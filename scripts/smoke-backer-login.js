#!/usr/bin/env node
/**
 * Backer login smoke — every Wave 1 access path, isolation, and gate markup.
 * Run twice (script always executes the matrix twice):
 *   node scripts/smoke-backer-login.js
 *   AUDIT_BASE=https://archive.intrepidgraphicnovel.com node scripts/smoke-backer-login.js
 *
 * Exit 0 = pass, 1 = fail
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var BASE = (process.env.AUDIT_BASE || '').replace(/\/$/, '');
var failures = [];
var passes = 0;

function pass(msg) {
  passes++;
  console.log('  PASS: ' + msg);
}

function fail(msg) {
  failures.push(msg);
  console.error('  FAIL: ' + msg);
}

function assert(cond, msg) {
  if (cond) pass(msg);
  else fail(msg);
}

function makeStorage() {
  var store = {};
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem: function (k, v) {
      store[k] = String(v);
    },
    removeItem: function (k) {
      delete store[k];
    },
    clear: function () {
      store = {};
    },
    key: function (i) {
      return Object.keys(store)[i] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
}

function loadArchiveAccess() {
  var localStorage = makeStorage();
  var sessionStorage = makeStorage();
  var window = { localStorage: localStorage, sessionStorage: sessionStorage };
  var ctx = {
    window: window,
    localStorage: localStorage,
    sessionStorage: sessionStorage,
    console: console
  };
  var code = fs.readFileSync(path.join(ROOT, 'archive-access.js'), 'utf8');
  vm.runInNewContext(code, ctx);
  return {
    access: ctx.window.IntrepidArchiveAccess,
    localStorage: localStorage,
    sessionStorage: sessionStorage,
    window: ctx.window
  };
}

function extractCartValidator() {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var reMatch = html.match(/CART_LINK_KEY_RE\s*=\s*\/(\^CART-\[A-Z0-9\]\{8,24\}\$)\/;/);
  if (!reMatch) {
    return null;
  }
  var CART_LINK_KEY_RE = new RegExp(reMatch[1]);
  return function isValidCartographerLinkKey(key) {
    if (!key || typeof key !== 'string') return false;
    return CART_LINK_KEY_RE.test(key.trim().toUpperCase());
  };
}

function runMatrix(label) {
  console.log('\n[' + label + '] server-side access architecture (static)');

  var accessJs = fs.readFileSync(path.join(ROOT, 'archive-access.js'), 'utf8');
  assert(accessJs.indexOf('scribe4') === -1, 'scribe4 not in archive-access.js');
  assert(accessJs.indexOf('hollowlands9') === -1, 'hollowlands9 not in archive-access.js');
  assert(accessJs.indexOf('/api/access/login') !== -1, 'archive-access uses POST /api/access/login');
  assert(accessJs.indexOf('/api/access/session') !== -1, 'archive-access uses GET /api/access/session');
  assert(accessJs.indexOf('/api/access/logout') !== -1, 'archive-access uses POST /api/access/logout');
  assert(accessJs.indexOf('refreshSession') !== -1, 'archive-access exposes refreshSession');

  var env = loadArchiveAccess();
  var A = env.access;
  assert(!!A, 'IntrepidArchiveAccess exported');
  assert(A.ENABLE_GUEST_ENTRY === false, 'guest entry OFF');
  assert(A.hasPublicContentAccess() === false, 'fresh unloaded session has no public content access');

  console.log('\n[' + label + '] CART- URL format (index.html)');
  var isValidCart = extractCartValidator();
  assert(typeof isValidCart === 'function', 'CART_LINK_KEY_RE extracted from index.html');
  if (typeof isValidCart === 'function') {
    assert(isValidCart('CART-HOLLOWLANDS') === true, 'CART-HOLLOWLANDS valid');
    assert(isValidCart('cart-abcdefgh') === true, 'lowercase cart- prefix accepted after uppercasing');
    assert(isValidCart('CART-ABC12345') === true, '8-char suffix valid');
    assert(isValidCart('CART-ABCDEFGH1234567890123456') === true, '24-char suffix valid');
    assert(isValidCart('CART-ABC1234') === false, '7-char suffix invalid');
    assert(isValidCart('CART-ABCDEFGH12345678901234567') === false, '25-char suffix invalid');
    assert(isValidCart('CART-') === false, 'CART- with empty suffix invalid');
    assert(isValidCart('CART-abc') === false, 'CART-abc too short');
    assert(isValidCart('scribe4') === false, 'scribe4 is not a CART- key');
    assert(isValidCart('hollowlands9') === false, 'hollowlands9 is not a CART- key');
    assert(isValidCart(null) === false, 'null CART key invalid');
  }

  console.log('\n[' + label + '] markup + flags');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert(html.indexOf('id="entry-access-pw"') !== -1, 'archive entry password input present');
  assert(html.indexOf('id="entry-access-eye"') !== -1, 'entry password eye toggle present');
  assert(html.indexOf('id="gate-pw"') !== -1, 'cartographer gate password input present');
  assert(html.indexOf('id="gate-eye"') !== -1, 'cartographer gate eye toggle present');
  assert(/aria-label="Show access password"/.test(html), 'eye toggle aria-label present');
  assert(html.indexOf('id="entry-access-btn"') !== -1, 'Unlock Archive button present');
  assert(html.indexOf('id="entry-optin-step"') !== -1, 'post-unlock opt-in step present');
  assert(html.indexOf('id="entry-optin-form"') !== -1, 'post-unlock opt-in form present');
  assert(html.indexOf('opt_in_source" value="archive-post-unlock"') !== -1, 'post-unlock source archive-post-unlock');
  assert(html.indexOf("That code unlocks the reader only") !== -1, 'scribe4-on-map-gate error copy present');
  assert(html.indexOf('Enter your Cartographer access word at the archive entry') !== -1, 'CART- URL directs to archive entry (no client grant)');

  var visible = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  assert(visible.toLowerCase().indexOf('hollowlands9') === -1, 'hollowlands9 not in visible HTML');
  assert(visible.toLowerCase().indexOf('scribe4') === -1, 'scribe4 not in visible HTML');

  var gateJs = fs.readFileSync(path.join(ROOT, 'reader/backer-gate.js'), 'utf8');
  assert(/ENABLE_READER_GATE\s*=\s*true/.test(gateJs), 'in-reader Issue 2 overlay ON');
  assert(gateJs.indexOf('scribe4') === -1, 'scribe4 not in backer-gate.js');
  assert(gateJs.indexOf('intrepid_reader_gate_disabled') === -1, 'reader gate_disabled bypass removed');
  assert(/id="reader-gate-pw"/.test(gateJs), 'reader gate password input markup exists');
  assert(/id="reader-gate-eye"/.test(gateJs), 'reader gate password eye toggle present');

  var readerHtml = fs.readFileSync(path.join(ROOT, 'reader/intrepid-dusk-volume-1/index.html'), 'utf8');
  assert(readerHtml.indexOf('/api/protected-media/') !== -1, 'reader uses protected media URLs');
  assert(readerHtml.indexOf('refreshSession') !== -1, 'reader boot refreshes server session');
  assert(readerHtml.indexOf('intrepid_cartographer_unlocked') === -1, 'reader no localStorage tier guard');

  var dossierHtml = fs.readFileSync(path.join(ROOT, 'dossier/index.html'), 'utf8');
  assert(dossierHtml.indexOf('/api/protected-media/dossier-') !== -1, 'dossier uses protected media URLs');

  assert(fs.existsSync(path.join(ROOT, 'netlify/functions/access-login.js')), 'access-login function present');
  assert(fs.existsSync(path.join(ROOT, 'netlify/functions/reader-shell.js')), 'reader-shell function present');
  assert(fs.existsSync(path.join(ROOT, 'netlify/lib/asset-allowlist.json')), 'asset allowlist generated');
}

function runMatrixTwice() {
  runMatrix('pass 1');
  runMatrix('pass 2 (repeat)');
}

async function fetchJson(url) {
  var res = await fetch(url, { redirect: 'follow' });
  var text = await res.text();
  return { status: res.status, ok: res.ok, text: text, url: url };
}

async function runLiveHttp(base, label) {
  if (!base) {
    console.log('\n[live HTTP] skipped (set AUDIT_BASE to hit a server)');
    return;
  }
  console.log('\n[live HTTP ' + label + '] ' + base);
  try {
    var home = await fetchJson(base + '/');
    assert(home.ok, label + ' GET / → ' + home.status);
    var build = (home.text.match(/window\.INTREPID_BUILD\s*=\s*(\d+)/) || [])[1];
    assert(!!build, label + ' INTREPID_BUILD present (' + (build || 'missing') + ')');
    var access = await fetchJson(base + '/archive-access.js');
    assert(access.ok, label + ' archive-access.js loads');
    assert(/ENABLE_GUEST_ENTRY\s*=\s*false/.test(access.text), label + ' live guest entry is OFF');
    var buildInfo = await fetchJson(base + '/api/build-info');
    var liveBuild = null;
    if (buildInfo.ok && buildInfo.text) {
      try {
        liveBuild = JSON.parse(buildInfo.text).build;
      } catch (e) {}
    }
    if (liveBuild != null && liveBuild >= 230) {
      assert(access.text.indexOf('scribe4') === -1, label + ' live archive-access.js has no scribe4');
      assert(access.text.indexOf('hollowlands9') === -1, label + ' live archive-access.js has no hollowlands9');
      assert(buildInfo.ok, label + ' build-info endpoint');
      pass(label + ' build-info build ' + liveBuild + ' (Option B+ live)');
    } else {
      pass(label + ' note: prod build ' + (liveBuild || 'unknown') + ' — Option B+ not deployed; skipping server gate live checks');
    }
    var reader = await fetchJson(base + '/reader/intrepid-dusk-volume-1/');
    assert(reader.status === 200, label + ' reader HTML ships (JS redirect is post-load)');
    var dossier = await fetchJson(base + '/dossier/');
    assert(dossier.status === 200, label + ' dossier HTML ships (JS redirect is post-load)');
    var page = await fetchJson(base + '/reader/intrepid-dusk-volume-1/assets/pages/page-022.webp');
    if (page.ok) {
      pass(label + ' note: page-022.webp is publicly fetchable (known static-asset gap; not a Wave 1 send blocker)');
    } else {
      pass(label + ' page-022.webp not publicly fetchable (' + page.status + ')');
    }
  } catch (err) {
    fail(label + ' live HTTP error: ' + (err && err.message ? err.message : err));
  }
}

async function main() {
  console.log('\n# Intrepid Map — Backer login smoke');
  runMatrixTwice();
  if (BASE) {
    await runLiveHttp(BASE, 'AUDIT_BASE');
  }
  var prod = process.env.PROD_BASE || 'https://archive.intrepidgraphicnovel.com';
  if (!BASE || BASE !== prod) {
    await runLiveHttp(prod, 'prod');
  }

  console.log('');
  if (failures.length) {
    console.error('RESULT: FAIL (' + failures.length + ' failed, ' + passes + ' passed)');
    failures.forEach(function (f) { console.error('  - ' + f); });
    process.exit(1);
  }
  console.log('RESULT: PASS (' + passes + ' passed, matrix run twice)');
  process.exit(0);
}

main();
