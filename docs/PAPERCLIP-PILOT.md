# Paperclip pilot — HP Omen (Windows 11, RTX 5090)

Goal: find out in one project (Intrepid Archive) whether [Paperclip](https://github.com/paperclipai/paperclip)
can run a morning-approved day of agent work on your own subscriptions and local models, with little
babysitting. If it passes the checks at the bottom, it becomes the orchestrator for every project.
If it fails, we know exactly where, before building anything ourselves.

**Shape of the setup**

| Piece | Where it runs |
|-------|---------------|
| Ollama + your local models (Qwen 3.8 27B, Gemma 4 12B) | Windows, on the 5090 — as today |
| Paperclip, Claude Code, Codex, git, gh | **WSL2 Ubuntu** on the same PC |
| Code and draft PRs | GitHub, as today |
| Phone access | Tailscale (free) — phase 2 |

Why WSL rather than native Windows: Paperclip doesn't document Windows support, and its agent CLIs,
Python and git all behave best on Linux. WSL is a real Linux on the same machine, and it can still
reach Ollama on Windows.

> Steps inside Paperclip's own screens are described by feature, not click-by-click: their docs site
> (docs.paperclip.ing) couldn't be read when this was written. Use it for exact menus.

Budget about an hour for Part A, an hour for Part B, then let it run a day for Part C.

---

## Part 0 — check what's already there (read-only)

Nothing below changes the PC. Paste it into a normal PowerShell window and keep the output: it decides
whether to use WSL (Part A) or an existing Docker setup, and which steps you can skip.

```powershell
"--- Windows / GPU";  [System.Environment]::OSVersion.VersionString; nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
"--- WSL";            wsl --status; wsl -l -v
"--- Docker";         docker --version; docker info --format "{{.ServerVersion}} {{.OperatingSystem}}" 2>$null
"--- Ollama";         ollama --version; ollama list; try { (Invoke-RestMethod http://localhost:11434/api/tags).models.name } catch { "Ollama API not reachable" }
"--- Ollama vars";    foreach ($v in "OLLAMA_CONTEXT_LENGTH","OLLAMA_HOST","OLLAMA_MAX_LOADED_MODELS") { "$v=" + [Environment]::GetEnvironmentVariable($v, "User") }
"--- Hermes";         Get-Command hermes -ErrorAction SilentlyContinue | Select-Object Source; Get-ChildItem "$env:LOCALAPPDATA\Programs","$env:ProgramFiles" -Directory -Filter "*ermes*" -ErrorAction SilentlyContinue | Select-Object FullName
"--- Dev tools";      foreach ($c in "node","git","gh","python","claude","codex","tailscale") { $p = Get-Command $c -ErrorAction SilentlyContinue; "{0,-10} {1}" -f $c, ($(if ($p) { $p.Source } else { "not found" })) }
```

What the answers mean:

| Finding | Then |
|---------|------|
| WSL lists an Ubuntu distro, version 2 | Skip A1; still do A2 |
| Docker Desktop is installed and running | You *could* use Paperclip's Docker image instead of A4–A7; WSL is still the simpler pilot |
| Ollama lists your models and the API answers | A3 is only the context variables |
| Hermes is found as a CLI (`hermes`) | Try Paperclip's Hermes adapter for the Local agent |
| Hermes is only a desktop app | Use the OpenCode → Ollama route for the Local agent |

---

## Part A — install (once)

### A1. WSL2 Ubuntu

PowerShell **as Administrator**:

```powershell
wsl --install -d Ubuntu
```

Reboot when asked, open **Ubuntu** from the Start menu and create a Linux username and password.

### A2. Let WSL share the PC's network

So Paperclip in WSL can reach Ollama on Windows (and later your phone can reach Paperclip). In Windows,
create or edit `C:\Users\<you>\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Then in PowerShell: `wsl --shutdown`, and reopen Ubuntu.

### A3. Give the local models room

Agent harnesses send long instructions, and Ollama's default context window cuts them off. How much
context fits in the 5090's 32 GB depends on the exact model, its quantization and the cache settings,
so **measure before going big**. In Windows **Settings → System → About → Advanced system settings →
Environment Variables**, add user variables:

| Variable | Value | Why |
|----------|-------|-----|
| `OLLAMA_CONTEXT_LENGTH` | `32768` to start | Enough for agent instructions; raise only after the test below |
| `OLLAMA_MAX_LOADED_MODELS` | `1` | Keeps Qwen and Gemma from fighting over VRAM |

Quit Ollama/Hermes from the tray and start it again. **Measure:** run `ollama run qwen3.8:27b "hi"`, then
`ollama ps` in another window. The `PROCESSOR` column must say **100% GPU**. If it shows any CPU share,
lower the context; if it's 100% GPU with room to spare in `nvidia-smi`, you can try `65536`, optionally
with `OLLAMA_FLASH_ATTENTION=1` and `OLLAMA_KV_CACHE_TYPE=q8_0` (roughly halves the context's memory),
and measure again.

Then check from **Ubuntu**:

```bash
curl -s localhost:11434/api/tags | head -c 300   # should list your models
```

If that fails, Ollama isn't listening beyond Windows: also set `OLLAMA_HOST` = `0.0.0.0`, restart it, retry.

### A4. Tools inside Ubuntu

```bash
sudo apt update && sudo apt install -y git python3 python3-venv tmux gh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24 && corepack enable
node -v   # needs 24.11 or newer
```

### A5. Sign in the agents on your subscriptions

```bash
npm install -g @anthropic-ai/claude-code @openai/codex
claude          # choose your Claude subscription login, then /exit
codex login     # sign in with ChatGPT
gh auth login   # GitHub, HTTPS, log in with browser
```

If a browser doesn't open from WSL, copy the URL it prints into Windows.

### A6. The project in WSL's own disk

Keep repos on the Linux side (`~/`), not under `/mnt/c` — that's many times slower for agents.

```bash
mkdir -p ~/projects && cd ~/projects
git clone https://github.com/gregersonartglitch/intrepid-archive.git
```

This is the agents' copy. Keep working in your usual Windows copy as before.

### A7. Install Paperclip (trusted local mode first)

```bash
tmux new -s paperclip          # keeps it running after you close the window (Ctrl-b d to detach)
npx paperclipai@latest onboard --yes
```

Open **http://localhost:3100** in your Windows browser. Note the command onboarding tells you to use to
start Paperclip again later — that's what you'll turn into a service if the pilot passes.

In **Windows Settings → System → Power**, stop the PC sleeping during work hours.

---

## Part B — set up one project

Keep the org small. Paperclip can model a whole company with a CEO that hires agents; you don't want
that. One project, one lead, two workers, and **you** approve anything structural.

1. **Company / workspace:** one, e.g. "Gregerson Studio". Turn on board approval for hiring agents so
   nothing new appears without you.
2. **Project:** "Intrepid Archive", workspace `~/projects/intrepid-archive`. Goal: one or two sentences
   on what this phase is for (e.g. "Ship the Vol. 2 reader polish and map label fixes").
3. **Agents:**

   | Agent | Runtime | Job |
   |-------|---------|-----|
   | Lead | Claude Code (subscription) | Morning plan, breaking work into tasks, final review |
   | Builder | Codex (ChatGPT subscription) | Most coding tasks |
   | Local | Hermes adapter → Qwen 3.8 27B | Small fixes, running checks, summaries |

   For **Local**: try the Hermes adapter first. If it can't reach your Hermes setup from WSL, use the
   OpenCode adapter pointed at Ollama (`http://localhost:11434`, model `qwen3.8:27b`) instead — same
   model, different harness.

4. **Instructions for every agent** (paste into each agent's instructions or the project's):
   - Follow `AGENTS.md` in the repo root.
   - One task, one branch, deliver a **draft PR**. Never deploy, tag or push to `feature/cuneiform-buttons`.
   - Every task must state **"Done when"** checks before work starts; it isn't done until they pass.
   - **Ask the board (Jon) instead of guessing** when: lore text, a visual judgment, more than 5 files,
     protected files, or the same task failed twice. Then move to the next task — don't wait.
5. **Morning plan:** a routine at **07:40 weekdays** that wakes Lead to write today's plan as tasks
   (with "Done when" checks) for your approval. You approve the batch once.
6. **Work hours:** heartbeats for Builder and Local only **09:00–15:00**, every 60–90 min, and at most
   one or two runs at a time.
7. **Budgets:** set agent and project caps. On subscriptions, Paperclip may not see dollar costs — Check 3
   tests whether the caps actually stop anything. Until it passes, the heartbeat schedule is your real limit.
8. **Review stage:** require Lead's review (a different model from the author) plus your approval before
   a task counts as done.

---

## Part C — the checks

Run them in order. Note pass/fail and anything odd; that's what decides the next step.

| # | Check | How | Pass if |
|---|-------|-----|---------|
| 0 | **Subscriptions + local model** | Give each agent a trivial task ("reply with the current branch name") | All three answer, Claude and Codex use your plans (no API key set), Local runs on the 5090 (`nvidia-smi` in Windows shows load) |
| 1 | **Direction carries through** | In the project chat or on the lead's task: "Focus on map labels today; leave the reader alone." Then let the next worker run | The next task picked and the PR touch labels, not `reader/` |
| 2 | **Recovery** | While a worker runs, stop Paperclip (`Ctrl-c` in tmux) or `wsl --shutdown`; restart | The task comes back as retry-able or resumes — not stuck "in progress" forever |
| 3 | **Limits stop work** | Set Builder's cap very low (or limit runs) and let it work | Builder pauses at the cap and you get a warning first |
| 4 | **Collaborator scope** | Phase 2 below: make a second, private project and invite a test account (a second email of yours) to Intrepid only | The test account sees Intrepid and **cannot** see the other project |
| 5 | **Hands-off block** | Approve a morning batch of 3–5 tasks, then leave it alone 09:00–15:00 | Draft PRs or clear questions at the end; you didn't have to fix the system itself |

### Phase 2 — phone and collaborator (for Check 4)

1. Install **Tailscale** on Windows and your phone (same account).
2. Re-run onboarding in authenticated mode: `npx paperclipai@latest onboard --yes --bind tailnet`
   (or `--bind lan` for home Wi-Fi only). This turns on real logins, invites and private projects.
   Whether `tailnet` detects Tailscale from inside WSL is something to confirm; if not, use `lan`
   with mirrored networking, or install Tailscale inside Ubuntu as well.
3. Open Paperclip on your phone at the address it prints. Then invite the test account and run Check 4.

---

## Afterwards

- **Passes 0, 1, 2 and 5** → adopt it. Make Paperclip a service that starts with the PC, add the other
  projects, invite your real collaborator.
- **Fails 0 or 2** → stop; that's the foundation. Bring the notes back and we'll decide between fixing it
  upstream, Agent Orchestrator, or a small custom layer.
- **Only 1, 3 or 4 fall short** → usually fixable with configuration or a small add-on; bring the notes back.

To undo everything: `wsl --unregister Ubuntu` removes the Linux side completely; delete `.wslconfig`
and the two Ollama variables to restore Windows as it was.
