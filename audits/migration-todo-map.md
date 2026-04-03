# Migration TODO Map

This file is a practical checklist for converging the repo to the canonical invoice-first architecture.

## Phase 1: Freeze legacy

- [ ] Treat `/create` as legacy in planning and ownership docs
- [ ] Do not add new product features to `components/flow/*`
- [ ] Do not add new product features to `components/documents/*`
- [ ] Do not extend `app/api/extract/route.ts` for invoice behavior
- [ ] Do not extend `types/document.ts` for invoice behavior

## Phase 2: Domain unification

- [ ] Confirm `types/invoice.ts` as the single surviving invoice domain model
- [ ] Audit hidden normalization inside `mergeInvoiceFormData(...)`
- [ ] Separate pure invoice schema ownership from merge/normalization side effects
- [ ] Ensure invoice preview consumes only the canonical invoice domain

## Phase 3: Extraction boundary unification

- [ ] Keep invoice extraction entering through `app/api/brief-extract/route.ts`
- [ ] Keep invoice candidate mapping inside the invoice extraction boundary
- [ ] Deprecate the legacy `/api/extract` pipeline after freeze is complete
- [ ] Remove invoice expectations from the legacy document extractor

## Phase 4: State ownership cleanup

- [ ] Keep invoice orchestration state owned by the invoice editor route/controller
- [ ] Audit all non-UI writes into invoice draft state
- [ ] Reduce hidden draft shaping split between controller, extraction mapping, and merge helpers
- [ ] Clarify preview handoff ownership and persistence contract

## Phase 5: UI cleanup on canonical flow

- [ ] Remove remaining wizard semantics from the invoice editor
- [ ] Simplify duplicated section shell responsibilities
- [ ] Tighten the right-rail and progress ownership model
- [ ] Align preview/export UX with the canonical editor flow only

## Phase 6: Legacy archival / deletion

- [ ] Isolate the legacy `/create` route behind a clear legacy boundary
- [ ] Decide whether `components/flow/*` is archived or deleted
- [ ] Decide whether `components/documents/*` is archived or deleted
- [ ] Remove `app/api/extract/route.ts` only after legacy retirement is approved
- [ ] Remove `types/document.ts` only after legacy retirement is approved

## Current boundary notes

- No dangerous canonical invoice imports from the legacy `/create` stack were found in the current audit.
- The legacy stack is mostly self-contained today, which makes a freeze-first approach low risk.
- The riskiest future work remains:
  - `types/invoice.ts`
  - `lib/invoice-brief-intake.ts`
  - preview/editor persistence contracts
