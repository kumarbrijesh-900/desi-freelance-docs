-- Bug E: Prevent duplicate child invoices for the same (parent, milestone).
-- Closes the duplicate-on-retry risk in fireMilestoneInvoice when the helper
-- succeeds at inserting the child invoice but fails before marking the
-- milestone fired. Next retry would currently INSERT another child; this
-- index causes the second INSERT to fail loud, surfacing the bug instead
-- of silently corrupting state.

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_parent_milestone
  ON invoices (parent_invoice_id, milestone_index)
  WHERE parent_invoice_id IS NOT NULL AND milestone_index IS NOT NULL;

COMMENT ON INDEX idx_invoices_unique_parent_milestone IS
  'Enforces one child invoice per (parent, milestone_index) pair. Catches retry-after-partial-failure scenarios in fireMilestoneInvoice. Partial index (WHERE NOT NULL) so non-milestone invoices are exempt.';
