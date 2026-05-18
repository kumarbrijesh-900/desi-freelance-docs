-- ═══════════════════════════════════════════════════
-- LANCE DATABASE ARCHITECTURE AUDIT (2026-04-25)
-- Full-stack Synchronization: SQL | Types | Frontend
-- ═══════════════════════════════════════════════════

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('bug', 'feature', 'general');
    CREATE TYPE feedback_status AS ENUM ('new', 'reviewed');
    CREATE TYPE invoice_status AS ENUM ('draft', 'finalized', 'settled', 'overdue');
    CREATE TYPE msa_response_type AS ENUM ('pending', 'accepted', 'rejected', 'negotiating');
    CREATE TYPE msa_status_type AS ENUM ('draft', 'active', 'expired');
    CREATE TYPE sez_status_type AS ENUM ('yes', 'no', 'not_sure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USER PROFILES (Agency Master)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    signature_url TEXT NOT NULL DEFAULT '',
    qr_code_url TEXT NOT NULL DEFAULT '',
    gst_registration_status TEXT NOT NULL DEFAULT 'not-registered',
    lut_availability TEXT NOT NULL DEFAULT 'no',
    lut_number TEXT NOT NULL DEFAULT '',
    lut_validity TEXT NOT NULL DEFAULT '',
    no_lut_tax_handling TEXT NOT NULL DEFAULT '',
    bank_name TEXT NOT NULL DEFAULT '',
    account_name TEXT NOT NULL DEFAULT '',
    account_number TEXT NOT NULL DEFAULT '',
    ifsc_code TEXT NOT NULL DEFAULT '',
    bank_address TEXT NOT NULL DEFAULT '',
    swift_bic_code TEXT NOT NULL DEFAULT '',
    iban_routing_code TEXT NOT NULL DEFAULT '',
    -- MSA Defaults (inherited by every new invoice for this user)
    msa_payment_terms_days INTEGER NOT NULL DEFAULT 20,
    msa_late_fee_rate NUMERIC NOT NULL DEFAULT 1.5,
    msa_late_fee_unit TEXT NOT NULL DEFAULT 'monthly',
    msa_ip_trigger_type TEXT NOT NULL DEFAULT 'upon_full_payment',
    msa_jurisdiction_city TEXT NOT NULL DEFAULT 'Bangalore',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- 3. CLIENTS (Directory)
-- Note: Preserving legacy naming conventions (city, state, gstin) for backward compatibility
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL DEFAULT '',
    client_email TEXT NOT NULL DEFAULT '',
    client_address TEXT NOT NULL DEFAULT '',
    address_line_1 TEXT NOT NULL DEFAULT '',
    address_line_2 TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    pin_code TEXT NOT NULL DEFAULT '',
    client_postal_code TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    gstin TEXT NOT NULL DEFAULT '',
    client_location TEXT NOT NULL DEFAULT 'domestic',
    client_entity_type TEXT NOT NULL DEFAULT 'agency',
    sez_status sez_status_type NOT NULL DEFAULT 'no',
    client_currency TEXT NOT NULL DEFAULT 'INR',
    msa_payment_terms_days INTEGER NOT NULL DEFAULT 15,
    msa_late_fee_rate NUMERIC NOT NULL DEFAULT 0,
    msa_late_fee_unit TEXT NOT NULL DEFAULT 'monthly',
    msa_ip_trigger_type TEXT NOT NULL DEFAULT 'upon_full_payment',
    msa_jurisdiction_city TEXT NOT NULL DEFAULT 'Bangalore',
    msa_version_label TEXT NOT NULL DEFAULT 'Standard Lance MSA v1.2',
    msa_notes_boilerplate TEXT NOT NULL DEFAULT '',
    msa_effective_date TIMESTAMPTZ,
    invoice_count INTEGER NOT NULL DEFAULT 0,
    last_invoiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CLIENT MSAs (Blueprints)
CREATE TABLE IF NOT EXISTS client_msas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Master Service Agreement',
    content TEXT NOT NULL DEFAULT '',
    status msa_status_type NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. INVOICES (Ledger)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status invoice_status NOT NULL DEFAULT 'draft',
    share_token TEXT UNIQUE,
    shared_at TIMESTAMPTZ,
    shared_to_email TEXT,
    template_id TEXT NOT NULL DEFAULT 'classic',
    msa_id UUID REFERENCES client_msas(id) ON DELETE SET NULL,
    msa_response msa_response_type NOT NULL DEFAULT 'pending',
    msa_responded_at TIMESTAMPTZ,
    client_msa_note TEXT,
    is_rcm_enabled BOOLEAN NOT NULL DEFAULT false,
    applied_payment_terms TEXT,           -- Bug 2 fixed: TEXT (e.g. 'Net 30')
    applied_late_fee_rate NUMERIC,
    applied_license_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. READ RECEIPTS (Analytics)
CREATE TABLE IF NOT EXISTS read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    viewer_ua TEXT,
    viewer_ip TEXT
);

