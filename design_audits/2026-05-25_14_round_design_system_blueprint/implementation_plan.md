# Phase 0: Launch Blocker Resolutions

This plan addresses the P0 and P1 functional bugs discovered during the 14-round audit, focusing strictly on data persistence and schema-cache issues before moving onto the Neo-Brutal visual refactor.

## Open Questions
- For the Global MSA, when a save fails, should we revert the UI to the last known good state, or keep the user's typed changes but show a stark red "Save Failed" neo-brutal banner?

## Proposed Changes

### 1. Invoice Save Schema-Cache Fix (P0)
The audit revealed a Supabase/PostgREST schema-cache issue involving the `client_id` relationship field during draft save, resulting in partial persistence (where projects/clients are created, but the invoice fails).

#### [MODIFY] `lib/supabase/invoices.ts`
- Audit the `saveInvoice` function to ensure it uses a single transactional RPC call (if available) or implements strict manual rollback logic if the invoice insertion fails after a client/project creation.
- Check the foreign key relationships to ensure `client_id` and `project_id` constraints are met exactly as PostgREST expects. We will force a schema cache reload on the Supabase dashboard if needed, but locally we will ensure the TypeScript payload perfectly matches the updated schema.

### 2. Profile & Global MSA Save Reliability (P0/P1)
The audit found that saving the Global MSA can silently fail, leaving users with a false sense of security regarding their legal terms.

#### [MODIFY] `lib/supabase/profiles.ts` & `lib/supabase/msa-resolver.ts`
- In `upsertProfile` and `syncGlobalMsaFromProfile`, verify that the Supabase response error object is explicitly checked (`if (error) throw error`). 
- Currently, it's likely swallowing the error or not propagating it back to the UI component. We will wrap these in strict `try/catch` blocks and return typed `{ success: false, error: ... }` objects.

#### [MODIFY] UI Components (e.g., `app/(authenticated)/profile/page.tsx` or similar profile forms)
- Wire up the returned error state to visually block the "Success" toast.
- Display a loud, neo-brutal error boundary indicating exactly what failed to save (e.g., "GLOBAL MSA SAVE FAILED - YOUR TERMS WERE NOT UPDATED").

### 3. Contract Defaults Hard Validation (P1)
Invalid contract defaults (e.g., negative late fees, missing payment terms) can currently flow into invoices.

#### [MODIFY] `lib/supabase/profiles.ts`
- Add strict Zod or runtime validation checks to `upsertProfile` before attempting to push to Supabase.
- Ensure `late_fee_rate` is a valid percentage/number, `payment_terms` is a positive integer, and `revision_rounds` is >= 0.

## Verification Plan

### Automated Tests
- No new automated tests are planned at this stage; we will rely on manual visual verification over the CDP session.

### Manual Verification
- We will attempt to create a draft invoice with a brand new client. If it fails, we verify that the client is not orphaned and the error is clearly surfaced. If it succeeds, we verify it appears in the Dashboard and Invoices list.
- We will attempt to save a Global MSA with an invalid payload (e.g., disconnecting the network or forcing an error) and verify that the UI strictly displays a failure state rather than a silent success.


## Session Log Addendum
**Type model watch:** Phase 1B surfaced frontend/backend drift around milestone date fields. Milestone rows expose `trigger_date`, `order_index`, and `status`, but not every UI-assumed field like `due_date`. Future dashboard lifecycle work should either extend `MilestoneRow` deliberately or derive due/timing from invoice/form_data with explicit fallback rules.
