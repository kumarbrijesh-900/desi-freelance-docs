# Session Log — May 6, 2026

## All v1 features verified working in production

- ✅ Global MSA on Profile page (saves to client_msas, client_id = NULL)
- ✅ Share-invoice API: 3-tier MSA lookup (client → global → block)
- ✅ MSA popup on client share page with full agreement text
- ✅ Client acceptance writes msa_response = 'accepted' + timestamp to DB
- ✅ Agency gets "MSA Accepted" in-app notification
- ✅ Invoice status pills: Draft/Sent/Paid
- ✅ Mark as Settled: writes status = 'SETTLED' + settled_at to DB
- ✅ Settlement modal with TDS deduction
- ✅ Empty state on /invoices
- ✅ Profile page: no completion banner when profile is complete
- ✅ Status enum updated to include SETTLED/PARTIAL/SENT/SAVED
- Latest deployed commit: b2ac1bc

## Status constraint now allows
draft, finalized, settled, SETTLED, PARTIAL, SENT, SAVED

## Next session
v1 is shippable. Test with one real freelancer before v1.5.

---

# Session Log — May 1, 2026

## What works in production
- OAuth sign-in
- Invoice creation wizard
- Share email delivery
- Share link to /share/[token]
- Latest deployed commit: 6c91a95

## Open bug
MSA popup never shows on share page because msa_id is always null
in DB. client_msas table is empty. No auto-creation flow.

## Decided product behavior
On first share with no MSA for that client, prompt user to either
use default global MSA (creates client_msas row) or create custom.
Match client via clientEmail.

## Next step
Build MSA-on-share modal + auto-creation path. ~2-3 hours.

## Known schema gotchas
- client_msas requires client_id NOT NULL
- invoices has no client_id column (lives in form_data JSON)
- invoice status enum: only 'draft' | 'finalized'
- Match clients via clients.client_email
