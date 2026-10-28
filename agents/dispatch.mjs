#!/usr/bin/env node
/**
 * Intrepid agent dispatcher — runs one step of the daily autonomous loop.
 *
 *   node agents/dispatch.mjs briefing          morning briefing, proposed issues, today's log issue
 *   node agents/dispatch.mjs work              next agent:ready issue → branch → draft PR → cross-review
 *   node agents/dispatch.mjs wrapup            end-of-day summary + next steps, closes the log issue
 *   node agents/dispatch.mjs status            providers, cooldowns, queue
 *   node agents/dispatch.mjs setup             create the GitHub labels
 *   node agents/dispatch.mjs test <provider>   one-line round trip to a provider
 *
 *   --dry-run   no GitHub writes and no pushes; prints what it would do
 *
 * Each role in agents/config.json lists providers in fallback order. A provider that reports a
 * usage limit goes on cooldown (agents/.state/cooldowns.json) so later runs skip it until it resets.
 *
 * No npm dependencies. Needs Node 20+, git, gh (logged in) and whichever CLIs the config names.
 * Run it from its own clone of the repo — it checks out branches and resets the working tree.
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(AGENTS_DIR, '..');
const STATE_DIR = path.join(AGENTS_DIR, '.state');
const IS_WIN = process.platform === 'win32';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const [MODE, MODE_ARG] = argv.filter((a) => !a.startsWith('--'));

/** Text that means "out of quota", not "the task failed". */
const LIMIT_RE = /usage limit|rate[ _-]?limit|quota|too many requests|\b429\b|limit reached|limit will reset|resets? at|overloaded|out of credits|credit balance/i;

const LABELS = {
  proposed: { name: 'agent:proposed', color: 'c5def5', description: 'Suggested by the briefing — relabel agent:ready to approve' },
  ready: { name: 'agent:ready', color: '0e8a16', description: 'Approved: agents may pick this up' },
  working: { name: 'agent:working', color: 'fbca04', description: 'An agent is on it' },
  review: { name: 'agent:review', color: '1d76db', description: 'Draft PR open, waiting on a human' },
  human: { name: 'needs-human', color: 'd93f0b', description: 'Needs a person: judgment, visual check or a blocker' },
  log: { name: 'agent:log', color: 'ededed', description: 'Daily agent log' },
  small: { name: 'size:small', color: 'bfdadc', description: 'One-file, low-risk — local model first' },
  priority: { name: 'priority:high', color: 'b60205', description: 'Agents take these first' },
};

// ─── Config, state, logging ─────────────────────────────────────────────────

function loadConfig() {
  const file = path.join(AGENTS_DIR, 'config.json');
  if (!fs.existsSync(file)) {
    console.error('Missing agents/config.json — copy agents/config.example.json and edit it (see agents/README.md).');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const CONFIG = loadConfig();
const REPO = CONFIG.githubRepo;
const BASE = CONFIG.baseBranch;

function loadPrompt(name) {
  return fs.readFileSync(path.join(AGENTS_DIR, 'prompts', name + '.md'), 'utf8');
}

// Read up front: checking out another branch can remove these files mid-run.
const PROMPTS = Object.fromEntries(['work', 'fix', 'revise', 'review', 'briefing', 'wrapup'].map((n) => [n, loadPrompt(n)]));
const RULES = fs.existsSync(path.join(ROOT, 'AGENTS.md')) ? fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8') : '';

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function today() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

function nowHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.appendFileSync(path.join(STATE_DIR, `run-${today()}.log`), line + '\n');
}

function truncate(text, max) {
  text = String(text || '');
  return text.length <= max ? text : text.slice(0, max) + `\n… [truncated ${text.length - max} chars]`;
}

// Cooldowns: provider name → ISO time it can be tried again.
const COOLDOWN_FILE = path.join(STATE_DIR, 'cooldowns.json');

function cooldownUntil(name) {
  const until = readJson(COOLDOWN_FILE, {})[name];
  return until && new Date(until) > new Date() ? new Date(until) : null;
}

function setCooldown(name, hours) {
  if (!hours) return;
  const all = readJson(COOLDOWN_FILE, {});
  all[name] = new Date(Date.now() + hours * 3600_000).toISOString();
  writeJson(COOLDOWN_FILE, all);
}

// One run at a time: scheduled runs can overlap if a work run goes long.
const LOCK_FILE = path.join(STATE_DIR, 'lock.json');

function acquireLock() {
  const lock = readJson(LOCK_FILE, null);
  if (lock && Date.now() - new Date(lock.started).getTime() < 3 * 3600_000) {
    log(`another run (${lock.mode}, pid ${lock.pid}) started at ${lock.started} — exiting`);
    process.exit(0);
  }
  writeJson(LOCK_FILE, { pid: process.pid, mode: MODE, started: new Date().toISOString() });
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* already gone */ }
}

