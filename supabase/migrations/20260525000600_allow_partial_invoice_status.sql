-- Bug A codification: allow 'PARTIAL' status on invoices.
-- This was applied manually to production on 2026-05-24 during v2.9 smoke test
-- when fireMilestoneInvoice tried to set parent invoice status='PARTIAL' to
-- represent "one milestone settled, more to go" and the existing CHECK
-- constraint rejected it.
--
-- The IF EXISTS makes the DROP idempotent for both fresh installs and prod
-- where the constraint was already replaced.

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY['draft', 'finalized', 'settled', 'overdue', 'cancelled', 'PARTIAL']));

COMMENT ON CONSTRAINT invoices_status_check ON invoices IS
  'Allows draft (unsaved), finalized (sent, awaiting payment), settled (fully paid), overdue (past due), cancelled (closed), PARTIAL (multi-milestone parent with some settled and some pending). PARTIAL added v2.9 (May 2026).';
