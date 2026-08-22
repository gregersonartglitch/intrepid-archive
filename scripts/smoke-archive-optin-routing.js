#!/usr/bin/env node
/**
 * Isolated Archive opt-in — step 1 routing + MailerLite config (217 baseline).
 * Does not require later reader-shell / dossier-shell / access-login work.
 * Run: node scripts/smoke-archive-optin-routing.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var { execSync } = require('child_process');

var ROOT = path.join(__dirname, '..');
var LIVE = '7fa2bc6';
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

function run() {
  var ml = fs.readFileSync(path.join(ROOT, 'mailerlite-config.js'), 'utf8');
  var redirects = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
  var toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  var backer = fs.readFileSync(path.join(ROOT, 'backer/index.html'), 'utf8');

  console.log('\n[MailerLite config]');
  assert(ml.indexOf("backerSource: 'archive_backer_optin'") !== -1, 'source archive_backer_optin');
  assert(ml.indexOf("publicSource: 'archive_public_waitlist'") !== -1, 'source archive_public_waitlist');
  assert(ml.indexOf("backerActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196515214173144716/subscribe'") !== -1, 'official backer form URL');
  assert(ml.indexOf("publicActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe'") !== -1, 'official public waitlist URL');
  assert(ml.indexOf('API token') !== -1, 'config warns not to put API tokens here');
  assert(!/MAILERLITE_API|apiKey|Bearer /.test(ml), 'no MailerLite API key in config');

  var sandbox = { window: {} };
  vm.runInNewContext(ml, sandbox);
  assert(sandbox.window.INTREPID_MAILERLITE.backerActionUrl !== sandbox.window.INTREPID_MAILERLITE.publicActionUrl, 'backer and public URLs stay separate');

  console.log('\n[routing]');
  assert(/\/backer\s+\/index.html\s+200!/.test(redirects), '_redirects /backer rewrite');
  assert(/\/backer\/\s+\/index.html\s+200!/.test(redirects), '_redirects /backer/ rewrite');
  assert(toml.indexOf('from = "/backer"') !== -1, 'netlify.toml /backer rewrite');
  assert(toml.indexOf('from = "/backer/"') !== -1, 'netlify.toml /backer/ rewrite');
  assert(backer.indexOf("params.set('entrance', 'backer')") !== -1, 'static /backer/ sets entrance=backer');
  assert(backer.indexOf('href="/?entrance=backer"') !== -1, 'static fallback link');

  console.log('\n[isolation] no later auth / protected-media / reader-shell');
  assert(toml.indexOf('to = "/.netlify/functions/access-login"') === -1, 'no access-login rewrite');
  assert(toml.indexOf('to = "/.netlify/functions/reader-shell"') === -1, 'no reader-shell rewrite');
  assert(toml.indexOf('to = "/.netlify/functions/dossier-shell"') === -1, 'no dossier-shell rewrite');
  assert(toml.indexOf('protected-media') === -1, 'no protected-media rewrite');
  assert(redirects.indexOf('legacy-asset-gone') === -1, 'no later legacy-asset 404s in _redirects');

  var changed = execSync('git diff --name-only ' + LIVE, { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  var allowed = {
    'mailerlite-config.js': true,
    'backer/index.html': true,
    'netlify.toml': true,
    '_redirects': true,
    'scripts/smoke-archive-optin-routing.js': true
  };
  var unexpected = changed.filter(function (f) { return !allowed[f]; });
  assert(unexpected.length === 0, 'only routing/config/smoke files differ from ' + LIVE + (unexpected.length ? ' (extra: ' + unexpected.join(', ') + ')' : ''));
  assert(changed.indexOf('fog.js') === -1, 'fog.js untouched');
  assert(changed.indexOf('archive-access.js') === -1, 'archive-access.js untouched');
}

run();

console.log('');
if (failures.length) {
  console.error('RESULT: FAIL (' + failures.length + ' failed, ' + passes + ' passed)');
  failures.forEach(function (f) { console.error('  - ' + f); });
  process.exit(1);
}
console.log('RESULT: PASS (' + passes + ' passed)');
process.exit(0);
