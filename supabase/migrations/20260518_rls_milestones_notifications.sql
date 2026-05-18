-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Strict RLS for invoice_milestones and notifications
-- File: supabase/migrations/20260518_rls_milestones_notifications.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: invoice_milestones
-- Access guard: a user may only read/write a milestone row if they own
-- the parent invoice. The sub-select is indexed via invoice_id FK.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE invoice_milestones ENABLE ROW LEVEL SECURITY;

-- SELECT: only the agency owner of the parent invoice can read milestones.
CREATE POLICY "Milestones: owner can select"
    ON invoice_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id      = invoice_milestones.invoice_id
              AND invoices.user_id = auth.uid()
        )
    );

-- INSERT: only the agency owner of the parent invoice can create milestones.
CREATE POLICY "Milestones: owner can insert"
    ON invoice_milestones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id      = invoice_milestones.invoice_id
              AND invoices.user_id = auth.uid()
        )
    );

-- UPDATE: only the agency owner of the parent invoice can update milestones.
CREATE POLICY "Milestones: owner can update"
    ON invoice_milestones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id      = invoice_milestones.invoice_id
              AND invoices.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id      = invoice_milestones.invoice_id
              AND invoices.user_id = auth.uid()
        )
    );

-- DELETE: only the agency owner of the parent invoice can remove milestones.
CREATE POLICY "Milestones: owner can delete"
    ON invoice_milestones FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id      = invoice_milestones.invoice_id
              AND invoices.user_id = auth.uid()
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: notifications
-- Access guard: strictly scoped to auth.uid() = user_id.
-- Service-role (used by all API routes) bypasses RLS automatically.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only read their own notifications.
CREATE POLICY "Notifications: owner can select"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: users can only insert notifications for themselves.
-- In practice, all inserts come from API routes using service_role (bypasses RLS),
-- but this policy ensures the anon/authenticated key cannot inject foreign rows.
CREATE POLICY "Notifications: owner can insert"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only update their own notifications (e.g., mark as read).
CREATE POLICY "Notifications: owner can update"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own notifications.
CREATE POLICY "Notifications: owner can delete"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);
