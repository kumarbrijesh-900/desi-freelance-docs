-- Migration: Add last_notified_at and msa_response_v2 sync
-- Run in Supabase SQL Editor

-- 1. Add last_notified_at for cron anti-spam
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- 2. Add index to optimize cron lookups
CREATE INDEX IF NOT EXISTS idx_invoices_last_notified
  ON public.invoices(last_notified_at);
