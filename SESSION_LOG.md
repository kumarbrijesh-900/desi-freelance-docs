# Session Log — May 6, 2026 (Session 2)

## What was built today (v1.5 Phase F + Phase G partial)

### Phase F: Schema refactor — COMPLETE ✅
- ✅ #22+23 — Added Milestone interface to types/invoice.ts, mergeInvoiceFormData handles both old (lineItems) and new (milestones) shapes
- ✅ #24 — invoice-calculations.ts and invoice-validation.ts updated for milestone tree
- ✅ #25+26 — DeliverablesSection.tsx fully rewritten for Milestone[], MAX_MILESTONES = 5, InvoiceEditorPage wired to milestones
- ✅ #27 — All 6 PDF templates updated to render milestone tree
- ✅ #28 — Supabase persistence: syncMilestonesFromInvoice uses formData.milestones, correct column names (quantity/total/item_type/unit), invoice_milestones gets status/tds_amount/amount columns

### Phase G: Multi-milestone billing — IN PROGRESS
- ✅ #29 — ShareLinkModal shows "Milestone 1 of N" framing with Due now / Remaining / Total project
- ✅ #30 — All 6 PDF templates render MilestoneSummaryBlock (verified in exported PDF)
- ✅ #31 — Mark Milestone 1 settled → auto-generate Milestone 2 invoice (COMPLETE)
- ✅ #32 — Skip MSA gate on subsequent milestone invoices (COMPLETE)
- ✅ #33 — TDS deduction wired into settlement (COMPLETE)

## SQL migrations run today
```sql
-- Added status, tds_amount, amount to invoice_milestones
ALTER TABLE invoice_milestones
ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS tds_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

-- Expanded invoices status enum
ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
CHECK (status = ANY (ARRAY[
  'draft'::text, 'finalized'::text, 'settled'::text,
  'SETTLED'::text, 'PARTIAL'::text, 'SENT'::text, 'SAVED'::text
]));
```

## Schema state (invoice_milestones)
- id, invoice_id, title, order_index, created_at, status, tds_amount, amount

## Schema state (invoice_line_items)
- id, milestone_id, item_type, description, quantity, rate, unit, total, order_index, created_at

## Known issues / tech debt
- ShareLinkModal still has handleMsaToggle with direct DB calls — remove in cleanup
- Totals step shows ₹0 on first load for old invoices (lineItems path) — acceptable, new invoices use milestones
- "Engine is out of fuel" banner still showing — UX cruft, deprioritized
- Bell notification badge showing "8+" — not clearing — deprioritized

## Latest deployed commit
092f30a (HEAD -> main, origin/main) fix: update markMilestoneSettled to match by order_index

## Next session starts with
- Prompt #34: Implement TDS deduction field in Settlement Modal
- Prompt #35: Implement "Settlement Summary" in history table
- Phase H after that (#34, #35)

---

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
