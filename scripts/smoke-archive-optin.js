#!/usr/bin/env node
/**
 * Isolated Archive split-entrance + MailerLite opt-in smoke (217 + opt-in).
 * Does not require later reader-shell / dossier-shell / session-gate work.
 * Run: node scripts/smoke-archive-optin.js
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

function normalizeNewlines(s) {
  return String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
  var html = normalizeNewlines(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  var ml = normalizeNewlines(fs.readFileSync(path.join(ROOT, 'mailerlite-config.js'), 'utf8'));
  var redirects = normalizeNewlines(fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8'));
  var toml = normalizeNewlines(fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8'));
  var access = normalizeNewlines(fs.readFileSync(path.join(ROOT, 'archive-access.js'), 'utf8'));

  console.log('\n[entrances] backer vs public');
  assert(/id="archive-public"/.test(html), 'public waitlist screen present');
  assert(/id="archive-entry"/.test(html), 'backer entrance present');
  assert(html.indexOf('Guest Access Waitlist') !== -1, 'public waitlist title');
  assert(html.indexOf('Get notified when guest access opens.') !== -1, 'public waitlist copy');
  assert(html.indexOf('You’re on the waitlist!') !== -1, 'public success heading');
  assert(html.indexOf("var ML_FAIL_COPY_PUBLIC = 'We couldn’t add you right now. You can try again.';") !== -1, 'public fail copy has no Archive offer');
  assert(html.indexOf('ML_FAIL_COPY_BACKER') !== -1 && html.indexOf('continue to the Archive') !== -1, 'backer fail copy still offers Archive continue');
  assert(html.indexOf('We’ll email you when guest access opens.') !== -1, 'public success body');
  var successCss = html.slice(html.indexOf('.public-waitlist-success-title'), html.indexOf('.entry-optin-fields'));
  assert(successCss.indexOf('font-family: var(--font-ui)') !== -1, 'success uses sans-serif UI font');
  assert(successCss.indexOf('font-style: italic') === -1, 'success is not italic');
  assert(successCss.indexOf('color: var(--bone)') !== -1, 'success uses high-contrast bone');
  assert(successCss.indexOf('font-size: 18px') !== -1, 'success body is 18px on desktop');
  assert(html.indexOf('Notify Me') !== -1, 'public Notify Me CTA');
  assert(html.indexOf('Already a backer? Enter the Archive') !== -1, 'Already a backer link copy');
  assert(/href="\/backer\/"/.test(html), 'Already a backer href is /backer/');
  var alreadyCss = html.slice(html.indexOf('.entry-already-backer {'), html.indexOf('.entry-mail-form'));
  assert(alreadyCss.indexOf('font-size: 16px') !== -1, 'Already a backer is 16px on desktop');
  assert(alreadyCss.indexOf('min-height: 44px') !== -1, 'Already a backer has 44px tap target');
  assert(alreadyCss.indexOf('width: 100%') !== -1, 'Already a backer uses full text-row target');
  assert(alreadyCss.indexOf('color: var(--gold)') !== -1, 'Already a backer uses gold at rest');
  assert(alreadyCss.indexOf('outline: 2px solid var(--gold)') !== -1, 'Already a backer shows the gold boxed outline at rest');
  var mobileCss = html.slice(html.indexOf('@media (max-width: 767px)'), html.indexOf('VIP WELCOME'));
  assert(mobileCss.indexOf('.entry-already-backer') !== -1 && mobileCss.indexOf('font-size: 15px') !== -1, 'Already a backer is at least 15px on mobile');
  assert(mobileCss.indexOf('.public-waitlist-success-body') !== -1 && mobileCss.indexOf('font-size: 16px') !== -1, 'success body is at least 16px on mobile');
  assert(html.indexOf('Would you like occasional updates about Intrepid Dusk, new releases, and what comes next?') !== -1, 'backer choice question');
  assert(html.indexOf('Your choice does not affect access to your rewards.') !== -1, 'choice does not affect rewards');
  assert(html.indexOf('Yes, keep me updated') !== -1, 'Yes button');
  assert(html.indexOf('No thanks') !== -1, 'No thanks button');
  assert(html.indexOf('Subscribe and Continue') !== -1, 'backer Subscribe and Continue CTA');
  assert(html.indexOf('Continue Without Email') !== -1, 'Continue Without Email');
  assert(html.indexOf('Get occasional Archive news by email. (Optional)') !== -1, 'backer mail-step copy');
  assert(html.indexOf('Enter the Archive') !== -1, 'plain-English Enter the Archive');
  assert(/aria-label="Enter the Archive"/.test(html), 'Enter the Archive aria-label');
  assert(/id="entry-access-eye"/.test(html), 'password eye toggle remains');
  assert(/id="entry-access-pw"/.test(html), 'password field remains on backer login');
  assert(html.indexOf('Show access password') !== -1, 'eye toggle show label');
  assert(html.indexOf('Hide access password') !== -1, 'eye toggle hide label');

  var publicChunk = html.slice(html.indexOf('id="archive-public"'), html.indexOf('id="archive-entry"'));
  assert(publicChunk.indexOf('entry-access-pw') === -1, 'public screen has no password field');
  assert(publicChunk.indexOf('type="password"') === -1, 'public screen has no password input');

  var loginChunk = html.slice(html.indexOf('id="entry-login-step"'), html.indexOf('id="archive-home"'));
  assert(loginChunk.indexOf('Join the waitlist') === -1, 'password step has no waitlist form');
  assert(loginChunk.indexOf('Notify Me') === -1, 'password step has no public Notify Me CTA');
  assert(loginChunk.indexOf('Subscribe and Continue') === -1, 'password step has no backer subscribe CTA');
  assert(loginChunk.indexOf('name="nickname"') === -1, 'no nickname on login step');
  assert(loginChunk.indexOf('type="checkbox"') === -1, 'no consent checkbox on login step');

  console.log('\n[removed] combined signup clutter');
  assert(html.indexOf('id="entry-follow-form"') === -1, 'guest Netlify follow form removed');
  assert(html.indexOf('id="entry-follow-nickname"') === -1, 'nickname field removed');
  assert(html.indexOf('id="entry-optin-form"') === -1, 'post-unlock Netlify form removed');
  assert(html.indexOf('No access word? Get notified when guest access opens') === -1, 'guest-access-opens copy removed');
  assert(!/mid to late August/i.test(html), 'mid to late August language removed from index');
  assert(html.indexOf('hollowlands-follow') === -1, 'Netlify hollowlands-follow not on entry screens');

  console.log('\n[MailerLite] official form, fail closed, no API key');
  assert(ml.indexOf("backerSource: 'archive_backer_optin'") !== -1, 'source archive_backer_optin');
  assert(ml.indexOf("publicSource: 'archive_public_waitlist'") !== -1, 'source archive_public_waitlist');
  assert(ml.indexOf('Intrepid Dusk Archive Opt-ins') !== -1, 'backer group name documented');
  assert(ml.indexOf('Intrepid Dusk Public Waitlist') !== -1, 'public group name documented');
  assert(ml.indexOf("backerActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196515214173144716/subscribe'") !== -1, 'backer action URL is official Archive Opt-ins form');
  assert(ml.indexOf("publicActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe'") !== -1, 'public action URL is official waitlist form');
  assert(ml.indexOf('196515214173144716') !== -1 && ml.indexOf('196516110968817063') !== -1, 'backer and public form IDs are both present');
  assert(ml.indexOf("backerActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe'") === -1, 'public URL is not assigned to backerActionUrl');
  assert(ml.indexOf("publicActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196515214173144716/subscribe'") === -1, 'backer URL is not assigned to publicActionUrl');
  assert(ml.indexOf('api token') !== -1 || ml.indexOf('API token') !== -1, 'config warns not to put API tokens here');
  assert(!/MAILERLITE_API|apiKey|Bearer [A-Za-z0-9]/.test(html), 'no MailerLite API key in index.html');
  assert(!/Bearer|MAILERLITE_API/.test(ml), 'no MailerLite API key in config');

  var subFn = extractFunction(html, 'subscribeMailerLiteForm');
  assert(!!subFn, 'subscribeMailerLiteForm extracted');
  if (subFn) {
    assert(subFn.indexOf("reject(new Error('not-configured'))") !== -1, 'empty form URL fails closed');
    assert(subFn.indexOf('isMailerLiteSuccessPayload') !== -1, 'success requires MailerLite payload');
    assert(subFn.indexOf("fetch('/')") === -1, 'does not POST to Netlify Forms');
    assert(subFn.indexOf("cbName = 'mlWebformSubmitted'") !== -1, 'JSONP callback is MailerLite mlWebformSubmitted');
    assert(subFn.indexOf('intrepidMlCb') === -1, 'generated intrepidMlCb callback removed');
  }

  var successFn = extractFunction(html, 'isMailerLiteSuccessPayload');
  assert(!!successFn, 'isMailerLiteSuccessPayload extracted');

  console.log('\n[flow] No thanks / Continue / failure never block');
  var noFn = extractFunction(html, 'declineBackerMailing');
  assert(!!noFn, 'declineBackerMailing extracted');
  if (noFn) {
    assert(noFn.indexOf('subscribeMailerLiteForm') === -1, 'No thanks makes no MailerLite request');
    assert(noFn.indexOf("setMailingChoice('declined')") !== -1, 'No thanks records declined');
    assert(noFn.indexOf('setPublicWaitlistState') === -1, 'No thanks does not write public waitlist state');
    assert(noFn.indexOf('continueAfterBackerMailing()') !== -1, 'No thanks continues via shared after-choice helper');
  }

  var skipFn = extractFunction(html, 'continueBackerWithoutJoining');
  assert(!!skipFn, 'continueBackerWithoutJoining extracted');
  if (skipFn) {
    assert(skipFn.indexOf('subscribeMailerLiteForm') === -1, 'Continue Without Email posts nothing');
    assert(skipFn.indexOf('setPublicWaitlistState') === -1, 'Continue Without Email does not write public waitlist state');
    assert(skipFn.indexOf('continueAfterBackerMailing()') !== -1, 'Continue Without Email continues via shared after-choice helper');
  }

  var joinFn = extractFunction(html, 'submitBackerMailing');
  assert(!!joinFn, 'submitBackerMailing extracted');
  if (joinFn) {
    assert(joinFn.indexOf("subscribeMailerLiteForm('backer'") !== -1, 'backer Join hits MailerLite backer form');
    assert(joinFn.indexOf('You are subscribed!') !== -1, 'success copy only on then() after ML');
    assert(joinFn.indexOf('ML_FAIL_COPY_BACKER') !== -1, 'backer failure uses Archive continue copy');
    assert(joinFn.indexOf("setMailingChoice('joined')") !== -1, 'joined only after ML then()');
    assert(joinFn.indexOf('setPublicWaitlistState') === -1, 'backer join does not write public waitlist state');
    var catchPart = joinFn.slice(joinFn.indexOf('.catch'));
    assert(catchPart.indexOf('You are subscribed!') === -1, 'failure does not claim joined');
    assert(catchPart.indexOf("setMailingChoice('joined')") === -1, 'failure does not record joined');
  }

  var publicFn = extractFunction(html, 'submitPublicWaitlist');
  assert(!!publicFn, 'submitPublicWaitlist extracted');
  if (publicFn) {
    assert(publicFn.indexOf("subscribeMailerLiteForm('public'") !== -1, 'public Notify Me hits MailerLite public form');
    assert(publicFn.indexOf('renderPublicWaitlistState') !== -1, 'public success reveal only on then() after ML');
    assert(publicFn.indexOf('ML_FAIL_COPY_PUBLIC') !== -1, 'public failure uses guest waitlist copy');
    assert(publicFn.indexOf('continue to the Archive') === -1, 'public failure does not offer Archive access');
    assert(publicFn.indexOf("setPublicWaitlistState('joined')") !== -1, 'public success writes public waitlist state only');
    assert(publicFn.indexOf('setMailingChoice') === -1, 'public Notify Me does not write backer choice');
    var publicCatch = publicFn.slice(publicFn.indexOf('.catch'));
    assert(publicCatch.indexOf('You’re on the waitlist!') === -1, 'public failure does not claim waitlist success');
    assert(publicCatch.indexOf('renderPublicWaitlistState') === -1, 'public failure does not reveal success block');
    assert(publicCatch.indexOf("setPublicWaitlistState('joined')") === -1, 'public failure does not record public joined');
    assert(publicCatch.indexOf("setMailingChoice('joined')") === -1, 'public failure does not record backer joined');
  }

  var submitFn = extractFunction(html, 'submitEntryAccess');
  assert(!!submitFn, 'submitEntryAccess extracted');
  if (submitFn) {
    assert(submitFn.indexOf('enterArchiveHome()') !== -1, 'valid code enters hub after password');
    assert(submitFn.indexOf('That access word was not recognized') !== -1, 'invalid code still errors');
    assert(submitFn.indexOf('subscribeMailerLiteForm') === -1, 'password submit does not email signup');
    assert(submitFn.indexOf('.then(') === -1, '217 client submitArchiveCode stays synchronous');
  }

  console.log('\n[state] independent backer/public keys, no stored email, reset does not clear');
  var setChoice = extractFunction(html, 'setMailingChoice');
  assert(!!setChoice, 'setMailingChoice extracted');
  if (setChoice) {
    assert(setChoice.indexOf('email') === -1, 'backer choice setter does not store email');
    assert(setChoice.indexOf('LS_ML_CHOICE') !== -1, 'backer setter writes backer key only');
    assert(setChoice.indexOf('LS_ML_PUBLIC') === -1, 'backer setter does not write public key');
    assert(setChoice.indexOf('joined') !== -1 && setChoice.indexOf('declined') !== -1, 'backer choice is joined or declined');
  }
  var setPublic = extractFunction(html, 'setPublicWaitlistState');
  assert(!!setPublic, 'setPublicWaitlistState extracted');
  if (setPublic) {
    assert(setPublic.indexOf('email') === -1, 'public setter does not store email');
    assert(setPublic.indexOf('LS_ML_PUBLIC') !== -1, 'public setter writes public key only');
    assert(setPublic.indexOf('LS_ML_CHOICE') === -1, 'public setter does not write backer key');
  }
  var renderPublic = extractFunction(html, 'renderPublicWaitlistState');
  assert(!!renderPublic, 'renderPublicWaitlistState extracted');
  if (renderPublic) {
    assert(renderPublic.indexOf('getPublicWaitlistState()') !== -1, 'public screen reads public waitlist state');
    assert(renderPublic.indexOf('getMailingChoice()') === -1, 'public screen does not read backer choice');
    assert(renderPublic.indexOf("=== 'declined'") === -1, 'public screen is not hidden by backer declined');
  }
  var afterFn = extractFunction(html, 'continueAfterBackerMailing');
  assert(!!afterFn, 'continueAfterBackerMailing extracted');
  if (afterFn) {
    assert(afterFn.indexOf('shouldSkipArchiveEntry()') !== -1, 'already-unlocked backers skip password after choice');
    assert(afterFn.indexOf('enterArchiveHome()') !== -1, 'already-unlocked backers continue into the hub');
    assert(afterFn.indexOf("showArchiveEntry({ step: 'login'") !== -1, 'locked backers still reach password after choice');
  }
  var promptFn = extractFunction(html, 'shouldPromptBackerMailing');
  assert(!!promptFn, 'shouldPromptBackerMailing extracted');
  if (promptFn) {
    assert(promptFn.indexOf('isBackerEntrance()') !== -1, 'prompt is backer-entrance only');
    assert(promptFn.indexOf("getMailingChoice() === 'not_asked'") !== -1, 'prompt uses backer choice only');
    assert(promptFn.indexOf('getPublicWaitlistState') === -1, 'public waitlist join does not skip backer choice');
  }
  var backerEnt = extractFunction(html, 'isBackerEntrance');
  assert(!!backerEnt, 'isBackerEntrance extracted');
  if (backerEnt) {
    assert(backerEnt.indexOf("path === '/backer'") !== -1, 'path /backer is a backer entrance');
    assert(backerEnt.indexOf("params.get('entrance') === 'backer'") !== -1, 'query entrance=backer is a backer entrance');
    assert(backerEnt.indexOf("params.has('entry')") === -1, 'later-build ?entry= is not a backer entrance');
  }
  assert(html.indexOf("intrepid_archive_ml_choice_v1") !== -1, 'backer choice key retained');
  assert(html.indexOf("intrepid_archive_ml_public_waitlist_v1") !== -1, 'separate public waitlist key');
  assert(access.indexOf('intrepid_archive_ml_choice_v1') === -1, 'resetArchiveAccess keys do not include backer mailing choice');
  assert(access.indexOf('intrepid_archive_ml_public_waitlist_v1') === -1, 'resetArchiveAccess keys do not include public waitlist state');
  assert(access.indexOf('scribe4') !== -1 && access.indexOf('hollowlands9') !== -1, '217 client codes remain');
  assert(access.indexOf('ENABLE_GUEST_ENTRY = false') !== -1, 'guest entry remains off');

  console.log('\n[routing + 217 isolation]');
  assert(/\/backer\s+\/index.html\s+200!/.test(redirects) || /from = "\/backer"/.test(toml), '/backer rewrite present');
  assert(toml.indexOf('from = "/backer/"') !== -1, 'netlify.toml /backer/ rewrite');
  assert(toml.indexOf('to = "/.netlify/functions/access-login"') === -1, 'no access-login rewrite');
  assert(toml.indexOf('to = "/.netlify/functions/reader-shell"') === -1, 'no reader-shell rewrite');
  assert(toml.indexOf('to = "/.netlify/functions/dossier-shell"') === -1, 'no dossier-shell rewrite');
  assert(html.indexOf('window.INTREPID_BUILD = 248') !== -1, 'INTREPID_BUILD is 248 (217 + isolated opt-in corrections)');
  assert(html.indexOf('fog.js?v=217') !== -1, 'fog.js cache buster stays 217');
  assert(html.indexOf('archive-access.js?v=209') !== -1, 'archive-access cache buster stays 209');
  assert(html.indexOf('mailerlite-config.js?v=248') !== -1, 'mailerlite-config cache buster is 248');
  assert(html.indexOf('refreshSession') === -1, 'no later session refresh boot');
  assert(fs.existsSync(path.join(ROOT, 'backer/index.html')), 'backer/index.html exists for static hosts');

  var initAt = html.indexOf('INIT');
  var bootStart = html.indexOf('if (hasDirectArchiveIntent()) {', initAt);
  var bootEnd = html.indexOf('wireArchiveEntrances();', bootStart);
  var bootFn = bootStart >= 0 && bootEnd > bootStart ? html.slice(bootStart, bootEnd) : '';
  var crlfBoot = bootFn.replace(/\n/g, '\r\n');
  var crlfExtracted = normalizeNewlines(crlfBoot);
  assert(bootFn.indexOf('checkGate()') !== -1, 'direct map/scan/key still skip mailing');
  assert(bootFn.indexOf('shouldPromptBackerMailing()') !== -1, 'unlocked backers can still be asked the required choice');
  assert(bootFn.indexOf('shouldPromptBackerMailing()') < bootFn.indexOf('shouldSkipArchiveEntry()'), 'required backer choice is checked before skip-entry');
  assert(bootFn.indexOf('showPublicWaitlist()') !== -1, 'public path shows waitlist');
  assert(bootFn.indexOf('isArchiveMailingEnabled()') !== -1, 'kill switch can restore password-on-/');
  assert(crlfExtracted.indexOf('shouldPromptBackerMailing()') !== -1, 'boot extract still finds prompt after CRLF normalize');
  assert(crlfExtracted.indexOf('shouldSkipArchiveEntry()') !== -1, 'boot extract still finds skip-entry after CRLF normalize');

  console.log('\n[codes] not in visible HTML');
  var visible = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  assert(visible.toLowerCase().indexOf('scribe4') === -1, 'scribe4 absent from markup');
  assert(visible.toLowerCase().indexOf('hollowlands9') === -1, 'hollowlands9 absent from markup');

  console.log('\n[config module]');
  var sandbox = { window: {} };
  vm.runInNewContext(ml, sandbox);
  assert(sandbox.window.INTREPID_MAILERLITE.backerActionUrl === 'https://assets.mailerlite.com/jsonp/875026/forms/196515214173144716/subscribe', 'config loads official backer form URL');
  assert(sandbox.window.INTREPID_MAILERLITE.publicActionUrl === 'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe', 'config loads official public waitlist URL');
  assert(sandbox.window.INTREPID_MAILERLITE.backerActionUrl !== sandbox.window.INTREPID_MAILERLITE.publicActionUrl, 'backer and public form URLs stay separate');
  assert(sandbox.window.INTREPID_MAILERLITE.publicSource === 'archive_public_waitlist', 'public source value');
  assert(sandbox.window.INTREPID_MAILERLITE.backerSource === 'archive_backer_optin', 'backer source value');

  console.log('\n[isolation] files vs live ' + LIVE);
  var changed = execSync('git diff --name-only ' + LIVE, { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  var forbidden = changed.filter(function (f) {
    return f === 'fog.js' ||
      f === 'archive-access.js' ||
      f.indexOf('reader/') === 0 ||
      f.indexOf('dossier/') === 0 ||
      f.indexOf('netlify/functions/') === 0 ||
      f.indexOf('netlify/lib/') === 0;
  });
  assert(forbidden.length === 0, 'no map/auth/reader/dossier files vs live' + (forbidden.length ? ' (hit: ' + forbidden.join(', ') + ')' : ''));
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
