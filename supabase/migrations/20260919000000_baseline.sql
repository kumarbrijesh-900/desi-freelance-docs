-- Squashed baseline for the public schema.
--
-- pg_dump --schema-only --schema=public --no-owner against production
-- (project mjrbytfvesgvbuxyoidp, PostgreSQL 17.6) on 2026-09-19, then
-- corrected for replay. Verified against production's live catalog: 15
-- tables, 223 columns, 43 constraints, 33 indexes (15 standalone plus 18
-- backing PK/UNIQUE constraints), 61 RLS policies, 5 functions, 3 triggers,
-- 4 enums, 66 grants, RLS enabled on all 15 tables.
--
-- Replaces the 38 files now in supabase/migrations_archive/. Only 2 of those
-- had a matching row in supabase_migrations.schema_migrations; the rest were
-- applied by hand or under different timestamps. That folder's README has the
-- full map and the 20 applied rows as they stood before the squash.
--
-- Four corrections to the raw dump, each marked in place with "-- [baseline]":
--   1. pg_dump 18 emits \restrict / \unrestrict psql meta-commands. They are
--      not SQL and break any executor that is not psql.
--   2. CREATE SCHEMA public -> CREATE SCHEMA IF NOT EXISTS public.
--   3. COMMENT ON SCHEMA public is not executable by the migration role;
--      public is owned by pg_database_owner.
--   4. Twelve ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin statements
--      require membership of a role that postgres does not hold.
-- One addition: uuid-ossp. faqs, notifications and user_feedback default their
-- id to extensions.uuid_generate_v4(), which a --schema=public dump omits.

--
-- PostgreSQL database dump
--

-- [baseline] psql meta-command removed: \restrict 6Rbp9ZqxrtDJEiZtQ5Olj1KPESqZZxqiqanqqXseP72gGjC5ygUkmxZcAwAKzHW

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- [baseline] faqs, notifications and user_feedback default their id to
-- extensions.uuid_generate_v4(). A --schema=public dump does not carry the
-- extension, so a fresh replay fails on those three CREATE TABLEs. The other
-- twelve tables use gen_random_uuid(), which is core Postgres.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- [baseline] public already exists on Supabase; made idempotent.
CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

-- [baseline] not executable by the migration role: COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: feedback_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_status AS ENUM (
    'new',
    'reviewed'
);


--
-- Name: feedback_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_type AS ENUM (
    'bug',
    'feature',
    'general'
);


--
-- Name: msa_acceptance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.msa_acceptance_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'proposed'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'invoice_sent',
    'invoice_viewed',
    'msa_accepted',
    'msa_negotiating',
    'msa_rejected',
    'invoice_settled',
    'milestone_settled',
    'milestone_requested',
    'payment_reminder',
    'msa_unanswered'
);


