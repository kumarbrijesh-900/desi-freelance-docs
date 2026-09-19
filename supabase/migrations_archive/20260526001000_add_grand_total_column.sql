-- Add denormalized grand_total column.
-- Persisted at save time, avoids JSONB parsing on list pages.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS grand_total numeric DEFAULT 0;

COMMENT ON COLUMN public.invoices.grand_total IS
  'Denormalized invoice total computed from milestones[].lineItems[].qty * rate at save time.';

-- Backfill from form_data milestones
UPDATE public.invoices
SET grand_total = COALESCE((
  SELECT SUM(
    COALESCE((li->>'qty')::numeric, 0) * COALESCE((li->>'rate')::numeric, 0)
  )
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(form_data->'milestones') = 'array'
         THEN form_data->'milestones'
         ELSE '[]'::jsonb END
  ) AS m,
  jsonb_array_elements(
    CASE WHEN jsonb_typeof(m->'lineItems') = 'array'
         THEN m->'lineItems'
         ELSE '[]'::jsonb END
  ) AS li
), 0)
WHERE grand_total IS NULL OR grand_total = 0;

CREATE INDEX IF NOT EXISTS idx_invoices_grand_total
  ON public.invoices(grand_total);
