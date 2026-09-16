-- projects.msa_accepted_via_invoice_id records WHICH invoice carried the MSA
-- the client accepted. Its foreign key was created with no action clause, so
-- it defaults to NO ACTION: once a project points at an invoice, deleting that
-- invoice is blocked outright.
--
-- That is the wrong answer for this column. The pointer is a historical note,
-- not a dependency that should keep an invoice alive - and a blocked delete is
-- a failure the operator cannot act on. SET NULL loses the note and lets the
-- delete through, which is the trade this column wants.
--
-- deleteInvoice() is now a single statement (the FK cascade does the rest), so
-- a blocked delete no longer half-destroys anything. This removes the block.
alter table public.projects
  drop constraint if exists projects_msa_accepted_via_invoice_id_fkey;

alter table public.projects
  add constraint projects_msa_accepted_via_invoice_id_fkey
  foreign key (msa_accepted_via_invoice_id)
  references public.invoices(id)
  on delete set null;

comment on column public.projects.msa_accepted_via_invoice_id is
  'Which invoice carried the MSA the client accepted. A historical note: ON DELETE SET NULL, so deleting the invoice clears it rather than being blocked.';
