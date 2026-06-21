# Glofox → GHL: New Purchase — Overview

Deep-dive for this automation. Quick version: [README](./README.md). Repo-wide context: [root README](../README.md).

---

## 1. What it does

When a member completes a purchase in Glofox (every Social Fitness purchase is a **paid trial**), create or update their Go High Level contact, tag them `trial-purchase`, and record which offer they bought — so GHL onboarding/follow-up automations can run.

## 2. The flow

```
Glofox Webhook → Save Branch ID (filter) → Only New Purchases → Lookup Studio (cache) → Studio In Sheet? → Get Member Email → GHL: Upsert Contact
```

| Node | What it does |
|---|---|
| **Glofox Webhook** | Receives Glofox events on path `glofox-new-purchase`. Top-level payload keys are PascalCase (`Type`/`Metadata`/`Payload`; nested keys lowercase). |
| **Save Branch ID (filter)** | Saves `Metadata.location_id` for per-studio execution filtering. |
| **Only New Purchases** | Passes only `Type === MEMBERSHIP_CREATED`. |
| **Lookup Studio (cache)** | Data Table `studio_config` "Get row" where `branch_id == Metadata.location_id` → Glofox API creds. |
| **Studio In Sheet?** | Continues only for a known studio; unknown studios halt silently (no Stop & Error guard). |
| **Get Member Email** | `GET /members/{user_id}` → email, name, phone. |
| **GHL: Upsert Contact** | `POST /contacts/upsert` → create/update contact + tag `trial-purchase` + set custom field `latest_offer_registered_for` from `Payload.membership_definition.plan_name`. |

## 3. Design decisions

- **Trigger = `MEMBERSHIP_CREATED` only** (created, not updated) for now. `MEMBERSHIP_UPDATED` (renewals/changes) is out of scope for v1.
- **No trial/paid split.** Every Social Fitness purchase is a *paid trial*, so there's no free-vs-paid distinction to filter on — all purchases flow through and get `trial-purchase`.
- **Separate from [Purchase Nudge](../glofox-purchase-nudge/).** Both react to `MEMBERSHIP_CREATED`, but they do different jobs (this one syncs the contact + offer; the nudge waits and chases a booking). Kept as two separate automations by design.
- **Offer recorded** via the GHL custom field **"Latest Offer Registered For"** (`latest_offer_registered_for`), set from `Payload.membership_definition.plan_name` (e.g. "1 Week Trial").
- **Consent defaults to yes** (no `dndSettings`) — consent is collected upstream in Glofox.
- **Studio config from a Data Table cache, not the sheet.** The webhook resolves studio config via the **"Lookup Studio (cache)"** node — a Data Table (`studio_config`: `branch_id` [key], `studio_name`, `api_key`, `api_token`, `ghl_location`, `ghl_pit`) "Get row" by Branch ID. Reading the studio-config Google Sheet on every event hit Google's ~60 reads/min/user Sheets limit and failed with HTTP 429 at high volume (GitHub issue #19). A separate **"Sync Studio Config → Data Table"** workflow (n8n id `mKrkdoAQ85WCZiJF`; repo [`../sync-studio-config/`](../sync-studio-config/)) keeps the table in sync from the sheet — once per run, on a 15-min schedule plus an instant secured webhook fired by an Apps Script `onChange` trigger. The sheet stays the human-editable source of truth.
- **Glofox creds come from the cache**; **GHL** uses the stored PIT credential + (currently) a hardcoded test `locationId`.
- **Error handling**: routes failures to the shared Error Handler workflow (Slack alerts).

## 4. Current state

- **Now on the Data Table cache** (no longer reads the studio-config sheet on each event).
- Manually tested: contact upserted and `trial-purchase` tag applied.
- **Blocked on Glofox.** The webhook was registered with Glofox as the n8n **test** URL, not the **production** URL, so live purchases aren't captured yet — Glofox needs to switch it to `…/webhook/glofox-new-purchase`.
- The `latest_offer_registered_for` custom field should be re-verified once it's on the production URL (an earlier manual test wrote it blank before the PascalCase fix).

## 5. Open items

- Finalise the `trial-purchase` tag with stakeholders (placeholder).
- Switch the Glofox-registered webhook from the n8n **test** URL to the **production** URL (`…/webhook/glofox-new-purchase`).
- Re-verify `latest_offer_registered_for` populates once on the production URL.
- Move the GHL `locationId` into the studio config (multi-studio).
- Confirm the GHL onboarding/welcome automation that `trial-purchase` should trigger.

Tracked on the [master checklist (#14)](https://github.com/SocialFitnessManchester/n8n-automations/issues/14).
