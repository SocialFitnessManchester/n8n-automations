# Glofox → GHL: New Purchase — Overview

Deep-dive for this automation. Quick version: [README](./README.md). Repo-wide context: [root README](../README.md).

---

## 1. What it does

When a member completes a purchase in Glofox (every Social Fitness purchase is a **paid trial**), create or update their Go High Level contact, tag them `trial-purchase`, and record which offer they bought — so GHL onboarding/follow-up automations can run.

## 2. The flow

```
Glofox Webhook → Only New Purchases → Lookup Studio Config → Get Member Email → GHL: Upsert Contact
```

| Node | What it does |
|---|---|
| **Glofox Webhook** | Receives Glofox events on path `glofox-new-purchase`. |
| **Only New Purchases** | Passes only `type === MEMBERSHIP_CREATED`. |
| **Lookup Studio Config** | Finds the studio row by Branch ID → Glofox API creds (sheet-driven). |
| **Get Member Email** | `GET /members/{user_id}` → email, name, phone. |
| **GHL: Upsert Contact** | `POST /contacts/upsert` → create/update contact + tag `trial-purchase` + set custom field `latest_offer_registered_for`. |

## 3. Design decisions

- **Trigger = `MEMBERSHIP_CREATED` only** (created, not updated) for now. `MEMBERSHIP_UPDATED` (renewals/changes) is out of scope for v1.
- **No trial/paid split.** Every Social Fitness purchase is a *paid trial*, so there's no free-vs-paid distinction to filter on — all purchases flow through and get `trial-purchase`.
- **Separate from [Purchase Nudge](../glofox-purchase-nudge/).** Both react to `MEMBERSHIP_CREATED`, but they do different jobs (this one syncs the contact + offer; the nudge waits and chases a booking). Kept as two separate automations by design.
- **Offer recorded** via the GHL custom field **"Latest Offer Registered For"** (`latest_offer_registered_for`), set from `payload.membership_definition.plan_name` (e.g. "1 Week Trial").
- **Consent defaults to yes** (no `dndSettings`) — consent is collected upstream in Glofox.
- **Glofox creds are sheet-driven**; **GHL** uses the stored PIT credential + (currently) a hardcoded test `locationId`.
- **Error handling**: routes failures to the shared Error Handler workflow (Slack alerts).

## 4. Current state

- Built and **tested green** end-to-end against the test sub-account: contact upserted, `trial-purchase` tag applied, and "Latest Offer Registered For" set to the plan name.
- Not live.

## 5. Open items

- Finalise the `trial-purchase` tag with stakeholders (placeholder).
- Register the webhook URL with Glofox.
- Move the GHL `locationId` to the studio config sheet (multi-studio).
- Confirm the GHL onboarding/welcome automation that `trial-purchase` should trigger.

Tracked on the [master checklist (#14)](https://github.com/SocialFitnessManchester/n8n-automations/issues/14).