// Keep dispatcher state out of git on every branch, including ones without our .gitignore entries.
function excludeLocalFiles() {
  const file = path.join(ROOT, '.git', 'info', 'exclude');
  if (!fs.existsSync(path.dirname(file))) return;
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const wanted = ['agents/config.json', 'agents/.state/'].filter((l) => !current.split(/\r?\n/).includes(l));
  if (wanted.length) fs.appendFileSync(file, (current.endsWith('\n') || !current ? '' : '\n') + wanted.join('\n') + '\n');
}

// ─── Shell helpers ──────────────────────────────────────────────────────────

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, ...opts,
  }).trim();
}

function git(...args) { return sh('git', args); }
function gh(...args) { return sh('gh', [...args, '-R', REPO]); }
function ghJson(...args) { return JSON.parse(gh(...args) || 'null'); }

/** GitHub writes go through here so --dry-run can skip them. */
function ghWrite(...args) {
  if (DRY) { log('[dry-run] gh ' + args.join(' ')); return ''; }
  return gh(...args);
}

/** Write a body to a temp file: long markdown overflows the Windows command line. */
function bodyFile(body) {
  const file = path.join(STATE_DIR, `body-${process.pid}.md`);
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(file, body);
  return file;
}

function quoteWin(arg) {
  return /^[\w\-.:/=@,]+$/.test(arg) ? arg : '"' + arg.replace(/"/g, '\\"') + '"';
}

function killTree(child) {
  if (IS_WIN) {
    try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F']); } catch { /* already exited */ }
  } else {
    child.kill('SIGKILL');
  }
}

/** Run a CLI with the prompt on stdin. Resolves { code, stdout, stderr, timedOut }. */
function runProcess(command, args, { input = '', env = {}, timeoutMs }) {
  return new Promise((resolve) => {
    const options = { cwd: ROOT, env: { ...process.env, ...env }, windowsHide: true };
    // npm installs CLIs as .cmd shims on Windows, which Node only launches through a shell.
    const child = IS_WIN
      ? spawn([command, ...args].map(quoteWin).join(' '), { ...options, shell: true })
      : spawn(command, args, options);
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let done = false;
    const finish = (code, extra = '') => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr: stderr + extra, timedOut });
    };
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => finish(-1, String(err)));
    child.on('close', (code) => finish(code));
    child.stdin.on('error', () => { /* CLI exited before reading stdin */ });
    child.stdin.end(input);
  });
}

const ollamaUpCache = new Map();

async function ollamaUp(url = 'http://localhost:11434') {
  if (!ollamaUpCache.has(url)) {
    try {
      const res = await fetch(url.replace(/\/$/, '') + '/api/tags', { signal: AbortSignal.timeout(3000) });
      ollamaUpCache.set(url, res.ok);
    } catch {
      ollamaUpCache.set(url, false);
    }
  }
  return ollamaUpCache.get(url);
}

/** Plain chat call to Ollama — no tools, so used for briefing, review and wrap-up only. */
async function callOllama(p, prompt, timeoutMs) {
  const url = (p.url || 'http://localhost:11434').replace(/\/$/, '') + '/api/chat';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: p.model,
        stream: false,
        messages: [{ role: 'user', content: prompt }],
        options: { num_ctx: p.numCtx || 32768 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) return { code: res.status, stdout: '', stderr: text, timedOut: false };
    return { code: 0, stdout: JSON.parse(text).message?.content || '', stderr: '', timedOut: false };
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
    return { code: -1, stdout: '', stderr: String(err), timedOut };
  }
}

