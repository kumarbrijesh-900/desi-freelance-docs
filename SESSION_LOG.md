# Session Log — May 6, 2026

## What works in production (end of session)
- ✅ Global MSA section added to Profile page
- ✅ client_msas.client_id is nullable (migration done)
- ✅ Share-invoice API does 3-tier MSA lookup server-side:
    Tier 1: client-specific MSA (client_msas where client_id matches)
    Tier 2: global MSA (client_msas where client_id IS NULL)
    Tier 3: returns 422 NO_MSA_FOUND if neither found
- ✅ msa_response field is now canonical (lowercase: pending/accepted)
- ✅ Share page reads msa_response (not msa_status) to gate invoice
- ✅ Accept Terms writes msa_response = 'accepted' + msa_responded_at timestamp to DB
- ✅ Agency gets "MSA Accepted" in-app notification on acceptance
- ✅ Full end-to-end verified: Share → Email → MSA popup → Accept → Invoice unlocks → DB updated
- Latest deployed commit: 65488eb

## Remaining v1 items (in order)
- Prompt #15 — Mark as Paid / Settlement button on invoices table
- Prompt #16 — Invoice status pill colors and labels
- Prompt #17 — PDF download verification
- Prompt #19 — Profile completion banner cleanup
- Prompt #20 — Empty state for /invoices (zero invoices)
- Prompt #21 — "Back to Home" link cleanup

## v1 ships after these 6 prompts. Then real-user testing before v1.5.

## Known tech debt (do NOT fix in v1)
- msa_status column still exists in DB alongside msa_response — drop in v1.5
- msa_accepted_at column still exists — drop in v1.5
- ShareLinkModal still has handleMsaToggle with direct DB calls — remove in v1.5
- "Override with Custom MSA" UI in share dialog is now redundant (API handles it) — clean up in v1.5

## Next session start checklist
1. Share fresh screenshot of /invoices page
2. Share roadmap file
3. Claude will write Prompt #15 (Mark as Paid)

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
