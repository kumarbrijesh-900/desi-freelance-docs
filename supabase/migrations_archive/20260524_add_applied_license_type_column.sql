ALTER TABLE public.invoices ADD COLUMN applied_license_type text;

COMMENT ON COLUMN public.invoices.applied_license_type IS
  'Snapshot of effective license type at finalize/share time. Locks in IP terms for audit immutability. Companion to applied_payment_terms / applied_late_fee_rate / applied_late_fee_unit (v2.8.3).';
