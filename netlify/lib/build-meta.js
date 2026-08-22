"use strict";

/** Keep in sync with index.html INTREPID_BUILD on deploy-worthy changes. */
var INTREPID_BUILD = 245;

var COMMIT_SHA =
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA)) ||
  "dev";

module.exports = {
  INTREPID_BUILD: INTREPID_BUILD,
  COMMIT_SHA: COMMIT_SHA,
};
