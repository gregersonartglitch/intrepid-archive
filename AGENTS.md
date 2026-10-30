# AGENTS.md — rules for every coding agent in this repo

Read this before changing anything. It applies to every coding agent, whether a person is watching
or an orchestrator is running unattended.

Deeper context: [`AGENT-HANDOFF.md`](AGENT-HANDOFF.md) (repos, deploy, auth tiers),
[`docs/REGRESSION-LOCKS.md`](docs/REGRESSION-LOCKS.md) (ship protocol), and
[`docs/QA-SMOKE-CHECKLIST.md`](docs/QA-SMOKE-CHECKLIST.md).

## 1. What this is

The Intrepid Archive is a vanilla HTML/CSS/JS static site deployed on Netlify. The main surfaces are
the Hollowlands fog-of-war map, Legendist page-flip reader, and backer archive shell.

## 2. Hard rules for unattended runs

1. **One task, one branch.** Change only what the task asks. No drive-by refactors or reformatting.
2. **Never deploy, tag, or touch the base branch.** Work on your own branch and deliver a draft PR;
   a human ships.
3. **Don't touch the build stamp.** A human updates `INTREPID_BUILD` and cache-busters at ship time.
4. **Don't edit** deploy configuration or this file unless the task explicitly says to.
5. **No large binaries.** Don't add or re-export images, PDFs, audio, or model weights unless asked.
6. **Never write access codes, passwords, keys, or tokens** into code, docs, PR text, or logs.
7. **When in doubt, stop.** Ask when a task needs visual, lore, or product judgment.

## 3. Checks to run before you finish

Install the token/weight guard once per clone with `python3 scripts/check_commit.py --install`
(`python` also works on systems where it names Python 3).

```bash
node --check fog.js                    # after any fog.js edit
node scripts/smoke-journey-flow.js     # journey / gate / chime changes
```

Run `scripts/audit-checks.mjs` with a local server after changes to loading, gates, or the reader.
For visual changes, list exactly what a human should check in the browser.
