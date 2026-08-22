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
 * Empty URLs = fail closed. Never claim waitlist/list success without a MailerLite success payload.
 * Public waitlist URL is set (form 196516110968817063). Backer form URL still empty.
 */
(function (global) {
  'use strict';
  global.INTREPID_MAILERLITE = {
    backerActionUrl: '',
    /* Official Intrepid Dusk Public Waitlist embed (mlb2-45100729 / form 196516110968817063). */
    publicActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe',
    backerSource: 'archive_backer_optin',
    publicSource: 'archive_public_waitlist',
    backerGroup: 'Intrepid Dusk Archive Opt-ins',
    publicGroup: 'Intrepid Dusk Public Waitlist'
  };
})(typeof window !== 'undefined' ? window : this);
