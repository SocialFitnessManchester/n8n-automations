# Sync Studio Config → Data Table

Keeps an n8n **Data Table** (`studio_config`) in sync with the studio-config Google Sheet, so the per-studio webhook workflows can resolve studio credentials/config from the Data Table instead of reading the Google Sheet on every event.

**Why:** reading the sheet on every inbound webhook hit Google's *60 reads/min/user* Sheets quota and caused `429` errors at volume (see issue **#19**). This workflow reads the sheet **once per run** and caches it; the webhook workflows then do an internal Data Table lookup (no external quota).

## Triggers
- **Schedule** — every 15 minutes (safety-net refresh).
- **Webhook** (`POST /webhook/refresh-studio-config`) — instant refresh, called by the Studio Config sheet's Apps Script `onChange` trigger when a studio is added/edited. Protected by an `x-refresh-secret` header (Header Auth credential "Studio Config Refresh Secret").

## Flow
`Schedule / Webhook → Read Studio Sheet (1 read) → Map Rows by Position → Upsert into studio_config`

- **Map Rows by Position** reads columns by position (future-proof vs header renames): `0 Studio | 1 Branch ID | 2 API Key | 3 API Token | 4 GHL Location | 5 GHL PIT`, and **dedupes by Branch ID keeping the first occurrence** (matches the live "first match wins" lookup + the duplicate-row sheet workaround).
- **Upsert** keys on `branch_id`.

## Data Table: `studio_config`
Columns: `branch_id` (key), `studio_name`, `api_key`, `api_token`, `ghl_location`, `ghl_pit`.

## Consumed by
The webhook workflows look up `branch_id == metadata.location_id` via a **Data table → Get row** node ("Lookup Studio (cache)"). Converted so far: **Attended Count**, **First Class**. Remaining rollout tracked in #19.

## Notes / future
- Config is up to ~15 min stale on the schedule path; the instant webhook closes that gap when the sheet changes.
- Studios **removed** from the sheet are not yet pruned from the table (rare; future enhancement).
