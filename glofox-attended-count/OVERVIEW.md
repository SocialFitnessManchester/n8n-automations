# Glofox → GHL Total Classes Attended — Overview

The deep-dive for this automation. For the quick "what is this" version, see the [README](./README.md). For repo-wide context, see the [root README](../README.md) and [ONBOARDING](../ONBOARDING.md).

---

## 1. What it does

When a member is marked **attended** in Glofox, push their **lifetime count of attended classes** to a custom field on their Go High Level contact, so GHL automations can trigger on milestones (5 / 10 / 25 classes, etc.).

## 2. Why it's standalone (not part of First Class)

This logic was originally proposed as a branch inside [glofox-first-class](../glofox-first-class/). We deliberately built it as **its own workflow** instead.

- **Reason:** the team needs to troubleshoot quickly. One workflow = one job = a straight line someone can read top-to-bottom.
- **Trade-off accepted:** it needs its own Glofox webhook registration (a support ticket), and it re-does the member/bookings lookups rather than sharing First Class's data. Worth it for the simplicity.

## 3. The flow

```
Glofox Webhook → Only Attended Events → Get Member → Get Bookings → GHL: Update Total Attended Count
```

| Node | What it does |
|---|---|
| **Glofox Webhook** | Receives Glofox booking events on path `glofox-attended-count`. |
| **Only Attended Events** | Single-output gate — stops the run unless `type === BOOKING_UPDATED && payload.attended === true`. Not a branch. |
| **Get Member** | `GET /members/{user_id}` → the member's **email** (needed to match the GHL contact; not in the webhook or bookings response). |
| **Get Bookings** | `GET /bookings?user_id={user_id}&attended=true` → read **`total_count`**. |
| **GHL: Update Total Attended Count** | `POST /contacts/upsert` writing the count to the "Total Classes Attended" custom field. |

## 4. Key findings (verified empirically against the test sub-account)

- **The webhook payload is lean** — it carries `user_id`, `type`, and `payload.attended`, but **no count and no email**.
- **Attendance signal** = `type: BOOKING_UPDATED` + `payload.attended: true`. `payload.status` stays `BOOKED` — it never becomes "ATTENDED".
- **The bookings API paginates** — `limit` defaults to 50, caps at 100 per page, with `page` / `has_more` / `total_count`.
- **Use `total_count`, not row-counting** — `?attended=true` then read `total_count` gives the exact lifetime attended count in **one call, immune to pagination**. (Counting the returned rows would silently truncate at 50 — wrong for anyone with 50+ bookings.)
- **Email needs a lookup** — it only lives on the member record (`GET /members/{id}`), not on the webhook or the booking.
- **The attended flag is immediate** — marking a member attended updates the API straight away, even for a class in the future; no need to wait for class time. (Verified: count went 1 → 2 immediately after marking a new attendance.)

## 5. Current state

- Draft workflow in n8n: **DRAFT — Glofox → GHL Total Attended Count (#3)** (id `yfMSLNQnB6Y4zf0X`), inactive.
- Tested end-to-end: webhook → filter → member lookup → bookings count all work; the count flows correctly into the GHL request body. Only the final GHL write is blocked by placeholder IDs.
- **Not committed to `workflows/` yet** — the draft currently has Glofox creds inline for testing; those must move to the studio config sheet before the JSON is exported here (see #13).

## 6. Open items

Tracked as GitHub issues under the [`glofox-attended-count`](https://github.com/SocialFitnessManchester/n8n-automations/labels/glofox-attended-count) label:

- **#9** — Wire real GHL config (location ID + custom field ID) and run end-to-end
- **#10** — Verify `total_count` reports the true count at scale (1000s of bookings)
- **#11** — Register the webhook URL with Glofox support
- **#12** — Confirm the `attended=true` filter on a mixed attended/not-attended member
- **#13** — Move Glofox creds to the studio config sheet + export sanitized workflow JSON

## 7. History

Originated as issue **#3** (filed under `glofox-first-class`). Once we decided it should be standalone, #3 was closed and the work moved here under its own `glofox-attended-count` label.
