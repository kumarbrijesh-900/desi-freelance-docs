-- Migration: Add msa_status to invoices table
-- Purpose: Track if the client has accepted the MSA for a specific invoice

DO $$ BEGIN
    CREATE TYPE msa_acceptance_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS msa_status msa_acceptance_status DEFAULT 'pending';
