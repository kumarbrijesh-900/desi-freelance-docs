# audits/ — historical analysis (mostly superseded)

**Current source of truth for Lance's state is [`/SESSION_LOG.md`](../SESSION_LOG.md) — start with the pinned "READ FIRST" block.** The latest handover snapshot is also authoritative over anything in this folder.

The markdown docs here are **historical audits and recovery plans**, retained for reference only. Most predate the "E" design migration and the dashboard / milestone-lifecycle / notification / project-closure work, so their "current state" and "next steps" are **out of date**. Do NOT treat them as active work-orders.

Superseded / historical (do not action):
- `pipeline-diagnosis.md`, `recovery-strategy.md`, `recovery-roadmap.md` — April invoice-pipeline diagnosis + recovery plan
- `architecture-convergence-audit.md`, `canonical-architecture-blueprint.md`, `invoice-domain-convergence-plan.md`, `migration-todo-map.md` — architecture-convergence series
- `executive-recovery-plan.md`, `technical-regression-report.md`, `forensic-audit.md`, `intent-vs-outcome.md`, `file-regression-map.md` — recovery / regression series
- `design-system-foundation-audit.md` — predates the "E" design system (current tokens: `/lance-E-migration-plan.md` + `app/globals.css` `@theme`)
- `ux-debt-inventory.md`, `ux-regression-report.md` — early UX audits

The `.sql` files in this folder (`notifications-migration.sql`, `msa-status-migration.sql`, `cron-nudges-migration.sql`, `supabase-audit.sql`) are reference SQL only; version-controlled migrations live in `/supabase/migrations/`.
