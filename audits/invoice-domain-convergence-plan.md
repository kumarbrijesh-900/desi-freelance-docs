# Invoice Domain Convergence Plan

## 1. Canonical invoice domain model

### Canonical invoice types and interfaces

The canonical invoice domain model should remain the invoice-first model in:

- `types/invoice.ts`

The canonical business object is:

- `InvoiceFormData`

The canonical supporting types are:

- `InvoiceLineItemType`
- `InvoiceRateUnit`
- `InvoiceLineItem`
- `AgencyDetails`
- `ClientDetails`
- `InvoiceMeta`
- `TaxConfig`
- `InvoiceTaxType`
- `InvoiceTaxBreakdown`
- `LicenseType`
- `LicenseDetails`
- `PaymentDetails`
- `InvoiceComputedValues`
- `InvoiceStepperStep`

These types already cover the surviving invoice product surface:

- agency details
- client details
- line items
- payment details
- invoice metadata
- tax/compliance data
- preview/export requirements

### Fields that belong to the surviving invoice model

The surviving invoice model should continue to own these field groups:

1. Agency
   - business identity
   - tax registration state
   - GSTIN / PAN
   - address details
   - optional logo

2. Client
   - client identity
   - billing location
   - domestic/international routing
   - client tax identifiers
   - address and currency/country fields

3. Deliverables
   - line item type
   - description
   - quantity
   - rate
   - unit

4. Payment
   - payment terms
   - settlement mode
   - bank identity
   - account details
   - structured bank address content
   - optional licensing terms
   - optional payment QR

5. Meta and totals
   - invoice number
   - invoice date
   - due date
   - tax configuration
   - computed totals

### Duplicated or legacy types

The following are duplicate or legacy domain types and should not shape the canonical invoice architecture:

- `types/document.ts`
  - `ProjectPreset`
  - `LicenseType`
  - `YesNo`
  - `LicensingData`
  - `ExtractedDocumentData`
  - `DocumentFormState`

### Document-specific types that should remain legacy

These should remain legacy because they belong to the `/create` wizard and its output model, not the canonical invoice editor:

- `ProjectPreset`
- `LicensingData`
- `ExtractedDocumentData`
- `DocumentFormState`
- `YesNo`

### Exact canonical files

- `types/invoice.ts`
- `components/invoice/InvoiceEditorPage.tsx`
- `components/invoice/AgencyDetailsSection.tsx`
- `components/invoice/ClientDetailsSection.tsx`
- `components/invoice/DeliverablesSection.tsx`
- `components/invoice/TermsPaymentSection.tsx`
- `components/invoice/InvoiceMetaSection.tsx`
- `components/invoice/TotalsTaxesSection.tsx`
- `components/invoice/BriefIntakeCard.tsx`
- `app/invoice/new/page.tsx`
- `app/invoice/preview/page.tsx`

### Exact legacy files

- `types/document.ts`
- `app/create/page.tsx`
- `components/flow/CreateDocumentWizard.tsx`
- `components/flow/ProjectPresetStep.tsx`
- `components/flow/BriefInputStep.tsx`
- `components/flow/LicensingStep.tsx`
- `components/flow/ReviewStep.tsx`
- `components/flow/GenerateButtons.tsx`
- `components/flow/Paywall.tsx`
- `components/flow/VoiceInputButton.tsx`
- `components/documents/InvoiceTemplate.tsx`
- `components/documents/ScopeTemplate.tsx`
- `components/documents/WatermarkedNotice.tsx`

## 2. Canonical extraction boundary

### Where extraction should enter the invoice system

The canonical extraction entry should be:

1. `components/invoice/BriefIntakeCard.tsx`
2. `components/invoice/InvoiceEditorPage.tsx`
3. `app/api/brief-extract/route.ts`

This is the surviving invoice intake path.

### Canonical extracted payload shape before form mapping

The canonical extracted business payload should be:

- `InvoiceBriefExtractionSchema` in `lib/invoice-brief-intake.ts`

