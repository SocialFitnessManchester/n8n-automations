# Error Handler — Slack Alerts (shared)

> ▶️ **Open in n8n:** [⚠️ Error Handler — Slack Alerts](https://automation.social-fitness.com/workflow/AKbzN48d9DQwMioQ)

Shared workflow that **every** automation routes its failures to. When any workflow fails, this posts a single alert to Slack **#5c-n8n-errors** with the affected **studio**, the workflow, the failed step, the error message, and a link to the execution.

## How it works

```
Error Trigger → Get Failed Execution (n8n API) → Extract Branch ID → Lookup Studio (sheet) → One Alert Only → Slack
```

1. n8n fires this workflow whenever another workflow errors (it gets the workflow name, failed node, error, and execution id).
2. It fetches the failed execution via the n8n API to recover the original webhook payload.
3. It pulls the **Branch ID** (`metadata.location_id`) out of that payload and looks up the **studio name** in the config sheet.
4. It posts one Slack alert. Fallbacks: "not identified (failed before studio lookup)" if there's no Branch ID, or "unknown branch <id>" if the sheet has no match.

## Wiring & operational notes

- Every automation has **Settings → Error Workflow** set to this workflow.
- ⚠️ **This workflow must stay ACTIVE** — n8n only runs error workflows that are active.
- Alerts post via the **"AI Account Director"** Slack app, which must remain a **member of #5c-n8n-errors** (else posts fail with `not_in_channel`).

## Credentials used (references only — no secrets in the export)

- **Slack** ("Slack account")
- **Google service account** (reads the studio config sheet)
- **n8n API key** ("n8n API (self)") — an n8n public API key stored as an `httpHeaderAuth` credential (`X-N8N-API-KEY`), used to read the failed execution.

## To replicate

- Create an n8n API key (Settings → n8n API) and store it as an `httpHeaderAuth` credential named `X-N8N-API-KEY`.
- The studio lookup keys on the sheet's **Branch ID** and **Studio Name (MUST MATCH GROW EXACT)** columns.