--
-- Name: advance_first_milestone_to_live(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_first_milestone_to_live() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.msa_status = 'accepted'
     and old.msa_status is distinct from 'accepted'
     and new.parent_invoice_id is null then
    update public.invoice_milestones
       set status = 'LIVE'
     where invoice_id = new.id
       and status = 'PENDING'
       and order_index = (
         select min(order_index) from public.invoice_milestones
          where invoice_id = new.id and status = 'PENDING'
       );
  end if;
  return new;
end;
$$;


--
-- Name: block_owner_msa_self_accept(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_owner_msa_self_accept() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  current_uid uuid;
BEGIN
  -- Service role bypasses (API routes use it and apply their own owner check)
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
       NEW.msa_status      IS DISTINCT FROM OLD.msa_status
    OR NEW.msa_response    IS DISTINCT FROM OLD.msa_response
    OR NEW.msa_responded_at IS DISTINCT FROM OLD.msa_responded_at
    OR NEW.msa_accepted_at IS DISTINCT FROM OLD.msa_accepted_at
    OR NEW.client_msa_note IS DISTINCT FROM OLD.client_msa_note
  ) THEN
    RAISE EXCEPTION
      'owner_cannot_accept_own_msa: Invoice owners cannot accept or reject their own MSA. Send the share link to your client.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: save_profile_with_global_msa(jsonb, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_profile_with_global_msa(p_profile jsonb, p_global_msa_id uuid, p_global_msa_title text, p_global_msa_content text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
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
      user_id, agency_name, address, address_line1, address_line2, city, pin_code,
      state, gstin, pan, logo_url, gst_registration_status, lut_availability,
      lut_number, lut_validity, no_lut_tax_handling, bank_name, account_name,
      account_number, ifsc_code, bank_address, swift_bic_code, iban_routing_code,
      qr_code_url, signature_url, msa_payment_terms_days, msa_late_fee_rate,
      msa_late_fee_unit, msa_ip_trigger_type, msa_jurisdiction_city,
      primary_service, free_revision_rounds, extra_revision_fee_percent, updated_at
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
    SET title = COALESCE(p_global_msa_title, ''),
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
    SELECT id INTO v_global_msa_id
    FROM public.client_msas
    WHERE user_id = v_user_id
      AND client_id IS NULL
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_global_msa_id IS NULL THEN
      INSERT INTO public.client_msas (
        user_id, client_id, title, content, status, updated_at
      )
      VALUES (
        v_user_id, NULL, COALESCE(p_global_msa_title, ''),
        COALESCE(p_global_msa_content, ''), 'active', NOW()
      )
      RETURNING id INTO v_global_msa_id;
    ELSE
      UPDATE public.client_msas
      SET title = COALESCE(p_global_msa_title, ''),
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


--
-- Name: FUNCTION save_profile_with_global_msa(p_profile jsonb, p_global_msa_id uuid, p_global_msa_title text, p_global_msa_content text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.save_profile_with_global_msa(p_profile jsonb, p_global_msa_id uuid, p_global_msa_title text, p_global_msa_content text) IS 'Atomically saves user_profiles and the user-level Global MSA. Used by /profile to prevent partial-success silent failures.';


--
-- Name: sync_invoice_milestones(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_invoice_milestones(p_invoice_id uuid, p_milestones jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  m jsonb;
  v_idx int;
  v_ref text;
  v_id uuid;
  v_amount numeric;
  v_keep_refs text[] := '{}';
begin
  if not exists (select 1 from public.invoices i where i.id = p_invoice_id and i.user_id = auth.uid()) then
    raise exception 'sync_invoice_milestones: invoice % not found or not owned by caller', p_invoice_id;
  end if;

  if p_milestones is null or jsonb_typeof(p_milestones) <> 'array' then
    raise exception 'sync_invoice_milestones: p_milestones must be a jsonb array, got %', coalesce(jsonb_typeof(p_milestones), 'null');
  end if;

  if jsonb_array_length(p_milestones) = 0 then
    delete from public.invoice_milestones where invoice_id = p_invoice_id;
    return;
  end if;

  for v_idx in 0 .. jsonb_array_length(p_milestones) - 1 loop
    m := p_milestones -> v_idx;
    v_ref := coalesce(nullif(m->>'id', ''), 'idx-' || v_idx);
    v_keep_refs := array_append(v_keep_refs, v_ref);

    select coalesce(sum(coalesce((li->>'qty')::numeric, 0) * coalesce((li->>'rate')::numeric, 0)), 0)
      into v_amount
      from jsonb_array_elements(coalesce(m->'lineItems', '[]'::jsonb)) li;

    v_id := null;
    select id into v_id from public.invoice_milestones
      where invoice_id = p_invoice_id and form_ref = v_ref;
    if v_id is null then
      select id into v_id from public.invoice_milestones
        where invoice_id = p_invoice_id and form_ref is null and order_index = v_idx;
    end if;

    if v_id is not null then
      update public.invoice_milestones set
        title = coalesce(nullif(m->>'title', ''), 'Milestone ' || (v_idx + 1)),
        order_index = v_idx,
        amount = v_amount,
        form_ref = v_ref,
        tds_amount = case
          when status in ('SETTLED', 'CANCELLED') then tds_amount
          else coalesce((m->>'tdsAmount')::numeric, 0)
        end
      where id = v_id;
    else
      insert into public.invoice_milestones
        (invoice_id, form_ref, title, status, tds_amount, amount, order_index)
      values (
        p_invoice_id,
        v_ref,
        coalesce(nullif(m->>'title', ''), 'Milestone ' || (v_idx + 1)),
        upper(coalesce(nullif(m->>'status', ''), 'PENDING')),
        coalesce((m->>'tdsAmount')::numeric, 0),
        v_amount,
        v_idx
      )
      returning id into v_id;
    end if;

    delete from public.invoice_line_items where milestone_id = v_id;
    insert into public.invoice_line_items
      (milestone_id, item_type, sub_type, description, quantity, rate, unit, total, order_index)
    select
      v_id,
      t.li->>'type',
      coalesce(t.li->>'subType', ''),
      t.li->>'description',
      coalesce((t.li->>'qty')::numeric, 0),
      coalesce((t.li->>'rate')::numeric, 0),
      t.li->>'rateUnit',
      coalesce((t.li->>'qty')::numeric, 0) * coalesce((t.li->>'rate')::numeric, 0),
      (t.ord - 1)::int
    from jsonb_array_elements(coalesce(m->'lineItems', '[]'::jsonb)) with ordinality as t(li, ord);
  end loop;

  delete from public.invoice_milestones
   where invoice_id = p_invoice_id
     and coalesce(form_ref, 'idx-' || order_index) <> all (v_keep_refs);
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: client_msas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_msas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    user_id uuid NOT NULL,
    title text DEFAULT 'Master Service Agreement'::text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_msas_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'expired'::text])))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    client_name text,
    client_email text,
    user_id uuid,
    client_type text,
    gstin text,
    sez_status text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    pin_code text,
    country text,
    updated_at timestamp with time zone DEFAULT now(),
    client_address text DEFAULT ''::text NOT NULL,
    client_postal_code text DEFAULT ''::text NOT NULL,
    client_currency text DEFAULT ''::text NOT NULL,
    invoice_count integer DEFAULT 0 NOT NULL,
    last_invoiced_at timestamp with time zone,
    client_entity_type text DEFAULT 'agency'::text NOT NULL,
    msa_effective_date timestamp with time zone,
    msa_late_fee_unit text DEFAULT 'monthly'::text NOT NULL,
    msa_ip_trigger_type text DEFAULT 'upon_full_payment'::text NOT NULL,
    msa_jurisdiction_city text DEFAULT 'Bangalore'::text NOT NULL,
    msa_version_label text DEFAULT 'Standard Lance MSA v1.2'::text NOT NULL,
    free_revision_rounds integer DEFAULT 2 NOT NULL,
    extra_revision_fee_percent numeric(5,2) DEFAULT 15 NOT NULL,
    msa_late_fee_rate numeric DEFAULT 1.5,
    msa_payment_terms_days integer DEFAULT 20,
    msa_notes_boilerplate text,
    CONSTRAINT clients_client_type_check CHECK ((client_type = ANY (ARRAY['domestic'::text, 'international'::text]))),
    CONSTRAINT clients_sez_status_check CHECK ((sez_status = ANY (ARRAY['yes'::text, 'no'::text, 'not_sure'::text])))
);