This is the best current candidate for the stable extraction boundary because it is already invoice-oriented and richer than the AI-provider payload.

The canonical extraction pipeline should conceptually be:

1. raw user input
   - typed brief
   - OCR text
   - optional voice transcript text
2. normalized brief text
3. provider/heuristic extraction
4. canonical invoice extraction payload
   - `InvoiceBriefExtractionSchema`
5. mapping into invoice form state
   - `InvoiceFormData`

### Canonical extraction helpers and pipelines

These are the canonical invoice extraction files:

- `app/api/brief-extract/route.ts`
- `lib/ai-brief-extractor.ts`
- `lib/invoice-brief-intake.ts`
- `lib/name-role-inference.ts`
- `lib/location-inference.ts`
- `lib/identifier-classifier.ts`
- invoice-specific helper files used by the invoice path:
  - `lib/invoice-address.ts`
  - `lib/gstin-parser.ts`
  - `lib/pin-code-inference.ts`
  - `lib/ocr-normalization.ts`

### Legacy extraction helpers and pipelines

These are legacy and should be deprecated later, not extended:

- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`
- `types/document.ts::ExtractedDocumentData`

### Canonical vs provider payload

`AiBriefExtraction` in `lib/ai-brief-extractor.ts` should not be treated as the long-term canonical extracted business model.

It is better understood as:

- provider/adapter output

The canonical extracted business payload should be:

- `InvoiceBriefExtractionSchema`

That keeps the invoice domain independent from the AI provider contract.

## 3. Mapping boundary

### Where extracted data is currently converted into invoice form state

The current conversion path lives primarily in:

- `lib/invoice-brief-intake.ts`

The key functions are:

- `normalizeExtractedData(...)`
  - converts `AiBriefExtraction` into invoice-oriented extracted fields
- `mapBriefExtractionToInvoiceForm(...)`
  - converts canonical extracted fields into `InvoiceFormData`
- `applyCandidateToForm(...)`
  - low-level assignment helper used during mapping
- `runBriefAutofill(...)`
  - orchestration wrapper around normalization, extraction merge, mapping, and clarification generation

### Functions that are too overloaded today

The most overloaded mapping/domain functions are:

- `lib/invoice-brief-intake.ts::normalizeExtractedData(...)`
  - mixes provider adaptation with invoice extraction normalization
- `lib/invoice-brief-intake.ts::mapBriefExtractionToInvoiceForm(...)`
  - owns too much field-level assignment and merge behavior
- `lib/invoice-brief-intake.ts::runBriefAutofill(...)`
  - combines orchestration, extraction, mapping, and output packaging
- `types/invoice.ts::mergeInvoiceFormData(...)`
  - mixes domain merge with hidden normalization/derivation side effects

### Desired target boundary

The desired target boundary for later passes should be:

1. Provider/heuristic extraction layer
   - AI and heuristic helpers produce candidate data
2. Canonical extraction adapter layer
   - one explicit invoice extraction object:
     - `InvoiceBriefExtractionSchema`
3. Mapping layer
   - one explicit mapper from extraction object -> `InvoiceFormData`
4. Domain normalization layer
   - one explicit place for invoice-domain normalization

What should not continue:

- provider payload types leaking into page orchestration
- mapping and normalization being spread across both `lib/invoice-brief-intake.ts` and `types/invoice.ts`

## 4. Dangerous duplication

### Duplicate types

1. License typing exists in both models:
   - `types/invoice.ts::LicenseType`
   - `types/document.ts::LicenseType`

2. Licensing payloads are duplicated:
   - `types/invoice.ts::LicenseDetails`
   - `types/document.ts::LicensingData`

3. Extracted payloads are duplicated:
   - `lib/invoice-brief-intake.ts::InvoiceBriefExtractionSchema`
   - `types/document.ts::ExtractedDocumentData`

### Duplicate extraction helpers

There are two separate “brief -> extracted fields” stacks:

Canonical:

- `app/api/brief-extract/route.ts`
- `lib/ai-brief-extractor.ts`
- `lib/invoice-brief-intake.ts`

Legacy:

- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`

