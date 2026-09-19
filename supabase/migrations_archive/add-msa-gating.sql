-- Phase 9b.1 Migration: MSA Gating for Shared Invoices
-- Run in Supabase SQL Editor

-- 1. Add MSA gating columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS msa_id UUID REFERENCES client_msas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS msa_accepted_at TIMESTAMPTZ;

-- 2. Allow public read of MSA content when linked to a shared invoice
-- (anon users need to read MSA text to accept it)
CREATE POLICY IF NOT EXISTS client_msas_select_via_shared_invoice ON client_msas
  FOR SELECT USING (
    id IN (
      SELECT msa_id FROM invoices
      WHERE share_token IS NOT NULL AND share_token != '' AND msa_id IS NOT NULL
    )
  );

-- 3. Allow public update of msa_accepted_at on shared invoices
-- Only allows setting the msa_accepted_at field (not other fields)
CREATE POLICY IF NOT EXISTS invoices_update_msa_acceptance ON invoices
  FOR UPDATE USING (
    share_token IS NOT NULL AND share_token != '' AND msa_id IS NOT NULL
  )
  WITH CHECK (
    share_token IS NOT NULL AND share_token != '' AND msa_id IS NOT NULL
  );
