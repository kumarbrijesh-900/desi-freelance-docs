-- Remove overly broad public UPDATE policies on invoices
-- MSA acceptance goes through /api/msa-response with service role key
DROP POLICY IF EXISTS "Allow public update access with share token" ON invoices;
DROP POLICY IF EXISTS "Invoices: public can update MSA acceptance" ON invoices;
DROP POLICY IF EXISTS "Allow public read access with share token" ON invoices;
DROP POLICY IF EXISTS "Invoices: public can view shared invoices" ON invoices;
