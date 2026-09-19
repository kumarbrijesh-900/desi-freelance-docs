
-- Migration: Payment Overhaul & Addendum Support
-- Adds top-level columns for due dates and addendum flagging to support reminders and contract authority logic.

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS has_addendum BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER;

COMMENT ON COLUMN public.invoices.has_addendum IS 'Flag indicating if this invoice has project-specific overrides (Addendum).';
COMMENT ON COLUMN public.invoices.due_date IS 'Promoted due date for automated reminders and late fee calculations.';
COMMENT ON COLUMN public.invoices.payment_terms_days IS 'Numeric payment terms (Net days) for mathematical due date calculation.';
