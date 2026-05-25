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
