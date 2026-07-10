-- Phase 2.1: canonical milestone lifecycle status casing + CHECK fence.
-- trigger_mode / trigger_status were already fenced in the June trigger-machinery migration;
-- this adds the missing piece: the status column itself.
-- Pre-state: 12 rows, exactly 2 lowercase 'cancelled' (written by cron + project-close,
-- both fixed in app commit 479806b, deployed READY before this migration).

update public.invoice_milestones set status = 'CANCELLED' where status = 'cancelled';

alter table public.invoice_milestones
  add constraint invoice_milestones_status_check
  check (status in ('PENDING', 'LIVE', 'SETTLED', 'CANCELLED'));

comment on constraint invoice_milestones_status_check on public.invoice_milestones is
  'Milestone lifecycle canon is UPPERCASE (PENDING/LIVE/SETTLED/CANCELLED). trigger_* columns are a separate lowercase family. Enforced 2026-07-07 after casing drift from two writer routes.';
