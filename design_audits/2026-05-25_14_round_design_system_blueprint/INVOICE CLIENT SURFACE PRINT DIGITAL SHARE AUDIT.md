# Invoice Client Surface, Print, Digital Share Audit

Date: 2026-05-25
Mode: sanitized repo summary
Raw evidence policy: screenshots, raw DOM JSON, invoice IDs, share tokens, and live client/project details are local-only and not committed.

## Scope

Checked the client-facing and near-client invoice surfaces:

- Invoice preview.
- Print media output.
- Invoice templates.
- Download/share decision modal.
- Share Invoice entry point.
- Agency preview of client share route.
- Public/digital share route behavior from authenticated context.
- Static modal inventory for invoice-related client/payment surfaces.

## Verdict

The invoice surfaces have a strong visual base, but the final client invoice is not yet safe enough to treat as a launch-ready document. The main issues are semantic/data correctness and client-facing relevance, not only styling.

## Main Findings

### 1. Share flow can be blocked before the user reaches the share decision

The Share Invoice entry point encountered the same save/schema-cache blocker seen in the draft-flow audit. This prevents reliable digital sharing until the backend/schema issue is resolved.

### 2. Milestone summary source can be wrong

Some preview/share/template surfaces appear to rely on a first-milestone assumption rather than the actual invoice/milestone being viewed or shared.

Risk:

- Client sees the wrong milestone label, amount, or commercial narrative.
- The tax invoice story may not match the billed event.

### 3. Placeholder tax/classification text can reach client-facing output

The audit found that unresolved classification text can be printed instead of being blocked or omitted.

CA verdict:

- Placeholder values are not valid invoice values.
- If legally required, block final/share until resolved.
- If optional, omit rather than print placeholders.

### 4. Draft/final status is not consistently propagated to templates

Template output needs to know whether it is rendering a draft, final invoice, preview, or client-facing shared document.

Rule:

- Draft watermarks and preview-only affordances should never be ambiguous.

### 5. Product branding can appear where the agency brand should lead

Some templates include Lance branding. This may be acceptable as a product-tier decision, but it should not be accidental.

Visual/brand verdict:

- Final client invoices should feel agency-issued first.
- App/product branding should be limited, intentional, and never distract from legal/payment content.

### 6. Digital share route needs clean unauthenticated verification

The scan used an authenticated browser context, so true unauthenticated-client behavior still needs a clean-session verification pass after the save/share blocker is fixed.

## Client-Facing Data Contract

Allowed on final invoice/share output:

- Agency identity.
- Client identity.
- Invoice number/date/due date.
- Deliverables and milestone being billed.
- Taxable value, tax treatment, totals.
- Payment instructions.
- Relevant MSA/addendum status in digital share flow.
- Legally required tax fields.

Avoid on final invoice/share output:

- Internal app state.
- Debug/status placeholders.
- Editor-only helper text.
- Agency preview labels.
- Implementation-heavy explanations.
- Product branding unless explicitly chosen.

## Recommended Fix Direction

1. Fix the save/share blocker first.
2. Define a strict final-invoice data contract.
3. Fix milestone-summary source.
4. Prevent placeholders from printing.
5. Ensure templates receive correct draft/final/share context.
6. Decide product branding policy for client invoices.
7. Re-test unauthenticated share route in a clean browser context.

## Design System Implication

App chrome can be loud and neo-brutal. Client documents should be confident but legally boring: clear, professional, complete, and free of internal UI noise.

## Approval Gate

This report is audit-only. No source-code implementation is approved by this document.
