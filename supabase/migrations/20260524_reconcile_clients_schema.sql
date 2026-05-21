-- ============================================================
-- Reconcile clients table schema with application code
-- ============================================================
-- The foundation migration (20240424_foundation_clients.sql) created a minimal
-- clients table. The app code (lib/supabase/clients.ts → clientDetailsToRow)
-- now writes ~28 columns. This migration closes every gap.
--
-- All statements use IF NOT EXISTS / safe patterns so this is
-- idempotent — re-running it on a DB that already has some of
-- these columns will not error.
-- ============================================================

-- 1. Rename legacy columns whose names diverged from code expectations.
--    The code writes `client_email` but the original column was `email`.
--    The code writes `client_address` but the original column was `address`.
--    Safe: if the old column doesn't exist (already renamed), these will no-op via DO block.

DO $$
BEGIN
  -- email → client_email
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE public.clients RENAME COLUMN email TO client_email;
  END IF;

  -- address → client_address
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'address'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'client_address'
  ) THEN
    ALTER TABLE public.clients RENAME COLUMN address TO client_address;
  END IF;
END $$;

-- 2. Add all columns the code expects but that never had a migration.

-- Contact & address fields
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_line_1 TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_line_2 TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pin_code TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_postal_code TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';

-- Currency
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_currency TEXT DEFAULT '';

-- Classification
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'domestic';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_entity_type TEXT DEFAULT 'agency';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sez_status TEXT DEFAULT 'no';

-- MSA fields (msa_late_fee_unit was never in the foundation migration)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS msa_late_fee_unit TEXT DEFAULT 'monthly';

-- Revision policy
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS free_revision_rounds INT DEFAULT 2;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS extra_revision_fee_percent NUMERIC DEFAULT 15;

-- Usage tracking
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invoice_count INT DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_invoiced_at TIMESTAMPTZ;

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON COLUMN public.clients.client_type IS 'Stores client location type: domestic or international. Named client_type for legacy reasons.';
COMMENT ON COLUMN public.clients.client_entity_type IS 'Business entity classification: agency or freelancer.';
COMMENT ON COLUMN public.clients.sez_status IS 'SEZ unit status as text (yes/no). Replaces legacy is_sez_unit boolean.';
COMMENT ON COLUMN public.clients.msa_late_fee_unit IS 'Frequency for late fee: monthly, daily, or annually.';
COMMENT ON COLUMN public.clients.free_revision_rounds IS 'Number of free revision rounds included in MSA.';
COMMENT ON COLUMN public.clients.extra_revision_fee_percent IS 'Percentage fee charged per revision beyond the free rounds.';
COMMENT ON COLUMN public.clients.invoice_count IS 'Running count of invoices issued to this client.';
COMMENT ON COLUMN public.clients.last_invoiced_at IS 'Timestamp of the most recent invoice issued to this client.';
