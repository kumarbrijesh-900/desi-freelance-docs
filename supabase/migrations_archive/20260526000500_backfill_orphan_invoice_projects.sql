-- Orphan invoice backfill: create real clients/projects for historical invoices.
--
-- Context:
-- Some invoices predate the projects table and still have invoices.project_id IS NULL.
-- The app synthesizes pseudo-projects for those rows, but real navigation and ledgers
-- need persisted projects linked back to the invoice tree.
--
-- This migration is intentionally idempotent:
-- - Uses deterministic UUIDs for backfilled clients/projects.
-- - Skips client creation when a matching client already exists for the same user.
-- - Updates only invoices that are still missing project_id.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_client_id
  ON public.invoices(client_id);

CREATE OR REPLACE FUNCTION public.lance_backfill_uuid(seed text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    substr(md5(seed), 1, 8) || '-' ||
    substr(md5(seed), 9, 4) || '-' ||
    substr(md5(seed), 13, 4) || '-' ||
    substr(md5(seed), 17, 4) || '-' ||
    substr(md5(seed), 21, 12)
  )::uuid;
$$;

CREATE TEMP TABLE tmp_orphan_invoice_project_backfill ON COMMIT DROP AS
WITH orphan_master_invoices AS (
  SELECT
    i.id AS invoice_id,
    i.user_id,
    i.invoice_number,
    i.form_data,
    i.created_at,
    i.updated_at,
    NULLIF(BTRIM(COALESCE(
      i.form_data #>> '{client,clientName}',
      i.form_data #>> '{client,client_name}',
      ''
    )), '') AS raw_client_name,
    NULLIF(LOWER(BTRIM(COALESCE(
      i.form_data #>> '{client,clientEmail}',
      i.form_data #>> '{client,client_email}',
      i.shared_to_email,
      ''
    ))), '') AS raw_client_email,
    NULLIF(BTRIM(COALESCE(
      i.form_data ->> 'projectName',
      i.form_data #>> '{project,name}',
      i.form_data #>> '{meta,projectName}',
      i.form_data #>> '{client,projectName}',
      ''
    )), '') AS raw_project_name
  FROM public.invoices i
  WHERE i.project_id IS NULL
    AND i.parent_invoice_id IS NULL
),
normalized AS (
  SELECT
    omi.*,
    COALESCE(omi.raw_client_name, 'Historical client') AS client_name,
    omi.raw_client_email AS client_email,
    COALESCE(
      omi.raw_project_name,
      CASE
        WHEN omi.raw_client_name IS NOT NULL THEN omi.raw_client_name || ' project'
        ELSE 'Historical project ' || omi.invoice_number
      END
    ) AS project_name,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientAddress}', '')), '') AS client_address_direct,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientAddressLine1}', '')), '') AS address_line_1,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientAddressLine2}', '')), '') AS address_line_2,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientCity}', '')), '') AS city,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientPinCode}', '')), '') AS pin_code,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientPostalCode}', '')), '') AS client_postal_code,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientState}', '')), '') AS state,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientCountry}', '')), '') AS country,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientCurrency}', '')), '') AS client_currency,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{client,clientGstin}', '')), '') AS gstin,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{client,clientLocation}'), ''), 'domestic') AS client_type,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{client,clientType}'), ''), 'agency') AS client_entity_type,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{client,isClientSezUnit}'), ''), 'no') AS sez_status,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{agency,msaPaymentTermsDays}'), '')::integer, 20) AS msa_payment_terms_days,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{agency,msaLateFeeRate}'), '')::numeric, 1.5) AS msa_late_fee_rate,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{agency,msaLateFeeUnit}'), ''), 'monthly') AS msa_late_fee_unit,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{agency,msaIpTriggerType}'), ''), 'upon_full_payment') AS msa_ip_trigger_type,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{agency,msaJurisdictionCity}'), ''), 'Bangalore') AS msa_jurisdiction_city,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{agency,freeRevisionRounds}'), '')::integer, 2) AS free_revision_rounds,
    COALESCE(NULLIF(BTRIM(omi.form_data #>> '{agency,extraRevisionFeePercent}'), '')::numeric, 15) AS extra_revision_fee_percent,
    NULLIF(BTRIM(COALESCE(omi.form_data #>> '{meta,poNumber}', '')), '') AS master_po_number
  FROM orphan_master_invoices omi
),
prepared AS (
  SELECT
    n.*,
    COALESCE(
      n.client_address_direct,
      NULLIF(CONCAT_WS(', ', n.address_line_1, n.address_line_2, n.city, n.state, n.pin_code, n.country), '')
    ) AS client_address,
    public.lance_backfill_uuid(
      'orphan-client:' || n.user_id::text || ':' ||
      COALESCE('email:' || n.client_email, 'name:' || LOWER(n.client_name))
    ) AS proposed_client_id,
    public.lance_backfill_uuid('orphan-project:' || n.invoice_id::text) AS project_id
  FROM normalized n
),
with_existing_clients AS (
  SELECT
    p.*,
    existing_client.id AS existing_client_id
  FROM prepared p
  LEFT JOIN LATERAL (
    SELECT c.id
    FROM public.clients c
    WHERE c.user_id = p.user_id
      AND (
        (p.client_email IS NOT NULL AND LOWER(COALESCE(c.client_email, '')) = p.client_email)
        OR (p.client_email IS NULL AND LOWER(c.client_name) = LOWER(p.client_name))
      )
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST
    LIMIT 1
  ) existing_client ON TRUE
)
SELECT
  *,
  COALESCE(existing_client_id, proposed_client_id) AS resolved_client_id
FROM with_existing_clients;

INSERT INTO public.clients (
  id,
  user_id,
  client_name,
  client_email,
  client_address,
  address_line_1,
  address_line_2,
  city,
  pin_code,
  client_postal_code,
  state,
  country,
  client_currency,
  gstin,
  client_type,
  client_entity_type,
  sez_status,
  msa_payment_terms_days,
  msa_late_fee_rate,
  msa_late_fee_unit,
  msa_ip_trigger_type,
  msa_jurisdiction_city,
  msa_version_label,
  free_revision_rounds,
  extra_revision_fee_percent,
  invoice_count,
  last_invoiced_at,
  created_at,
  updated_at
)
SELECT DISTINCT ON (resolved_client_id)
  resolved_client_id,
  user_id,
  client_name,
  COALESCE(client_email, ''),
  COALESCE(client_address, ''),
  COALESCE(address_line_1, ''),
  COALESCE(address_line_2, ''),
  COALESCE(city, ''),
  COALESCE(pin_code, ''),
  COALESCE(client_postal_code, ''),
  COALESCE(state, ''),
  COALESCE(country, ''),
  COALESCE(client_currency, 'INR'),
  COALESCE(gstin, ''),
  client_type,
  client_entity_type,
  sez_status,
  msa_payment_terms_days,
  msa_late_fee_rate,
  msa_late_fee_unit,
  msa_ip_trigger_type,
  msa_jurisdiction_city,
  'Global Agency MSA',
  free_revision_rounds,
  extra_revision_fee_percent,
  0,
  updated_at,
  created_at,
  updated_at
FROM tmp_orphan_invoice_project_backfill
WHERE existing_client_id IS NULL
ORDER BY resolved_client_id, updated_at DESC
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (
  id,
  user_id,
  client_id,
  name,
  description,
  status,
  master_po_number,
  default_payment_terms_days,
  default_late_fee_rate,
  default_late_fee_unit,
  default_currency,
  start_date,
  created_at,
  updated_at
)
SELECT
  project_id,
  user_id,
  resolved_client_id,
  project_name,
  'Backfilled from historical invoice ' || invoice_number || ' (' || invoice_id::text || ').',
  'active',
  master_po_number,
  msa_payment_terms_days,
  msa_late_fee_rate,
  msa_late_fee_unit,
  COALESCE(client_currency, 'INR'),
  created_at::date,
  created_at,
  updated_at
FROM tmp_orphan_invoice_project_backfill
ON CONFLICT (id) DO UPDATE
SET
  client_id = COALESCE(public.projects.client_id, EXCLUDED.client_id),
  updated_at = COALESCE(
    GREATEST(public.projects.updated_at, EXCLUDED.updated_at),
    public.projects.updated_at,
    EXCLUDED.updated_at,
    NOW()
  );

UPDATE public.invoices i
SET
  project_id = b.project_id,
  client_id = COALESCE(i.client_id, b.resolved_client_id)
FROM tmp_orphan_invoice_project_backfill b
WHERE i.id = b.invoice_id
  AND i.project_id IS NULL;

UPDATE public.invoices child
SET
  project_id = b.project_id,
  client_id = COALESCE(child.client_id, b.resolved_client_id)
FROM tmp_orphan_invoice_project_backfill b
WHERE child.parent_invoice_id = b.invoice_id
  AND child.project_id IS NULL;

UPDATE public.clients c
SET
  invoice_count = counts.invoice_count,
  last_invoiced_at = counts.last_invoiced_at,
  updated_at = COALESCE(
    GREATEST(c.updated_at, counts.last_invoiced_at),
    c.updated_at,
    counts.last_invoiced_at,
    NOW()
  )
FROM (
  SELECT
    client_id,
    COUNT(*)::integer AS invoice_count,
    MAX(updated_at) AS last_invoiced_at
  FROM public.invoices
  WHERE client_id IS NOT NULL
  GROUP BY client_id
) counts
WHERE c.id = counts.client_id;

DROP FUNCTION IF EXISTS public.lance_backfill_uuid(text);

COMMENT ON COLUMN public.invoices.project_id IS
  'Linked project for first-class project navigation. Historical NULL rows backfilled in 20260526000500_backfill_orphan_invoice_projects.';
