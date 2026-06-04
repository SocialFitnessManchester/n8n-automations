# Social Fitness — n8n Automations

Monorepo for everything Social Fitness automates in n8n. Two projects live here:

| Folder | What it is |
|---|---|
| [`glofox-first-class/`](./glofox-first-class/) | An n8n workflow that listens for Glofox booking webhooks and tags the matching Go High Level contact (`first-class-booked` / `first-class-cancelled` / `first-class-attended`) so the existing GHL automations take over. |
| [`glofox-n8n-app/`](./glofox-n8n-app/) | A custom n8n community node — published to npm as [`n8n-nodes-glofox`](https://www.npmjs.com/package/n8n-nodes-glofox) — that exposes Glofox **Create Lead** and **Create Purchase** actions with sheet-backed studio selection and dynamic dropdowns. For building **new** automations that push data into Glofox (e.g. Facebook Lead Ad → Glofox Lead). |

For end-to-end context — why we moved off Zapier, how the infrastructure fits together, current state and open items — read [**OVERVIEW.md**](./OVERVIEW.md).

For onboarding a new teammate to work in this repo with Claude Code, see [**ONBOARDING.md**](./ONBOARDING.md).

## Open items

Tracked as [GitHub Issues](https://github.com/SocialFitnessManchester/n8n-automations/issues) on this repo. Anything that's a feature request, bug, or open question gets an issue so we can see the backlog in one place.
