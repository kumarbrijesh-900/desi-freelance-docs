# Archived migrations

Superseded by supabase/migrations/20260919000000_baseline.sql.

Kept for history only. They sit outside supabase/migrations/, so the
Supabase CLI does not read them, and they are not replayable as a
sequence -- several were superseded, and some record intent that was
applied differently.

## Why they were archived

This folder was never a migration history. On 2026-09-19 production
recorded 20 applied migrations against 38 files here, and only 2 matched:

| relationship | count |
| --- | --- |
| exact match, file and applied record | 2 |
| same name, different timestamp | 7 |
| applied in production, no file here | 11 |
| file here, no applied record at all | 29 |

The two that matched were 20260916180420_invoices_status_canon and
20260918080424_grand_total_comment_correction.

## Applied rows before the squash

In supabase_migrations.schema_migrations immediately before the baseline
replaced them, recorded so the sequence stays recoverable.

```
20260526145020  add_grand_total_column
20260530180543  advance_first_milestone_to_live_on_msa_acceptance
20260531041655  drop_advance_first_milestone_to_live_trigger
20260531043812  restore_advance_first_milestone_to_live
20260608185618  enable_rls_projects_subscriptions_sac_codes
20260609050117  harden_warn_level_security_advisories
20260609050611  harden_security_warnings_followup
20260620195112  dedupe_user_feedback_insert_policy
20260627052053  add_project_closure_columns
20260627061306  enable_realtime_notifications
20260627063351  add_milestone_notification_types
20260708061735  milestone_status_canon
20260708062149  milestone_stable_identity_and_atomic_sync
20260902034518  add_payment_reminder_notification_type
20260910080811  add_msa_unanswered_notification
20260916160000  msa_status_add_proposed
20260916160009  project_msa_invoice_fk_set_null
20260916160201  drop_demo_backup_and_activity_log
20260916180420  invoices_status_canon
20260918080424  grand_total_comment_correction
```
