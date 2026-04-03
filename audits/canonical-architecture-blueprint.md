# Canonical Architecture Blueprint

## 1. Canonical product direction

### Surviving product flow

The surviving product direction should be:

**Invoice-first, continuous-form invoice creation**

This means the product should converge around one primary workflow:

1. Start in the invoice editor
2. Use brief intake to assist autofill
3. Edit the invoice in one structured continuous form
4. Review in invoice preview
5. Print/export from the invoice preview surface

### Canonical routes

The canonical routes should be:

- `app/page.tsx`
  - marketing/home entry
- `app/invoice/new/page.tsx`
  - canonical invoice creation flow
- `app/invoice/preview/page.tsx`
  - canonical preview/export surface for the invoice flow
- `app/api/brief-extract/route.ts`
  - canonical extraction entry for invoice autofill

### Legacy routes

The legacy routes should be:

- `app/create/page.tsx`
  - legacy document wizard flow
- `app/api/extract/route.ts`
  - legacy extraction API for the document wizard

### Product boundary rule

Going forward, the repo should behave as if there is only **one active product surface for invoice creation**:

- the invoice editor

Anything outside that should be treated as:

- legacy,
- frozen,
- or intentionally separate from the invoice architecture.

## 2. Canonical domain model

### Single source domain

The canonical domain should be:

**`InvoiceFormData` and the invoice domain types in `types/invoice.ts`**

This should remain the single business object for:

- agency details
- client details
- deliverables / line items
- payment details
- tax and compliance configuration
- invoice metadata

### Invoice model vs document model

#### Canonical

- `types/invoice.ts`

This is the model that should survive as the single product domain because it already covers:

- invoice editing
- validation
- tax/compliance logic
- preview/export
- structured data capture

#### Legacy

- `types/document.ts`

This model belongs to the older brief-to-document wizard and should not continue to shape the future invoice product architecture.

### Which types should survive

Preserve:

- `InvoiceFormData`
- `InvoiceLineItem`
- `AgencyDetails`
- `ClientDetails`
- `InvoiceMeta`
- `PaymentDetails`
- `TaxConfig`
- `InvoiceComputedValues`
- `InvoiceStepperStep` only if it remains a UI navigation concept, not a workflow state machine

### Which types are legacy

Legacy:

- `ProjectPreset`
- `LicensingData`
- `ExtractedDocumentData`
- `DocumentFormState`

These should survive only if the `/create` wizard remains as a separate legacy product area. They should not influence the canonical invoice domain.

## 3. Canonical extraction boundary

### Where extraction should enter the system

Extraction should enter only through the invoice intake surface:

- `components/invoice/BriefIntakeCard.tsx`
- `app/api/brief-extract/route.ts`

The canonical boundary should be:

**brief input -> extraction candidate -> invoice domain mapping**

The extraction system should not be treated as direct form state ownership.

### Which extraction pipeline should survive

Preserve as canonical:

- `app/api/brief-extract/route.ts`
- `lib/ai-brief-extractor.ts`
- `lib/invoice-brief-intake.ts`
- related invoice inference helpers:
  - `lib/name-role-inference.ts`
  - `lib/location-inference.ts`
  - `lib/identifier-classifier.ts`
  - invoice normalization helpers

### Which extraction pipeline should be deprecated later

Deprecate later:

- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`

Why:

- it belongs to the legacy wizard
- it has a separate schema
- it does not feed the invoice domain
- it duplicates “brief -> extracted data” behavior outside the canonical architecture

### Extraction boundary rule

The canonical extraction boundary should be:

- extraction produces candidates or structured invoice-oriented fields
- mapping into invoice form state happens at one boundary
- extraction should not directly own editor orchestration

## 4. Canonical state architecture

### Who should own orchestration state

The invoice editor route should own orchestration state.

Canonical owner:

- `components/invoice/InvoiceEditorPage.tsx`

This route-level controller should own:

- the working invoice draft
- current UI/navigation state
- preview gating state
- brief intake completion state
- local persistence orchestration

### What should live in page/controller level

Route/controller level should own:

- canonical `formData`
- current active section / navigation highlight
- preview readiness
- toast and transient editor orchestration state
- draft restore/persist lifecycle
- brief autofill orchestration

### What should live in context, if any

**None by default for now.**

The repo does not currently need a global Context or app-wide store to converge on a clean architecture.

If Context is introduced later, it should only happen if:

- invoice editor state must be shared across nested routes or sibling surfaces,
- or route-level prop orchestration becomes unmanageable.

Until that need is real, the canonical architecture should remain:

- route-local controller state
- section props down
- pure callbacks up

### What should remain pure helper/domain logic

Pure domain/helper logic should live in `lib/` and stay free of route/UI orchestration:

- calculations
- validation
- compliance rules
- address normalization
- extraction normalization
- identifier and role inference

These helpers should not own:

- routing
- localStorage orchestration
- UI step progression
- preview navigation

### State ownership rule

There should be exactly one canonical invoice draft owner at runtime:

- the invoice editor controller

Everything else should either:

- derive from that state,
- validate that state,
- or render that state.

## 5. Canonical UI architecture

### Canonical section shell

The canonical section shell should live in:

- `components/invoice/InvoiceEditorPage.tsx`

The shell should own:

- section title
- one compact instruction line
- status badge
- active highlight
- right-rail relationship

Section components should primarily own:

- fields
- field-local interaction details
- section-local validation display

### Canonical shared input primitives

Preserve as canonical:

- `components/ui/AppSelectField.tsx`
- `components/ui/ChoiceCards.tsx`
- `lib/ui-foundation.ts`
- `lib/layout-foundation.ts`
- `components/ui/UploadToast.tsx`
- `components/ui/app-icons.tsx`
- `components/ui/motion-primitives.tsx`

These should be the only shared UI primitives that future work extends.

### Canonical progress rail

The canonical progress/navigation system should be:

- compact mobile progress summary
- compact desktop right rail section list

It should remain subordinate to the continuous form, not become a second workflow system.

### Canonical preview/export surface

The canonical preview/export surface should be:

- `app/invoice/preview/page.tsx`

This should remain the single route for:

- invoice preview
- print/export
- draft re-entry from preview

### Canonical component folders

Canonical:

- `components/invoice/*`
- `components/ui/*`
- `components/AppHeader.tsx`
- `components/LogoutButton.tsx`

Legacy:

- `components/flow/*`
- `components/documents/*`

### UI architecture rule

The repo should converge on one UI architecture:

- invoice editor shell
- invoice section components
- shared UI primitives
- invoice preview

No second invoice-generation UI architecture should remain active.

## 6. Legacy isolation map

### Folders/files that should later move to `legacy/` or a similar archive area

These should be isolated later:

- `app/create/page.tsx`
- `components/flow/`
- `components/documents/`
- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`
- `types/document.ts`

### Routes/components that should later be removed or frozen

Freeze first:

- `/create`
- the document wizard steps
- the legacy invoice/scope generation components
- the legacy extraction API

Later remove or archive:

- `app/create/page.tsx`
- `components/flow/*`
- `components/documents/*`
- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`
- `types/document.ts`

### Risks of removing them

1. Hidden user dependency risk
   - If any user still relies on `/create`, removing it without telemetry or confirmation could break workflows.

2. Team expectation risk
   - Stakeholders may still think “scope/proposal generation” is an active roadmap item.

3. Coupling risk
   - Some shared UI primitives are used by both systems, so isolation must not accidentally remove shared primitives with them.

4. Test/reference risk
   - Future contributors may still use the legacy flow as a reference implementation unless it is clearly marked and isolated.

## 7. Recommended migration order

### Phase 1: Freeze legacy

Goal:

- stop the legacy architecture from evolving alongside the invoice product

Actions later:

- mark `/create` as legacy in planning and ownership
- stop adding new logic to `components/flow/*`
- stop improving `app/api/extract/route.ts`
- stop using `types/document.ts` as a template for invoice work

### Phase 2: Unify domain model

Goal:

- make `InvoiceFormData` the uncontested single invoice domain

Actions later:

- keep all invoice editing, preview, validation, and extraction mapping anchored to `types/invoice.ts`
- prevent document-wizard models from influencing invoice architecture

### Phase 3: Unify extraction boundary

Goal:

- ensure only the invoice intake/extraction pipeline survives for invoice creation

Actions later:

- keep `app/api/brief-extract/route.ts` as the only active invoice extraction entry
- deprecate the legacy `/api/extract` pipeline
- keep extraction-to-form mapping on the invoice side only

### Phase 4: Unify state ownership

Goal:

- make one invoice editor controller the sole orchestration owner

Actions later:

- keep orchestration in `InvoiceEditorPage.tsx`
- narrow hidden shaping logic in helpers over time
- keep preview as a derivative surface of the editor state

### Phase 5: UI cleanup on canonical flow

Goal:

- clean up the invoice UI once architecture boundaries are stable

Actions later:

- remove remaining wizard semantics from the invoice editor
- simplify duplicated shells and embedded/non-embedded behaviors
- tighten the preview/editor contract

### Phase 6: Delete/archive legacy

Goal:

- physically remove or archive the older architecture

Actions later:

- move or archive `components/flow/*`
- move or archive `components/documents/*`
- remove `/create`
- remove legacy extraction and document schema files

Only do this after the invoice-first architecture is stable and clearly adopted.

## 8. Refactor risk notes

### High-risk changes

1. Changing `types/invoice.ts`
   - It currently acts as both schema and hidden normalization layer.
   - Any change here can ripple into extraction, editor state, validation, and preview.

2. Changing `lib/invoice-brief-intake.ts`
   - It is the extraction-to-form boundary.
   - It affects autofill, user trust, and overwrite behavior.

3. Changing preview/editor persistence contracts
   - `invoice-editor-draft`
   - `invoice-preview-data`
   - `invoice-sequence-by-year`
   - These affect refresh, preview, and resume behavior.

4. Removing the legacy flow too early
   - Could break hidden usage or future roadmap expectations.

5. Replacing route-local state with a new Context/store prematurely
   - Risks adding a second state architecture before the first one is stable.

### Safest changes to do first later

1. Freeze and label legacy
   - safest organizational move

2. Stop new development in `components/flow/*`
   - low runtime risk

3. Clarify canonical ownership in docs and planning
   - no runtime risk

4. Tighten UI boundaries in the invoice editor shell
   - relatively safe if it does not alter domain logic

5. Narrow domain responsibilities gradually
   - move toward a clearer split between:
     - controller orchestration
     - domain helpers
     - extraction boundary

## Blueprint summary

The repo should converge on one clean architecture:

**Canonical architecture = invoice-first, continuous-form, single-domain product**

That means:

- canonical routes:
  - `/invoice/new`
  - `/invoice/preview`
- canonical domain:
  - `types/invoice.ts`
- canonical extraction:
  - `app/api/brief-extract/route.ts`
  - `lib/invoice-brief-intake.ts`
- canonical state owner:
  - `components/invoice/InvoiceEditorPage.tsx`
- canonical UI folders:
  - `components/invoice/*`
  - `components/ui/*`

Everything else should be treated as legacy until formally archived or removed.

