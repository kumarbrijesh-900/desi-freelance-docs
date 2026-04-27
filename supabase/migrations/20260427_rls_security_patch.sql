-- SECURITY PATCH: Fix RLS Hijack Vulnerability
-- Revoke the public UPDATE policy on invoices that allowed unrestricted row modification.
-- Future updates to MSA status MUST go through the secure /api/msa-response API route.

DROP POLICY IF EXISTS invoices_update_msa_acceptance ON public.invoices;
