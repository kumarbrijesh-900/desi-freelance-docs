-- AUDIT-P0-001: Atomic profile + Global MSA save.
-- This function keeps user_profiles and the user's global client_msa in one
-- Postgres transaction. If either write fails, Postgres rolls back both.

ALTER TABLE public.client_msas
  ALTER COLUMN client_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.save_profile_with_global_msa(
  p_profile jsonb,
  p_global_msa_id uuid,
  p_global_msa_title text,
  p_global_msa_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_global_msa_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.user_profiles
  SET
    agency_name = COALESCE(p_profile->>'agency_name', ''),
    address = COALESCE(p_profile->>'address', ''),
    address_line1 = COALESCE(p_profile->>'address_line1', ''),
    address_line2 = COALESCE(p_profile->>'address_line2', ''),
    city = COALESCE(p_profile->>'city', ''),
    pin_code = COALESCE(p_profile->>'pin_code', ''),
    state = COALESCE(p_profile->>'state', ''),
    gstin = COALESCE(p_profile->>'gstin', ''),
    pan = COALESCE(p_profile->>'pan', ''),
    logo_url = COALESCE(p_profile->>'logo_url', ''),
    gst_registration_status = COALESCE(p_profile->>'gst_registration_status', 'not-registered'),
    lut_availability = COALESCE(p_profile->>'lut_availability', ''),
    lut_number = COALESCE(p_profile->>'lut_number', ''),
    lut_validity = COALESCE(p_profile->>'lut_validity', ''),
    no_lut_tax_handling = COALESCE(p_profile->>'no_lut_tax_handling', ''),
    bank_name = COALESCE(p_profile->>'bank_name', ''),
    account_name = COALESCE(p_profile->>'account_name', ''),
    account_number = COALESCE(p_profile->>'account_number', ''),
    ifsc_code = COALESCE(p_profile->>'ifsc_code', ''),
    bank_address = COALESCE(p_profile->>'bank_address', ''),
    swift_bic_code = COALESCE(p_profile->>'swift_bic_code', ''),
    iban_routing_code = COALESCE(p_profile->>'iban_routing_code', ''),
    qr_code_url = COALESCE(p_profile->>'qr_code_url', ''),
    signature_url = COALESCE(p_profile->>'signature_url', ''),
    msa_payment_terms_days = COALESCE(NULLIF(p_profile->>'msa_payment_terms_days', '')::integer, 20),
    msa_late_fee_rate = COALESCE(NULLIF(p_profile->>'msa_late_fee_rate', '')::numeric, 1.5),
    msa_late_fee_unit = COALESCE(p_profile->>'msa_late_fee_unit', 'monthly'),
    msa_ip_trigger_type = COALESCE(p_profile->>'msa_ip_trigger_type', 'upon_full_payment'),
    msa_jurisdiction_city = COALESCE(p_profile->>'msa_jurisdiction_city', 'Bengaluru'),
    primary_service = COALESCE(p_profile->>'primary_service', ''),
    free_revision_rounds = COALESCE(NULLIF(p_profile->>'free_revision_rounds', '')::integer, 2),
    extra_revision_fee_percent = COALESCE(NULLIF(p_profile->>'extra_revision_fee_percent', '')::numeric, 15),
    updated_at = NOW()
  WHERE user_id = v_user_id
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.user_profiles (
      user_id,
      agency_name,
      address,
      address_line1,
      address_line2,
      city,
      pin_code,
      state,
      gstin,
      pan,
      logo_url,
      gst_registration_status,
      lut_availability,
      lut_number,
      lut_validity,
      no_lut_tax_handling,
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      bank_address,
      swift_bic_code,
      iban_routing_code,
      qr_code_url,
      signature_url,
      msa_payment_terms_days,
      msa_late_fee_rate,
      msa_late_fee_unit,
      msa_ip_trigger_type,
      msa_jurisdiction_city,
      primary_service,
      free_revision_rounds,
      extra_revision_fee_percent,
      updated_at
    )
    VALUES (
      v_user_id,
      COALESCE(p_profile->>'agency_name', ''),
      COALESCE(p_profile->>'address', ''),
      COALESCE(p_profile->>'address_line1', ''),
      COALESCE(p_profile->>'address_line2', ''),
      COALESCE(p_profile->>'city', ''),
      COALESCE(p_profile->>'pin_code', ''),
      COALESCE(p_profile->>'state', ''),
      COALESCE(p_profile->>'gstin', ''),
      COALESCE(p_profile->>'pan', ''),
      COALESCE(p_profile->>'logo_url', ''),
      COALESCE(p_profile->>'gst_registration_status', 'not-registered'),
      COALESCE(p_profile->>'lut_availability', ''),
      COALESCE(p_profile->>'lut_number', ''),
      COALESCE(p_profile->>'lut_validity', ''),
      COALESCE(p_profile->>'no_lut_tax_handling', ''),
      COALESCE(p_profile->>'bank_name', ''),
      COALESCE(p_profile->>'account_name', ''),
      COALESCE(p_profile->>'account_number', ''),
      COALESCE(p_profile->>'ifsc_code', ''),
      COALESCE(p_profile->>'bank_address', ''),
      COALESCE(p_profile->>'swift_bic_code', ''),
      COALESCE(p_profile->>'iban_routing_code', ''),
      COALESCE(p_profile->>'qr_code_url', ''),
      COALESCE(p_profile->>'signature_url', ''),
      COALESCE(NULLIF(p_profile->>'msa_payment_terms_days', '')::integer, 20),
      COALESCE(NULLIF(p_profile->>'msa_late_fee_rate', '')::numeric, 1.5),
      COALESCE(p_profile->>'msa_late_fee_unit', 'monthly'),
      COALESCE(p_profile->>'msa_ip_trigger_type', 'upon_full_payment'),
      COALESCE(p_profile->>'msa_jurisdiction_city', 'Bengaluru'),
      COALESCE(p_profile->>'primary_service', ''),
      COALESCE(NULLIF(p_profile->>'free_revision_rounds', '')::integer, 2),
      COALESCE(NULLIF(p_profile->>'extra_revision_fee_percent', '')::numeric, 15),
      NOW()
    )
    RETURNING id INTO v_profile_id;
  END IF;

  IF p_global_msa_id IS NOT NULL THEN
    UPDATE public.client_msas
    SET
      title = COALESCE(p_global_msa_title, ''),
      content = COALESCE(p_global_msa_content, ''),
      status = 'active',
      updated_at = NOW()
    WHERE id = p_global_msa_id
      AND user_id = v_user_id
      AND client_id IS NULL
    RETURNING id INTO v_global_msa_id;

    IF v_global_msa_id IS NULL THEN
      RAISE EXCEPTION 'Global MSA not found for this user' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    SELECT id
    INTO v_global_msa_id
    FROM public.client_msas
    WHERE user_id = v_user_id
      AND client_id IS NULL
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_global_msa_id IS NULL THEN
      INSERT INTO public.client_msas (
        user_id,
        client_id,
        title,
        content,
        status,
        updated_at
      )
      VALUES (
        v_user_id,
        NULL,
        COALESCE(p_global_msa_title, ''),
        COALESCE(p_global_msa_content, ''),
        'active',
        NOW()
      )
      RETURNING id INTO v_global_msa_id;
    ELSE
      UPDATE public.client_msas
      SET
        title = COALESCE(p_global_msa_title, ''),
        content = COALESCE(p_global_msa_content, ''),
        status = 'active',
        updated_at = NOW()
      WHERE id = v_global_msa_id
        AND user_id = v_user_id
        AND client_id IS NULL
      RETURNING id INTO v_global_msa_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'profile_id', v_profile_id,
    'global_msa_id', v_global_msa_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_profile_with_global_msa(jsonb, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.save_profile_with_global_msa(jsonb, uuid, text, text) IS
  'Atomically saves user_profiles and the user-level Global MSA. Used by /profile to prevent partial-success silent failures.';
