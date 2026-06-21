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
Glofox Webhook → Save Branch ID (filter) → Only Attended Events → Lookup Studio (cache) → Resolve Studio (by position) → Studio In Sheet? → Get Member → Glofox: Get Bookings → GHL: Update Total Attended Count
```

| Node | What it does |
|---|---|
| **Glofox Webhook** | Receives Glofox booking events on path `glofox-attended-count`. Payload top-level keys are **PascalCase** (`Type` / `Metadata` / `Payload`; nested keys stay lowercase). |
| **Save Branch ID (filter)** | Execution Data node — saves `Metadata.location_id` as highlighted execution data, so the Executions list can be filtered per studio. |
| **Only Attended Events** | Single-output gate — stops the run unless `Type === BOOKING_UPDATED && Payload.attended === true`. Not a branch. |
| **Lookup Studio (cache)** | Data Table **"Get row"** against the `studio_config` table where `branch_id == Metadata.location_id`. Resolves studio config from the cache instead of reading the Google Sheet on every event (see §5). |
| **Resolve Studio (by position)** | Code node — takes the single row returned by the cache lookup and renames the snake_case columns to the camelCase names the downstream nodes expect (`branchId` / `apiKey` / `apiToken` / `ghlLocation` / `ghlPit`). |
| **Studio In Sheet?** | Gate — proceeds only if a matching studio row was resolved; unknown studios halt silently. |
| **Get Member** | `GET /members/{user_id}` → the member's **email** (needed to match the GHL contact; not in the webhook or bookings response). |
| **Glofox: Get Bookings** | `GET /bookings?user_id={user_id}&attended=true&status=BOOKED` → read **`total_count`**. The `&status=BOOKED` filter excludes cancelled-but-attended bookings, so the count reflects only attended classes that weren't later cancelled (decided in #12). |
| **GHL: Update Total Attended Count** | `POST /contacts/upsert` writing the count to the "Total Classes Attended" custom field. GHL location + PIT come **from the cache** (`ghl_location` / `ghl_pit`), so this workflow pulls its GHL creds dynamically (unlike First Class, which hardcodes them). |

## 4. Key findings (verified empirically against the test sub-account)

- **The webhook payload is lean** — it carries `user_id`, `type`, and `payload.attended`, but **no count and no email**.
- **Attendance signal** = `type: BOOKING_UPDATED` + `payload.attended: true`. `payload.status` stays `BOOKED` — it never becomes "ATTENDED".
- **The bookings API paginates** — `limit` defaults to 50, caps at 100 per page, with `page` / `has_more` / `total_count`.
- **Use `total_count`, not row-counting** — `?attended=true&status=BOOKED` then read `total_count` gives the exact lifetime attended count in **one call, immune to pagination**. (Counting the returned rows would silently truncate at 50 — wrong for anyone with 50+ bookings.)
- **Exclude cancelled classes** — adding `&status=BOOKED` keeps the count to attended classes that weren't subsequently cancelled (a class can be marked attended and then cancelled). Decided in **#12**.
- **Email needs a lookup** — it only lives on the member record (`GET /members/{id}`), not on the webhook or the booking.
- **The attended flag is immediate** — marking a member attended updates the API straight away, even for a class in the future; no need to wait for class time. (Verified: count went 1 → 2 immediately after marking a new attendance.)

## 5. Current state

- Workflow in n8n: **Glofox → GHL Total Classes Attended** (id `yfMSLNQnB6Y4zf0X`), **active**.
- **Studio config is resolved from an n8n Data Table cache, not the Google Sheet** (2026-06-21, #19). Flow: `Webhook → Save Branch ID (filter) → Only Attended Events → Lookup Studio (cache) → Resolve Studio (by position) → Studio In Sheet? → Get Member → Glofox: Get Bookings → GHL update`. The webhook workflows used to read the sheet on every event, which hit Google's Sheets API limit (~60 read-requests/min/user) and failed with HTTP 429 at high volume (~79k events in 24h).
- **The cache is the `studio_config` Data Table** (columns: `branch_id` [key], `studio_name`, `api_key`, `api_token`, `ghl_location`, `ghl_pit`). The `Lookup Studio (cache)` node is a Data Table **"Get row"** matching `branch_id == Metadata.location_id`.
- **`Resolve Studio (by position)` now just renames columns** — it takes the single row returned by the cache lookup and maps the snake_case columns to the camelCase names downstream nodes use (`branchId` / `apiKey` / `apiToken` / `ghlLocation` / `ghlPit`). It no longer scans all rows or matches by position.
- **The sheet is kept human-editable and stays the source of truth.** A separate workflow **"Sync Studio Config → Data Table"** (n8n id `mKrkdoAQ85WCZiJF`; repo folder [`../sync-studio-config/`](../sync-studio-config/)) reads the sheet **once per run** and upserts into the table on a **15-min schedule**, plus an **instant refresh** via a secured webhook fired by an Apps Script `onChange` trigger on the sheet.
- **Glofox creds: ✅ tested green** — Get Member + Glofox: Get Bookings pull API key/token/branch from the cache.
- **GHL location + PIT: ✅ tested green** — sourced from the cache (`ghl_location` / `ghl_pit`). A real `BOOKING_UPDATED` + attended event resolved the studio creds from the cache and wrote the attendance count to the GHL custom field end-to-end on live data.
- **The old #13 duplicate-row problem is worked around, not fully fixed.** Branch `66cfc853…` had a duplicate sheet row holding `"tester"`/`"Done - DG"` where GHL Location/PIT belong, which 401'd the upsert. It was worked around by ordering the correct row first in the sheet; the cache sync **dedupes by Branch ID keeping the first row**, so the cache holds the correct creds. Cleaning the sheet (one row per branch) is still the proper fix — tracked in #13.
- The **"Unknown Studio / Bad Input" Stop & Error** guard was removed; unknown studios now halt silently.
- Error handling is wired: `errorWorkflow` → shared **Error Handler** (`AKbzN48d9DQwMioQ`) → Slack `#5c-n8n-errors`.

## 6. Open items

Tracked as GitHub issues under the [`glofox-attended-count`](https://github.com/SocialFitnessManchester/n8n-automations/labels/glofox-attended-count) label:

- **#9** — Wire real GHL config (location ID + custom field ID) and run end-to-end. ✅ **Done** — GHL location + PIT now resolve from the cache and the upsert writes the count to the custom field, verified on live data.
- **#10** — Verify `total_count` reports the true count at scale (1000s of bookings). ⚠️ Still open — the GHL write works, but the at-scale `total_count` verification is separate.
- **#11** — Register the webhook URL with Glofox support. ✅ **Done-ish** — now on the production webhook URL and tested green end-to-end.
- **#12** — Confirm the `attended=true` filter on a mixed attended/not-attended member
- **#13** — Clean the studio config sheet: one row per branch (remove duplicates like `66cfc853…`) so the correct GHL Location/PIT are authoritative. Currently worked around by row ordering + the cache sync's dedupe-by-Branch-ID; sheet cleanup remains the proper fix.

## 7. History

Originated as issue **#3** (filed under `glofox-first-class`). Once we decided it should be standalone, #3 was closed and the work moved here under its own `glofox-attended-count` label.
