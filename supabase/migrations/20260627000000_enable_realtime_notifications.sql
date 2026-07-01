-- 2026-06-27 (session 2): enroll public.notifications in the supabase_realtime
-- publication so NotificationBell receives live postgres_changes broadcasts.
-- ALREADY APPLIED TO PROD via Supabase MCP; committed here for version control.
-- Replay-safe: guarded so re-running is a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
