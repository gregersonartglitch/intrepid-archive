"use strict";

/** Per-instance bounded rate limit (best-effort on Netlify Functions). */
var buckets = Object.create(null);
var WINDOW_MS = 60 * 1000;
var MAX_ATTEMPTS = 12;

function clientIp(event) {
  var h = event.headers || {};
  return (
    h["x-nf-client-connection-ip"] ||
    h["x-forwarded-for"] ||
    h["client-ip"] ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}

function isRateLimited(event, bucketKey) {
  var ip = clientIp(event);
  var key = bucketKey + ":" + ip;
  var now = Date.now();
  var bucket = buckets[key];
  if (!bucket || now - bucket.start > WINDOW_MS) {
    buckets[key] = { start: now, count: 1 };
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_ATTEMPTS;
}

module.exports = {
  isRateLimited: isRateLimited,
  WINDOW_MS: WINDOW_MS,
  MAX_ATTEMPTS: MAX_ATTEMPTS,
};
