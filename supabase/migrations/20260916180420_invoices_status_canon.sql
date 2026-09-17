-- invoices.status canon: lowercase, five values, fence re-cut.
--
-- Precedent: 20260707120000_milestone_status_canon.sql did this for
-- invoice_milestones (UPPERCASE there; trigger_* on the same table is a
-- separate lowercase family, so canon is per-column, not per-database).
--
-- ORDER MATTERS, and it differs from that precedent. invoice_milestones had
-- no CHECK when it was canonised, so it could update the data first. This
-- column HAS had invoices_status_check since 20260525000600, and that fence
-- rejects lowercase 'partial' -- so the data pass must come AFTER the drop,
-- not before it. Written the other way round it fails with 23514 on its own
-- UPDATE, which is exactly what happened on the first attempt.
--
-- Pre-state, verified against production immediately before this migration:
--   finalized 3, settled 2, draft 1, PARTIAL 1  (7 rows total)
--   0 rows 'overdue', 0 rows 'cancelled'
-- The data pass therefore moves exactly one row.
--
-- 'overdue' is dropped from the fence on purpose. Nothing writes it: overdue
-- is a derived predicate (isInvoiceOverdue) as of 609ba4c. Leaving it
-- permitted invites a stored value that can disagree with the predicate.
--
-- Application code shipped in c76d3d4 stops emitting 'PARTIAL', 'DRAFT',
-- 'SENT' and 'SETTLED'. That code is already live, so this closes a window
-- in which milestone-fire and partial settlement were rejected.

alter table public.invoices drop constraint if exists invoices_status_check;

update public.invoices set status = 'partial' where status = 'PARTIAL';

alter table public.invoices
  add constraint invoices_status_check
  check (status in ('draft', 'finalized', 'partial', 'settled', 'cancelled'));

alter table public.invoices alter column status set default 'draft';

comment on constraint invoices_status_check on public.invoices is
  'Invoice lifecycle canon is lowercase (draft/finalized/partial/settled/cancelled). overdue is derived, never stored. Enforced 2026-09-16 after PARTIAL drifted uppercase and four writer routes emitted values the previous fence rejected.';
