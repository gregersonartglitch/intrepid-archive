#!/usr/bin/env node
/**
 * Archive post-unlock MailerLite opt-in smoke (build 238).
 * Run: node scripts/smoke-archive-optin.js
 * Exit 0 = pass, 1 = fail
 *
 * Static contract: login vs newsletter card, sources, skip paths (no POST),
 * returning-user flags, hub quiet link, viewport CSS. Live screenshots are manual.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
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

function extractFunction(src, name) {
  var needle = 'function ' + name + '(';
  var start = src.indexOf(needle);
  if (start < 0) return null;
  var brace = src.indexOf('{', start);
  if (brace < 0) return null;
  var depth = 0;
  for (var i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function run() {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var ignore = fs.readFileSync(path.join(ROOT, '.netlifyignore'), 'utf8');
  var backupPath = path.join(ROOT, 'index.html.bak-preoptin-2026-08-21');

  console.log('\n[markup] login card + newsletter card');
  assert(/id="entry-login-step"/.test(html), 'login step wrapper present');
  assert(/id="entry-optin-step"/.test(html), 'post-unlock opt-in step present');
  assert(/id="entry-access-pw"/.test(html), 'access word input present');
  assert(/id="entry-access-eye"/.test(html), 'password eye toggle present');
  assert(/aria-label="Show access password"/.test(html), 'eye toggle aria-label present');
  assert(/cuneiform-btn__layer--latin">Unlock Archive</.test(html), 'Unlock Archive latin label present');
  assert(/id="entry-access-btn"[\s\S]{0,200}aria-label="Unlock Archive"/.test(html), 'Unlock Archive aria-label on gold button');
  assert(html.indexOf('No access word? Get notified when guest access opens') !== -1, 'guest notify copy uses access word');
  assert(html.indexOf('Stay connected with Intrepid Dusk') !== -1, 'opt-in heading copy');
  assert(html.indexOf('Join the email list') !== -1, 'primary join CTA');
  assert(html.indexOf('Continue without joining') !== -1, 'secondary skip CTA');
  assert(html.indexOf('Your Archive is already unlocked. This step is optional.') !== -1, 'optional-step note');
  assert(/id="entry-optin-close"[\s\S]{0,80}aria-label="Close"/.test(html), 'opt-in Close control with aria-label');
  assert(/id="archive-hub-optin"[\s\S]{0,80}Get email updates/.test(html), 'quiet hub Get email updates link');

  var optinChunk = html.slice(html.indexOf('id="entry-optin-step"'), html.indexOf('id="archive-home"'));
  assert(optinChunk.indexOf('type="checkbox"') === -1, 'post-unlock step has no consent checkbox');
  assert(optinChunk.indexOf('name="nickname"') === -1, 'post-unlock step has no nickname field');
  assert(optinChunk.indexOf('name="tier"') === -1, 'post-unlock step has no tier field');
  assert(optinChunk.indexOf('opt_in_source" value="archive-post-unlock"') !== -1, 'opt-in form source archive-post-unlock');
  assert(optinChunk.indexOf('name="marketing_opt_in" value="yes"') !== -1, 'opt-in form posts marketing_opt_in=yes');
  assert(optinChunk.indexOf('name="email"') !== -1, 'opt-in form has email');
  assert(optinChunk.indexOf('name="hollowlands-follow"') !== -1, 'opt-in reuses hollowlands-follow');
  assert(html.indexOf('Thanks — your signup was recorded. Your Archive is already open.') !== -1, 'success copy is recorded-not-inbox');

  var guestChunk = html.slice(html.indexOf('id="entry-follow-form"'), html.indexOf('id="entry-optin-step"'));
  assert(guestChunk.indexOf('opt_in_source" value="archive-entry-follow"') !== -1, 'guest notify source stays archive-entry-follow');
  assert(guestChunk.indexOf('name="nickname"') !== -1, 'guest notify still collects nickname');
  assert(guestChunk.indexOf('type="checkbox"') !== -1, 'guest notify still has explicit checkbox');

  console.log('\n[flags + storage]');
  assert(/var ENABLE_ARCHIVE_POST_UNLOCK_OPTIN = true/.test(html), 'ENABLE_ARCHIVE_POST_UNLOCK_OPTIN default ON with kill switch');
  assert(html.indexOf("intrepid_archive_optin_prompted_v1") !== -1, 'prompted flag key');
  assert(html.indexOf("intrepid_archive_optin_submitted_v1") !== -1, 'submitted flag key');
  assert(html.indexOf("intrepid_follow_signup_disabled") !== -1, 'shared follow kill switch still present');
  assert(/get\('optin'\) === '0'/.test(html), 'URL ?optin=0 kill present');

  console.log('\n[flow] unlock vs invalid vs skip');
  var submitFn = extractFunction(html, 'submitEntryAccess');
  assert(!!submitFn, 'submitEntryAccess extracted');
  if (submitFn) {
    assert(submitFn.indexOf('maybeContinueAfterUnlock()') !== -1, 'valid code continues to opt-in helper');
    assert(!/result\.ok\)[\s\S]{0,400}enterArchiveHome\(\)/.test(submitFn), 'valid code does not jump straight to hub');
    assert(submitFn.indexOf('That access word was not recognized') !== -1, 'invalid code still errors');
    assert(submitFn.indexOf('showArchiveOptinStep') === -1, 'invalid path does not open opt-in from submitEntryAccess');
    assert(submitFn.indexOf('markArchiveOptinPrompted') === -1, 'invalid path does not mark prompted');
  }

  var maybeFn = extractFunction(html, 'maybeContinueAfterUnlock');
  assert(!!maybeFn, 'maybeContinueAfterUnlock extracted');
  if (maybeFn) {
    assert(maybeFn.indexOf('shouldOfferArchiveOptin()') !== -1, 'opt-in offer gated after unlock');
    assert(maybeFn.indexOf('showArchiveOptinStep()') !== -1, 'offer shows newsletter card');
    assert(maybeFn.indexOf('enterArchiveHome()') !== -1, 'already-submitted/kill falls through to hub');
  }

  var skipFn = extractFunction(html, 'skipArchiveOptin');
  assert(!!skipFn, 'skipArchiveOptin extracted');
  if (skipFn) {
    assert(skipFn.indexOf('fetch(') === -1, 'Continue/Close/Escape helper posts nothing');
    assert(skipFn.indexOf('enterArchiveHome()') !== -1, 'skip enters hub');
    assert(skipFn.indexOf('markArchiveOptinSubmitted') === -1, 'skip does not mark submitted');
  }

  var payloadFn = extractFunction(html, 'buildArchiveOptinPayload');
  assert(!!payloadFn, 'buildArchiveOptinPayload extracted');
  if (payloadFn) {
    assert(payloadFn.indexOf("'archive-post-unlock'") !== -1, 'join payload source archive-post-unlock');
    assert(payloadFn.indexOf("marketing_opt_in: 'yes'") !== -1, 'join payload marketing_opt_in=yes');
    assert(payloadFn.indexOf('nickname') === -1, 'join payload has no nickname');
    assert(payloadFn.indexOf('email:') !== -1, 'join payload includes email');
  }

  var submitOptinFn = extractFunction(html, 'submitArchiveOptin');
  assert(!!submitOptinFn, 'submitArchiveOptin extracted');
  if (submitOptinFn) {
    assert(submitOptinFn.indexOf("method: 'POST'") !== -1, 'join POSTs to Netlify');
    assert(submitOptinFn.indexOf('markArchiveOptinSubmitted()') !== -1, 'success marks submitted');
    assert(submitOptinFn.indexOf('Thanks — your signup was recorded. Your Archive is already open.') !== -1, 'success copy on 200');
    assert(submitOptinFn.indexOf('Your Archive stays open') !== -1, 'network fail keeps access');
    var catchPart = submitOptinFn.slice(submitOptinFn.indexOf('.catch'));
    assert(catchPart.indexOf('markArchiveOptinSubmitted') === -1, 'network fail does not mark submitted');
  }

  var wireFn = extractFunction(html, 'wireArchiveOptin');
  assert(!!wireFn, 'wireArchiveOptin extracted');
  if (wireFn) {
    assert(wireFn.indexOf("e.key !== 'Escape'") !== -1, 'Escape is wired');
    assert(wireFn.indexOf('skipArchiveOptin()') !== -1, 'Close/Continue/Escape share skip helper');
    assert(wireFn.indexOf('fetch(') === -1, 'wireArchiveOptin itself does not POST');
  }

  var bootOfferFn = extractFunction(html, 'shouldOfferArchiveOptinOnBoot');
  assert(!!bootOfferFn, 'shouldOfferArchiveOptinOnBoot extracted');
  if (bootOfferFn) {
    assert(bootOfferFn.indexOf('hasArchiveOptinPrompted()') !== -1, 'returning prompted users skip the card');
    assert(bootOfferFn.indexOf('hasDirectArchiveIntent()') !== -1, 'map/edit deep links skip the card');
  }

  var hubFn = extractFunction(html, 'renderHubOptinLink');
  assert(!!hubFn, 'renderHubOptinLink extracted');
  if (hubFn) {
    assert(hubFn.indexOf('hasArchiveOptinSubmitted()') !== -1, 'hub link hides after successful join');
    assert(hubFn.indexOf('isArchivePostUnlockOptinEnabled()') !== -1, 'hub link respects kill switch');
  }

  console.log('\n[codes] scribe4 / hollowlands9 stay server-side; invalid stays local');
  var visible = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  assert(visible.toLowerCase().indexOf('scribe4') === -1, 'scribe4 absent from markup');
  assert(visible.toLowerCase().indexOf('hollowlands9') === -1, 'hollowlands9 absent from markup');
  assert(html.indexOf('maybeContinueAfterUnlock()') !== -1, 'both valid codes share post-unlock opt-in (scribe4 and hollowlands9)');

  console.log('\n[viewports + backup]');
  assert(html.indexOf('max-width: 90vw') !== -1, 'gate card scales on narrow viewports');
  assert(html.indexOf('.gate-card.is-optin { padding: 48px 22px 28px; }') !== -1, 'mobile padding for opt-in card');
  assert(html.indexOf('window.INTREPID_BUILD = 238') !== -1, 'INTREPID_BUILD is 238');
  assert(html.indexOf('fog.js?v=238') !== -1, 'fog.js cache buster is 238');
  assert(fs.existsSync(backupPath), 'pre-optin backup file exists');
  assert(ignore.indexOf('index.html.bak-preoptin-2026-08-21') !== -1, 'backup excluded from Netlify publish');
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