--
-- Name: COLUMN clients.client_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.client_type IS 'Stores client location type: domestic or international.';


--
-- Name: COLUMN clients.sez_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.sez_status IS 'SEZ unit status as text (yes/no). Replaces legacy is_sez_unit boolean.';


--
-- Name: COLUMN clients.invoice_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.invoice_count IS 'Running count of invoices issued to this client.';


--
-- Name: COLUMN clients.last_invoiced_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.last_invoiced_at IS 'Timestamp of the most recent invoice issued to this client.';


--
-- Name: COLUMN clients.client_entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.client_entity_type IS 'Business entity classification: agency or freelancer.';


--
-- Name: COLUMN clients.msa_late_fee_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.msa_late_fee_unit IS 'Frequency for late fee: monthly, daily, or annually.';


--
-- Name: COLUMN clients.free_revision_rounds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.free_revision_rounds IS 'Number of free revision rounds included in MSA.';


--
-- Name: COLUMN clients.extra_revision_fee_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.extra_revision_fee_percent IS 'Percentage fee charged per revision beyond the free rounds.';


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    project_type text,
    raw_brief text,
    extracted_data jsonb,
    licensing_data jsonb,
    user_id uuid,
    status text DEFAULT 'draft'::text,
    current_step integer DEFAULT 0,
    review_state jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    category text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    milestone_id uuid NOT NULL,
    item_type text,
    description text,
    quantity numeric DEFAULT 1,
    rate numeric DEFAULT 0,
    unit text,
    total numeric DEFAULT 0,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    sub_type text DEFAULT ''::text NOT NULL
);