// ─── Providers and roles ────────────────────────────────────────────────────

/** Why a provider can't run right now, or null if it can. */
async function unavailable(name, { agentic }) {
  const p = CONFIG.providers[name];
  if (!p) return 'not in config';
  if (p.enabled === false) return 'disabled';
  const until = cooldownUntil(name);
  if (until) return `cooling down until ${until.toLocaleTimeString()}`;
  if (agentic && p.type !== 'cli') return 'chat-only, cannot edit files';
  if ((p.type === 'ollama' || p.requiresOllama) && !(await ollamaUp(p.url))) return 'Ollama not reachable';
  return null;
}

async function runProvider(name, prompt) {
  const p = CONFIG.providers[name];
  const timeoutMs = (p.timeoutMinutes || 30) * 60_000;
  const r = p.type === 'ollama'
    ? await callOllama(p, prompt, timeoutMs)
    : await runProcess(p.command, p.args || [], { input: prompt, env: p.env || {}, timeoutMs });
  const output = (r.stdout || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const tail = output.slice(-2000) + '\n' + (r.stderr || '').slice(-2000);
  const hitLimit = LIMIT_RE.test(tail) && (r.code !== 0 || output.length < 400);
  const ok = r.code === 0 && !r.timedOut && !!output && !hitLimit;
  if (hitLimit) setCooldown(name, p.cooldownHours ?? 5);
  const why = ok ? '' : r.timedOut ? 'timed out' : hitLimit ? 'usage limit (cooling down)' : !output && r.code === 0 ? 'empty reply' : `exit ${r.code}`;
  if (!ok) log(`${name} failed: ${why} ${truncate((r.stderr || output).trim(), 300)}`);
  return { ok, output, why };
}

/**
 * Try each provider a role lists until one succeeds.
 * agentic: the provider edits files, so the tree is reset to `resetTo` between attempts.
 */
async function runRole(role, prompt, { agentic = false, exclude = [], chain, resetTo } = {}) {
  const tried = [];
  for (const name of chain || CONFIG.roles[role] || []) {
    if (exclude.includes(name)) continue;
    const reason = await unavailable(name, { agentic });
    if (reason) { tried.push(`${name}: ${reason}`); continue; }
    log(`${role}: trying ${name}`);
    const r = await runProvider(name, prompt);
    if (r.ok) return { provider: name, output: r.output, tried };
    tried.push(`${name}: ${r.why}`);
    if (agentic && resetTo) resetTree(resetTo);
  }
  log(`${role}: no provider succeeded (${tried.join('; ') || 'none configured'})`);
  return { provider: null, output: '', tried };
}

// ─── Git and checks ─────────────────────────────────────────────────────────

function ensureClean() {
  const dirty = git('status', '--porcelain');
  if (dirty) {
    throw new Error('Working tree has uncommitted changes. The dispatcher needs its own clean clone (see agents/README.md):\n' + dirty);
  }
}

function resetTree(sha) {
  git('reset', '--hard', sha);
  git('clean', '-fd');
}

function hasChanges(startSha) {
  return !!git('status', '--porcelain') || git('rev-parse', 'HEAD') !== startSha;
}

function commitAll(message, provider) {
  if (!git('status', '--porcelain')) return;
  git('add', '-A');
  git('commit', '-m', message, '-m', `Agent: ${provider}`);
}

function runChecks() {
  const results = [];
  for (const cmd of CONFIG.checks || []) {
    try {
      const out = execFileSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 10 * 60_000 });
      results.push({ cmd, ok: true, out });
    } catch (err) {
      results.push({ cmd, ok: false, out: String(err.stdout || '') + String(err.stderr || err.message) });
    }
  }
  const summary = results.length
    ? results.map((r) => `- ${r.ok ? '✅' : '❌'} \`${r.cmd}\``).join('\n')
    : '- (no checks configured)';
  const failures = results.filter((r) => !r.ok).map((r) => `$ ${r.cmd}\n${truncate(r.out, 4000)}`).join('\n\n');
  return { ok: results.every((r) => r.ok), summary, failures };
}

