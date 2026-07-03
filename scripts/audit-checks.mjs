#!/usr/bin/env node
/**
 * Local smoke checks for Fable / Claude Code audit sessions.
 * Prerequisite: npx http-server . -p 8080 --cors -c-1
 *
 * Usage:
 *   node scripts/audit-checks.mjs
 *   EXPECTED_BUILD=59 node scripts/audit-checks.mjs
 *   AUDIT_BASE=http://127.0.0.1:8080 node scripts/audit-checks.mjs
 */

const BASE = (process.env.AUDIT_BASE || 'http://localhost:8080').replace(/\/$/, '');
const EXPECTED_BUILD = parseInt(process.env.EXPECTED_BUILD || '62', 10);

/** @type {{ name: string, status: 'pass'|'fail'|'warn', detail: string }[]} */
const checks = [];

function record(name, status, detail) {
  checks.push({ name, status, detail });
}

async function fetchResource(path) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, url };
  } catch (err) {
    return { ok: false, status: 0, text: '', url, error: String(err.message || err) };
  }
}

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

async function main() {
  // ── Server reachable ──────────────────────────────────────────────
  const root = await fetchResource('/');
  if (!root.ok) {
    record(
      'server_up',
      'fail',
      root.error
        ? `Cannot reach ${BASE}: ${root.error}`
        : `GET / returned HTTP ${root.status}`
    );
    printReport();
    process.exit(1);
  }
  record('server_up', 'pass', `GET / → HTTP ${root.status}`);

  const html = root.text;

  // ── Build stamp ─────────────────────────────────────────────────────
  const buildMatch = html.match(/window\.INTREPID_BUILD\s*=\s*(\d+)/);
  if (!buildMatch) {
    record('intrepid_build_present', 'fail', 'window.INTREPID_BUILD not found in index.html');
  } else {
    const build = parseInt(buildMatch[1], 10);
    if (build === EXPECTED_BUILD) {
      record('intrepid_build', 'pass', `INTREPID_BUILD = ${build}`);
    } else {
      record(
        'intrepid_build',
        'fail',
        `INTREPID_BUILD = ${build}, expected ${EXPECTED_BUILD}`
      );
    }
  }

  const fogCacheMatch = html.match(/fog\.js\?v=(\d+)/);
  if (fogCacheMatch && buildMatch) {
    const cacheBuster = parseInt(fogCacheMatch[1], 10);
    const build = parseInt(buildMatch[1], 10);
    if (cacheBuster === build) {
      record('fog_cache_buster', 'pass', `fog.js?v=${cacheBuster} matches build`);
    } else {
      record(
        'fog_cache_buster',
        'fail',
        `fog.js?v=${cacheBuster} does not match INTREPID_BUILD ${build}`
      );
    }
  } else {
    record('fog_cache_buster', 'warn', 'Could not verify fog.js cache buster');
  }

  // ── Gate shell in HTML ──────────────────────────────────────────────
  const gateIds = ['gate', 'gate-pw', 'gate-btn', 'gate-err', 'landing', 'landing-map'];
  const missingGate = gateIds.filter((id) => !html.includes(`id="${id}"`));
  if (missingGate.length === 0) {
    record('gate_elements', 'pass', `All gate/landing ids present (${gateIds.join(', ')})`);
  } else {
    record('gate_elements', 'fail', `Missing ids: ${missingGate.join(', ')}`);
  }

  if (html.includes('Enter your Cartographer access word')) {
    record('gate_copy', 'pass', 'Cartographer gate subtitle copy present');
  } else {
    record('gate_copy', 'fail', 'Expected gate subtitle copy not found');
  }

  // Password must not leak in visible HTML (JS const is acceptable for client gate)
  const visibleHtml = stripScripts(html);
  if (visibleHtml.toLowerCase().includes('hollowlands9')) {
    record(
      'password_not_in_visible_html',
      'fail',
      'hollowlands9 appears outside <script> tags'
    );
  } else {
    record(
      'password_not_in_visible_html',
      'pass',
      'hollowlands9 not in static HTML body'
    );
  }

  // ── fog.js loads ────────────────────────────────────────────────────
  const fog = await fetchResource('/fog.js');
  if (fog.ok && fog.text.length > 10000) {
    record('fog_js_loads', 'pass', `fog.js → HTTP ${fog.status}, ${fog.text.length} bytes`);
  } else {
    record(
      'fog_js_loads',
      'fail',
      fog.error || `fog.js HTTP ${fog.status}, ${fog.text.length} bytes`
    );
  }

  if (fog.ok && fog.text.includes('function isClickable')) {
    record('fog_is_clickable', 'pass', 'isClickable() found in fog.js');
  } else if (fog.ok) {
    record('fog_is_clickable', 'fail', 'isClickable() not found in fog.js');
  }

  // ── data.js loads ───────────────────────────────────────────────────
  const data = await fetchResource('/data.js');
  if (data.ok && data.text.includes('crossing-pool')) {
    record('data_js_loads', 'pass', `data.js → HTTP ${data.status}`);
  } else {
    record('data_js_loads', 'fail', `data.js failed or missing journey data`);
  }

  // ── Reader + dossier ────────────────────────────────────────────────
  const reader = await fetchResource('/reader/intrepid-dusk-volume-1/');
  if (reader.ok && reader.text.includes('Volume 1 Reader')) {
    record('reader_volume_1', 'pass', `reader/intrepid-dusk-volume-1/ → HTTP ${reader.status}`);
  } else {
    record(
      'reader_volume_1',
      'fail',
      `reader/intrepid-dusk-volume-1/ → HTTP ${reader.status}`
    );
  }

  const readerEntry = await fetchResource('/reader/');
  if (readerEntry.ok) {
    record('reader_entry', 'pass', `/reader/ → HTTP ${readerEntry.status}`);
  } else {
    record('reader_entry', 'fail', `/reader/ → HTTP ${readerEntry.status}`);
  }

  const backerGate = await fetchResource('/reader/backer-gate.js');
  if (backerGate.ok && backerGate.text.includes('scribe4')) {
    record('reader_backer_gate', 'pass', 'reader/backer-gate.js loads');
  } else {
    record('reader_backer_gate', 'fail', 'reader/backer-gate.js missing or incomplete');
  }

  const dossier = await fetchResource('/dossier/');
  if (dossier.ok && dossier.status === 200) {
    record('dossier', 'pass', `/dossier/ → HTTP ${dossier.status}`);
  } else {
    record('dossier', 'fail', `/dossier/ → HTTP ${dossier.status}`);
  }

  // ── Cartographer gate logic (static source check) ───────────────────
  if (
    html.includes('intrepid_cartographer_unlocked') &&
    html.includes('hasCartographerAccess')
  ) {
    record('cartographer_ls_key', 'pass', 'intrepid_cartographer_unlocked gate logic present');
  } else {
    record('cartographer_ls_key', 'fail', 'Cartographer localStorage gate not found in index.html');
  }

  if (html.includes('CART_LINK_KEY_RE') && html.includes('isValidCartographerLinkKey')) {
    record('cart_link_key_format', 'pass', 'CART- link requires 8–24 alphanumeric suffix');
  } else {
    record('cart_link_key_format', 'fail', 'CART- private link validation not found in index.html');
  }

  const fogSrc = await fetchResource('/fog.js');
  if (
    fogSrc.ok &&
    fogSrc.text.includes('isFullyDiscovered') &&
    fogSrc.text.includes("d.phase === 'complete'") &&
    fogSrc.text.includes('isOnPath(locId)')
  ) {
    record('journey_counter_phase', 'pass', 'Journey counter requires complete phase on path stops');
  } else if (fogSrc.ok) {
    record('journey_counter_phase', 'fail', 'isFullyDiscovered path-stop phase gate missing in fog.js');
  } else {
    record('journey_counter_phase', 'warn', 'Could not fetch fog.js for journey counter check');
  }

  if (!html.includes('intrepid_atlas_auth') || html.includes('No legacy auto-migrate')) {
    record('no_legacy_tier_a_migrate', 'pass', 'No obvious legacy tier-A auto-migrate in comments/logic');
  } else if (html.match(/intrepid_atlas_auth[\s\S]{0,200}tier.*A[\s\S]{0,200}grantCartographerAccess/)) {
    record(
      'no_legacy_tier_a_migrate',
      'fail',
      'Possible legacy intrepid_atlas_auth + tier A migrate still present'
    );
  } else {
    record('no_legacy_tier_a_migrate', 'warn', 'Manual review: search index.html for atlas_auth migrate');
  }

  printReport();
  const failed = checks.filter((c) => c.status === 'fail').length;
  process.exit(failed > 0 ? 1 : 0);
}

function printReport() {
  const passed = checks.filter((c) => c.status === 'pass').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const warned = checks.filter((c) => c.status === 'warn').length;

  console.log('');
  console.log('# Intrepid Map — Local Audit Checks');
  console.log(`Base: ${BASE} | Expected build: ${EXPECTED_BUILD}`);
  console.log(`Result: ${passed} pass, ${failed} fail, ${warned} warn`);
  console.log('');

  for (const c of checks) {
    const icon = c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '⚠';
    console.log(`${icon} ${c.name}: ${c.detail}`);
  }

  console.log('');
  console.log('--- JSON ---');
  console.log(
    JSON.stringify(
      {
        base: BASE,
        expectedBuild: EXPECTED_BUILD,
        timestamp: new Date().toISOString(),
        summary: { pass: passed, fail: failed, warn: warned },
        checks,
      },
      null,
      2
    )
  );
}

main();
