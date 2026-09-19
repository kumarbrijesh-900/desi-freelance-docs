-- 2026-06-27 (session 2): extend the notification_type enum with the two milestone
-- events the settle / request-next-milestone paths insert. Before this, inserting
-- these values failed silently (supabase-js returns {error}; call sites did not check),
-- so "Milestone Paid" notifications never persisted.
-- ALREADY APPLIED TO PROD via Supabase MCP; committed here for version control.
-- Replay-safe via IF NOT EXISTS.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'milestone_settled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'milestone_requested';
