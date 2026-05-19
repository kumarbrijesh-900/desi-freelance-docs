-- Phase 1: Add is_offline flag to invoices.
-- Marks invoices the user downloaded as PDF and is managing manually,
-- outside the tracked digital share flow. Defaults to false; existing
-- invoices remain tracked.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_offline boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invoices.is_offline IS
  'When true, invoice was downloaded as PDF and is managed manually. Excluded from master list and dashboard metrics.';

CREATE INDEX IF NOT EXISTS invoices_is_offline_idx
  ON public.invoices (is_offline)
  WHERE is_offline = true;
