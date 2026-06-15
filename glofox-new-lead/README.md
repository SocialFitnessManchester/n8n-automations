# Glofox → GHL: New Lead

> ▶️ **Open in n8n:** [Glofox New Lead → GHL Contact](https://automation.social-fitness.com/workflow/FqmDta5ldKcD4Nzq) _(draft / inactive — dummy pending the real lead payload)_

When a **new lead** is created in Glofox, create or update their contact in Go High Level so the GHL nurture automations can take over — capturing the **offer** they came in for when there is one, and treating them as a **general enquiry** when there isn't.

## How it works (plain English)

1. Glofox tells us "a new lead was created" (a lead webhook — event name TBC).
2. We look up the studio's Glofox API creds in the config sheet (by Branch ID).
3. We fetch the lead's details (email, name, phone).
4. **If the lead came in for a specific offer** → upsert the GHL contact, tag `new-lead` + `lead-with-offer`, and record the offer in **"Latest Offer Registered For"**.
5. **If it's a general enquiry** (no offer) → upsert the contact, tag `new-lead` + `general-enquiry`, and **leave the offer field untouched** (so we never blank out an offer captured from another channel).

Because step 4/5 **upsert by email**, a person who already exists in GHL (e.g. from a Facebook lead ad or a GHL form for a specific offer) is **updated, not duplicated**.

## ⚠️ Status: DUMMY / PLACEHOLDER — blocked on the real payload

We do **not** yet have a real Glofox lead webhook payload, so the event name, the `lead_id` path, the lead-detail endpoint, and where the offer lives are all **assumptions**. The workflow is structurally complete and importable, but every assumed field is flagged in node notes and must be confirmed before testing.

- 🔗 **Payload investigation:** [#17 — capture the real Glofox lead webhook payload](https://github.com/SocialFitnessManchester/n8n-automations/issues/17).
- Pin a dummy payload on the **Glofox Webhook** node to dry-run the logic in the meantime.

## More

- Full detail and design decisions: [OVERVIEW.md](./OVERVIEW.md)
- Exported workflow: [`workflows/glofox-new-lead.json`](./workflows/glofox-new-lead.json)
- Open items: the [master checklist](https://github.com/SocialFitnessManchester/n8n-automations/issues/14)
