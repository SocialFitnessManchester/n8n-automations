# Glofox → GHL: New Purchase

> ▶️ **Open in n8n:** [Glofox New Purchase → GHL Contact](https://automation.social-fitness.com/workflow/DzAQM7K2b1az34FE)

When a member completes a **purchase** in Glofox (a paid trial), create or update their contact in Go High Level — tagged `trial-purchase` and stamped with the exact offer they bought — so the GHL onboarding/follow-up automations can take over.

## How it works (plain English)

1. Glofox tells us "someone just purchased" (a `MEMBERSHIP_CREATED` webhook).
2. We look up that member's details in Glofox (email, name, phone).
3. We create/update them as a contact in GHL with the `trial-purchase` tag.
4. We record which offer they bought in the **"Latest Offer Registered For"** custom field.

## Status

🚧 **Draft — not live yet.** Built and tested green end-to-end against the test sub-account.

## More

- Full detail and design decisions: [OVERVIEW.md](./OVERVIEW.md)
- Exported workflow: [`workflows/glofox-new-purchase.json`](./workflows/glofox-new-purchase.json)
- Open items: the [master checklist](https://github.com/SocialFitnessManchester/n8n-automations/issues/14)
