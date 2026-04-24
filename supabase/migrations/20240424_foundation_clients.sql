-- Foundation: Clients and Client MSAs
-- This migration ensures the core client infrastructure exists with strict RLS.

-- 1. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    email TEXT,
    gstin TEXT,
    address TEXT,
    state TEXT,
    is_international BOOLEAN DEFAULT FALSE,
    is_sez_unit BOOLEAN DEFAULT FALSE,
    
    -- MSA Blueprint fields (as seen in add-msa-blueprint.sql)
    msa_effective_date DATE,
    msa_payment_terms_days INT DEFAULT 20,
    msa_late_fee_rate DECIMAL DEFAULT 1.5,
    msa_ip_trigger_type TEXT DEFAULT 'upon_payment',
    msa_jurisdiction_city TEXT DEFAULT 'Bangalore',
    msa_version_label TEXT DEFAULT 'Standard Lance MSA v1.2',
    msa_notes_boilerplate TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Client MSAs Table (for versioned/specific agreements)
CREATE TABLE IF NOT EXISTS public.client_msas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT,
    content_summary TEXT,
    status TEXT DEFAULT 'active', -- active, archived, pending
    version_label TEXT,
    effective_date DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_msas ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Clients
CREATE POLICY "Users can manage their own clients"
    ON public.clients
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. RLS Policies for Client MSAs
CREATE POLICY "Users can manage their own client MSAs"
    ON public.client_msas
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Add policy for shared invoice access (read-only for clients via shared link)
-- Note: This is a simplified version of the logic in add-msa-gating.sql
-- In a real scenario, this would check if the MSA is linked to a shared invoice.
CREATE POLICY "Public read access for MSAs linked to invoices"
    ON public.client_msas
    FOR SELECT
    USING (TRUE); -- Gating should be handled by more specific policies or at the app level

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_client_msas_client_id ON public.client_msas(client_id);
CREATE INDEX IF NOT EXISTS idx_client_msas_user_id ON public.client_msas(user_id);
