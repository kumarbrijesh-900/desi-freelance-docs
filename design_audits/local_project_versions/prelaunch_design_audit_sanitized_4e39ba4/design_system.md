# Lance Pre-launch Design System Blueprint Audit

Date: 2026-05-25
Mode: sanitized repo summary
Raw evidence policy: screenshots, raw DOM JSON, scripts, share-route evidence, invoice IDs, client names, emails, and authenticated production screenshots are intentionally kept local-only and are not committed to the repository.
Agent handoff JSON: `Pre-launch Design Audit.json`

## Audit Contract

- This is an audit-only artifact.
- Do not treat this commit as approval to modify application source code.
- Future implementation requires explicit user approval.
- The committed repo version contains sanitized summaries only.
- Full local evidence remains in the project folder under the same audit root, but raw screenshots/JSON/scripts are intentionally not tracked.

## Goal

Establish a launch-ready design system blueprint for Lance before touching the UI. The audit evaluates:

- Neo-brutal visual consistency.
- Responsive layout behavior.
- Invoice creation and draft save flow.
- Client-facing invoice, print, template, preview, and share surfaces.
- Profile settings, banking details, compliance, and Global MSA surfaces.
- Semantic clarity for solo founders while preserving CA/legal precision.

## Method

Browser scans used the already-authenticated Chrome session over CDP on port `9222`. Each scan opened a fresh page inside the existing authenticated context, navigated to target routes, captured DOM heuristics and screenshots locally, then closed the page.

Committed summaries intentionally avoid:

- Live invoice numbers.
- Client/project names.
- Emails.
- Share tokens.
- Production screenshots.
- Raw DOM dumps.

## Areas Covered

| Area | Routes / Surfaces | Repo Artifact |
|---|---|---|
| Foundation visual scan | Dashboard, projects, invoices, clients, invoice editor | This file |
| Invoice draft flow | New invoice creation and post-save status checks | `CREATING INVOICE DRAFT FLOW and CHECK STATUS.md` |
| Client invoice surfaces | Preview, print, templates, share modal, public/digital share behavior | `INVOICE CLIENT SURFACE PRINT DIGITAL SHARE AUDIT.md` |
| Profile and Global MSA | Agency, banking, contract defaults, Global MSA, compliance, upload/crop modal, mobile/tablet profile | `PROFILE SETTINGS GLOBAL MSA DEEP AUDIT.md` |
| Agent handoff | Consolidated machine-readable summary | `Pre-launch Design Audit.json` |

## Foundation Findings

The app already has a strong Lance identity: high-contrast black, lime accents, heavy typography, and neo-brutal panels. The audit still found drift that should become part of the design-system hardening backlog:

- Some surfaces use soft shadows or blurred shadows.
- Some warnings/modals use softer SaaS-style visual language.
- Border widths are not fully consistent across page families.
- A few responsive surfaces overflow or compress awkwardly.
- The invoice editor, dashboard, profile, and share surfaces do not yet feel like a single strict system.

Blueprint rule:

- App chrome should use square geometry, strong black borders, hard offset shadows, and intentional status colors.
- Client documents may use quieter typography, but must not leak app UI, placeholders, debug text, or irrelevant product branding.

## Draft Flow Findings

The create-draft flow exposed a launch-risk save failure. In the tested production state, draft invoice persistence failed with a Supabase/PostgREST schema-cache error for an invoice-client relationship field.

Observed UX risk:

- The editor generated a visible invoice reference during the attempted save.
- The invoice was not discoverable afterward in the checked status surfaces.
- Related master data could be created before the invoice row failed.
- The user experience after failure is ambiguous.

Blueprint rule:

- Save Draft must be atomic from the user's point of view.
- If a save partially succeeds, the UI must say exactly what saved and what did not.
- Draft invoices must be discoverable immediately after successful save.

## Client Invoice Surface Findings

The invoice preview and templates are visually rich, but client-facing correctness needs hardening before launch.

Key findings:

- Share flow can be blocked by the same save/schema-cache failure.
- Some template/share surfaces rely on the wrong milestone summary source.
- Placeholder tax/classification text can reach client-facing invoice output.
- Draft/final state is not consistently propagated into template rendering.
- Product branding appears in places where a final agency-issued invoice should usually prioritize the agency brand.
- Digital share surfaces need a clean unauthenticated-client verification pass after the save blocker is fixed.

Blueprint rule:

- Every client-facing invoice field must pass a relevance test: tax, payment, contract, deliverable, or client action.
- If a value is unresolved, block final/share where legally required or omit it where legally optional. Do not print placeholders.

## Profile + Global MSA Findings

Profile has the right primitives: agency identity, address, GST/PAN, bank details, signature, QR, default payment terms, late fee, IP transfer trigger, revisions, Global MSA content, and LUT compliance.

Main risks:

- Global MSA save can silently fail while the UI reports success.
- Profile and Global MSA saves are not atomic.
- Contract numeric inputs lack min/max constraints.
- Late-fee unit semantics are inconsistent between UI language and applied snapshots.
- Raw Global MSA text lacks an effective-terms summary.
- Sticky save controls interrupt long-form profile/MSA reading.
- Tablet and mobile profile layouts need tightening.

Blueprint rule:

- Legal/payment settings need dual-language UI: formal term plus plain-English consequence.
- Legal/payment save states must be reliable, auditable, and explicit.

## Semantic Language Map

| Current Term | Keep? | Plain-language Support |
|---|---:|---|
| Master Services Agreement / MSA | Yes | Your default client contract |
| IP Transfer Trigger | Yes | When ownership moves to the client |
| Jurisdiction | Yes | Legal city for disputes |
| Late Fee Rate | Yes | Fee charged when client pays late |
| Revision Policy | Yes | Free edits and paid extra edits |
| LUT Availability | Yes | Export tax letter status |
| Outstanding | Yes | Money still unpaid |
| Settled | Yes | Paid and marked done |

## Recommended Implementation Sequence

1. Fix launch blockers:
   - Resolve invoice save/share schema-cache failure.
   - Make profile + Global MSA save reliable.
   - Prevent client-facing placeholders/noise.

2. Harden legal/profile trust:
   - Add Global MSA effective-terms preview.
   - Add validation to contract defaults.
   - Normalize late-fee units.

3. Harden client invoice output:
   - Define final-invoice data contract.
   - Fix milestone-summary source.
   - Separate agency preview affordances from true client-facing output.

4. Harden design system:
   - Codify border, radius, shadow, color, badge, typography, warning, and modal rules.
   - Remove soft UI drift.

5. Harden responsive profile/editor flows:
   - Fix tablet overflow.
   - Replace hidden-scroll mobile settings tabs.
   - Reserve space for sticky controls.

## Approval Gate

This is a sanitized audit summary for repository sharing. It is not implementation approval.
