#!/usr/bin/env node
/**
 * Archive split-entrance + MailerLite opt-in smoke (build 242).
 * Run: node scripts/smoke-archive-optin.js
 * Exit 0 = pass, 1 = fail
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

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
  var ml = fs.readFileSync(path.join(ROOT, 'mailerlite-config.js'), 'utf8');
  var redirects = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
  var toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  var readerShell = fs.readFileSync(path.join(ROOT, 'netlify/functions/reader-shell.js'), 'utf8');
  var dossierShell = fs.readFileSync(path.join(ROOT, 'netlify/functions/dossier-shell.js'), 'utf8');
  var access = fs.readFileSync(path.join(ROOT, 'archive-access.js'), 'utf8');

  console.log('\n[entrances] backer vs public');
  assert(/id="archive-public"/.test(html), 'public waitlist screen present');
  assert(/id="archive-entry"/.test(html), 'backer entrance present');
  assert(html.indexOf('Guest Access Waitlist') !== -1, 'public waitlist title');
  assert(html.indexOf('Get notified when guest access opens.') !== -1, 'public waitlist copy');
  assert(html.indexOf('Notify Me') !== -1, 'public Notify Me CTA');
  assert(html.indexOf('Already a backer? Enter the Archive') !== -1, 'Already a backer link copy');
  assert(/href="\/backer\/"/.test(html), 'Already a backer href is /backer/');
  var alreadyCss = html.slice(html.indexOf('.entry-already-backer {'), html.indexOf('.entry-mail-form'));
  assert(alreadyCss.indexOf('font-size: 16px') !== -1, 'Already a backer is 16px on desktop');
  assert(alreadyCss.indexOf('min-height: 44px') !== -1, 'Already a backer has 44px tap target');
  assert(alreadyCss.indexOf('width: 100%') !== -1, 'Already a backer uses full text-row target');
  assert(alreadyCss.indexOf('color: var(--bone)') !== -1, 'Already a backer uses high-contrast bone');
  assert(alreadyCss.indexOf('outline: 2px solid var(--gold)') !== -1, 'Already a backer keeps visible focus ring');
  var mobileCss = html.slice(html.indexOf('@media (max-width: 767px)'), html.indexOf('VIP WELCOME'));
  assert(mobileCss.indexOf('.entry-already-backer') !== -1 && mobileCss.indexOf('font-size: 15px') !== -1, 'Already a backer is at least 15px on mobile');
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
  }

  var successFn = extractFunction(html, 'isMailerLiteSuccessPayload');
  assert(!!successFn, 'isMailerLiteSuccessPayload extracted');

  console.log('\n[flow] No thanks / Continue / failure never block');
  var noFn = extractFunction(html, 'declineBackerMailing');
  assert(!!noFn, 'declineBackerMailing extracted');
  if (noFn) {
    assert(noFn.indexOf('subscribeMailerLiteForm') === -1, 'No thanks makes no MailerLite request');
    assert(noFn.indexOf("setMailingChoice('declined')") !== -1, 'No thanks records declined');
    assert(noFn.indexOf("showArchiveEntry({ step: 'login'") !== -1, 'No thanks goes to password immediately');
  }

  var skipFn = extractFunction(html, 'continueBackerWithoutJoining');
  assert(!!skipFn, 'continueBackerWithoutJoining extracted');
  if (skipFn) {
    assert(skipFn.indexOf('subscribeMailerLiteForm') === -1, 'Continue Without Email posts nothing');
    assert(skipFn.indexOf("showArchiveEntry({ step: 'login'") !== -1, 'Continue Without Email goes to password');
  }

  var joinFn = extractFunction(html, 'submitBackerMailing');
  assert(!!joinFn, 'submitBackerMailing extracted');
  if (joinFn) {
    assert(joinFn.indexOf("subscribeMailerLiteForm('backer'") !== -1, 'backer Join hits MailerLite backer form');
    assert(joinFn.indexOf('You are subscribed!') !== -1, 'success copy only on then() after ML');
    assert(joinFn.indexOf('ML_FAIL_COPY') !== -1, 'failure uses specified copy');
    assert(joinFn.indexOf("setMailingChoice('joined')") !== -1, 'joined only after ML then()');
    var catchPart = joinFn.slice(joinFn.indexOf('.catch'));
    assert(catchPart.indexOf('You are subscribed!') === -1, 'failure does not claim joined');
    assert(catchPart.indexOf("setMailingChoice('joined')") === -1, 'failure does not record joined');
  }

  var publicFn = extractFunction(html, 'submitPublicWaitlist');
  assert(!!publicFn, 'submitPublicWaitlist extracted');
  if (publicFn) {
    assert(publicFn.indexOf("subscribeMailerLiteForm('public'") !== -1, 'public Notify Me hits MailerLite public form');
    assert(publicFn.indexOf('You are on the waitlist!') !== -1, 'public success copy only on then() after ML');
    assert(publicFn.indexOf('ML_FAIL_COPY') !== -1, 'public failure uses specified copy');
    var publicCatch = publicFn.slice(publicFn.indexOf('.catch'));
    assert(publicCatch.indexOf('You are on the waitlist!') === -1, 'public failure does not claim waitlist success');
    assert(publicCatch.indexOf("setMailingChoice('joined')") === -1, 'public failure does not record joined');
  }

  var submitFn = extractFunction(html, 'submitEntryAccess');
  assert(!!submitFn, 'submitEntryAccess extracted');
  if (submitFn) {
    assert(submitFn.indexOf('enterArchiveHome()') !== -1, 'valid code enters hub after password');
    assert(submitFn.indexOf('That access word was not recognized') !== -1, 'invalid code still errors');
    assert(submitFn.indexOf('subscribeMailerLiteForm') === -1, 'password submit does not email signup');
  }

  console.log('\n[state] choice only, no stored email, reset does not clear');
  var setChoice = extractFunction(html, 'setMailingChoice');
  assert(!!setChoice, 'setMailingChoice extracted');
  if (setChoice) {
    assert(setChoice.indexOf('email') === -1, 'choice setter does not store email');
    assert(setChoice.indexOf('joined') !== -1 && setChoice.indexOf('declined') !== -1, 'choice is joined or declined');
  }
  assert(html.indexOf("intrepid_archive_ml_choice_v1") !== -1, 'local choice key');
  assert(access.indexOf('intrepid_archive_ml_choice_v1') === -1, 'resetArchiveAccess keys do not include mailing choice');

  console.log('\n[routing]');
  assert(/\/backer\s+\/index.html\s+200!/.test(redirects) || /from = "\/backer"/.test(toml), '/backer rewrite present');
  assert(toml.indexOf('from = "/backer/"') !== -1, 'netlify.toml /backer/ rewrite');
  assert(readerShell.indexOf('/backer/?entry=required') !== -1, 'reader-shell bounces to backer entrance');
  assert(dossierShell.indexOf('/backer/?entry=required') !== -1, 'dossier-shell bounces to backer entrance');
  assert(html.indexOf('window.INTREPID_BUILD = 242') !== -1, 'INTREPID_BUILD is 242');
  assert(html.indexOf('fog.js?v=242') !== -1, 'fog.js cache buster is 242');
  assert(html.indexOf('mailerlite-config.js?v=242') !== -1, 'mailerlite-config cache buster is 242');
  assert(fs.existsSync(path.join(ROOT, 'backer/index.html')), 'backer/index.html exists for static hosts');

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
