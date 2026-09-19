ALTER TABLE invoice_milestones
  ADD COLUMN IF NOT EXISTS trigger_mode text NOT NULL DEFAULT 'immediate'
    CHECK (trigger_mode IN ('immediate', 'scheduled', 'cancelled')),
  ADD COLUMN IF NOT EXISTS trigger_date timestamptz,
  ADD COLUMN IF NOT EXISTS trigger_status text NOT NULL DEFAULT 'pending'
    CHECK (trigger_status IN ('pending', 'fired', 'failed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS trigger_error text,
  ADD COLUMN IF NOT EXISTS trigger_fired_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invoice_milestones_scheduled_pending
  ON invoice_milestones (trigger_date)
  WHERE trigger_mode = 'scheduled' AND trigger_status = 'pending';

COMMENT ON COLUMN invoice_milestones.trigger_mode IS 
  'How the next milestone invoice is generated: immediate (auto on settle), scheduled (cron picks up at trigger_date), cancelled (soft-cancelled, no invoice generated)';

COMMENT ON COLUMN invoice_milestones.trigger_status IS 
  'Lifecycle for scheduled triggers: pending (queued), fired (invoice generated), failed (generation errored), cancelled (user cancelled before trigger_date)';
