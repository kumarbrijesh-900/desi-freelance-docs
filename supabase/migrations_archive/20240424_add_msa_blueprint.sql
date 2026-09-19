-- Add MSA Blueprint fields to clients table
-- Captures the foundational legal and commercial terms agreed with a client.

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS msa_effective_date DATE,
ADD COLUMN IF NOT EXISTS msa_payment_terms_days INT DEFAULT 20,
ADD COLUMN IF NOT EXISTS msa_late_fee_rate DECIMAL DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS msa_ip_trigger_type TEXT DEFAULT 'upon_payment',
ADD COLUMN IF NOT EXISTS msa_jurisdiction_city TEXT DEFAULT 'Bangalore',
ADD COLUMN IF NOT EXISTS msa_version_label TEXT DEFAULT 'Standard Lance MSA v1.2',
ADD COLUMN IF NOT EXISTS msa_notes_boilerplate TEXT;

COMMENT ON COLUMN clients.msa_effective_date IS 'Date the Master Service Agreement was signed/became effective.';
COMMENT ON COLUMN clients.msa_payment_terms_days IS 'Standard days for payment as per MSA (e.g., 20).';
COMMENT ON COLUMN clients.msa_late_fee_rate IS 'Monthly interest rate for late payments (e.g., 1.5).';
COMMENT ON COLUMN clients.msa_ip_trigger_type IS 'When IP ownership transfers (e.g., upon_payment, immediate).';
COMMENT ON COLUMN clients.msa_jurisdiction_city IS 'Legal jurisdiction for disputes as per MSA.';
COMMENT ON COLUMN clients.msa_version_label IS 'Version or Reference ID of the signed MSA.';
COMMENT ON COLUMN clients.msa_notes_boilerplate IS 'Standard legal notes or project-specific terms agreed in the MSA.';
