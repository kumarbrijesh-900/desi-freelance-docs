# Creating Invoice Draft Flow and Check Status

Date: 2026-05-25
Mode: sanitized repo summary
Raw evidence policy: screenshots, raw DOM JSON, invoice IDs, generated client/project names, and test emails are local-only and not committed.

## Scope

The audit created a new invoice draft through the authenticated UI, attempted to save it as draft, then checked dashboard, projects, invoices, and clients for whether the draft became discoverable.

## Verdict

The draft invoice did not persist successfully in the tested production state.

The editor generated a visible invoice reference during the attempted save, but the invoice was not discoverable afterward on the checked status pages. The failure was traced to a Supabase/PostgREST schema-cache error involving an invoice-client relationship field.

## Key Finding

Save Draft currently has a risky partial-persistence shape:

- Related master data can be created before the invoice row fails.
- The invoice itself may not save.
- The user is left on the editor with an ambiguous failure state.
- Status pages do not clearly explain what happened.

## UX Risk

From the user's perspective, "Save Draft" should mean the draft exists somewhere they can return to. If related client/project records are created but the invoice is not, the system feels inconsistent and auditability suffers.

## CA / Business Risk

Client/project master data has record-keeping implications. Creating master records without the linked draft invoice can create noisy or orphaned operational data.

## Recommended Fix Direction

1. Resolve the database/schema-cache blocker before UI polish.
2. Treat draft save as atomic from the user's point of view.
3. If partial save is unavoidable, show exact status:
   - what saved,
   - what failed,
   - what the user should do next.
4. Ensure saved drafts appear immediately on the correct status surface.

## Design System Implication

Failure states need the same visual strength as success states. A neo-brutal system should not only celebrate completion; it should make blockers loud, plain, and recoverable.

## Approval Gate
This report is audit-only. No source-code implementation is approved by this document.

---

## 🚀 Proposed Implementation Plan: Phase 0 Launch Blockers

To resolve the P0 data persistence and schema-cache issues blocking invoice draft saves, the following plan is proposed:

### 1. Invoice Save Schema-Cache Fix (P0)
- **Target File:** `lib/supabase/invoices.ts`
- **Action:** Audit the `saveInvoice` function to ensure it uses a single transactional RPC call (if available) or implements strict manual rollback logic if the invoice insertion fails after a client/project creation.
- **Verification:** Ensure `client_id` and `project_id` constraints are met exactly as PostgREST expects.

### 2. Profile & Global MSA Save Reliability (P0/P1)
- **Target Files:** `lib/supabase/profiles.ts`, `lib/supabase/msa-resolver.ts`, and relevant UI Profile forms.
- **Action:** In `upsertProfile` and `syncGlobalMsaFromProfile`, verify that the Supabase response error object is explicitly checked (`if (error) throw error`). Return typed `{ success: false, error: ... }` objects and wire this up to block the "Success" toast, displaying a loud neo-brutal error instead.

### 3. Contract Defaults Hard Validation (P1)
- **Target File:** `lib/supabase/profiles.ts`
- **Action:** Add strict validation checks to `upsertProfile` before pushing to Supabase (e.g., ensuring late fee rate is valid, payment terms are positive).
