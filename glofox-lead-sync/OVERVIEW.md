# glofox-lead-sync — technical overview

**Workflow:** `Glofox Initial Lead Sync (pick studio)` — n8n id `dHOF8Xnwl3oip8vj` (manual trigger, inactive by design — it's a run-on-demand tool).

## Why polling (no lead webhook)

Glofox has **no webhook for lead creation** (confirmed by Glofox support 2026-06). Only `membership_created` / `membership_updated` fire, and those are purchases — further down the funnel than a lead. So leads/members are **pulled** from the members API instead.

## Flow

```
Run Sync (manual)
  → Pick Studio            (custom Glofox node: Studio → Get Config)
  → Get All Leads (paged)  (HTTP, GET /2.0/members, all statuses, 100/page)
  → Flatten Leads          (Code: map fields + derive ghl_type)
  → GHL: Upsert Contact    (HTTP POST contacts/upsert, throttled)
Get All Leads also →
  → Sync Summary (Code)    → Slack: Sync Done   (#5c-n8n-errors)
```

## Nodes / endpoints

- **Pick Studio** — `n8n-nodes-glofox.glofox`, resource **Studio**, operation **Get Config** (added in node v0.2.0). Outputs the selected studio's `branch_id`, `api_key`, `api_token`, `ghl_location`, `ghl_pit` — read live from the studio-config sheet. Needs the **`glofoxApi`** (Glofox sheet-backed) credential.
- **Get All Leads (paged)** — `GET https://gf-api.aws.glofox.com/prod/2.0/members?limit=100` with Glofox headers (`x-api-key`, `x-glofox-api-token`, `x-glofox-branch-id`) sourced from Pick Studio. Built-in pagination: increment `page` each request, stop when `has_more === false`. Max page size is **100**. Default sort is `created` DESC.
- **Flatten Leads** — flattens all pages into one item per contact; sets `ghl_type = (MEMBER|TRIAL) ? 'customer' : 'lead'`.
- **GHL: Upsert Contact** — `POST https://services.leadconnectorhq.com/contacts/upsert`, `Authorization: Bearer <ghl_pit>` + `Version: 2021-07-28` (PIT from Pick Studio, not a stored credential). Body: `locationId` (from Pick Studio), `email`, `firstName`, `lastName`, `phone`, **`type`** (lead/customer), `source: "Glofox initial sync"`, `tags: ["glofox-initial-sync"]`. **Batching** `{batchSize: 8, batchInterval: 2000}` (~4/sec) to stay under GHL's ~100/10s rate limit. `onError: continueRegularOutput` so a bad record doesn't halt the run.
- **Sync Summary / Slack** — counts by status and by GHL type; posts to `#5c-n8n-errors`.

## Status → GHL Contact Type mapping

| Glofox `lead_status` | GHL `type` |
|---|---|
| `LEAD`, `COLD` | `lead` |
| `MEMBER`, `TRIAL` | `customer` |

## Dependencies / prerequisites

- **Custom node `n8n-nodes-glofox` ≥ 0.2.0** ([`../glofox-n8n-app/`](../glofox-n8n-app/)) installed on the n8n instance, for the **Studio → Get Config** operation.
- **`glofoxApi` credential** configured (service account with Viewer access to the studio-config sheet; sheet id `10JeveuIeXNGsGyDQD5dvFLKzOoOzIN8ffRwszGuu2XA`, tab `Sheet1`).
- The studio's **GHL Location (col 5) and GHL PIT (col 6)** filled into the studio-config sheet (read by position). Most rows still need this — see the studio-sheet cleanup task.

## Companion (not in this folder yet)

The **ongoing new-lead poll** (n8n `cT78tr3vNdRCWPxG`) runs on a 6-hour timer: reads a per-studio "last seen" marker (data table `lead_poll_state`), pulls `?lead_status=LEAD` since the marker, upserts new leads to GHL as `lead`, and advances the marker. It's **built and proven on Abhi Test but not yet committed** — it currently has hard-coded test credentials and needs refactoring to use the **Pick Studio** node (like this workflow) before it's repo-safe and multi-studio.
