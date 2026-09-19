-- projects.msa_accepted_at and projects.msa_accepted_via_invoice_id recorded a
-- project-level MSA acceptance model that was never wired. Nothing ever wrote
-- either column: 0 of 5 rows at the time of this migration, and the only code
-- that touched them wrote NULL explicitly. Acceptance lives on the master
-- invoice (invoices.msa_status / msa_accepted_at), and children inherit their
-- master's - see lib/invoice-msa.ts.
--
-- The last reader, a fallback in computeProjectLifecycle that could only ever
-- evaluate to null, was removed in c95f717. The production build running at the
-- time of this migration is c95f717, so nothing live selects these columns.

alter table public.projects
  drop column msa_accepted_at,
  drop column msa_accepted_via_invoice_id;
