# Onboarding: Working on this repo with Claude Code

This guide takes a teammate from "I have VS Code with Claude Code installed" to "I can build and modify n8n workflows on this repo, the same way Abhi has been doing." Allow about 30 minutes.

This guide is repo-wide (cloning, git identity, n8n-mcp install, sample prompts). For project-specific context, see the README and `OVERVIEW.md` in each subfolder — e.g. [glofox-first-class/](./glofox-first-class/) for the booking-event automation, or [glofox-n8n-app/](./glofox-n8n-app/) for the custom n8n community node.

The approach throughout: rather than running commands yourself, you ask Claude Code to do them for you using natural language. Sample prompts are in `> blockquotes` below — copy-paste them straight into the Claude Code chat.

---

## Before you start

You should already have:

- **VS Code** installed
- **Claude Code** extension installed and signed in (chat sidebar visible)
- Login for the shared **SocialFitnessManchester** GitHub account
- Login for the shared **n8n** instance: [`https://automation.social-fitness.com`](https://automation.social-fitness.com)

If anything's missing, ask Abhi.

---

## Step 1 — Clone the repo

Open Claude Code in VS Code and paste:

> Please clone the SocialFitnessManchester/n8n-automations GitHub repo to `~/projects/automations`. If `gh` (the GitHub CLI) isn't installed or authenticated, walk me through that first. Once the repo is cloned, read the root `README.md` and give me a 5-bullet summary of what this repo is about.

Claude Code will:

- Check if you have the `gh` CLI installed; install it if not
- Walk you through `gh auth login` (you'll authenticate with the shared GitHub account)
- Clone the repo to `~/projects/automations`
- Read the root `README.md` and summarize so you have context

---

## Step 2 — Set up your git identity

By convention, commits on Social Fitness repos go as `Social Fitness Automations <noreply@social-fitness.com>` rather than your personal name. This is a one-time setup. Paste:

> Set up my git identity so any commits to repos under github.com/SocialFitnessManchester/ go as "Social Fitness Automations" with the email "noreply@social-fitness.com". Use a `~/.gitconfig` `includeIf` rule so it applies automatically based on the remote URL — don't set a global default for other repos.

Claude Code creates `~/.gitconfig-social-fitness` with the identity and adds a matching `includeIf` rule to `~/.gitconfig`. Verify it worked:

> Verify that my git identity in `~/projects/automations` shows "Social Fitness Automations" and confirm the rule won't apply to non-SocialFitnessManchester repos.

---

## Step 3 — Connect Claude Code to the n8n instance

This is the most important step. The `n8n-mcp` server is what lets Claude Code read and write workflows directly in n8n. Without it, Claude Code can write code about n8n but can't actually *do* anything inside the instance.

### 3a. Get your own n8n API key

Each person should have their own API key (for audit trail and so it can be revoked independently).

1. Open [`https://automation.social-fitness.com`](https://automation.social-fitness.com) and sign in with the shared n8n account
2. Click your user icon (bottom-left) → **Settings**
3. **API** tab → **Create an API Key**
4. Name it `claude-code-<your-name>` (e.g. `claude-code-mike`)
5. Copy the key — it's a long string starting with `eyJ...`. **You only see it once.** Stash it in your password manager.

### 3b. Tell Claude Code to add the MCP

Paste into Claude Code, replacing `<YOUR_KEY>`:

> Please add the `n8n-mcp` server to my Claude Code config so I can manage workflows on `https://automation.social-fitness.com`. The API key is: `<YOUR_KEY>`. Use the management-mode setup with stdio.

Claude Code will run a `claude mcp add` command with the right environment variables.

### 3c. Restart Claude Code

**Important:** the new MCP server won't be available until you fully restart Claude Code. Either:

- Close the VS Code window entirely and reopen it, OR
- Restart the Claude Code extension (Command Palette → "Developer: Reload Window")

### 3d. Verify it works

Once reloaded, paste:

> Check the connection to n8n and list the workflows that exist.

You should see "Glofox First Class Test" plus a couple of other test workflows. If the connection fails, share the error with Claude Code and it'll help debug.

---

## Step 4 — Try it out

You're ready. Here are prompts to get going, ranging from gentle to substantive:

### Just exploring

> Read the root `README.md` then dig into the README and `OVERVIEW.md` inside `glofox-first-class/`. Tell me which parts of that automation currently work end-to-end and which are still pending.

> Pull the structure of the "Glofox First Class Test" workflow in n8n and explain it to me in plain language.

### Reading recent activity

> Pull the last 10 executions of "Glofox First Class Test" from n8n. Which ones succeeded and which failed?

### Making a small change

> In "Glofox First Class Test", the GHL: Tag first-class-booked node currently includes the member's phone. Add their `lead_status` from the Glofox member endpoint as a custom field on the GHL upsert too. Validate the workflow when done.

### Adding a new studio (the most common task)

> I need to add a new studio to the Glofox first-class automation. The studio is "Bridge Studio", with Glofox Branch ID `abc123def456` and GHL Location ID `XyzLocId001`. Walk me through what I need to do, including the Google Sheet row, the PIT credential, and the new workflow file in this repo.

### Debugging a failure

> The most recent failed execution of "Glofox First Class Test" — what went wrong? Pull the execution data, identify the failing node, and propose a fix.

---

## Tips and gotchas

- **Never commit credentials.** API keys, PITs, OAuth tokens live in n8n's Credentials UI or environment variables — not in the workflow JSON in this repo. The committed files reference credentials by ID, not by value.
- **The studio config Google Sheet has real Glofox API keys.** Treat its sharing settings carefully.
- **Glofox needs to manually register every webhook URL.** Adding a new studio = a Glofox support ticket. Plan ahead.
- **Pin test data on the webhook node** while developing — paste an example payload so you can run the workflow with **Execute Workflow** without needing a real Glofox booking each time. Ask Claude Code: *"Give me a JSON payload to pin on the Glofox Webhook node for a typical BOOKING_CREATED event."*
- **Refresh n8n in the browser after Claude Code makes changes.** Claude Code edits via API; the browser UI doesn't auto-update. Press F5 to see latest state.
- **Execute Workflow, not Execute Step.** Single-step execution often shows cached output rather than re-running. Full-workflow execution is the reliable way to test changes.
- **If Claude Code seems to have stale info,** prompt it to re-fetch: *"Re-fetch the current state of workflow <name> from n8n before making any changes."*
- **When in doubt, ask Claude Code to explain.** It has access to the n8n node schemas and can describe what any node does, what fields a given API expects, and so on.

---

## When you get stuck

- **Glofox API questions:** the user-facing docs are at `developer.glofox.com`; for things their docs don't cover, Glofox support (the same channel for webhook registration) is responsive
- **GHL API questions:** [`highlevel.stoplight.io`](https://highlevel.stoplight.io) is the v2 API reference
- **n8n questions:** [`docs.n8n.io`](https://docs.n8n.io), or just ask Claude Code — it has the full n8n node catalog via the MCP
- **Anything else:** ping Abhi or commit a `[WIP]` branch with what you've tried, and we'll pair on it

---

## Reference: what the MCP setup command actually does

For transparency, when Claude Code "adds the MCP server in step 3b," what's actually running is something like:

```bash
claude mcp add n8n-mcp \
  -e MCP_MODE=stdio \
  -e LOG_LEVEL=error \
  -e DISABLE_CONSOLE_OUTPUT=true \
  -e N8N_API_URL=https://automation.social-fitness.com \
  -e N8N_API_KEY=<your-key> \
  -- npx n8n-mcp
```

This registers a per-machine config that tells Claude Code: "when you launch, also start the n8n-mcp tool (downloaded on-demand via npx) with these credentials." The key sits in Claude Code's local config — it's not in this git repo.

If you ever need to remove or rotate: `claude mcp remove n8n-mcp` then re-add with the new key.