--
-- Name: invoice_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    title text NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'PENDING'::text,
    tds_amount numeric DEFAULT 0,
    amount numeric DEFAULT 0,
    trigger_mode text DEFAULT 'immediate'::text NOT NULL,
    trigger_date timestamp with time zone,
    trigger_status text DEFAULT 'pending'::text NOT NULL,
    trigger_error text,
    trigger_fired_at timestamp with time zone,
    form_ref text,
    CONSTRAINT invoice_milestones_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'LIVE'::text, 'SETTLED'::text, 'CANCELLED'::text]))),
    CONSTRAINT invoice_milestones_trigger_mode_check CHECK ((trigger_mode = ANY (ARRAY['immediate'::text, 'scheduled'::text, 'cancelled'::text]))),
    CONSTRAINT invoice_milestones_trigger_status_check CHECK ((trigger_status = ANY (ARRAY['pending'::text, 'fired'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN invoice_milestones.trigger_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoice_milestones.trigger_mode IS 'How the next milestone invoice is generated: immediate (auto on settle), scheduled (cron picks up at trigger_date), cancelled (soft-cancelled, no invoice generated)';


--
-- Name: COLUMN invoice_milestones.trigger_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoice_milestones.trigger_status IS 'Lifecycle for scheduled triggers: pending (queued), fired (invoice generated), failed (generation errored), cancelled (user cancelled before trigger_date)';


--
-- Name: COLUMN invoice_milestones.form_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoice_milestones.form_ref IS 'Stable client-side Milestone.id from form_data. Sync matches on this (not order_index) so reordering can never reattach lifecycle state to the wrong milestone.';


--
-- Name: CONSTRAINT invoice_milestones_status_check ON invoice_milestones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT invoice_milestones_status_check ON public.invoice_milestones IS 'Milestone lifecycle canon is UPPERCASE (PENDING/LIVE/SETTLED/CANCELLED). trigger_* columns are a separate, already-fenced lowercase family. Enforced 2026-07-07.';


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    invoice_number text NOT NULL,
    form_data jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    share_token text,
    shared_at timestamp with time zone,
    template_id text DEFAULT 'classic'::text,
    msa_id uuid,
    msa_accepted_at timestamp with time zone,
    msa_response text DEFAULT 'pending'::text,
    msa_responded_at timestamp with time zone,
    shared_to_email text,
    applied_payment_terms text,
    due_date date,
    reminded_due_date boolean DEFAULT false NOT NULL,
    reminded_overdue boolean DEFAULT false NOT NULL,
    has_addendum boolean DEFAULT false,
    last_notified_at timestamp with time zone,
    msa_status public.msa_acceptance_status DEFAULT 'pending'::public.msa_acceptance_status,
    payment_terms_days integer,
    settled_at timestamp with time zone,
    parent_invoice_id uuid,
    milestone_index integer,
    client_msa_note text,
    is_offline boolean DEFAULT false NOT NULL,
    applied_late_fee_rate numeric,
    applied_late_fee_unit text,
    applied_license_type text,
    project_id uuid,
    client_id uuid,
    grand_total numeric DEFAULT 0,
    notified_unanswered boolean DEFAULT false NOT NULL,
    CONSTRAINT invoices_msa_response_check CHECK ((msa_response = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))),
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finalized'::text, 'partial'::text, 'settled'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN invoices.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.due_date IS 'Promoted due date for automated reminders and late fee calculations.';


--
-- Name: COLUMN invoices.has_addendum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.has_addendum IS 'Flag indicating if this invoice has project-specific overrides (Addendum).';


--
-- Name: COLUMN invoices.msa_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.msa_status IS 'Client MSA acceptance status. Writeable only by anon (client) via share_token and by service_role via API routes. Authenticated users cannot self-update.';


--
-- Name: COLUMN invoices.payment_terms_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.payment_terms_days IS 'Numeric payment terms (Net days) for mathematical due date calculation.';


--
-- Name: COLUMN invoices.is_offline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.is_offline IS 'When true, invoice was downloaded as PDF and is managed manually. Excluded from master list and dashboard metrics.';


--
-- Name: COLUMN invoices.applied_late_fee_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.applied_late_fee_rate IS 'Snapshot of effective late-fee percentage at the moment of finalize/share. Locks in terms for audit immutability.';


--
-- Name: COLUMN invoices.applied_late_fee_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.applied_late_fee_unit IS 'Snapshot of effective late-fee cadence. Stored as singular noun: "day", "week", or "month".';


--
-- Name: COLUMN invoices.applied_license_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.applied_license_type IS 'Snapshot of effective license type at finalize/share time. Locks in IP terms for audit immutability. Companion to applied_payment_terms / applied_late_fee_rate / applied_late_fee_unit (v2.8.3).';


--
-- Name: COLUMN invoices.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.project_id IS 'Linked project for first-class project navigation. Historical NULL rows backfilled in 20260526000500_backfill_orphan_invoice_projects.';


--
-- Name: COLUMN invoices.grand_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.grand_total IS 'Pre-tax taxable value of the ONE milestone this invoice bills: milestone[0] on a master, the single milestone on a child. NOT the project total, and NOT tax-inclusive despite the name. See billableLineItems in lib/invoice-calculations.ts for the invariant. Corrected 2026-09-18; the original comment claimed every milestone, which no writer has ever produced.';


--
-- Name: COLUMN invoices.notified_unanswered; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.notified_unanswered IS 'One-time guard for the UNANSWERED notification (master MSA pending 7+ days after shared_at). Set true when the notification is emitted so it never repeats. Mirrors the reminded_* pattern but notifies the invoice owner, not the client.';


--
-- Name: CONSTRAINT invoices_status_check ON invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT invoices_status_check ON public.invoices IS 'Invoice lifecycle canon is lowercase (draft/finalized/partial/settled/cancelled). overdue is derived, never stored. Enforced 2026-09-16 after PARTIAL drifted uppercase and four writer routes emitted values the previous fence rejected.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    invoice_id uuid,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    full_name text,
    business_name text,
    email text,
    user_id uuid,
    gst_registered boolean DEFAULT false,
    gstin text,
    pan text,
    lut_enabled boolean DEFAULT false,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    pin_code text,
    country text DEFAULT 'India'::text,
    logo_url text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    msa_accepted_at timestamp with time zone,
    msa_accepted_via_invoice_id uuid,
    project_addendum_text text,
    master_po_number text,
    default_payment_terms_days integer,
    default_late_fee_rate numeric,
    default_late_fee_unit text,
    default_currency text DEFAULT 'INR'::text,
    start_date date,
    expected_end_date date,
    actual_end_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    closure_reason text
);


--
-- Name: COLUMN projects.msa_accepted_via_invoice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.msa_accepted_via_invoice_id IS 'Which invoice carried the MSA the client accepted. A historical note: ON DELETE SET NULL, so deleting the invoice clears it rather than being blocked.';


--
-- Name: COLUMN projects.closed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.closed_at IS 'Timestamp a project was closed early (status=closed). Distinct from completion (all milestones settled), which is inferred and not persisted.';


--
-- Name: COLUMN projects.closure_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.closure_reason IS 'Reason a project was closed early (e.g. non-payment, scope discrepancy). Holds a canned reason label or free text.';


--
-- Name: read_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.read_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now(),
    viewer_ip text,
    viewer_ua text
);


--
-- Name: sac_codes_architecture; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sac_codes_architecture (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_type text NOT NULL,
    sac_code text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    tier text,
    payment_status text,
    provider text,
    provider_payment_id text,
    user_id uuid
);


--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    type public.feedback_type NOT NULL,
    message text NOT NULL,
    status public.feedback_status DEFAULT 'new'::public.feedback_status,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agency_name text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    address_line1 text DEFAULT ''::text NOT NULL,
    address_line2 text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    pin_code text DEFAULT ''::text NOT NULL,
    state text DEFAULT ''::text NOT NULL,
    gstin text DEFAULT ''::text NOT NULL,
    pan text DEFAULT ''::text NOT NULL,
    logo_url text DEFAULT ''::text NOT NULL,
    gst_registration_status text DEFAULT 'not-registered'::text NOT NULL,
    lut_availability text DEFAULT ''::text NOT NULL,
    lut_number text DEFAULT ''::text NOT NULL,
    no_lut_tax_handling text DEFAULT ''::text NOT NULL,
    bank_name text DEFAULT ''::text NOT NULL,
    account_name text DEFAULT ''::text NOT NULL,
    account_number text DEFAULT ''::text NOT NULL,
    ifsc_code text DEFAULT ''::text NOT NULL,
    bank_address text DEFAULT ''::text NOT NULL,
    swift_bic_code text DEFAULT ''::text NOT NULL,
    iban_routing_code text DEFAULT ''::text NOT NULL,
    qr_code_url text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    signature_url text,
    lut_validity text DEFAULT ''::text NOT NULL,
    msa_payment_terms_days integer DEFAULT 20 NOT NULL,
    msa_late_fee_rate numeric DEFAULT 1.5 NOT NULL,
    msa_late_fee_unit text DEFAULT 'monthly'::text NOT NULL,
    msa_ip_trigger_type text DEFAULT 'upon_full_payment'::text NOT NULL,
    msa_jurisdiction_city text DEFAULT 'Bangalore'::text NOT NULL,
    free_revision_rounds integer DEFAULT 2 NOT NULL,
    extra_revision_fee_percent numeric(5,2) DEFAULT 15 NOT NULL,
    primary_service text DEFAULT ''::text NOT NULL
);


