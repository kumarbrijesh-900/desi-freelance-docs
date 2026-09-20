-- Two concurrent saves of a fresh draft can both miss the
-- (user_id, invoice_number) lookup in saveInvoice and both INSERT, leaving two
-- invoices sharing a number. GST Rule 46 requires a unique consecutive serial
-- per invoice, so this is the backstop that holds regardless of which code
-- path does the writing.
--
-- Checked before writing: 7 invoices, 7 distinct (user_id, invoice_number)
-- pairs, 0 duplicate groups. 2 of the 7 are milestone children and they carry
-- their own numbers, so this does not constrain the milestone flow.
--
-- Deliberately not CONCURRENTLY: migrations run inside a transaction, where
-- CREATE INDEX CONCURRENTLY is not permitted.

create unique index if not exists idx_invoices_unique_user_invoice_number
  on public.invoices (user_id, invoice_number)
  where invoice_number is not null;
