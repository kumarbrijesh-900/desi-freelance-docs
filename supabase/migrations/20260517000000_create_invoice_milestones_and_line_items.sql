-- Codifies invoice_milestones and invoice_line_items, which were created via the
-- Supabase SQL editor and never captured in a migration. Idempotent (IF NOT EXISTS).
-- On the existing prod DB this is a no-op; the value is reproducibility from source
-- (fresh `supabase db reset` / new environments) and closing the line_items RLS gap.
--
-- ORDERING: timestamp 20260517000000 places this AFTER 001_invoices.sql (the FK
-- target) and BEFORE the 20260518_* migrations (which enable milestone RLS and
-- re-add the line_items FK) and BEFORE 20260525000500 (which adds the trigger_*
-- columns + scheduled-pending index). The trigger_* columns, that index, and the
-- milestone RLS policies are INTENTIONALLY omitted here — they are added by those
-- later migrations. Do not duplicate them.

-- ── invoice_milestones (base columns only; trigger_* added by 20260525000500) ──
CREATE TABLE IF NOT EXISTS public.invoice_milestones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  title       text NOT NULL,
  order_index integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  status      text DEFAULT 'PENDING',
  tds_amount  numeric DEFAULT 0,
  amount      numeric DEFAULT 0
);

-- ── invoice_line_items (FK → invoice_milestones) ──
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.invoice_milestones(id) ON DELETE CASCADE,
  item_type    text,
  description  text,
  quantity     numeric DEFAULT 1,
  rate         numeric DEFAULT 0,
  unit         text,
  total        numeric DEFAULT 0,
  order_index  integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  sub_type     text NOT NULL DEFAULT ''
);

-- ── RLS for invoice_line_items (genuine gap: live policy is SQL-editor-only) ──
-- Owner of the parent invoice (via milestone → invoice) may manage its line items.
-- invoice_milestones RLS is handled by 20260518_rls_milestones_notifications.sql.
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage items for their invoices" ON public.invoice_line_items;
CREATE POLICY "Users can manage items for their invoices"
  ON public.invoice_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoice_milestones m
      JOIN public.invoices i ON i.id = m.invoice_id
      WHERE m.id = invoice_line_items.milestone_id
        AND i.user_id = auth.uid()
    )
  );
