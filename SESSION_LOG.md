# Session Log — May 7, 2026

## Latest deployed commit: a54ae9f

## Production state
- Sign-in works
- Invoice creation works (multi-milestone, up to 5 milestones)
- Share email delivers with MSA gating
- Client accepts MSA → invoice unlocks
- Agency gets notifications
- Mark Milestone Settled → auto-generates next milestone invoice
- Child invoices skip MSA gate (previously accepted banner shown)
- TDS stored per milestone in invoice_milestones table
- Milestone progress badge on invoices table ("M1 of 2 settled")
- Per-milestone due dates: settlement date + payment terms

## v1.5 COMPLETE ✅
All prompts #22–#35 shipped and verified in production.

### Phase F: Schema refactor
- ✅ #22+23 — Milestone type + mergeInvoiceFormData (dual-track backward compat)
- ✅ #24 — invoice-calculations + invoice-validation for milestone tree
- ✅ #25+26 — DeliverablesSection rewritten for Milestone[], MAX_MILESTONES=5
- ✅ #27 — All 6 PDF templates render MilestoneSummaryBlock
- ✅ #28 — Supabase persistence uses invoice_milestones + invoice_line_items

### Phase G: Multi-milestone billing
- ✅ #29 — Share modal: "Milestone 1 of N" framing
- ✅ #30 — PDF: Due now / Remaining / Total project summary
- ✅ #31 — Mark M1 settled → auto-generate M2 invoice via API
- ✅ #32 — Child invoices skip MSA gate, show "previously accepted" banner
- ✅ #33 — TDS stored in invoice_milestones.tds_amount

### Phase H: Polish
- ✅ #34 — "M1 of 2 settled" badge on invoices table
- ✅ #35 — Per-milestone due date: settlement date + payment terms (GST compliant)

## Schema additions (all migrations run)
- invoice_milestones: status, tds_amount, amount columns added
- invoices: parent_invoice_id, milestone_index columns added
- invoices: status enum expanded (draft/finalized/settled/SETTLED/PARTIAL/SENT/SAVED)
- client_msas: client_id made nullable (global MSA support)

## Known tech debt (v2 cleanup)
- msa_status + msa_accepted_at columns still in invoices (shadow fields, use msa_response)
- ShareLinkModal has dead handleMsaToggle code
- Milestone sub-rows show ₹0 amount (relational amount not synced from form_data)
- "Engine is out of fuel" banner still showing

## Next
- v2 planning or real-user testing
- Locked for v2: brief parsing engine, email cron, late fees, GSTIN auto-fetch
