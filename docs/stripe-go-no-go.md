# Stripe Vol. 1 Unlock — Go/No-Go (Jon's one-pager)

Say **"unblock deploy + start Stripe"** only when every GATE box is checked.
Full spec: `docs/stripe-vol1-unlock.md` (settled — no re-litigating).

## GATES — all required before any code ships

- [ ] **G1. Deploy works.** A test deploy (draft is fine) reaches Netlify
      without Forbidden. Until this passes, paywall code is UI that can't
      charge. Fix order: `netlify logout && netlify login` → PAT → git
      remote + CI (durable).
- [ ] **G2. KS price confirmed.** Look up the actual Wanderer/digital tier:
      KS $15 → guest $14. KS $12 → guest $15. Wrong price is the
      cheapest-to-avoid, most expensive-to-repair mistake (backer trust).
- [ ] **G3. Stripe test mode ready.** Account created, product entered with
      the "reader now + PDF when available" description, test keys in
      Netlify env vars. Secret key never in the repo — no exceptions.

## ACCEPTED TRADEOFFS — sign off once, then stop worrying

- [ ] Friction, not fortress: a technical user can bypass. Same trust model
      as backer codes. We are selling convenience and honesty.
- [ ] localStorage unlock: new device / cleared storage = manual restore
      from Stripe receipt. You are support for v1.
- [ ] PDF is manual: you export the buyer email from Stripe and send the
      PDF yourself until v1.1 automation. Checkout copy promises
      "PDF when available," nothing sooner.
- [ ] Replayed success-URL works for 24h (spec invariant 5). Acceptable;
      same as a shared backer code.
- [ ] No auto-revoke on refund: if you refund someone, their reader unlock
      stays until their storage clears. Accept and move on.
- [ ] No Stripe Tax in v1. Revisit if volume ever makes it matter.

## BEFORE FLIPPING LIVE — the test pass (from spec checklist)

- [ ] Test card 4242… completes → lands on Issue 2 page 1, unlocked
- [ ] Fake/unpaid session_id → NO unlock, graceful fallback to paywall
- [ ] Paid unlock does NOT set `intrepid_cartographer_unlocked` (map stays
      gated — run the A8-style check)
- [ ] scribe4 backer path unchanged
- [ ] Cancel from Stripe → back at boundary, no error, paywall re-openable
- [ ] Jon makes ONE real live purchase with his own card before announcing

## KILL CRITERIA — stop and reassess if…

- Deploy path breaks again mid-build (don't hand-patch functions around a
  broken pipeline)
- KS tier price can't be confirmed (don't guess; pick the $15 guest price
  as the safe default)
- Any code path is found setting map keys from the paid flow (ship blocker,
  no exceptions)

**Bottom line:** G1 is the whole game. G2 protects backers. G3 is 20 minutes
of dashboard work. Everything below the gates is already decided — check the
boxes and go.
