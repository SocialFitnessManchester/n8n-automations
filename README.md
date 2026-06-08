# Social Fitness — n8n Automations

Monorepo for everything Social Fitness automates in n8n. The projects that live here:

| Folder | What it is |
|---|---|
| [`glofox-first-class/`](./glofox-first-class/) | An n8n workflow that listens for Glofox booking webhooks and tags the matching Go High Level contact (`first-class-booked` / `first-class-cancelled` / `first-class-attended`) so the existing GHL automations take over. |
| [`glofox-purchase-nudge/`](./glofox-purchase-nudge/) | An n8n workflow that listens for Glofox `MEMBERSHIP_CREATED` events. Waits 10 minutes, then checks if the member booked their first class. If yes — safety-net `first-class-booked` tag in GHL. If no — `purchase-no-booking-yet` tag that triggers a nudge-to-book automation in GHL. |
| [`glofox-attended-count/`](./glofox-attended-count/) | An n8n workflow that listens for Glofox attendance events (`BOOKING_UPDATED` + `attended`) and pushes the member's **lifetime attended-classes count** to a Go High Level custom field, so GHL automations can fire on milestones (5 / 10 / 25 classes). |
| [`glofox-n8n-app/`](./glofox-n8n-app/) | A custom n8n community node — published to npm as [`n8n-nodes-glofox`](https://www.npmjs.com/package/n8n-nodes-glofox) — that exposes Glofox **Create Lead** and **Create Purchase** actions with sheet-backed studio selection and dynamic dropdowns. For building **new** automations that push data into Glofox (e.g. Facebook Lead Ad → Glofox Lead). |

## Open in n8n

Direct links to each live workflow (self-hosted at `automation.social-fitness.com`):

| Automation | n8n workflow |
|---|---|
| First Class | [Open](https://automation.social-fitness.com/workflow/v3Luxgug3t0f5QJd) |
| Purchase Nudge | [Open](https://automation.social-fitness.com/workflow/Nf5cGnVRTCIbihGC) |
| Attended Count | [Open](https://automation.social-fitness.com/workflow/yfMSLNQnB6Y4zf0X) _(draft)_ |

> `glofox-n8n-app` isn't a workflow — it's a custom node published to [npm](https://www.npmjs.com/package/n8n-nodes-glofox).

For onboarding a new teammate to work in this repo with Claude Code, see [**ONBOARDING.md**](./ONBOARDING.md).

For per-project deep dives — architecture, design decisions, history, current state — see each subfolder's own `OVERVIEW.md` (e.g. [`glofox-first-class/OVERVIEW.md`](./glofox-first-class/OVERVIEW.md)).

## Open items

Tracked as [GitHub Issues](https://github.com/SocialFitnessManchester/n8n-automations/issues) on this repo. Anything that's a feature request, bug, or open question gets an issue so we can see the backlog in one place.
