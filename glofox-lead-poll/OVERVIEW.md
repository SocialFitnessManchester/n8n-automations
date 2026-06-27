# glofox-lead-poll — technical overview

Ongoing 6-hourly poll that pushes **new** Glofox leads into GHL across **all GHL-ready studios**. Built as two workflows (a conductor + a per-studio worker) to avoid n8n's loop-with-fan-out pitfalls.

- **Main / conductor:** `Glofox Lead Poll (all studios, every 6h)` — n8n id `P5xUqBY9rRaEJ7XK`
- **Sub / worker:** `Glofox Lead Poll — single studio (sub)` — n8n id `btcLAW4tzEymNG9s`

Both **inactive** by default. Activate the **main** to go live.

## Why polling

Glofox has **no lead-creation webhook** (confirmed by Glofox support; only `membership_created`/`membership_updated` fire, which are purchases). So leads are pulled from the members API on a timer. See also [`../glofox-lead-sync/`](../glofox-lead-sync/) for the one-off back-fill.

## Main (conductor)

```
Every 6 Hours (schedule)
  → Get Studios        (dataTable: studio_config, all rows)
  → Only GHL-ready     (filter: ghl_pit && api_key && branch_id all non-empty)
  → Poll Each Studio   (Execute Sub-workflow, "run once for each item" → the sub)
```

The Execute-once-per-item is the loop — it runs the sub for each studio sequentially, then the schedule waits for the next trigger.

## Sub (one studio)

Receives a studio row (`branch_id`, `api_key`, `api_token`, `ghl_location`, `ghl_pit`, `studio_name`) from the conductor.

```
Studio In (Execute Workflow Trigger)
  ├─→ Get Marker   (dataTable: lead_poll_state, row where branch_id = this studio)
  └─→ Get Leads    (HTTP GET /2.0/members?lead_status=LEAD&limit=100, headers from the studio creds)
        ├─→ Find New Leads (Code)  → GHL: Upsert Contact
        └─→ Update Marker
```

- **Find New Leads** — `marker = lead_poll_state value, or now() if the studio has no marker yet`; keeps leads with `created > marker`; emits one item per new lead. (Defaulting a missing marker to *now* means a brand-new studio sends nothing old — back-fill is `glofox-lead-sync`'s job.)
- **GHL: Upsert Contact** — `POST contacts/upsert`, `Authorization: Bearer <ghl_pit>` + `Version: 2021-07-28` (PIT from the studio input, not a stored credential), body sets `type: "lead"`, `source: "Glofox lead poll"`, `tags: ["new-lead"]`, `locationId` from the studio. Throttled (`batchSize 8 / 2000ms`, ~4/sec) for GHL's ~100/10s limit; `onError: continueRegularOutput`.
- **Update Marker** — dataTable **upsert** on `lead_poll_state` (creates the row if missing), `last_seen_created = newest lead's created` (or `now()` if the studio has no leads). Sourced from the Get Leads node (the resourceMapper-from-Code-node null quirk only bites when the value comes from a Code node — here it's from the HTTP node, which works).

## Data tables

- **`studio_config`** (`Ba4cRH8IzwZG9WqJ`) — per-studio creds (`branch_id`, `api_key`, `api_token`, `ghl_location`, `ghl_pit`). Kept fresh from the studio sheet by [`../sync-studio-config/`](../sync-studio-config/). **This is the source of all credentials — none are hardcoded in the workflows.**
- **`lead_poll_state`** (`ACJBM7zGZMspXFqw`) — per-studio `last_seen_created` marker (`branch_id`, `last_seen_created`).

## Notes / dependencies

- A studio is only polled once its **GHL Location + PIT** are in `studio_config` (i.e. in the studio sheet — pending the sheet cleanup for most studios).
- The workflows reference each other and the data tables **by n8n id** — re-importing into a *fresh* n8n would need those ids re-linked (standard n8n-export caveat).
- Tested 2026-06-27 on Abhi Test: conductor→sub ran, dynamic creds worked, 5 new leads upserted to GHL (type `lead`), marker advanced correctly.
