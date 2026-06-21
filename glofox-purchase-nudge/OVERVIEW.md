# Glofox → GHL Purchase Nudge — Overview

The deep-dive for this automation. For the quick "what is this" version and the full node-by-node walkthrough, see the [README](./README.md). For repo-wide context, see the [root README](../README.md) and [ONBOARDING](../ONBOARDING.md). This workflow shares its upstream pattern (Sheets lookup → Glofox member/bookings calls → GHL upsert) with [glofox-first-class](../glofox-first-class/OVERVIEW.md), so most of that doc's infrastructure section applies here too.

---

## 1. What it does

When a member completes a purchase in Glofox (`MEMBERSHIP_CREATED`), wait 10 minutes, then check whether they've booked their first class. If they have, apply `first-class-booked` in GHL as a safety net; if they haven't, apply a nudge tag (`purchase-no-booking-yet`) that triggers a "please book your first class" GHL automation.

## 2. The flow

```
Glofox Webhook → Save Branch ID (filter) → Is MEMBERSHIP_CREATED? → Lookup Studio (cache) → Studio In Sheet? → Get Member Email → Wait 10 Minutes → Get Booking Count → Has Any Active Booking?
                                                                                                                                                                                          ├─ yes → GHL: Tag first-class-booked (safety net)
                                                                                                                                                                                          └─ no  → GHL: Tag purchase-no-booking-yet (nudge)
```

- **Save Branch ID (filter)** — saves `location_id` right after the webhook so per-studio execution filtering works. The webhook payload's top-level keys are PascalCase (`Type`/`Metadata`/`Payload`; nested keys lowercase).
- **Is MEMBERSHIP_CREATED?** — early type gate so other events sent to the same URL are ignored.
- **Lookup Studio (cache)** — resolves studio config from the n8n **Data Table** `studio_config` (cols: `branch_id` [key], `studio_name`, `api_key`, `api_token`, `ghl_location`, `ghl_pit`) via a Data Table "Get row" where `branch_id == Metadata.location_id`. This replaces the old per-event Google Sheets read, which hit Google's ~60 reads/min/user limit and failed with HTTP 429 at high volume (GitHub issue #19). The sheet stays the human-editable source of truth; a separate **"Sync Studio Config → Data Table"** workflow (n8n id `mKrkdoAQ85WCZiJF`; repo `../sync-studio-config/`) keeps the table in step with it (once per run, 15-min schedule + an instant secured webhook fired by an Apps Script `onChange` trigger on the sheet).
- **Studio In Sheet?** — guard for studios not present in the cache; unknown studios halt silently (the old "Unknown Studio / Bad Input" Stop & Error guard was removed).
- **Wait 10 Minutes** — gives the member time to book before we decide whether they need a nudge.
- **Has Any Active Booking?** — `data.filter(b => b.status !== 'CANCELED').length > 0`, branching to the safety-net tag or the nudge tag.

Failures route to the shared **Error Handler** workflow (`AKbzN48d9DQwMioQ`) via the `errorWorkflow` setting, which posts to Slack `#5c-n8n-errors`.

## 3. Current state

- Workflow in n8n: **Glofox Purchase Nudge Test** (id `Nf5cGnVRTCIbihGC`), inactive.
- **Now on the cache** — studio config is resolved from the `studio_config` Data Table (see §2), no longer a per-event Sheets read.
- Glofox creds come from the cache; the GHL nodes use the stored `HighLevel PIT - Test Sub Account` credential with a hardcoded test location id (not from cache) — no inline secrets.
- **Still blocked on Glofox**: the webhook was given to Glofox as the n8n **test** URL, not the **production** URL, so live purchases aren't captured. Glofox needs to switch it to `…/webhook/glofox-purchase-nudge-test` — the path legitimately ends `-test` (that's the workflow name); the fix is `/webhook/` instead of `/webhook-test/`. Not yet tested end-to-end on live data.
- Committed to `workflows/glofox-purchase-nudge.json`.

## 4. Open items

See the [README's "Gaps to address before activating"](./README.md) and the GitHub issues under the [`glofox-purchase-nudge`](https://github.com/SocialFitnessManchester/n8n-automations/labels/glofox-purchase-nudge) label (notably #6). Key ones: Glofox needs to switch the registered webhook from the test URL to the production URL (`/webhook/` not `/webhook-test/`) before live purchases are captured, the `purchase-no-booking-yet` tag name is a placeholder, and the GHL location/credential are hardcoded to the test sub-account. The Sheets-read scaling issue is resolved — the workflow is on the `studio_config` Data Table cache (issue #19, now closed).
