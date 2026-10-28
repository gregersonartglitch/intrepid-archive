# Agent pipeline

A daily loop that keeps working on this repo for 4–6 hours after a morning briefing, using one
paid model (Claude) plus free local models (Qwen, Gemma via Ollama / Hermes), with optional Kimi on
Ollama Cloud. When one model runs out of quota the next one in line takes the run.

Nothing here deploys. Agents open **draft PRs**; you review, browser-check and ship as usual.

## How a day goes

| When | Step | You |
|------|------|-----|
| 07:40 | `briefing` — reads the queue, open PRs, yesterday's log, recent commits and `.planning/todos/`, writes the briefing into a new **Agent log YYYY-MM-DD** issue and files up to 5 `agent:proposed` issues | Read it on your phone. Relabel the ones you want to `agent:ready` (add `priority:high` to jump the queue) |
| 09:00–15:00, every 90 min | `work` — takes the next `agent:ready` issue, branches from the base, runs a coding model, runs the checks (one fix attempt if they fail), enforces guardrails, opens a draft PR, has a *different* model review it (one revision round if asked) | Nothing, unless something is labeled `needs-human` |
| 15:30 | `wrapup` — summarizes the day into the log issue, suggests tomorrow's work, closes the log | Read tonight or tomorrow |

### Who does what

| Role | Order tried | Notes |
|------|-------------|-------|
| briefing | claude → qwen → gemma | Claude's judgment is worth it here; local models keep it running when Claude is out |
| code | kimi → claude → qwen-coder | Kimi is off until you enable it |
| codeSmall (`size:small`) | qwen-coder → kimi → claude | Local first: free, unlimited |
| review | claude → kimi → qwen | The author is always skipped, so a different model reviews |
| wrapup | gemma → qwen → claude | Summaries don't need a frontier model |

Edit `roles` in `config.json` to change any of this.

### Labels

`agent:proposed` → you relabel → `agent:ready` → `agent:working` → `agent:review` (draft PR open).
`needs-human` means it stopped for you: a question, failed checks, a guardrail hit or a reviewer's call.
`size:small` routes to the local model. `agent:log` is the daily log issue.

### Guardrails (enforced by code, not just by prompt)

- Coding models can only read/edit files and run `node` and read-only `git` commands; no push, deploy or network tools.
- Changes to protected paths (`agents/`, `AGENTS.md`, `netlify.toml`, `_redirects`, `.netlify/`, `netlify/`, `.github/`) or files over 2 MB are **not pushed**.
- One run at a time (lock file); work runs only inside `workWindow`.
- Shared rules for every model live in [`../AGENTS.md`](../AGENTS.md).

## Setup (Windows — the machine running Hermes / Ollama)

The dispatcher has to run on the machine with your local models and your logins. It needs to be on
and logged in during work hours.

1. **Install the tools** (skip what you have):
   - Node 20+ and Git
   - GitHub CLI: `winget install GitHub.cli`, then `gh auth login`
   - Claude Code CLI: `npm install -g @anthropic-ai/claude-code`, then run `claude` once and sign in with your Claude subscription
   - Ollama (Hermes uses it). Check `ollama list` shows your models.
2. **Give the local models enough context.** Claude Code's instructions are long, and Ollama's default
   window cuts them off. In *System → Environment variables*, add a user variable
   `OLLAMA_CONTEXT_LENGTH` = `32768` (or `65536` if your GPU has room), then quit and restart Ollama/Hermes.
3. **Make a separate clone for the agents.** The dispatcher switches branches and resets files, so
   never point it at the copy you work in:
   ```powershell
   git clone https://github.com/gregersonartglitch/intrepid-archive.git C:\agents\intrepid-archive
   cd C:\agents\intrepid-archive
   ```
4. **Configure:** `copy agents\config.example.json agents\config.json`, then edit:
   - `model` / `--model` values to match `ollama list` exactly (e.g. `qwen3.8:27b`, `gemma4:12b`)
   - `baseBranch` if you work somewhere other than `feature/cuneiform-buttons`
   - `workWindow`, and `notify.ntfyTopic` if you want phone pushes (install the free ntfy app and subscribe to a long random topic name)
5. **Create the labels and test each model:**
   ```powershell
   node agents\dispatch.mjs setup
   node agents\dispatch.mjs test claude
   node agents\dispatch.mjs test qwen
   node agents\dispatch.mjs test gemma
   node agents\dispatch.mjs test qwen-coder
   node agents\dispatch.mjs status
   ```
   If `qwen-coder` fails, your Ollama version may not support Claude Code yet. Update Ollama, or
   remove `qwen-coder` from the `code` roles and keep Qwen for reviews and briefings only.
6. **Dry run once:** `node agents\dispatch.mjs briefing --dry-run`. It runs the models and prints the
   briefing but writes nothing to GitHub. `work --dry-run` does real edits on a local branch but
   doesn't push or relabel.
7. **Schedule it:** `powershell -ExecutionPolicy Bypass -File agents\install-schedule.ps1`
   (flags for other times are at the top of the script; `-Remove` uninstalls). In *Power options*, stop
   the PC sleeping during work hours.

The dispatcher lives in the repo, so the base branch must contain `agents/`. Merge the PR that
added it before scheduling, or set `baseBranch` to that PR's branch for a trial.

### Mac or Linux instead

Steps 1–6 are the same (`brew install gh node`, `export OLLAMA_CONTEXT_LENGTH=32768` before starting
Ollama). For step 7, `crontab -e`:

```cron
40 7 * * 1-5   cd ~/agents/intrepid-archive && node agents/dispatch.mjs briefing
0 9-14 * * 1-5 cd ~/agents/intrepid-archive && node agents/dispatch.mjs work
30 15 * * 1-5  cd ~/agents/intrepid-archive && node agents/dispatch.mjs wrapup
```

## Turning on Kimi (optional, Ollama Cloud)

1. `ollama signin`, then pull the cloud model: `ollama pull kimi-k2.6:cloud` (check the current tag on
   ollama.com; the free tier has small limits, Ollama Pro is $20/mo).
2. In `config.json`, set `"enabled": true` on `kimi` and make its `--model` match `ollama list`.
3. `node agents\dispatch.mjs test kimi`.

## Adding a human collaborator

1. GitHub → repo **Settings → Collaborators → Add people**, role **Write**.
2. **Settings → Branches → Add rule** for the base branch: require a PR and 1 approval. Agent and
   human work then both go through PRs.
3. They use the same labels: file issues, approve with `agent:ready`, review the agents' draft PRs.
   The agents run on your accounts; they don't need Claude or Ollama.
4. Only add them to Netlify if they should be able to deploy.

## Troubleshooting

- **Logs:** `agents\.state\run-YYYY-MM-DD.log`. **Cooldowns:** `agents\.state\cooldowns.json` (delete to clear).
- **"Working tree has uncommitted changes":** someone edited the agent clone. `git status` there, then `git reset --hard` if nothing's worth keeping.
- **A run seems stuck:** each model has `timeoutMinutes`; a stale lock clears itself after 3 hours, or delete `agents\.state\lock.json`.
- **An issue keeps failing:** split it into smaller issues, or label it `size:small` / remove `agent:ready` and do it by hand.
