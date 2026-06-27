# glofox-lead-poll

The **ongoing, automatic** side of Glofox→GHL lead capture: every **6 hours** it checks **each studio** for **new leads** and pushes them into Go High Level with Contact Type `lead`.

It's the companion to [`glofox-lead-sync/`](../glofox-lead-sync/):
- **`glofox-lead-sync`** = the **one-off back-fill** — manually import a studio's *existing* contacts when you onboard it.
- **`glofox-lead-poll`** (this) = the **ongoing top-up** — automatically catch *new* leads from then on.

Together they replace the dead-end webhook approach (Glofox has no new-lead webhook — see [`glofox-new-lead/`](../glofox-new-lead/), now superseded).

## How it works (two workflows)

It's built in two parts on purpose (so the per-studio fan-out doesn't tangle the loop):

1. **`glofox-lead-poll-main`** — the **conductor**. Every 6 hours: read the studio list → keep the GHL-ready ones → run the worker once per studio, in turn.
2. **`glofox-lead-poll-single-studio-sub`** — the **worker** (run once per studio by the conductor). For that studio: look up where it left off (its marker) → pull its new leads from Glofox → upsert them into its GHL → save the new marker.

Every studio's credentials (Glofox keys + GHL Location/PIT) come from the **`studio_config`** data table — **nothing is hardcoded**, so this is safe in version control.

## Good to know

- **No double-processing** — each studio remembers where it got to (a "last seen" marker in the `lead_poll_state` table), so it only ever sends genuinely new leads.
- **New studios self-initialise** — the first time the poll sees a studio with no marker, it sets one and sends nothing old (back-filling existing leads is `glofox-lead-sync`'s job).
- **GHL-ready studios only** — a studio is polled only once its **GHL Location + PIT are in the studio sheet** (others are skipped until the sheet's filled in).
- **Currently inactive** — it's off the 6-hour timer until you switch it on. Activate the **main** workflow to go live.

See [`OVERVIEW.md`](./OVERVIEW.md) for the technical detail.