--
-- Name: client_msas client_msas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_msas
    ADD CONSTRAINT client_msas_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_milestones invoice_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_milestones
    ADD CONSTRAINT invoice_milestones_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_share_token_key UNIQUE (share_token);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: read_receipts read_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.read_receipts
    ADD CONSTRAINT read_receipts_pkey PRIMARY KEY (id);


--
-- Name: sac_codes_architecture sac_codes_architecture_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sac_codes_architecture
    ADD CONSTRAINT sac_codes_architecture_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: idx_invoice_milestones_scheduled_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_milestones_scheduled_pending ON public.invoice_milestones USING btree (trigger_date) WHERE ((trigger_mode = 'scheduled'::text) AND (trigger_status = 'pending'::text));


--
-- Name: idx_invoices_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_client_id ON public.invoices USING btree (client_id);


--
-- Name: idx_invoices_grand_total; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_grand_total ON public.invoices USING btree (grand_total);


--
-- Name: idx_invoices_last_notified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_last_notified ON public.invoices USING btree (last_notified_at);


--
-- Name: idx_invoices_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_project_id ON public.invoices USING btree (project_id);


--
-- Name: idx_invoices_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_share_token ON public.invoices USING btree (share_token);


--
-- Name: idx_invoices_status_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status_due_date ON public.invoices USING btree (status, due_date);


