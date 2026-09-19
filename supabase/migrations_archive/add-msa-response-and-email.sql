-- Phase 9b.2 Migration: MSA Response tracking + email sharing
-- Run in Supabase SQL Editor

-- 1. Add MSA response column (replaces simple accepted_at approach)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS msa_response TEXT DEFAULT 'pending'
    CHECK (msa_response IN ('pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS msa_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shared_to_email TEXT;