/** Protected paths and oversized files, checked by code rather than trusted to the model. */
function guardrailViolations(startSha) {
  const files = git('diff', '--name-only', startSha, 'HEAD').split('\n').filter(Boolean);
  const problems = [];
  for (const f of files) {
    const norm = f.replace(/\\/g, '/');
    const hit = (CONFIG.protectedPaths || []).find((p) => (p.endsWith('/') ? norm.startsWith(p) : norm === p));
    if (hit) problems.push(`\`${f}\` is protected (${hit})`);
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs) && fs.statSync(abs).size > (CONFIG.maxFileMB || 2) * 1024 * 1024) {
      problems.push(`\`${f}\` is larger than ${CONFIG.maxFileMB || 2} MB`);
    }
  }
  return problems;
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'task';
}

function backToBase() {
  try { git('checkout', '-B', BASE, `origin/${BASE}`); } catch (err) { log('could not return to base: ' + err.message); }
}

// ─── GitHub helpers ─────────────────────────────────────────────────────────

function labelNames(issue) {
  return (issue.labels || []).map((l) => l.name);
}

function logIssueTitle(date) {
  return `Agent log ${date}`;
}

function findLogIssue(date) {
  const issues = ghJson('issue', 'list', '--label', LABELS.log.name, '--state', 'all', '--limit', '10', '--json', 'number,title,state');
  return issues.find((i) => i.title === logIssueTitle(date)) || null;
}

function issueThread(number) {
  return gh('issue', 'view', String(number), '--comments');
}

/** Append an entry to today's log issue, creating it if the briefing didn't run. */
function appendLog(text) {
  log(text.split('\n')[0]);
  if (DRY) return;
  let issue = findLogIssue(today());
  if (!issue) {
    const url = gh('issue', 'create', '--title', logIssueTitle(today()), '--label', LABELS.log.name,
      '--body-file', bodyFile('_No briefing ran today._'));
    issue = { number: url.split('/').pop() };
  }
  gh('issue', 'comment', String(issue.number), '--body-file', bodyFile(text));
}

async function notify(title, message, url) {
  const topic = CONFIG.notify?.ntfyTopic;
  if (!topic || DRY) return;
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: message,
      headers: { Title: title, ...(url ? { Click: url } : {}) },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    log('notify failed: ' + err.message);
  }
}

// ─── Modes ──────────────────────────────────────────────────────────────────

