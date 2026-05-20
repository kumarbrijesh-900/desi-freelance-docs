-- Add 'cancelled' to the invoices status CHECK constraint
-- This allows agencies to close/cancel projects that aren't going through

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'finalized', 'settled', 'overdue', 'cancelled'));
