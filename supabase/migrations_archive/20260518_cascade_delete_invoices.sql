-- CASCADE DELETE for invoice foreign keys
-- Run date: May 18, 2026
-- Purpose: Ensure deleting an invoice cascades to all dependent records

ALTER TABLE invoice_milestones DROP CONSTRAINT IF EXISTS invoice_milestones_invoice_id_fkey;
ALTER TABLE invoice_milestones ADD CONSTRAINT invoice_milestones_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_milestone_id_fkey;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_milestone_id_fkey 
  FOREIGN KEY (milestone_id) REFERENCES invoice_milestones(id) ON DELETE CASCADE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_parent_invoice_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_parent_invoice_id_fkey 
  FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
