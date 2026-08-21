/**
 * Official MailerLite generated-form endpoints.
 * These are public form action URLs from Forms → Embedded → HTML (the form action=).
 * They are not API keys. Do not put a MailerLite API token in this file or in page JS.
 *
 * Jon must create (single opt-in) before Join can succeed:
 *   1. Group "Intrepid Dusk Archive Opt-ins"
 *      Embedded form assigned to that group.
 *      Optional subscriber field `source` = archive_backer_optin
 *   2. Group "Intrepid Dusk Public Waitlist"
 *      Embedded form assigned to that group.
 *      Optional subscriber field `source` = archive_public_waitlist
 *   3. Paste each form's action URL below
 *      (https://assets.mailerlite.com/jsonp/{accountId}/forms/{formId}/subscribe)
 *
 * Empty URLs = fail closed. Never claim "You're on the list" without a MailerLite success payload.
 */
(function (global) {
  'use strict';
  global.INTREPID_MAILERLITE = {
    backerActionUrl: '',
    publicActionUrl: '',
    backerSource: 'archive_backer_optin',
    publicSource: 'archive_public_waitlist',
    backerGroup: 'Intrepid Dusk Archive Opt-ins',
    publicGroup: 'Intrepid Dusk Public Waitlist'
  };
})(typeof window !== 'undefined' ? window : this);
