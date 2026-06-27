# Social Fitness — n8n Automations

> 📋 **[MASTER CHECKLIST — everything left to test, configure & decide](https://github.com/SocialFitnessManchester/n8n-automations/issues/14)** — start here for the full picture across all automations.

Monorepo for everything Social Fitness automates in n8n. The projects that live here:

| Folder | What it is |
|---|---|
| [`glofox-first-class/`](./glofox-first-class/) | An n8n workflow that listens for Glofox booking webhooks and tags the matching Go High Level contact (`first-class-booked` / `first-class-cancelled` / `first-class-attended`) so the existing GHL automations take over. |
| [`glofox-purchase-nudge/`](./glofox-purchase-nudge/) | An n8n workflow that listens for Glofox `MEMBERSHIP_CREATED` events. Waits 10 minutes, then checks if the member booked their first class. If yes — safety-net `first-class-booked` tag in GHL. If no — `purchase-no-booking-yet` tag that triggers a nudge-to-book automation in GHL. |
| [`glofox-attended-count/`](./glofox-attended-count/) | An n8n workflow that listens for Glofox attendance events (`BOOKING_UPDATED` + `attended`) and pushes the member's **lifetime attended-classes count** to a Go High Level custom field, so GHL automations can fire on milestones (5 / 10 / 25 classes). |
| [`glofox-new-purchase/`](./glofox-new-purchase/) | An n8n workflow that listens for Glofox `MEMBERSHIP_CREATED` (a purchase / paid trial) and **creates/updates the Go High Level contact** — tagged `trial-purchase` and stamped with the offer they bought (`Latest Offer Registered For`). |
| [`glofox-new-lead/`](./glofox-new-lead/) | An n8n workflow that listens for a Glofox **new-lead** event and **creates/updates the Go High Level contact** — tagged `new-lead`, splitting `lead-with-offer` (stamps the offer) from `general-enquiry`. ⚠️ **Dummy/draft — blocked on the real lead payload ([#17](https://github.com/SocialFitnessManchester/n8n-automations/issues/17)).** |
| [`glofox-lead-sync/`](./glofox-lead-sync/) | A **manual, run-on-demand** n8n workflow that **bulk-imports a studio's existing Glofox contacts** (leads + members) into Go High Level with the correct Contact Type (`lead` / `customer`). Pick the studio from a sheet-backed dropdown and hit go — a one-off per studio when onboarding it to GHL. |
| [`error-handler/`](./error-handler/) | **Shared** workflow that every automation routes failures to — posts a Slack alert (with the affected studio) to `#5c-n8n-errors`. |
| [`glofox-n8n-app/`](./glofox-n8n-app/) | A custom n8n community node ([`n8n-nodes-glofox`](https://github.com/SocialFitnessManchester/glofox-n8n-app), installed on the n8n instance from that GitHub repo) that exposes Glofox **Create Lead**, **Create Purchase** and **Get Studio Config** actions with sheet-backed studio selection and dynamic dropdowns. **Get Studio Config** (v0.2.0) outputs a studio's Glofox + GHL credentials so a workflow can pick a studio from a dropdown and run against it — used by [`glofox-lead-sync/`](./glofox-lead-sync/). |

## Open in n8n

Direct links to each live workflow (self-hosted at `automation.social-fitness.com`):

| Automation | n8n workflow |
|---|---|
| First Class | [Open](https://automation.social-fitness.com/workflow/v3Luxgug3t0f5QJd) |
| Purchase Nudge | [Open](https://automation.social-fitness.com/workflow/Nf5cGnVRTCIbihGC) |
| Attended Count | [Open](https://automation.social-fitness.com/workflow/yfMSLNQnB6Y4zf0X) _(draft)_ |
| New Purchase | [Open](https://automation.social-fitness.com/workflow/DzAQM7K2b1az34FE) _(draft)_ |
| New Lead | [Open](https://automation.social-fitness.com/workflow/FqmDta5ldKcD4Nzq) _(draft — dummy, pending #17)_ |
| Lead Sync (initial, per studio) | [Open](https://automation.social-fitness.com/workflow/dHOF8Xnwl3oip8vj) _(manual, run on demand)_ |
| Error Handler (shared) | [Open](https://automation.social-fitness.com/workflow/AKbzN48d9DQwMioQ) |

> All automations route failures to the shared **Error Handler** workflow, which posts to Slack `#5c-n8n-errors`.

> `glofox-n8n-app` isn't a workflow — it's a custom node installed on the n8n instance from its [GitHub repo](https://github.com/SocialFitnessManchester/glofox-n8n-app).

For onboarding a new teammate to work in this repo with Claude Code, see [**ONBOARDING.md**](./ONBOARDING.md).

For per-project deep dives — architecture, design decisions, history, current state — see each subfolder's own `OVERVIEW.md` (e.g. [`glofox-first-class/OVERVIEW.md`](./glofox-first-class/OVERVIEW.md)).

## Open items

Tracked as [GitHub Issues](https://github.com/SocialFitnessManchester/n8n-automations/issues) on this repo. Anything that's a feature request, bug, or open question gets an issue so we can see the backlog in one place.
