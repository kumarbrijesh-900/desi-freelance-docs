-- Migration: Secure Override Workflow
-- Adds fields to capture the final, applied terms for a specific invoice transaction.
-- Ensures that even if the client's global MSA changes, the specific invoice remembers its terms.

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS applied_payment_terms TEXT,
ADD COLUMN IF NOT EXISTS applied_late_fee_rate NUMERIC,
ADD COLUMN IF NOT EXISTS applied_license_type TEXT;

COMMENT ON COLUMN public.invoices.applied_payment_terms IS 'The final payment terms (e.g., Net 20) applied at the time of invoice creation/override.';
COMMENT ON COLUMN public.invoices.applied_late_fee_rate IS 'The specific late fee rate (%) applied to this transaction.';
COMMENT ON COLUMN public.invoices.applied_license_type IS 'The specific intellectual property license type granted in this invoice.';
