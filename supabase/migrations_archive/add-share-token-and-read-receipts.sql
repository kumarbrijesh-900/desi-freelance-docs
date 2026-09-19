-- Phase 9b Migration: Share tokens + Read receipts
-- Run in Supabase SQL Editor

-- 1. Add share columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT 'classic';

-- 2. Index for fast public lookups by share_token
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token);

-- 3. Create read_receipts table
CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  viewer_ip TEXT,
  viewer_ua TEXT
);

-- 4. RLS for read_receipts
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;

-- Invoice owner can view read receipts for their invoices
CREATE POLICY read_receipts_select_owner ON read_receipts
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

-- Anyone (including anon) can insert a read receipt when viewing a shared invoice
CREATE POLICY read_receipts_insert_public ON read_receipts
  FOR INSERT WITH CHECK (true);

-- 5. Allow public SELECT on invoices by share_token (for /view/[token] route)
-- This policy allows anyone to read an invoice IF it has a share_token set
CREATE POLICY invoices_select_by_share_token ON invoices
  FOR SELECT USING (
    share_token IS NOT NULL AND share_token != ''
  );
