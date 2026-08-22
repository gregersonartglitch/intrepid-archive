#!/usr/bin/env node
/**
 * MailerLite JSONP callback lock (build 244).
 * Proves the page's subscribe callback produces a browser-usable JSONP response.
 * Empty email only — never submits a real address.
 *
 * Run: node scripts/smoke-mailerlite-jsonp.js
 */
'use strict';

var fs = require('fs');
var https = require('https');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PUBLIC_SUBSCRIBE =
  'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe';
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

function pageCallbackName(subFn) {
  if (!subFn) return null;
  if (subFn.indexOf("cbName = 'mlWebformSubmitted'") !== -1) return 'mlWebformSubmitted';
  if (subFn.indexOf('intrepidMlCb') !== -1) return 'intrepidMlCb17558700000001234';
  return null;
}

function probeCallback(callbackName) {
  var url =
    PUBLIC_SUBSCRIBE +
    '?fields%5Bemail%5D=&ml-submit=1&ajax=1&callback=' +
    encodeURIComponent(callbackName);
  return new Promise(function (resolve, reject) {
    https
      .get(url, { headers: { 'User-Agent': 'intrepid-jsonp-smoke/1 (no-signup)' } }, function (res) {
        var chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          resolve({
            status: res.statusCode,
            type: String(res.headers['content-type'] || ''),
            body: Buffer.concat(chunks).toString('utf8'),
            url: url
          });
        });
      })
      .on('error', reject);
  });
}

function isUsableJsonp(probe, callbackName) {
  if (!probe) return false;
  if (probe.status !== 200) return false;
  if (probe.type.indexOf('javascript') === -1) return false;
  return probe.body.indexOf(callbackName + '(') !== -1;
}

function run() {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var ml = fs.readFileSync(path.join(ROOT, 'mailerlite-config.js'), 'utf8');
  var subFn = extractFunction(html, 'subscribeMailerLiteForm');
  var skipFn = extractFunction(html, 'continueBackerWithoutJoining');
  var cbName = pageCallbackName(subFn);

  console.log('\n[static] page subscribe callback');
  assert(!!subFn, 'subscribeMailerLiteForm extracted');
  assert(!!cbName, 'page callback name detected (' + (cbName || 'none') + ')');
  assert(subFn.indexOf("subscribeMailerLiteForm") === 0 || !!subFn, 'subscribe helper present');
  assert(ml.indexOf("publicActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe'") !== -1, 'public form URL unchanged');
  assert(ml.indexOf("backerActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196515214173144716/subscribe'") !== -1, 'backer form URL unchanged');
  assert(ml.indexOf("publicSource: 'archive_public_waitlist'") !== -1, 'public source unchanged');
  assert(ml.indexOf("backerSource: 'archive_backer_optin'") !== -1, 'backer source unchanged');
  if (skipFn) {
    assert(skipFn.indexOf('subscribeMailerLiteForm') === -1, 'Continue Without Email still posts nothing');
  }

  return probeCallback(cbName || 'missing').then(function (pageProbe) {
    console.log('\n[live] empty-email probe of the page callback (no real address)');
    console.log('  callback=' + cbName);
    console.log('  status=' + pageProbe.status + ' type=' + pageProbe.type);
    console.log('  body=' + pageProbe.body.slice(0, 180));
    assert(
      isUsableJsonp(pageProbe, cbName),
      'page callback produces usable JSONP (javascript + ' + cbName + '(…))'
    );
    return probeCallback('intrepidMlCbLockTest');
  }).then(function (customProbe) {
    console.log('\n[live] empty-email probe of a generated custom callback');
    console.log('  status=' + customProbe.status + ' type=' + customProbe.type);
    console.log('  body=' + customProbe.body.slice(0, 180));
    assert(
      !isUsableJsonp(customProbe, 'intrepidMlCbLockTest'),
      'generated custom callback remains an unusable JSONP path'
    );
    assert(
      customProbe.type.indexOf('application/json') !== -1,
      'custom callback returns application/json (ORB-blocked as a script)'
    );
  });
}

run().then(function () {
  console.log('');
  if (failures.length) {
    console.error('RESULT: FAIL (' + failures.length + ' failed, ' + passes + ' passed)');
    failures.forEach(function (f) { console.error('  - ' + f); });
    process.exit(1);
  }
  console.log('RESULT: PASS (' + passes + ' passed)');
  process.exit(0);
}).catch(function (err) {
  console.error('RESULT: FAIL (' + err.message + ')');
  process.exit(1);
});
