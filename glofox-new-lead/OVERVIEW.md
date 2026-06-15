# Glofox → GHL: New Lead — Overview

Deep-dive for this automation. Quick version: [README](./README.md). Repo-wide context: [root README](../README.md).

---

## 1. What it does

When a **new lead** is created in Glofox, sync them into Go High Level as a contact so GHL nurture automations can run — capturing the **offer** the lead came in for when one exists, and handling **general enquiries** (no offer) without clobbering offer data captured elsewhere.

This is the **lead-stage** counterpart to [glofox-new-purchase](../glofox-new-purchase/) (which handles a completed purchase / paid trial via `MEMBERSHIP_CREATED`). A paid trial is **not** in scope here — that's already covered by New Purchase. Open question: whether "new trial" (e.g. a *free* trial sign-up) is a distinct Glofox event we also want to catch here.

## 2. The flow

```
Glofox Webhook → Only New Leads → Lookup Studio Config → Studio In Sheet? ─┬─ no → Stop & Error
                                                                           └─ yes → Get Lead Details → Has Offer? ─┬─ yes → GHL: Upsert (Offer)
                                                                                                                   └─ no  → GHL: Upsert (General)
```

| Node | What it does |
|---|---|
| **Glofox Webhook** | Receives Glofox lead events on path `glofox-new-lead`. Responds immediately (`onReceived`). |
| **Only New Leads** | Passes only the lead-created event. ⚠️ event name `LEAD_CREATED` is a placeholder. |
| **Lookup Studio Config** | Finds the studio row by Branch ID (`metadata.location_id`) → Glofox API creds (sheet-driven). |
| **Studio In Sheet?** | Guard — continue only if the branch is found AND a `lead_id` is present; otherwise Stop & Error (routes to the shared Error Handler / Slack). |
| **Get Lead Details** | `GET /leads/{lead_id}` → email, name, phone. ⚠️ Placeholder endpoint — may be unnecessary if the webhook already carries these. |
| **Has Offer?** | Splits "specific offer" leads from "general enquiry" leads. ⚠️ Placeholder offer field path. |
| **GHL: Upsert (Offer)** | Upsert contact + tags `new-lead`, `lead-with-offer` + write `latest_offer_registered_for`. |
| **GHL: Upsert (General)** | Upsert contact + tags `new-lead`, `general-enquiry`. **No** custom-field write (preserves any existing offer). |

## 3. Design decisions

- **The offer-vs-general-enquiry problem.** Leads arrive via different channels with different certainty about the offer:
  - **Facebook lead ads / GHL forms** → always a *specific offer* (and these already land directly in GHL).
  - **Studio's own site** → could be a *general enquiry* **or** a *specific offer* — we can't tell upfront.
  - The same person may arrive via more than one channel (both), or just one.

  Handling: **upsert by email** (never duplicate) + a **conditional offer write**. Offer present → stamp the offer field. No offer → tag as general enquiry and **omit the custom field entirely**, so an upsert can't overwrite an offer value already captured from FB/forms with a blank.

- **Upsert, not create.** Guarantees de-duplication against contacts that already exist in GHL from other sources.

- **Consent defaults to yes** (no `dndSettings`) — consistent with the other Glofox→GHL workflows; consent is handled upstream.

- **Error handling.** `errorWorkflow` routes failures to the shared Error Handler (`AKbzN48d9DQwMioQ` → Slack `#5c-n8n-errors`).

## 4. ⚠️ Unknowns — blocked on the real lead payload

We have **no captured Glofox lead webhook payload**. Every field path below is an assumption flagged in the workflow node notes, to be confirmed before any real testing:

| Assumption | Placeholder used | Needs confirming |
|---|---|---|
| Lead event type | `body.type === "LEAD_CREATED"` | Real event name for a new lead |
| Lead identifier | `body.payload.lead_id` | Real field + whether leads even have an id like members do |
| Lead-detail endpoint | `GET /leads/{lead_id}` | Whether Glofox exposes this, and its response shape (email/name/phone) |
| Offer location | `body.payload.offer_name` | Where (if anywhere) the offer/interest is carried |

Tracked in [#17 — capture the real Glofox lead webhook payload](https://github.com/SocialFitnessManchester/n8n-automations/issues/17). Until then this is a **dummy** — pin a sample payload on the webhook node to exercise the branching logic.

## 5. Current state

- **Created in n8n** as **Glofox New Lead → GHL Contact** (id `FqmDta5ldKcD4Nzq`), **inactive/draft**. Validated green (0 errors). Importable JSON mirror at [`workflows/glofox-new-lead.json`](./workflows/glofox-new-lead.json).
- ⚠️ **Dummy** — built on assumed field paths (see §4); cannot be tested for real until the lead payload lands (#17).
- Error handling wired: `errorWorkflow` → shared Error Handler (`AKbzN48d9DQwMioQ` → Slack `#5c-n8n-errors`).
- Hardcoded test location (`JHgfCMprry4fxGOzRsYl`) + test-sub-account PIT, same as the sibling workflows; move to the studio config sheet for multi-studio (#13).

## 6. Open items

- **Capture the real Glofox lead webhook payload** (the blocker) — [#17](https://github.com/SocialFitnessManchester/n8n-automations/issues/17).
- Confirm whether a distinct **"new trial"** (free trial) event should also be handled here.
- Finalise the GHL **tag names** (`new-lead`, `lead-with-offer`, `general-enquiry` are placeholders) with stakeholders, and the **GHL nurture workflow(s)** these should trigger.
- Register the webhook URL with Glofox.
- Move the GHL `locationId` + PIT to the studio config sheet (multi-studio).
- Create/import the workflow into n8n once the payload is known.

Tracked on the [master checklist (#14)](https://github.com/SocialFitnessManchester/n8n-automations/issues/14).