--
-- Name: idx_invoices_unique_parent_milestone; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invoices_unique_parent_milestone ON public.invoices USING btree (parent_invoice_id, milestone_index) WHERE ((parent_invoice_id IS NOT NULL) AND (milestone_index IS NOT NULL));


--
-- Name: idx_invoices_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_user_created ON public.invoices USING btree (user_id, created_at DESC);


--
-- Name: idx_invoices_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_user_status ON public.invoices USING btree (user_id, status);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_projects_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_client_id ON public.projects USING btree (client_id);


--
-- Name: idx_projects_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);


--
-- Name: invoice_milestones_invoice_form_ref_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoice_milestones_invoice_form_ref_key ON public.invoice_milestones USING btree (invoice_id, form_ref) WHERE (form_ref IS NOT NULL);


--
-- Name: invoices_is_offline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_is_offline_idx ON public.invoices USING btree (is_offline) WHERE (is_offline = true);


--
-- Name: invoices block_owner_msa_self_accept_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER block_owner_msa_self_accept_trigger BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.block_owner_msa_self_accept();


--
-- Name: invoices set_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: invoices trg_advance_first_milestone_to_live; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_advance_first_milestone_to_live AFTER UPDATE OF msa_status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.advance_first_milestone_to_live();


--
-- Name: client_msas client_msas_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_msas
    ADD CONSTRAINT client_msas_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_msas client_msas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_msas
    ADD CONSTRAINT client_msas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invoice_line_items invoice_line_items_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.invoice_milestones(id) ON DELETE CASCADE;


