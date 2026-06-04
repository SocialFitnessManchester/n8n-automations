# n8n-nodes-glofox

Custom n8n community node for Glofox (Social Fitness). Port of the private Zapier app to n8n, with one major upgrade: the **Studio dropdown is sheet-backed**, so adding a new gym = adding a row in the studio-config sheet, not creating yet another n8n credential.

Source lives under [`glofox-n8n-app/`](.) within the parent [n8n-automations](../) repo. Published to npm as **[`n8n-nodes-glofox`](https://www.npmjs.com/package/n8n-nodes-glofox)**.

## What it does

A single **Glofox: New Lead or Purchase** node exposing two resources, each with a `Create` operation:

| Resource | Operation | What it does |
|---|---|---|
| **Lead** | Create | Creates a new lead (contact) in the selected studio's Glofox branch. Calls `POST /2.1/branches/{branchId}/leads`. |
| **Purchase** | Create | Looks up an existing contact by email, then assigns a membership plan. Calls `GET /2.0/members?email=...` then `POST /2.2/branches/{branchId}/users/{userId}/memberships/{membershipId}/plans/{planCode}/purchase`. |

Three dynamic dropdowns make it human-proof:

1. **Studio** — populated from your studio config Google Sheet
2. **Membership Name** (Purchase only) — populated live from Glofox via `GET /2.0/memberships` for the selected studio
3. **Plan Name** (Purchase only) — depends on the selected Membership; filtered from the same memberships response

## Why sheet-backed

The Zapier version uses one connected account per gym, with Branch ID / API Key / API Token entered manually each time. With dozens of studios this gets unwieldy. In this n8n version:

- One credential per **n8n instance** (not per gym), pointing at the studio config sheet via a Google Service Account
- The node looks up the selected studio's Branch ID / API Key / API Token from the sheet at execution time
- Adding a new gym = adding a row in the sheet, full stop

## Installation (self-hosted n8n)

The recommended path is via n8n's built-in Community Nodes UI:

1. In n8n: **Settings → Community Nodes → Install a community node**
2. Package name: `n8n-nodes-glofox`
3. Tick "I understand the risks" and click **Install**

After install, the node appears in the picker as **Glofox: New Lead or Purchase** — no restart required.

### Alternative: manual install inside the container

If your n8n setup doesn't expose the Community Nodes UI, install directly inside the container:

```bash
docker exec -u node -w /home/node/.n8n/custom n8n npm install n8n-nodes-glofox
docker restart n8n
```

## Setting up the credential

After installation:

1. **Create a Google Service Account** (or reuse the one already shared with your studio config sheet) — make sure it has at least Viewer access on the sheet.
2. In n8n: **Credentials → New → Glofox (Sheet-backed)**.
3. Fill in:
   - **Studio Config Sheet ID** — long string between `/d/` and `/edit` in the sheet's URL
   - **Sheet Tab Name** — usually `Sheet1`
   - **Service Account Email** — `…@…iam.gserviceaccount.com`
   - **Service Account Private Key** — the PEM block including `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----`. Literal `\n` escape sequences are fine; the node converts them.
4. Save.

## Sheet structure

The first row of the configured sheet/tab must be a header row. The node looks for these columns by name (case-insensitive prefix match, so trailing parenthetical notes are fine):

| Studio Name | Branch ID | API Key | API Token |
|---|---|---|---|

Extra columns are ignored. Rows missing any of those four values are skipped.

## Local development

```bash
# from the parent repo
cd glofox-n8n-app

# Install dependencies
npm install

# Build TypeScript + copy icon assets
npm run build

# Or watch for changes during development
npm run dev
```

To test against a local n8n, build the package, then `npm link` it from your n8n custom-nodes directory. See [n8n's docs on developing community nodes](https://docs.n8n.io/integrations/creating-nodes/build/) for details.

## Publishing a new version

After making code changes:

```bash
cd glofox-n8n-app
npm version patch     # or minor, or major
npm publish
```

Then on your n8n droplet, update to the new version:

```bash
docker exec -u node -w /home/node/.n8n/custom n8n npm install n8n-nodes-glofox@latest
docker restart n8n
```

## Reference

- **Glofox API base:** `https://gf-api.aws.glofox.com/prod`
- **Glofox API docs:** <https://apidocs-plat.aws.glofox.com/flows/lead-sale/>
- **Zapier source this is ported from:** [SocialFitnessManchester/glofox-zapier-app](https://github.com/SocialFitnessManchester/glofox-zapier-app) (private)
