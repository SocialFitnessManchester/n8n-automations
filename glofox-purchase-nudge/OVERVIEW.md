# Glofox → GHL Purchase Nudge — Overview

The deep-dive for this automation. For the quick "what is this" version and the full node-by-node walkthrough, see the [README](./README.md). For repo-wide context, see the [root README](../README.md) and [ONBOARDING](../ONBOARDING.md). This workflow shares its upstream pattern (Sheets lookup → Glofox member/bookings calls → GHL upsert) with [glofox-first-class](../glofox-first-class/OVERVIEW.md), so most of that doc's infrastructure section applies here too.

---

## 1. What it does

When a member completes a purchase in Glofox (`MEMBERSHIP_CREATED`), wait 10 minutes, then check whether they've booked their first class. If they have, apply `first-class-booked` in GHL as a safety net; if they haven't, apply a nudge tag (`purchase-no-booking-yet`) that triggers a "please book your first class" GHL automation.

## 2. The flow

```
Glofox Webhook → Is MEMBERSHIP_CREATED? → Lookup Studio Config → Get Member Email → Wait 10 Minutes → Get Booking Count → Has Any Active Booking?
                                                                                                                              ├─ yes → GHL: Tag first-class-booked (safety net)
                                                                                                                              └─ no  → GHL: Tag purchase-no-booking-yet (nudge)
```

- **Is MEMBERSHIP_CREATED?** — early type gate so other events sent to the same URL are ignored.
- **Wait 10 Minutes** — gives the member time to book before we decide whether they need a nudge.
- **Has Any Active Booking?** — `data.filter(b => b.status !== 'CANCELED').length > 0`, branching to the safety-net tag or the nudge tag.

Failures route to the shared **Error Handler** workflow (`AKbzN48d9DQwMioQ`) via the `errorWorkflow` setting, which posts to Slack `#5c-n8n-errors`.

## 3. Current state

- Workflow in n8n: **Glofox Purchase Nudge Test** (id `Nf5cGnVRTCIbihGC`), inactive.
- **Tested** end-to-end against the test sub-account. Glofox creds are sheet-driven; the GHL nodes use the stored `HighLevel PIT - Test Sub Account` credential with a hardcoded test location id — no inline secrets.
- Committed to `workflows/glofox-purchase-nudge.json`.

## 4. Open items

See the [README's "Gaps to address before activating"](./README.md) and the GitHub issues under the [`glofox-purchase-nudge`](https://github.com/SocialFitnessManchester/n8n-automations/labels/glofox-purchase-nudge) label (notably #6). Key ones: the `purchase-no-booking-yet` tag name is a placeholder, the webhook URL routing needs confirming with Glofox, and the GHL location/credential are hardcoded to the test sub-account.
