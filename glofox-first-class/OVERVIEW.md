# Glofox → GHL First Class Automation — Overview

The deep-dive doc for this project. For a quick "what does this do" summary, see the [README](./README.md) in this folder. For the wider repo context, see the [repo root README](../README.md) and the [ONBOARDING guide](../ONBOARDING.md).

This document covers the full story of the **Glofox → GHL First Class** automation: why we moved off Zapier, how the infrastructure fits together, the per-branch logic, and current state.

---

## 1. Why we moved from Zapier to n8n

Our previous Zapier setup had three separate Zaps per studio (one each for first-class booked / cancelled / attended), each duplicating the same lookup logic. With dozens of studios, the count of Zaps and the surface for things to drift out of sync was getting unmanageable.

**n8n** gives us:

- A single workflow per studio that handles all three event types via branching, rather than three Zaps.
- Direct visibility into JSON payloads, expressions, and API calls — much easier to debug than Zapier's abstracted UI.
- Self-hosted execution: unlimited workflows, unlimited executions, no per-task cost.
- A real-code editor where we can build whatever logic we need (custom expressions, conditional filters, multi-step API flows).

---

## 2. Infrastructure setup

### 2.1 n8n instance

- Self-hosted at **`https://automation.social-fitness.com`**
- Software is free (community edition); fixed cost is just the hosting server
- All work is done in workflows owned by `Abhi Gupta <software@social-fitness.com>` in the n8n project

### 2.2 GitHub repo

- **`SocialFitnessManchester/n8n-automations`** — the source-of-truth for all workflow JSON exports and supporting docs
- One folder per project (e.g. this folder, `glofox-first-class/`)
- Inside each project folder, a `workflows/` directory holds the n8n JSON exports — one file per studio
- Cloned locally to `~/projects/automations/`

### 2.3 Git identity (anonymized)

Commits to any `SocialFitnessManchester/*` repo automatically use the identity `Social Fitness Automations <noreply@social-fitness.com>`. This is set up via a `~/.gitconfig` rule that matches the remote URL pattern, so no manual setup is needed per-repo. Other (non-SF) repos on the same machine are unaffected.

### 2.4 Credentials (in n8n)

The workflow uses two credentials, both configured in n8n's Credentials UI:

| Credential | Type | What it does |
|---|---|---|
| `Google Service Account account` | Google Service Account | Reads the studio config Google Sheet. The service account email is shared on the sheet with Viewer access. |
| `HighLevel PIT - Test Sub Account` | HTTP Header Auth | `Authorization: Bearer pit-...` — talks to HighLevel V2 API on behalf of one GHL sub-account. One credential per sub-account. |

Why two different auth methods? Because:
- **Google Sheets** uses OAuth2 / service accounts — service accounts are best for unattended workflows.
- **GHL** has moved away from the legacy V1 API key. The modern path is either OAuth2 (which requires building a marketplace app) or **Private Integration Tokens** (PIT). PIT is per-sub-account, simpler to set up, and works perfectly for our use case.

---

## 3. The Glofox → GHL First Class automation

### 3.1 What it does, in one sentence

When a member books, cancels, or attends what amounts to their first class at a studio, apply the corresponding tag in Go High Level (`first-class-booked`, `first-class-cancelled`, `first-class-attended`) so the existing GHL workflows can take over the welcome / follow-up / re-engagement automations.

### 3.2 The flow

```mermaid
flowchart TD
    A[Glofox Webhook<br/>BOOKING_CREATED, BOOKING_DELETED, BOOKING_UPDATED] --> B[Lookup Studio Config<br/>Google Sheets row by Branch ID<br/>returns API Key + API Token]
    B --> C[Get Member Email<br/>GET /members/:user_id from Glofox]
    C --> D[Get Booking Count<br/>GET /bookings?user_id= from Glofox]
    D --> E{Is First Class<br/>Event?}
    E -->|No| Z[Stop]
    E -->|Yes| F{Switch by<br/>payload.status}
    F -->|BOOKED| G[GHL upsert contact<br/>+ add first-class-booked tag]
    F -->|CANCELED| H[GHL upsert contact<br/>+ add first-class-cancelled tag]
    H --> I[GHL DELETE<br/>first-class-booked tag]
    F -->|ATTENDED| J[Pending<br/>Glofox needs to enable<br/>BOOKING_UPDATED events]
```

