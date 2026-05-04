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
