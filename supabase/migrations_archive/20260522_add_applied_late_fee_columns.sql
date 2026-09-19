ALTER TABLE public.invoices
  ADD COLUMN applied_late_fee_rate numeric,
  ADD COLUMN applied_late_fee_unit text;

COMMENT ON COLUMN public.invoices.applied_late_fee_rate IS 
  'Snapshot of effective late-fee percentage at the moment of finalize/share. Locks in terms for audit immutability.';
COMMENT ON COLUMN public.invoices.applied_late_fee_unit IS 
  'Snapshot of effective late-fee cadence. Stored as singular noun: "day", "week", or "month".';
