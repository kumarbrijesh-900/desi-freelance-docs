-- Lance Invoice Persistence Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
--
-- This migration creates the `invoices` table for storing
-- draft and finalized invoices per authenticated user.

-- 1. Create the invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  form_data     JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'finalized')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies: users can only access their own invoices
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_created
  ON public.invoices(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status
  ON public.invoices(user_id, status);

-- 5. Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
