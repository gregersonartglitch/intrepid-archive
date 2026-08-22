/**
 * Official MailerLite generated-form endpoints.
 * These are public form action URLs from Forms → Embedded → HTML (the form action=).
 * They are not API keys. Do not put a MailerLite API token in this file or in page JS.
 *
 * Official forms (single opt-in), pasted from MailerLite Embedded HTML:
 *   1. Group "Intrepid Dusk Archive Opt-ins"
 *      Optional subscriber field `source` = archive_backer_optin
 *   2. Group "Intrepid Dusk Public Waitlist"
 *      Optional subscriber field `source` = archive_public_waitlist
 *
 * Empty URLs = fail closed. Never claim waitlist/list success without a MailerLite success payload.
 * Both official form URLs are set. Do not live-test signup until Jon says so.
 */
(function (global) {
  'use strict';
  global.INTREPID_MAILERLITE = {
    /* Official Intrepid Dusk Archive Opt-ins embed (mlb2-45100412 / form 196515214173144716). */
    backerActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196515214173144716/subscribe',
    /* Official Intrepid Dusk Public Waitlist embed (mlb2-45100729 / form 196516110968817063). */
    publicActionUrl: 'https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe',
    backerSource: 'archive_backer_optin',
    publicSource: 'archive_public_waitlist',
    backerGroup: 'Intrepid Dusk Archive Opt-ins',
    publicGroup: 'Intrepid Dusk Public Waitlist'
  };
})(typeof window !== 'undefined' ? window : this);