function queueSummary() {
  const issues = ghJson('issue', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,labels');
  const groups = { ready: [], working: [], review: [], human: [], proposed: [], other: [] };
  for (const i of issues) {
    const names = labelNames(i);
    if (names.includes(LABELS.log.name)) continue;
    const key = ['human', 'working', 'review', 'ready', 'proposed'].find((k) => names.includes(LABELS[k].name)) || 'other';
    groups[key].push(`- #${i.number} ${i.title}${names.length ? ` [${names.join(', ')}]` : ''}`);
  }
  return Object.entries(groups)
    .map(([k, rows]) => `**${k === 'other' ? 'Other open issues' : LABELS[k].name}** (${rows.length})\n${rows.join('\n') || '- none'}`)
    .join('\n\n');
}

function providerSummary() {
  return Object.keys(CONFIG.providers).map((name) => {
    const p = CONFIG.providers[name];
    const until = cooldownUntil(name);
    return `- ${name}: ${p.enabled === false ? 'disabled' : until ? `cooling down until ${until.toLocaleString()}` : 'available'}`;
  }).join('\n');
}

function gatherBriefingContext() {
  try { git('fetch', 'origin', BASE); } catch (err) { log('fetch failed: ' + err.message); }
  const prs = ghJson('pr', 'list', '--state', 'open', '--limit', '30', '--json', 'number,title,isDraft,headRefName,labels');
  const prRows = prs.map((p) => `- #${p.number} ${p.title}${p.isDraft ? ' (draft)' : ''} — \`${p.headRefName}\``).join('\n') || '- none';

  const logs = ghJson('issue', 'list', '--label', LABELS.log.name, '--state', 'all', '--limit', '3', '--json', 'number,title');
  const prior = logs.find((i) => i.title !== logIssueTitle(today()));
  const yesterday = prior ? truncate(issueThread(prior.number), 15000) : 'No earlier log.';

  let commits = '';
  try { commits = git('log', '--oneline', '-15', `origin/${BASE}`); } catch { commits = '(unavailable)'; }

  const todoDir = path.join(ROOT, '.planning', 'todos', 'pending');
  const todos = fs.existsSync(todoDir)
    ? fs.readdirSync(todoDir).filter((f) => f.endsWith('.md')).map((f) => {
      const m = fs.readFileSync(path.join(todoDir, f), 'utf8').match(/^title:\s*(.+)$/m);
      return `- ${m ? m[1] : f} (\`.planning/todos/pending/${f}\`)`;
    }).join('\n')
    : '- none';

  return [
    `## Issue queue\n\n${queueSummary()}`,
    `## Open pull requests\n\n${prRows}`,
    `## Yesterday's log\n\n${yesterday}`,
    `## Recent commits on ${BASE}\n\n\`\`\`\n${commits}\n\`\`\``,
    `## Backlog notes not yet filed as issues\n\n${todos}`,
    `## Model availability\n\n${providerSummary()}`,
  ].join('\n\n');
}

function parseProposals(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (!m) return [];
  try {
    const list = JSON.parse(m[1]);
    return Array.isArray(list) ? list.filter((p) => p && typeof p.title === 'string' && p.title.trim()) : [];
  } catch {
    log('briefing JSON block did not parse; no issues proposed');
    return [];
  }
}

async function briefing() {
  const date = today();
  if (findLogIssue(date)) { log(`briefing for ${date} already exists`); return; }

  const context = gatherBriefingContext();
  const r = await runRole('briefing', fill(PROMPTS.briefing, {
    DATE: date, CONTEXT: context, MAX_PROPOSALS: CONFIG.maxProposalsPerDay ?? 5,
  }));
  let body = r.provider
    ? r.output
    : `⚠️ No model was available for the briefing (${r.tried.join('; ')}). Raw state below.\n\n${context}`;

  const open = ghJson('issue', 'list', '--state', 'open', '--limit', '200', '--json', 'title').map((i) => i.title.toLowerCase());
  const created = [];
  for (const p of parseProposals(body).slice(0, CONFIG.maxProposalsPerDay ?? 5)) {
    if (open.includes(p.title.toLowerCase())) continue;
    const labels = [LABELS.proposed.name, ...(p.size === 'small' ? [LABELS.small.name] : [])];
    const url = ghWrite('issue', 'create', '--title', p.title, '--label', labels.join(','),
      '--body-file', bodyFile(`${p.body || ''}\n\n---\n_Proposed by the ${date} briefing (${r.provider}). Relabel \`agent:ready\` to approve._`));
    created.push(`- ${p.title}${url ? ` — ${url}` : ''}`);
  }
  body = body.replace(/```json[\s\S]*?```/, created.length ? `**Filed as \`agent:proposed\`:**\n${created.join('\n')}` : '');
  body += `\n\n---\n_Briefing by ${r.provider || 'none'}. Approve work by relabeling issues \`agent:ready\`._`;

  const url = ghWrite('issue', 'create', '--title', logIssueTitle(date), '--label', LABELS.log.name, '--body-file', bodyFile(body));
  if (DRY) console.log('\n' + body);
  log(`briefing posted ${url || '(dry run)'}`);
  await notify(`Intrepid briefing ${date}`, `${created.length} proposed, tap to approve`, url);
}

function nextReadyIssue() {
  const issues = ghJson('issue', 'list', '--label', LABELS.ready.name, '--state', 'open', '--limit', '50',
    '--json', 'number,title,body,labels,createdAt');
  const blocked = [LABELS.working.name, LABELS.human.name, LABELS.log.name];
  return issues
    .filter((i) => !labelNames(i).some((n) => blocked.includes(n)))
    .sort((a, b) => {
      const pa = labelNames(a).includes(LABELS.priority.name) ? 0 : 1;
      const pb = labelNames(b).includes(LABELS.priority.name) ? 0 : 1;
      return pa - pb || a.createdAt.localeCompare(b.createdAt);
    })[0] || null;
}

async function workIssue(issue) {
  const n = String(issue.number);
  const labels = labelNames(issue);
  const branch = `agent/issue-${n}-${slug(issue.title)}`;
  const role = labels.includes(LABELS.small.name) ? 'codeSmall' : 'code';
  log(`work: #${n} ${issue.title} (${role})`);

  ensureClean();
  ghWrite('issue', 'edit', n, '--add-label', LABELS.working.name, '--remove-label', LABELS.ready.name);
  git('fetch', 'origin', BASE);
  git('checkout', '-B', branch, `origin/${BASE}`);
  const startSha = git('rev-parse', 'HEAD');

  const vars = {
    ISSUE_NUMBER: n, ISSUE_TITLE: issue.title, ISSUE_BODY: issue.body || '(no description)',
    BRANCH: branch, BASE, CHECKS: (CONFIG.checks || []).map((c) => `\`${c}\``).join(', ') || '(none)',
    PROTECTED: (CONFIG.protectedPaths || []).map((p) => `\`${p}\``).join(', '),
  };

  const finishIssue = (add, comment) => {
    ghWrite('issue', 'edit', n, '--remove-label', LABELS.working.name, ...(add ? ['--add-label', add] : []));
    if (comment) ghWrite('issue', 'comment', n, '--body-file', bodyFile(comment));
  };

  try {
    const result = await runRole(role, fill(PROMPTS.work, vars), { agentic: true, resetTo: startSha });
    if (!result.provider) {
      finishIssue(LABELS.ready.name, null);
      appendLog(`⏸️ #${n} put back in the queue — no coding model available (${result.tried.join('; ')}).`);
      return 'no-provider';
    }
    const author = result.provider;

    if (!hasChanges(startSha)) {
      finishIssue(LABELS.human.name, `🛑 **${author}** made no changes:\n\n${truncate(result.output, 6000)}`);
      appendLog(`🛑 #${n} — ${author} stopped without changes; labeled needs-human.`);
      return 'blocked';
    }

    let report = result.output;
    let checks = runChecks();
    if (!checks.ok) {
      log(`checks failed on #${n}; one fix attempt by ${author}`);
      const fix = await runRole(role, fill(PROMPTS.fix, { ...vars, CHECK_OUTPUT: checks.failures }), { agentic: true, chain: [author] });
      if (fix.provider) report += `\n\n#### After fixing failed checks\n\n${fix.output}`;
      checks = runChecks();
    }
    commitAll(`agent(#${n}): ${issue.title}`, author);

    const violations = guardrailViolations(startSha);
    if (violations.length) {
      finishIssue(LABELS.human.name, `🛑 **${author}**'s change was not pushed — it breaks repo guardrails:\n\n${violations.map((v) => `- ${v}`).join('\n')}\n\nThe commit is on local branch \`${branch}\` in the agent clone.`);
      appendLog(`🛑 #${n} — guardrail violation, not pushed: ${violations.join('; ')}`);
      return 'guardrail';
    }

    // Cross-review by a different model than the author.
    const review = await runRole('review', fill(PROMPTS.review, {
      ...vars, AUTHOR: author, RULES: truncate(RULES, 12000), CHECK_SUMMARY: checks.summary,
      DIFF: truncate(git('diff', `${startSha}..HEAD`), CONFIG.reviewMaxChars || 60000),
    }), { exclude: [author] });
    if (git('status', '--porcelain')) resetTree('HEAD'); // reviewers must not edit
    let verdict = (review.output.match(/VERDICT:\s*(approve|changes|needs-human)/i) || [])[1]?.toLowerCase() || 'needs-human';

    let revised = '';
    if (verdict === 'changes') {
      const before = git('rev-parse', 'HEAD');
      const rev = await runRole(role, fill(PROMPTS.revise, { ...vars, REVIEW: review.output }), { agentic: true, chain: [author], resetTo: before });
      if (rev.provider) {
        commitAll(`agent(#${n}): address review`, author);
        checks = runChecks();
        revised = `\n\n### Revision after review (${author})\n\n${truncate(rev.output, 4000)}`;
        if (guardrailViolations(startSha).length) {
          resetTree(before);
          checks = runChecks();
          revised += '\n\n_Revision reverted: it touched protected paths._';
        }
      }
      verdict = 'needs-human'; // revised once, not re-reviewed: a person looks before shipping
    }

    if (!DRY) git('push', '-u', 'origin', branch, '--force-with-lease');
    const needsHuman = verdict !== 'approve' || !checks.ok;
    const prBody = [
      `Automated draft for #${n} — ${issue.title}`,
      `**Written by:** ${author} · **Reviewed by:** ${review.provider || 'nobody (no reviewer available)'} · **Verdict:** ${verdict}`,
      `### Checks\n${checks.summary}${checks.ok ? '' : `\n\n<details><summary>Failure output</summary>\n\n\`\`\`\n${truncate(checks.failures, 6000)}\n\`\`\`\n</details>`}`,
      `### Agent report\n\n${truncate(report, 8000)}${revised}`,
      `---\nRefs #${n}. Not deployed. Review, browser-check, then ship as usual (build stamp, tag, deploy).`,
    ].join('\n\n');

    let prUrl = '';
    try {
      prUrl = ghWrite('pr', 'create', '--draft', '--base', BASE, '--head', branch,
        '--title', `agent: ${issue.title} (#${n})`, '--body-file', bodyFile(prBody));
    } catch {
      prUrl = gh('pr', 'view', branch, '--json', 'url', '--jq', '.url'); // PR already open from an earlier run
      ghWrite('pr', 'comment', prUrl, '--body-file', bodyFile(`Updated by a new run.\n\n${prBody}`));
    }
    if (review.provider) {
      ghWrite('pr', 'comment', prUrl || branch, '--body-file', bodyFile(`### Review by ${review.provider}\n\n${review.output}`));
    }

    const doneLabels = needsHuman ? `${LABELS.review.name},${LABELS.human.name}` : LABELS.review.name;
    finishIssue(doneLabels, `Draft PR: ${prUrl || '(dry run)'} — ${author}, reviewed by ${review.provider || 'nobody'}, verdict **${verdict}**.`);
    appendLog(`${needsHuman ? '🟡' : '🟢'} #${n} ${issue.title} → ${prUrl || 'PR (dry run)'}\n\nWritten by **${author}**, reviewed by **${review.provider || 'nobody'}**, verdict **${verdict}**, checks ${checks.ok ? 'pass' : 'FAIL'}.`);
    return 'pr';
  } catch (err) {
    finishIssue(LABELS.human.name, `💥 Dispatcher error while working on this:\n\n\`\`\`\n${truncate(err.stack || err.message, 4000)}\n\`\`\``);
    appendLog(`💥 #${n} dispatcher error: ${err.message}`);
    return 'error';
  } finally {
    backToBase();
  }
}

