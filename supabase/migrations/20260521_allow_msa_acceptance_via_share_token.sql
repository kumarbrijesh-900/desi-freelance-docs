-- v2.8.1 (security follow-up): Restore legitimate client MSA acceptance.
--
-- Discovery: Every UPDATE policy on public.invoices required auth.uid() = user_id,
-- which is false for anon (NULL = user_id is NULL, not TRUE). Result: anon (real
-- clients) UPDATE attempts via /share/[token] were silently RLS-blocked, returning
-- 0 rows. Every "Failed to accept terms" alert in production traced to this gap.
--
-- The v1 schema correctly added column-level GRANT (anon → 5 MSA columns) but
-- never added the corresponding RLS policy permitting the row-level write.
--
-- Three-layer security model after this migration:
--   1. RLS policy (this file): WHICH ROWS each role can update
--      - anon and authenticated can update rows where share_token is set
--   2. Column-level GRANT (v2.3): WHICH COLUMNS each role can update
--      - anon limited to msa_status, msa_response, msa_responded_at,
--        msa_accepted_at, clnt_msa_note
--   3. Trigger block_owner_msa_self_accept (v2.8): owner can't self-accept
--      even though their existing "Users can update own invoices" policy permits

CREATE POLICY "Anyone with share_token can accept MSA on shared invoice"
  ON public.invoices
  FOR UPDATE
  USING (share_token IS NOT NULL AND share_token <> '')
  WITH CHECK (share_token IS NOT NULL AND share_token <> '');

COMMENT ON POLICY "Anyone with share_token can accept MSA on shared invoice" ON public.invoices IS
  'Permits anon (real clients) to UPDATE the 5 MSA columns on shared invoices. Column-level GRANT scopes which columns; trigger block_owner_msa_self_accept prevents owner abuse. Authenticated non-owners can also accept (rare edge case: a client who also uses Lance themselves, opening their own client share link).';
