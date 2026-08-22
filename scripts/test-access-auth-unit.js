#!/usr/bin/env node
"use strict";

process.env.ACCESS_SIGNING_SECRET = "unit-test-secret-not-for-prod";
process.env.ACCESS_COOKIE_VERSION = "1";
process.env.READER_ACCESS_CODE = "scribe4";
process.env.CARTOGRAPHER_ACCESS_CODE = "hollowlands9";

var auth = require("../netlify/lib/access-auth");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

var readerSession = auth.createSession(auth.TIER_READER);
var readerToken = auth.encodeSession(readerSession);
var decodedReader = auth.decodeSession(readerToken);
assert(decodedReader && decodedReader.tier === auth.TIER_READER, "reader token decodes");

var cartoSession = auth.createSession(auth.TIER_CARTOGRAPHER);
var cartoToken = auth.encodeSession(cartoSession);
assert(auth.decodeSession(cartoToken).tier === auth.TIER_CARTOGRAPHER, "cartographer token decodes");

var tampered = readerToken.slice(0, -1) + (readerToken.slice(-1) === "a" ? "b" : "a");
assert(auth.decodeSession(tampered) === null, "tampered token rejected");

var expired = auth.createSession(auth.TIER_READER);
expired.exp = Math.floor(Date.now() / 1000) - 10;
assert(auth.decodeSession(auth.encodeSession(expired)) === null, "expired token rejected");

assert(auth.resolveTierFromCode("scribe4") === auth.TIER_READER, "scribe4 resolves reader");
assert(auth.resolveTierFromCode("HOLLOWLANDS9") === auth.TIER_CARTOGRAPHER, "hollowlands9 case-insensitive");
assert(auth.resolveTierFromCode("wrong") === null, "wrong code null");
assert(auth.tierMeetsRequirement(auth.TIER_READER, auth.TIER_READER), "reader meets reader");
assert(!auth.tierMeetsRequirement(auth.TIER_READER, auth.TIER_CARTOGRAPHER), "reader not cartographer");

var event = {
  headers: {
    cookie: auth.COOKIE_NAME + "=" + encodeURIComponent(readerToken),
  },
};
var session = auth.readSessionFromEvent(event);
assert(session && session.tier === auth.TIER_READER, "read session from cookie header");

console.log("\nRESULT: PASS\n");