async function work() {
  const hours = CONFIG.workWindow || {};
  if (hours.start && nowHHMM() < hours.start) { log(`before work window (${hours.start})`); return; }
  // A dry run leaves labels alone, so it would pick the same issue again.
  const max = DRY ? 1 : CONFIG.maxIssuesPerRun || 1;
  for (let i = 0; i < max; i++) {
    if (hours.end && nowHHMM() >= hours.end) { log(`past work window end (${hours.end})`); break; }
    const issue = nextReadyIssue();
    if (!issue) { log('queue empty — nothing labeled agent:ready'); break; }
    const outcome = await workIssue(issue);
    if (outcome === 'no-provider') break; // everyone is out of quota; try again next run
  }
}

async function wrapup() {
  const date = today();
  const issue = findLogIssue(date);
  if (!issue) { log(`no log issue for ${date}; nothing to wrap up`); return; }

  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const prs = ghJson('pr', 'list', '--state', 'all', '--limit', '30', '--json', 'number,title,url,isDraft,createdAt,headRefName')
    .filter((p) => new Date(p.createdAt) >= midnight)
    .map((p) => `- #${p.number} ${p.title} — ${p.url}`).join('\n') || '- none';

  const r = await runRole('wrapup', fill(PROMPTS.wrapup, {
    DATE: date, LOG: truncate(issueThread(issue.number), 20000), PRS: prs, QUEUE: queueSummary(),
  }));
  const body = r.provider
    ? `## Wrap-up\n\n${r.output}\n\n---\n_Wrap-up by ${r.provider}._`
    : `## Wrap-up\n\nNo model was available (${r.tried.join('; ')}).\n\n### PRs today\n${prs}`;
  ghWrite('issue', 'comment', String(issue.number), '--body-file', bodyFile(body));
  ghWrite('issue', 'close', String(issue.number));
  if (DRY) console.log('\n' + body);
  log('wrap-up posted');
  await notify(`Intrepid wrap-up ${date}`, 'Day summary is ready', `https://github.com/${REPO}/issues/${issue.number}`);
}

