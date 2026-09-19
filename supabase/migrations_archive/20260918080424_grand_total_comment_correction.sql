-- Correct the contract on invoices.grand_total.
--
-- 20260526001000_add_grand_total_column.sql created this column with the
-- comment "Denormalized invoice total computed from milestones[].lineItems[]
-- .qty * rate at save time" and a backfill that SUMS EVERY MILESTONE.
-- saveInvoice has always written only milestone[0] - the one milestone an
-- invoice actually bills. The documented contract and the stored contents have
-- therefore disagreed since the column was created.
--
-- That disagreement was not harmless. Three value resolvers were written
-- against the all-milestones reading as a fallback:
--   lib/supabase/projects.ts getInvoiceTotal
--   lib/supabase/projects.ts getInvoiceTaxableValue
--   lib/supabase/invoices.ts (invoice list post-processing)
-- Each of them, when form_data would not resolve, silently returned the
-- PROJECT's value in place of the invoice's - 605,000 against a billed 204,000
-- on INV-2026-9996. Latent, because every live row resolves.
--
-- No data changes here. All seven rows already hold the billed scope. Only the
-- contract is corrected, so the next reader is not misled the same way.

comment on column public.invoices.grand_total is
  'Pre-tax taxable value of the ONE milestone this invoice bills: milestone[0] on a master, the single milestone on a child. NOT the project total, and NOT tax-inclusive despite the name. See billableLineItems in lib/invoice-calculations.ts for the invariant. Corrected 2026-09-18; the original comment claimed every milestone, which no writer has ever produced.';