### 3.3 Step-by-step

1. **Glofox webhook fires** when a booking is created, deleted, or updated. The top-level `type` field tells you the event kind; the nested `payload.status` is `BOOKED` / `CANCELED` / `ATTENDED`. We route on the latter.

2. **Studio config lookup (Google Sheets).** The webhook payload includes a `metadata.location_id`, which we match against the **Branch ID** column in [this sheet](https://docs.google.com/spreadsheets/d/10JeveuIeXNGsGyDQD5dvFLKzOoOzIN8ffRwszGuu2XA/edit). The row gives us the Glofox API Key + Token for that branch. Storing creds in a sheet (rather than hard-coded in n8n) means non-technical staff can add new studios by adding a row.

3. **Get member details from Glofox** — calls `GET /prod/2.0/members/{user_id}` to retrieve email, first name, last name, phone, and consent fields. This is what gets pushed to GHL.

4. **Get bookings history from Glofox** — calls `GET /prod/2.0/bookings?user_id={user_id}` to retrieve the member's full booking list (cancelled bookings stay in the list with `status: CANCELED`). We use this to figure out whether this event is genuinely the member's first class.

5. **"Is First Class Event?" filter.** One IF node with branching logic by event status:
   - **BOOKED** event passes if the count of *non-cancelled* bookings is exactly 1. This catches first-ever bookings AND re-bookings after a cancellation (where the member's first booking was cancelled, then they re-booked — we treat the re-booking as their real first class).
   - **CANCELED** event passes if non-cancelled count is 0 AND total bookings is 1 — i.e. this cancellation just removed their only-ever booking. This ensures we don't double-fire if a member cancels multiple times.
   - **ATTENDED** event passes if attended count is 1.

6. **Switch by event status.** Routes the item to one of three branches: BOOKED, CANCELED, or ATTENDED.

7. **Each branch does its GHL action(s):**
   - **BOOKED:** one HTTP call — `POST /contacts/upsert` with email, name, phone, and the `first-class-booked` tag. Creates the contact if missing, updates if existing, all in one shot. GHL's tag-added event triggers the welcome automation.
   - **CANCELED:** two HTTP calls — first an upsert with the `first-class-cancelled` tag, then a `DELETE /contacts/{id}/tags` to remove the `first-class-booked` tag. Removing the booked tag is what makes a future re-booking re-fire the welcome automation (since the tag wouldn't otherwise be a new addition).
   - **ATTENDED:** one upsert with `first-class-attended` tag, then a `DELETE /contacts/{id}/tags` to remove `first-class-booked` (mirrors the CANCELED pattern).

### 3.4 Decisions worth knowing about

- **Marketing consent.** We default to "yes" — we don't read Glofox's `consent.email.active` block and don't set GHL's DND flags. Reason: anyone reaching this point has already consented at the Glofox booking step upstream. Re-validating would just add complexity.

- **One workflow per studio (for now).** Each studio has its own n8n workflow with a hardcoded GHL Location ID and a dedicated PIT credential. This mirrors the Zapier pattern (one Zap per studio) and was the fastest way to ship. The long-term play is one master workflow that picks the GHL location dynamically from the sheet — but it requires the GHL Location ID and PIT to also live in the sheet, and changes to how credentials are referenced.

- **Webhook URLs require Glofox staff to register them.** Every new endpoint = a Glofox support ticket. This argues against having dozens of webhook URLs (one per studio per event) and pushes us toward consolidation — but it's a tradeoff we'll revisit.

- **We use Glofox's `total_count` + filtered `status` rather than their `is_first` field.** The `is_first` flag is dynamic — it flips to `false` when a booking is cancelled, even though the cancelled booking *was* their first. Filtered counting gives us historical correctness.

---

## 4. Current state per branch

| Branch | Status | Notes |
|---|---|---|
| **First class booked** | ✅ Working | Tested end-to-end on test sub-account. Contact created in GHL with name, email, phone, and tag in a single API call. |
| **First class cancelled** | ✅ Working | Tested end-to-end. Adds `first-class-cancelled` tag, removes `first-class-booked`. |
| **First class attended** | ✅ Working | Tested end-to-end via synthetic payload (Glofox is now firing `BOOKING_UPDATED` with `payload.attended: true` to signal attendance — `payload.status` stays `BOOKED`). Adds `first-class-attended` tag, removes `first-class-booked`. |

---

## 5. How to add a new studio (when we're ready to roll out)

1. **Add a row to the [studio config sheet](https://docs.google.com/spreadsheets/d/10JeveuIeXNGsGyDQD5dvFLKzOoOzIN8ffRwszGuu2XA/edit)** — Studio Name, Branch ID (from Glofox), API Key, API Token.
2. **Create a Private Integration in the GHL sub-account** (Settings → Private Integrations) with View/Edit Contacts scopes. Copy the PIT.
3. **Note the GHL Location ID** for the sub-account (Settings → Business Profile).
4. **In n8n: duplicate the test workflow**, update:
   - Workflow name (e.g. `Glofox First Class — Studio X`)
   - Webhook path (e.g. `glofox-first-class-studio-x`)
   - Create a new HTTP Header Auth credential for the new PIT, assign to all three GHL HTTP nodes
   - Replace the Location ID in each GHL HTTP body
5. **Export the workflow JSON** from n8n and add it to `workflows/<studio-name>.json` in this folder. Commit + push.
6. **Submit a ticket to Glofox support** to register the new webhook URL on the studio's Glofox account.

---

## 6. Open items / what's next

- **Total attendance count to GHL custom field:** for downstream GHL automations triggered on milestones (e.g. 5 / 10 / 25 classes attended). Plan: a parallel branch off `Get Booking Count` that fires on every `BOOKING_UPDATED + attended === true` event (not gated by first-class filter), derives the count via `data.filter(b => b.attended === true).length`, and PUTs/upserts a GHL custom field. Needs the GHL custom field to be created first and its Custom Field ID captured.
- **No-show case:** if a member books a first class but neither attends nor cancels, we currently have no signal — Glofox's webhook behaviour for this scenario isn't yet known. Needs a follow-up with Glofox support to ask whether a separate event fires (e.g. on auto-mark-as-missed) or whether we need a scheduled job to sweep for stale BOOKED bookings past their `time_finish`. Worth deciding what GHL action a "no-show" should trigger (likely a re-engagement tag).
- **GHL sub-account is currently hardcoded per workflow:** the four GHL HTTP nodes each have `locationId` baked into the body and an HTTP Header Auth credential pinned to the test sub-account's PIT. Only the Glofox API creds are looked up from the studio config sheet. Before cloning this workflow to additional studios, extend the sheet with `GHL Location ID` and `GHL Private Integration Token` columns and rewire the GHL nodes to read both from the sheet (analogous to how Glofox creds work today). That turns it into one master workflow that handles every studio.
- **Multi-studio consolidation:** once the per-studio approach is proven across a few studios, consider collapsing to a single master workflow with dynamic GHL credential lookup. Saves on maintenance and on Glofox support tickets (one webhook URL handles all studios). Depends on the previous item being done.
- **New workflow: Purchase → first-class nudge:** when a member completes a purchase in Glofox (separate webhook event, payload still TBC), wait 10 minutes, then check if they've booked a class. If yes, apply `first-class-booked` tag as a safety net; if no, apply a nudge tag like `purchase-no-booking-yet` that triggers a "please book your first class" automation in GHL. Same upstream as the First Class workflow (Sheets lookup, member email lookup) plus a Wait node and post-wait booking check. Needs: a sample purchase webhook payload from Glofox + the exact GHL tag name for the nudge automation + Glofox support to register the webhook URL if it's not already firing through the existing endpoint.
- **Error handling:** the workflow currently fails silently if a branch ID isn't found in the sheet or if a GHL API call returns an error. Adding an error branch with a Slack/email alert would catch issues earlier.
- **Cut over from Zapier:** the existing Zapier flow is still receiving Glofox webhooks. When we're ready, Glofox needs to switch the registered URL from the Zapier endpoint to the n8n endpoint, and we pause the corresponding Zaps.