async function status() {
  console.log(`Repo: ${REPO}  base: ${BASE}  work window: ${CONFIG.workWindow?.start}–${CONFIG.workWindow?.end}\n`);
  console.log('Providers:');
  for (const name of Object.keys(CONFIG.providers)) {
    console.log(`  ${name.padEnd(12)} ${(await unavailable(name, { agentic: false })) || 'ready'}`);
  }
  console.log('\nRoles:');
  for (const [role, chain] of Object.entries(CONFIG.roles)) console.log(`  ${role.padEnd(10)} ${chain.join(' → ')}`);
  const lock = readJson(LOCK_FILE, null);
  console.log(`\nLock: ${lock ? `${lock.mode} since ${lock.started}` : 'none'}\n`);
  console.log(queueSummary());
}

function setup() {
  for (const l of Object.values(LABELS)) {
    ghWrite('label', 'create', l.name, '--color', l.color, '--description', l.description, '--force');
    log(`label ${l.name}`);
  }
}

async function test(name) {
  if (!name || !CONFIG.providers[name]) {
    console.error(`Usage: node agents/dispatch.mjs test <${Object.keys(CONFIG.providers).join('|')}>`);
    process.exit(1);
  }
  const reason = await unavailable(name, { agentic: false });
  if (reason && reason !== 'disabled') { console.log(`${name}: ${reason}`); process.exit(1); }
  const started = Date.now();
  const r = await runProvider(name, 'Reply with exactly the word OK and nothing else.');
  console.log(`${name}: ${r.ok ? 'OK' : 'FAILED — ' + r.why} in ${((Date.now() - started) / 1000).toFixed(1)}s\n${truncate(r.output, 500)}`);
  process.exit(r.ok ? 0 : 1);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const MODES = { briefing, work, wrapup, status, setup, test: () => test(MODE_ARG) };

if (!MODES[MODE]) {
  console.error('Usage: node agents/dispatch.mjs <briefing|work|wrapup|status|setup|test <provider>> [--dry-run]');
  process.exit(1);
}

excludeLocalFiles();
const locked = ['briefing', 'work', 'wrapup'].includes(MODE);
if (locked) acquireLock();
try {
  await MODES[MODE]();
} catch (err) {
  log(`${MODE} failed: ${err.stack || err.message}`);
  await notify(`Intrepid agents: ${MODE} failed`, err.message);
  process.exitCode = 1;
} finally {
  if (locked) releaseLock();
  try { fs.unlinkSync(path.join(STATE_DIR, `body-${process.pid}.md`)); } catch { /* no bodies written */ }
}
