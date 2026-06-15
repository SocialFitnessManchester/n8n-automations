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
| **Get Bookings** | `GET /bookings?user_id={user_id}&attended=true&status=BOOKED` → read **`total_count`**. The `&status=BOOKED` filter excludes cancelled-but-attended bookings, so the count reflects only attended classes that weren't later cancelled (decided in #12). |
| **GHL: Update Total Attended Count** | `POST /contacts/upsert` writing the count to the "Total Classes Attended" custom field. |

## 4. Key findings (verified empirically against the test sub-account)

- **The webhook payload is lean** — it carries `user_id`, `type`, and `payload.attended`, but **no count and no email**.
- **Attendance signal** = `type: BOOKING_UPDATED` + `payload.attended: true`. `payload.status` stays `BOOKED` — it never becomes "ATTENDED".
- **The bookings API paginates** — `limit` defaults to 50, caps at 100 per page, with `page` / `has_more` / `total_count`.
- **Use `total_count`, not row-counting** — `?attended=true&status=BOOKED` then read `total_count` gives the exact lifetime attended count in **one call, immune to pagination**. (Counting the returned rows would silently truncate at 50 — wrong for anyone with 50+ bookings.)
- **Exclude cancelled classes** — adding `&status=BOOKED` keeps the count to attended classes that weren't subsequently cancelled (a class can be marked attended and then cancelled). Decided in **#12**.
- **Email needs a lookup** — it only lives on the member record (`GET /members/{id}`), not on the webhook or the booking.
- **The attended flag is immediate** — marking a member attended updates the API straight away, even for a class in the future; no need to wait for class time. (Verified: count went 1 → 2 immediately after marking a new attendance.)

## 5. Current state

- Draft workflow in n8n: **Glofox → GHL Total Classes Attended** (id `yfMSLNQnB6Y4zf0X`), inactive.
- **Now has the standardised studio-config lookup step** (2026-06-15) — was the only automation missing it. Flow: `Webhook → Only Attended Events → Lookup Studio Config → Resolve Studio (by position) → Studio In Sheet? → Get Member → Get Bookings → GHL update`.
- **All dynamic values pull from the studio sheet.** The lookup is **future-proof against header renames**: a `Lookup Studio Config` Google Sheets node reads **all** rows, and a `Resolve Studio (by position)` Code node matches the branch and reads columns **by position** (after dropping n8n's `row_number`): `0 Studio | 1 Branch ID | 2 API Key | 3 API Token | 4 GHL Location | 5 GHL PIT`. So renaming a column header doesn't break anything.
- **Glofox creds: ✅ tested green** — Get Member + Get Bookings ran successfully pulling API key/token/branch from the sheet (replaced the old hardcoded values).
- **GHL location + PIT: wired to the sheet** (positions 4/5) but ⚠️ **not yet green** — the test branch `66cfc853…` has a **duplicate sheet row** ("AI Testing Tool - Test Sub Account" matched first) that holds `"tester"`/`"Done - DG"` where GHL Location/PIT should be, so the upsert 401'd (`locationId: "tester"`). **Fix = clean the sheet: one row per branch with GHL Location/PIT in columns 5/6** (the Abhi Test layout). Tracked in #13.
- Committed JSON now reflects the live sheet-driven design (no inline creds — all expressions referencing the sheet).
- Error handling is wired: `errorWorkflow` → shared **Error Handler** (`AKbzN48d9DQwMioQ`) → Slack `#5c-n8n-errors`.

## 6. Open items

Tracked as GitHub issues under the [`glofox-attended-count`](https://github.com/SocialFitnessManchester/n8n-automations/labels/glofox-attended-count) label:

- **#9** — Wire real GHL config (location ID + custom field ID) and run end-to-end
- **#10** — Verify `total_count` reports the true count at scale (1000s of bookings)
- **#11** — Register the webhook URL with Glofox support
- **#12** — Confirm the `attended=true` filter on a mixed attended/not-attended member
- **#13** — Move Glofox creds to the studio config sheet + export sanitized workflow JSON

## 7. History

Originated as issue **#3** (filed under `glofox-first-class`). Once we decided it should be standalone, #3 was closed and the work moved here under its own `glofox-attended-count` label.
