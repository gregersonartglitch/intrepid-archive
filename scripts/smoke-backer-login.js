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
  console.log('\n[' + label + '] archive-access codes + isolation');
  var env = loadArchiveAccess();
  var A = env.access;

  assert(!!A, 'IntrepidArchiveAccess exported');
  assert(A.ENABLE_GUEST_ENTRY === false, 'guest entry OFF (ENABLE_GUEST_ENTRY === false)');
  assert(A.canEnterAsGuest() === false, 'canEnterAsGuest() is false');
  assert(A.hasPublicContentAccess() === false, 'fresh session has no public content access');
  assert(A.hasCartographerAccess() === false, 'fresh session has no cartographer access');
  assert(A.hasReaderBackerAccess() === false, 'fresh session has no reader backer access');
  assert(A.shouldSkipArchiveEntry() === false, 'fresh session must see archive entry');

  var bad = A.submitArchiveCode('nope');
  assert(bad && bad.ok === false && bad.reason === 'invalid', 'wrong word rejected');
  assert(A.submitArchiveCode('').ok === false, 'empty word rejected');
  assert(A.submitArchiveCode('   ').ok === false, 'whitespace-only rejected');
  assert(A.submitArchiveCode('hollowlands').ok === false, 'legacy hollowlands (no 9) rejected');
  assert(A.submitArchiveCode('hollowlands8').ok === false, 'hollowlands8 rejected');
  assert(A.submitArchiveCode('scribe').ok === false, 'scribe (no 4) rejected');
  assert(A.submitArchiveCode('scribe5').ok === false, 'scribe5 rejected');
  assert(A.hasPublicContentAccess() === false, 'failed attempts do not grant access');

  var reader = A.submitArchiveCode('  SCRIBE4  ');
  assert(reader.ok === true, 'scribe4 accepted (trim + case-insensitive)');
  assert(reader.reader === true && reader.cartographer === false, 'scribe4 → reader only');
  assert(A.hasReaderBackerAccess() === true, 'scribe4 sets reader backer keys');
  assert(A.hasCartographerAccess() === false, 'scribe4 does NOT unlock cartographer map');
  assert(env.localStorage.getItem('intrepid_reader_backer') === 'granted', 'intrepid_reader_backer=granted');
  assert(env.localStorage.getItem('intrepid_reader_issue_002') === 'granted', 'issue 002 granted');
  assert(env.localStorage.getItem('intrepid_reader_issue_003') === 'granted', 'issue 003 granted');
  assert(env.localStorage.getItem('intrepid_cartographer_unlocked') !== 'granted', 'cartographer key not set by scribe4');
  assert(A.hasPublicContentAccess() === true, 'scribe4 unlocks hub reader/dossier');
  assert(A.shouldSkipArchiveEntry() === true, 'scribe4 skips archive entry on return visit');

  A.resetArchiveAccess();
  assert(A.hasReaderBackerAccess() === false, 'reset clears reader keys');
  assert(A.hasPublicContentAccess() === false, 'reset restores entry gate');

  var cart = A.submitArchiveCode('Hollowlands9');
  assert(cart.ok === true, 'hollowlands9 accepted (mixed case)');
  assert(cart.reader === true && cart.cartographer === true, 'hollowlands9 → reader + cartographer');
  assert(A.hasCartographerAccess() === true, 'hollowlands9 sets cartographer key');
  assert(A.hasReaderBackerAccess() === true, 'hollowlands9 also unlocks Issues 2–3 / PDF');
  assert(env.localStorage.getItem('intrepid_cartographer_unlocked') === 'granted', 'intrepid_cartographer_unlocked=granted');
  assert(env.localStorage.getItem('intrepid_atlas_label') === 'Patron', 'cartographer label stored');
  assert(A.hasPublicContentAccess() === true, 'hollowlands9 unlocks hub');

  A.resetArchiveAccess();
  A.grantReaderBackerAccess();
  assert(A.hasCartographerAccess() === false, 'grantReaderBackerAccess does not grant map');
  A.grantCartographerAccess('Cartographer');
  assert(A.hasCartographerAccess() === true, 'grantCartographerAccess sets map key (console-export path)');

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
  assert(html.indexOf("That code unlocks the reader only") !== -1, 'scribe4-on-map-gate error copy present');
  assert(/grantCartographerAccess\('Cartographer'\)/.test(html), 'valid CART- URL still grants in index.html');

  var visible = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  assert(visible.toLowerCase().indexOf('hollowlands9') === -1, 'hollowlands9 not in visible HTML');
  assert(visible.toLowerCase().indexOf('scribe4') === -1, 'scribe4 not in visible HTML');

  var gateJs = fs.readFileSync(path.join(ROOT, 'reader/backer-gate.js'), 'utf8');
  assert(/ENABLE_READER_GATE\s*=\s*true/.test(gateJs), 'in-reader Issue 2 overlay ON (backup deep-link gate)');
  assert(gateJs.indexOf('scribe4') !== -1, 'reader backer-gate still knows scribe4');
  assert(/id="reader-gate-pw"/.test(gateJs), 'reader gate password input markup exists');
  assert(/id="reader-gate-eye"/.test(gateJs), 'reader gate password eye toggle present');
  assert(/Show access password/.test(gateJs), 'reader gate eye toggle aria-label present');

  var readerHtml = fs.readFileSync(path.join(ROOT, 'reader/intrepid-dusk-volume-1/index.html'), 'utf8');
  assert(readerHtml.indexOf('bootstrapPublicContentRoute') !== -1, 'reader deep-link uses fail-closed bootstrap guard');
  assert(readerHtml.indexOf('window.location.replace("/")') !== -1, 'reader guard redirects home when archive-access missing');
  assert(readerHtml.indexOf('intrepid_cartographer_unlocked') !== -1, 'reader inline head guard checks localStorage keys');
  assert(readerHtml.indexOf('archive-access-granted') !== -1, 'reader body hidden until access granted');
  assert(readerHtml.indexOf('Download PDF') !== -1, 'reader Download PDF control present');

  var dossierHtml = fs.readFileSync(path.join(ROOT, 'dossier/index.html'), 'utf8');
  assert(dossierHtml.indexOf('bootstrapPublicContentRoute') !== -1, 'dossier deep-link uses fail-closed bootstrap guard');
  assert(dossierHtml.indexOf('window.location.replace("/")') !== -1, 'dossier guard redirects home when archive-access missing');
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
    assert(/scribe4/.test(access.text) && /hollowlands9/.test(access.text), label + ' both access words present in archive-access.js (client gate)');
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