### Duplicate mapping logic

Current invoice mapping logic is split across:

- `lib/invoice-brief-intake.ts::normalizeExtractedData(...)`
- `lib/invoice-brief-intake.ts::mapBriefExtractionToInvoiceForm(...)`
- `lib/invoice-brief-intake.ts::applyCandidateToForm(...)`
- `types/invoice.ts::mergeInvoiceFormData(...)`

This is dangerous because there is no single place where the business boundary is obvious.

### Cross-imports between canonical invoice flow and legacy document flow

No direct canonical invoice-flow imports into the legacy `/create` stack were found.

The main cross-domain coupling I found is:

- `lib/licensing-summary.ts`
  - imports `LicensingData` from `types/document.ts`
  - currently used only by legacy flow files:
    - `components/flow/LicensingStep.tsx`
    - `components/flow/CreateDocumentWizard.tsx`

This is not currently a canonical-invoice dependency, but it is a good example of a helper that should remain clearly legacy-scoped later.

## 5. Safe first implementation slice

### Recommended next implementation pass only

The safest next implementation pass is:

**Extraction adapter layer only**

### What that means

Do one narrow pass that formalizes:

- `InvoiceBriefExtractionSchema`

as the only canonical extracted invoice payload before form mapping.

That pass should:

- keep UI untouched
- keep state ownership untouched
- keep hydration untouched
- keep legacy `/create` untouched
- avoid changing `InvoiceFormData`

### Why this is the safest slice

It creates one explicit invoice extraction boundary without forcing a broad refactor of:

- page state ownership
- preview/export
- editor UI
- legacy wizard flow
- invoice domain normalization

It is safer than type consolidation alone because `types/invoice.ts` is still overloaded.
It is safer than a broad mapping refactor because the UI currently depends on the present form shape.

## 6. Explicit no-go areas

These areas should not be touched yet because the risk is high:

1. `components/invoice/InvoiceEditorPage.tsx`
   - route orchestration, persistence, preview handoff, and section UX are tightly coupled

2. `types/invoice.ts::mergeInvoiceFormData(...)`
   - this function is overloaded and important, but changing it too early risks silent domain regressions

3. `app/invoice/preview/page.tsx`
   - preview relies on current invoice payload shape and browser persistence

4. Hydration/bootstrap strategy
   - this is currently stabilizing the route enough to function and should not be mixed into boundary convergence yet

5. `/create` file deletion or folder moves
   - legacy is already frozen; removal should wait until canonical boundaries are cleaner

6. OCR or AI tuning
   - that changes extraction behavior at the same time as boundary work and makes convergence harder to reason about

7. Global state/context introduction
   - state ownership should remain route-local until the domain and extraction boundaries are clearer

## 7. Exact overloaded files to split later

These files are canonical but overloaded and should be split in later passes:

- `types/invoice.ts`
  - schema + defaults + merge + normalization side effects
- `lib/invoice-brief-intake.ts`
  - text normalization + AI adaptation + heuristic extraction + mapping + clarifications
- `components/invoice/InvoiceEditorPage.tsx`
  - controller + persistence + preview handoff + extraction orchestration + section shell

## 8. Convergence summary

### Canonical files

- `types/invoice.ts`
- `app/invoice/new/page.tsx`
- `app/invoice/preview/page.tsx`
- `app/api/brief-extract/route.ts`
- `components/invoice/*`
- `lib/ai-brief-extractor.ts`
- `lib/invoice-brief-intake.ts`
- `lib/name-role-inference.ts`
- `lib/location-inference.ts`
- `lib/identifier-classifier.ts`

### Legacy files

- `app/create/page.tsx`
- `app/api/extract/route.ts`
- `components/flow/*`
- `components/documents/*`
- `types/document.ts`
- `lib/extract-document-data.ts`
- `lib/licensing-summary.ts`

### One recommended next pass only

Create a narrow extraction adapter layer that makes `InvoiceBriefExtractionSchema` the explicit, canonical invoice extraction payload before any mapping into `InvoiceFormData`.
