# glofox-lead-sync

A **manual, on-demand** n8n workflow that bulk-imports **all of a studio's Glofox contacts** (leads *and* members) into Go High Level with the correct **Contact Type** — run **once per studio** when onboarding it to GHL.

It's the one-off "initial sync" companion to the ongoing new-lead poll: this back-fills everyone who already exists in Glofox; the poll then keeps GHL topped up with new leads going forward.

## How to run it

1. Open the workflow in n8n: **[Glofox Initial Lead Sync (pick studio)](https://automation.social-fitness.com/workflow/dHOF8Xnwl3oip8vj)**.
2. Click the **Pick Studio** node → choose the studio from the **dropdown** (the list is pulled live from the studio-config sheet by the custom Glofox node).
3. Click **Execute workflow**.

That's it. Pick a studio, hit go.

## What it does

- Pulls **every member record** for that studio from Glofox (paged, 100 at a time).
- Maps the Glofox status to a GHL **Contact Type**:
  - `LEAD`, `COLD` → **Lead**
  - `MEMBER`, `TRIAL` → **Customer**
- **Upserts** each contact into the studio's GHL sub-account (matched on email, so re-running never creates duplicates).
- Posts a **Slack summary** to `#5c-n8n-errors` (totals by status and by GHL type).

## Good to know

- **Idempotent** — safe to re-run; existing contacts are updated, not duplicated.
- **Throttled** — GHL rate-limits at ~100 requests / 10s, so upserts are batched (≈4/sec). A full studio of ~950 contacts takes a few minutes.
- **Contactless records skip** — a contact with no email *and* no phone can't be created in GHL; those are skipped automatically (the run continues).
- **Per-studio credentials come from the sheet** — Glofox API key/token/branch **and** the GHL Location + PIT are read from the studio-config sheet via the custom Glofox node. The studio's **GHL Location/PIT must be filled into the sheet** (columns 5 & 6) before syncing it.

See [`OVERVIEW.md`](./OVERVIEW.md) for the technical detail.
