# Executive Recovery Plan

## 1. Executive diagnosis

The invoice app is unstable because extraction, inference, normalization, UI-level auto-correction, and client bootstrap are all writing to the same form state with overlapping authority.
The result is not one bug but a system where values can be parsed, inferred, merged, normalized, and re-derived multiple times before the user sees them.
That makes the editor feel unreliable even when individual functions appear correct in isolation.
The largest problems are not visual polish problems; they are write-path ambiguity, hidden mutations, and non-deterministic bootstrap behavior.
The UI currently amplifies those state issues by exposing overwritten or reinterpreted values as if they were intentional.
Until the write path is stabilized, further UI polish, AI tuning, or integration work will increase complexity faster than trust.

## 2. Top 5 blockers

1. `lib/invoice-brief-intake.ts` writes extracted values into live form state with permissive overwrite behavior and index-based line-item merging.
2. `types/invoice.ts` `mergeInvoiceFormData(...)` is not a pure merge and silently rewrites address, state, and PAN-related fields.
3. `components/invoice/AgencyDetailsSection.tsx` and `components/invoice/ClientDetailsSection.tsx` perform additional inference while the user types, creating double-write behavior.
4. `lib/name-role-inference.ts` and the name extractors in `lib/invoice-brief-intake.ts` use broad cues like `from`, `for`, and `brand`, making agency/client identity unreliable.
5. `components/invoice/InvoiceEditorPage.tsx` relies on client-only bootstrap, `localStorage`, and generated values for initial visible state, which makes rendering and behavior harder to reason about.

## 3. First fix sequence

1. Freeze the extraction-to-form boundary.
   Target: `lib/invoice-brief-intake.ts` → `mapBriefExtractionToInvoiceForm(...)`, `shouldApplyCandidate(...)`, `applyCandidateToForm(...)`
   Goal: stop silent overwrites and make autofill behavior predictable before touching any parser or UI.

2. Quarantine hidden normalization side effects.
   Target: `types/invoice.ts` → `mergeInvoiceFormData(...)`, `normalizeAgencyDetails(...)`, `normalizeClientDetails(...)`
   Goal: document and constrain what this layer is allowed to rewrite so merges stop changing meaning unexpectedly.

3. Stop UI-level re-inference while editing.
   Target: `components/invoice/AgencyDetailsSection.tsx` → `syncAgencyDetails(...)`
   Target: `components/invoice/ClientDetailsSection.tsx` → `syncClientDetails(...)`
   Goal: prevent the section components from competing with the central mapping/normalization layers.

4. Narrow identity inference.
   Target: `lib/name-role-inference.ts` → `inferAgencyName(...)`, `inferClientName(...)`
   Target: `lib/invoice-brief-intake.ts` → `extractAgencyName(...)`, `extractClientName(...)`
   Goal: reduce false positives around agency/client role assignment before any further extraction improvements.

5. Re-evaluate bootstrap after state writes are stable.
   Target: `components/invoice/InvoiceEditorPage.tsx` → mount bootstrap effect, `getFreshInvoiceData()`, initial state ownership
   Goal: make initial render strategy deliberate instead of patching over instability with suppression and delayed render.

## 4. Safe zones

These areas can remain untouched for now:
- `app/invoice/preview/page.tsx`
- global styling in `app/globals.css`
- shared visual helpers in `lib/ui-foundation.ts`
- motion primitives in `components/ui/motion-primitives.tsx`
- Playwright and benchmark test scaffolding, except where tests must be updated later to reflect stabilized behavior
- optional integrations and external APIs that were deferred already

These are not the current source of systemic instability.

## 5. Dangerous zones

These should not be changed yet:
- hydration strategy in broad strokes across the whole editor
- another structural UI redesign
- OCR pipeline upgrades or multimodal intake redesign
- AI prompt/model tuning
- new integrations such as Places, exchange-rate helpers, email, or payments

Why:
- each of these areas is wide in scope
- each will add more moving parts before the write path is trustworthy
- changing them now will make root-cause isolation harder, not easier

## 6. Definition of “stabilized enough”

The system is stabilized enough only when all of the following are true:
- extracted values do not silently overwrite meaningful user-entered values
- line items do not merge unpredictably by row position
- a merge operation does not secretly rewrite unrelated fields
- agency/client identity is materially more predictable on normal conversational briefs
- the same input produces the same visible form result through a traceable path
- section components are no longer doing surprise state correction while the user edits
- bootstrap behavior is understandable, even if not yet ideal

Only after that should the team resume UI polish or new integrations.

## 7. Recommended next implementation pass

One narrowly scoped repair pass only:

Stabilize the extraction-to-form write path in `lib/invoice-brief-intake.ts`, centered on `mapBriefExtractionToInvoiceForm(...)`.

That pass should focus only on:
- overwrite gating
- conflict handling
- line-item merge safety
- preserving existing user values

It should not include:
- UI redesign
- hydration redesign
- OCR improvements
- AI prompt expansion
- integrations

This is the smallest intervention that can reduce real damage without rewriting the system.
