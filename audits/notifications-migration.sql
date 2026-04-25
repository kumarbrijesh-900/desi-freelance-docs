-- ════════════════════════════════════════════════════════════════
-- LANCE NOTIFICATIONS MIGRATION (2026-04-25)
-- Paste into Supabase SQL Editor and run.
-- Powers the in-app Notification Centre.
-- ════════════════════════════════════════════════════════════════

-- Notification type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'invoice_sent',       -- Agency sent invoice to client
    'invoice_viewed',     -- Client opened the invoice link
    'msa_accepted',       -- Client accepted the MSA
    'msa_negotiating',    -- Client proposed MSA changes
    'msa_rejected',       -- Client rejected the MSA
    'invoice_settled'     -- Invoice marked as paid
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL DEFAULT '',
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications: users can read own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Notifications: users can update own (mark read)"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role INSERT is used by the API route (no user policy needed for insert)

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
-- Expected: id, user_id, invoice_id, type, title, message, is_read, created_at