--
-- Name: invoice_milestones invoice_milestones_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_milestones
    ADD CONSTRAINT invoice_milestones_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_msa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_msa_id_fkey FOREIGN KEY (msa_id) REFERENCES public.client_msas(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_parent_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_parent_invoice_id_fkey FOREIGN KEY (parent_invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: projects projects_msa_accepted_via_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_msa_accepted_via_invoice_id_fkey FOREIGN KEY (msa_accepted_via_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: read_receipts read_receipts_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.read_receipts
    ADD CONSTRAINT read_receipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications Anon can notify owner of shared invoice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can notify owner of shared invoice" ON public.notifications FOR INSERT TO anon WITH CHECK (((invoice_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = notifications.invoice_id) AND (i.share_token IS NOT NULL) AND (i.share_token <> ''::text) AND (i.user_id = notifications.user_id))))));


--
-- Name: sac_codes_architecture Anyone can read SAC codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read SAC codes" ON public.sac_codes_architecture FOR SELECT TO authenticated, anon USING (true);


--
-- Name: invoices Anyone with share_token can accept MSA on shared invoice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone with share_token can accept MSA on shared invoice" ON public.invoices FOR UPDATE USING (((share_token IS NOT NULL) AND (share_token <> ''::text))) WITH CHECK (((share_token IS NOT NULL) AND (share_token <> ''::text)));


--
-- Name: clients Clients: users can manage own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients: users can manage own clients" ON public.clients USING ((auth.uid() = user_id));


--
-- Name: faqs FAQs: public can read published; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "FAQs: public can read published" ON public.faqs FOR SELECT USING ((is_published = true));


--
-- Name: clients Full access to own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Full access to own clients" ON public.clients USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Full access to own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Full access to own profile" ON public.user_profiles TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoices Invoices: users can manage own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invoices: users can manage own invoices" ON public.invoices USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: client_msas MSAs: public can read via shared invoice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "MSAs: public can read via shared invoice" ON public.client_msas FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.msa_id = client_msas.id) AND (invoices.share_token IS NOT NULL)))));


--
-- Name: client_msas MSAs: users can manage own MSAs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "MSAs: users can manage own MSAs" ON public.client_msas USING ((auth.uid() = user_id));


--
-- Name: invoice_milestones Milestones: owner can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Milestones: owner can delete" ON public.invoice_milestones FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_milestones.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoice_milestones Milestones: owner can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Milestones: owner can insert" ON public.invoice_milestones FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_milestones.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoice_milestones Milestones: owner can select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Milestones: owner can select" ON public.invoice_milestones FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_milestones.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoice_milestones Milestones: owner can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Milestones: owner can update" ON public.invoice_milestones FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_milestones.invoice_id) AND (invoices.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_milestones.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: notifications Notifications: owner can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: owner can delete" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Notifications: owner can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: owner can insert" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Notifications: owner can select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: owner can select" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Notifications: owner can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: owner can update" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Notifications: users can read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: users can read own" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Notifications: users can update own (mark read); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: users can update own (mark read)" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Profiles: users can manage own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles: users can manage own profile" ON public.user_profiles USING ((auth.uid() = user_id));


--
-- Name: faqs Published FAQs are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Published FAQs are viewable by everyone" ON public.faqs FOR SELECT USING ((is_published = true));


--
-- Name: read_receipts Read Receipts: owners can view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read Receipts: owners can view" ON public.read_receipts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = read_receipts.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: client_msas Users can delete own MSAs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own MSAs" ON public.client_msas FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: clients Users can delete own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: invoices Users can delete own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: client_msas Users can insert own MSAs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own MSAs" ON public.client_msas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: clients Users can insert own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoices Users can insert own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_feedback Users can insert their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoice_line_items Users can manage items for their invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage items for their invoices" ON public.invoice_line_items USING ((EXISTS ( SELECT 1
   FROM (public.invoice_milestones
     JOIN public.invoices ON ((invoices.id = invoice_milestones.invoice_id)))
  WHERE ((invoice_milestones.id = invoice_line_items.milestone_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoice_milestones Users can manage milestones for their invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage milestones for their invoices" ON public.invoice_milestones USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_milestones.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: clients Users can manage their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own clients" ON public.clients USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: client_msas Users can read own MSAs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own MSAs" ON public.client_msas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: clients Users can read own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own clients" ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: client_msas Users can update own MSAs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own MSAs" ON public.client_msas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: clients Users can update own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: invoices Users can update own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: invoices Users can view own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: projects Users manage own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own projects" ON public.projects TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users manage own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own subscription" ON public.subscriptions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: client_msas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_msas ENABLE ROW LEVEL SECURITY;

--
-- Name: client_msas client_msas_select_via_shared_invoice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_msas_select_via_shared_invoice ON public.client_msas FOR SELECT USING ((id IN ( SELECT invoices.msa_id
   FROM public.invoices
  WHERE ((invoices.share_token IS NOT NULL) AND (invoices.share_token <> ''::text) AND (invoices.msa_id IS NOT NULL)))));


--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: clients clients_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_delete_own ON public.clients FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: clients clients_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_delete_owner ON public.clients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: clients clients_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_insert_own ON public.clients FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: clients clients_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_insert_owner ON public.clients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: clients clients_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_select_own ON public.clients FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: clients clients_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_select_owner ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: clients clients_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_update_own ON public.clients FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: clients clients_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_update_owner ON public.clients FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents documents_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_insert_own ON public.documents FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: documents documents_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_select_own ON public.documents FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: documents documents_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_update_own ON public.documents FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: faqs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices invoices_select_by_share_token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_select_by_share_token ON public.invoices FOR SELECT USING (((share_token IS NOT NULL) AND (share_token <> ''::text)));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: read_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: read_receipts read_receipts_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_receipts_select_owner ON public.read_receipts FOR SELECT USING ((invoice_id IN ( SELECT invoices.id
   FROM public.invoices
  WHERE (invoices.user_id = auth.uid()))));


--
-- Name: sac_codes_architecture; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sac_codes_architecture ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION advance_first_milestone_to_live(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.advance_first_milestone_to_live() FROM PUBLIC;
GRANT ALL ON FUNCTION public.advance_first_milestone_to_live() TO service_role;


--
-- Name: FUNCTION block_owner_msa_self_accept(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.block_owner_msa_self_accept() TO anon;
GRANT ALL ON FUNCTION public.block_owner_msa_self_accept() TO authenticated;
GRANT ALL ON FUNCTION public.block_owner_msa_self_accept() TO service_role;


--
-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;


--
-- Name: FUNCTION save_profile_with_global_msa(p_profile jsonb, p_global_msa_id uuid, p_global_msa_title text, p_global_msa_content text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.save_profile_with_global_msa(p_profile jsonb, p_global_msa_id uuid, p_global_msa_title text, p_global_msa_content text) TO anon;
GRANT ALL ON FUNCTION public.save_profile_with_global_msa(p_profile jsonb, p_global_msa_id uuid, p_global_msa_title text, p_global_msa_content text) TO authenticated;
GRANT ALL ON FUNCTION public.save_profile_with_global_msa(p_profile jsonb, p_global_msa_id uuid, p_global_msa_title text, p_global_msa_content text) TO service_role;


--
-- Name: FUNCTION sync_invoice_milestones(p_invoice_id uuid, p_milestones jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_invoice_milestones(p_invoice_id uuid, p_milestones jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.sync_invoice_milestones(p_invoice_id uuid, p_milestones jsonb) TO service_role;


--
-- Name: TABLE client_msas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_msas TO anon;
GRANT ALL ON TABLE public.client_msas TO authenticated;
GRANT ALL ON TABLE public.client_msas TO service_role;


--
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role;


--
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documents TO anon;
GRANT ALL ON TABLE public.documents TO authenticated;
GRANT ALL ON TABLE public.documents TO service_role;


--
-- Name: TABLE faqs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faqs TO anon;
GRANT ALL ON TABLE public.faqs TO authenticated;
GRANT ALL ON TABLE public.faqs TO service_role;


--
-- Name: TABLE invoice_line_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invoice_line_items TO anon;
GRANT ALL ON TABLE public.invoice_line_items TO authenticated;
GRANT ALL ON TABLE public.invoice_line_items TO service_role;


--
-- Name: TABLE invoice_milestones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invoice_milestones TO anon;
GRANT ALL ON TABLE public.invoice_milestones TO authenticated;
GRANT ALL ON TABLE public.invoice_milestones TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: COLUMN invoices.msa_accepted_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(msa_accepted_at) ON TABLE public.invoices TO anon;


--
-- Name: COLUMN invoices.msa_response; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(msa_response) ON TABLE public.invoices TO anon;


--
-- Name: COLUMN invoices.msa_responded_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(msa_responded_at) ON TABLE public.invoices TO anon;


--
-- Name: COLUMN invoices.msa_status; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(msa_status) ON TABLE public.invoices TO anon;


--
-- Name: COLUMN invoices.client_msa_note; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(client_msa_note) ON TABLE public.invoices TO anon;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: TABLE read_receipts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.read_receipts TO anon;
GRANT ALL ON TABLE public.read_receipts TO authenticated;
GRANT ALL ON TABLE public.read_receipts TO service_role;


--
-- Name: TABLE sac_codes_architecture; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sac_codes_architecture TO anon;
GRANT ALL ON TABLE public.sac_codes_architecture TO authenticated;
GRANT ALL ON TABLE public.sac_codes_architecture TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE user_feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_feedback TO anon;
GRANT ALL ON TABLE public.user_feedback TO authenticated;
GRANT ALL ON TABLE public.user_feedback TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
-- [baseline] requires membership of supabase_admin: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

-- [baseline] psql meta-command removed: \unrestrict 6Rbp9ZqxrtDJEiZtQ5Olj1KPESqZZxqiqanqqXseP72gGjC5ygUkmxZcAwAKzHW

