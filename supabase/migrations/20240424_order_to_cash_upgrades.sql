-- Phase: Order-to-Cash Upgrades
-- Run in Supabase SQL Editor

-- 1. Update MSA Response enum/check
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_msa_response_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_msa_response_check CHECK (msa_response IN ('pending', 'accepted', 'rejected', 'negotiating'));

-- 2. Add Client MSA Note column
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_msa_note TEXT;

-- 3. Update Invoice Status enum/check
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'finalized', 'settled', 'overdue'));
