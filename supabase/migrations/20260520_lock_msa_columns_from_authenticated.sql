-- Phase A0.1 (v2.8 security): Prevent authenticated invoice owners from
-- accepting their own MSA via the share page.
--
-- Mechanism: a BEFORE UPDATE trigger that raises an exception if the
-- caller (resolved via auth.uid()) is the row's user_id AND any MSA
-- response column is being changed.
--
-- Bypass paths (intentional):
--   - service_role: server-side API routes (they apply their own owner check)
--   - anon: legitimate client acceptance via share_token (auth.uid() is NULL)

CREATE OR REPLACE FUNCTION public.block_owner_msa_self_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_uid uuid;
BEGIN
  -- Service role bypasses
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Resolve auth.uid() safely (anon has none)
  BEGIN
    current_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_uid := NULL;
  END;

  -- Anonymous clients pass through (this is the legitimate acceptance path)
  IF current_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Block authenticated owner from changing any MSA response column
  IF current_uid = NEW.user_id AND (
       NEW.msa_status       IS DISTINCT FROM OLD.msa_status
    OR NEW.msa_response     IS DISTINCT FROM OLD.msa_response
    OR NEW.msa_responded_at IS DISTINCT FROM OLD.msa_responded_at
    OR NEW.msa_accepted_at  IS DISTINCT FROM OLD.msa_accepted_at
    OR NEW.client_msa_note  IS DISTINCT FROM OLD.client_msa_note
  ) THEN
    RAISE EXCEPTION
      'owner_cannot_accept_own_msa: Invoice owners cannot accept or reject their own MSA. Send the share link to your client.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_owner_msa_self_accept_trigger ON public.invoices;

CREATE TRIGGER block_owner_msa_self_accept_trigger
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.block_owner_msa_self_accept();

COMMENT ON FUNCTION public.block_owner_msa_self_accept() IS
  'Prevents authenticated invoice owners from updating MSA response columns on their own invoices. Anon (clients) and service_role bypass. Raises owner_cannot_accept_own_msa on violation.';