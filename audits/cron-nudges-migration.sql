-- ════════════════════════════════════════════════════════════════
-- LANCE AUTOMATED NUDGES MIGRATION (2026-04-25)
-- Paste into Supabase SQL Editor and run.
-- ════════════════════════════════════════════════════════════════

-- 1. Add tracking columns to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS reminded_due_date BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminded_overdue BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill existing due dates from form_data JSON (if they exist)
-- Assumes form_data structure has a meta object with a dueDate string (YYYY-MM-DD)
UPDATE public.invoices
SET due_date = NULLIF(form_data->'meta'->>'dueDate', '')::DATE
WHERE due_date IS NULL 
  AND form_data->'meta'->>'dueDate' IS NOT NULL
  AND form_data->'meta'->>'dueDate' != '';

-- 3. Verify
SELECT id, invoice_number, status, due_date, reminded_due_date, reminded_overdue
FROM public.invoices
ORDER BY created_at DESC
LIMIT 5;
