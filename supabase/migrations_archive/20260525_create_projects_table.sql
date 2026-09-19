-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Phase 2.9 Core Projects Table & Invoices Linking
-- File: supabase/migrations/20260525_create_projects_table.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: Create Projects Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    
    -- MSA tracking and project-level addendums
    msa_accepted_at TIMESTAMPTZ,
    msa_accepted_via_invoice_id UUID, -- Foreign key defined in Section 3 to avoid circular dependency
    project_addendum_text TEXT,
    master_po_number TEXT,
    
    -- Project-level fallback configuration default settings
    default_payment_terms_days INT,
    default_late_fee_rate NUMERIC,
    default_late_fee_unit TEXT,
    default_currency TEXT NOT NULL DEFAULT 'INR',
    
    -- Project timeline settings
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: Link Invoices to Projects
-- ─────────────────────────────────────────────────────────────────────────────

-- Add project_id column to invoices table if it doesn't already exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: Create circular foreign key for project's accepted msa invoice reference
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects 
ADD CONSTRAINT fk_projects_msa_accepted_via_invoice 
FOREIGN KEY (msa_accepted_via_invoice_id) 
REFERENCES public.invoices(id) 
ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- SELECT: owner of the project can read it
CREATE POLICY "Projects: owner can select"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: owner can create projects for themselves
CREATE POLICY "Projects: owner can insert"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: owner can update their projects
CREATE POLICY "Projects: owner can update"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: owner can delete their projects
CREATE POLICY "Projects: owner can delete"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: Automate updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
