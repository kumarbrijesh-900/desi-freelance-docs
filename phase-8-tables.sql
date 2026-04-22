-- ═══════════════════════════════════════════════════
-- Phase 8: User Profile + Client Directory + MSA
-- Run this in Supabase SQL Editor
-- Project: mjrbytfvesgvbuxyoidp
-- ═══════════════════════════════════════════════════

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  pin_code TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  pan TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  gst_registration_status TEXT NOT NULL DEFAULT 'not-registered',
  lut_availability TEXT NOT NULL DEFAULT '',
  lut_number TEXT NOT NULL DEFAULT '',
  no_lut_tax_handling TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  account_name TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  ifsc_code TEXT NOT NULL DEFAULT '',
  bank_address TEXT NOT NULL DEFAULT '',
  swift_bic_code TEXT NOT NULL DEFAULT '',
  iban_routing_code TEXT NOT NULL DEFAULT '',
  qr_code_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- 2. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  client_address TEXT NOT NULL DEFAULT '',
  client_address_line1 TEXT NOT NULL DEFAULT '',
  client_address_line2 TEXT NOT NULL DEFAULT '',
  client_city TEXT NOT NULL DEFAULT '',
  client_pin_code TEXT NOT NULL DEFAULT '',
  client_postal_code TEXT NOT NULL DEFAULT '',
  client_state TEXT NOT NULL DEFAULT '',
  client_country TEXT NOT NULL DEFAULT '',
  client_currency TEXT NOT NULL DEFAULT '',
  client_gstin TEXT NOT NULL DEFAULT '',
  client_location TEXT NOT NULL DEFAULT 'domestic',
  is_client_sez_unit TEXT NOT NULL DEFAULT '',
  invoice_count INT NOT NULL DEFAULT 0,
  last_invoiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

-- 3. Client MSAs
CREATE TABLE IF NOT EXISTS client_msas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Master Service Agreement',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_msas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own MSAs" ON client_msas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own MSAs" ON client_msas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own MSAs" ON client_msas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own MSAs" ON client_msas FOR DELETE USING (auth.uid() = user_id);