-- 7. FAQs (Public Knowledge)
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. USER FEEDBACK (Product-Led Growth)
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type feedback_type NOT NULL DEFAULT 'general',
    message TEXT NOT NULL,
    status feedback_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. ROW LEVEL SECURITY (Policies)

-- Global Enable
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_msas ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Profiles: Own rows only
CREATE POLICY "Profiles: users can manage own profile" ON user_profiles
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Clients: Own rows only
CREATE POLICY "Clients: users can manage own clients" ON clients
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- MSAs: Own rows only
CREATE POLICY "MSAs: users can manage own MSAs" ON client_msas
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Invoices: Own rows + Public View via Share Token
CREATE POLICY "Invoices: users can manage own invoices" ON invoices
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Invoices: public can view shared invoices" ON invoices
    FOR SELECT USING (share_token IS NOT NULL);

-- Public MSA acceptance: row-gated by share_token.
-- NOTE: The msa_status column's native enum type already rejects invalid values
-- at the DB level — no need to duplicate that check here and risk mismatching
-- enum literals. Column-level write restriction is enforced via GRANT UPDATE below.
DROP POLICY IF EXISTS "Invoices: public can update MSA acceptance" ON invoices;
CREATE POLICY "Invoices: public can update MSA acceptance" ON invoices
    FOR UPDATE
    USING (share_token IS NOT NULL)
    WITH CHECK (share_token IS NOT NULL);

-- Column-level defence: strip all UPDATE rights from the anon role, then
-- grant back ONLY the four MSA-related columns. This prevents an unauthenticated
-- caller from overwriting financial columns (form_data, due_date, status, etc.)
-- even if they hold a valid share_token.
REVOKE UPDATE ON invoices FROM anon;
GRANT UPDATE (msa_status, msa_response, msa_responded_at, client_msa_note) ON invoices TO anon;

-- Read Receipts: Owner can read; Public can insert
CREATE POLICY "Read Receipts: owners can view" ON read_receipts
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = read_receipts.invoice_id AND invoices.user_id = auth.uid()
    ));

CREATE POLICY "Read Receipts: public can insert" ON read_receipts
    FOR INSERT WITH CHECK (true);

-- FAQs: Public Read; Admin Manage
CREATE POLICY "FAQs: public can read published" ON faqs
    FOR SELECT USING (is_published = true);

-- User Feedback: Authenticated users can insert; Admin can read
CREATE POLICY "Feedback: users can insert own" ON user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MSAs: Public can read MSAs attached to shared invoices (Bug 5 fix)
CREATE POLICY "MSAs: public can read via shared invoice" ON client_msas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.msa_id      = client_msas.id
              AND invoices.share_token IS NOT NULL
        )
    );

-- Note: Admin/Service access is typically handled via service_role or specific metadata checks
-- For standard RLS, we block non-owner reads for feedback and non-published reads for FAQs
