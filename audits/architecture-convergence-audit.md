# Architecture Convergence Audit

## 1. Current architecture map

### Product entry points

1. `app/invoice/new/page.tsx`
   - Current primary invoice product entry.
   - Loads `components/invoice/InvoiceEditorPage.tsx`.
   - This is the richest user flow and the one linked from `app/page.tsx`.

2. `app/invoice/preview/page.tsx`
   - Read-only preview/export route for the invoice editor.
   - Depends on `invoice-preview-data` in `localStorage`, not router params or server data.

3. `app/create/page.tsx`
   - Separate create-document route using `components/flow/CreateDocumentWizard.tsx`.
   - Not linked from the current home page.
   - Behaves like a legacy or sidecar product flow.

4. `app/api/brief-extract/route.ts`
   - Invoice-specific extraction API.
   - Feeds the invoice autofill path.

5. `app/api/extract/route.ts`
   - Separate document-wizard extraction API.
   - Simpler, regex-based, and not part of the invoice editor.

### Product-flow architecture in the repo today

#### A. Invoice editor architecture

- UI shell: `components/invoice/InvoiceEditorPage.tsx`
- Section components:
  - `AgencyDetailsSection.tsx`
  - `ClientDetailsSection.tsx`
  - `DeliverablesSection.tsx`
  - `TermsPaymentSection.tsx`
  - `InvoiceMetaSection.tsx`
  - `TotalsTaxesSection.tsx`
- Intake: `BriefIntakeCard.tsx`
- Domain model: `types/invoice.ts`
- Extraction pipeline:
  - `lib/ai-brief-extractor.ts`
  - `lib/invoice-brief-intake.ts`
  - `lib/name-role-inference.ts`
  - `lib/identifier-classifier.ts`
  - `lib/location-inference.ts`
  - supporting `lib/invoice-*`

This is a continuous-form editor with a right rail, preview handoff, domain-specific validation, tax/compliance rules, and local draft persistence.

#### B. Document wizard architecture

- Entry: `app/create/page.tsx`
- Wizard: `components/flow/CreateDocumentWizard.tsx`
- Steps:
  - `ProjectPresetStep.tsx`
  - `BriefInputStep.tsx`
  - `LicensingStep.tsx`
  - `ReviewStep.tsx`
  - `GenerateButtons.tsx`
  - `Paywall.tsx`
- Extraction:
  - `app/api/extract/route.ts`
  - `lib/extract-document-data.ts`
- Domain model:
  - `types/document.ts`
- Outputs:
  - `components/documents/InvoiceTemplate.tsx`
  - `components/documents/ScopeTemplate.tsx`
  - `components/documents/WatermarkedNotice.tsx`

This is a smaller staged wizard that generates simplified invoice/scope outputs from a raw brief.

### State architecture in the repo today

1. Route-local React state
   - `InvoiceEditorPage.tsx` owns the canonical invoice editor state in one large `formData` object plus route-local UI state.
   - `CreateDocumentWizard.tsx` owns separate local slices: `projectPreset`, `rawBrief`, `licensing`, `extractedData`, and generation flags.

2. Browser persistence architecture
   - Invoice editor bootstraps from `invoice-editor-draft` and `invoice-sequence-by-year` in `localStorage`.
   - Preview bootstraps from `invoice-preview-data` in `localStorage`.
   - There is no server-backed editor session or preview model.

3. Hidden merge/normalization architecture
   - `types/invoice.ts` contains `mergeInvoiceFormData(...)`, which is not just a merge:
     - it hydrates addresses
     - derives GST/PAN/state
     - normalizes defaults
   - `lib/invoice-brief-intake.ts` also maps and merges extraction output into the form model.

4. No app-level state container
   - No Redux, Zustand, or React Context store was found for the invoice or create flows.
   - The system relies on prop drilling + utility merges + `localStorage`.

### UX architecture in the repo today

1. Continuous form
   - `InvoiceEditorPage.tsx` now behaves mostly as a continuous editor.

2. Residual wizard semantics inside the invoice editor
   - `orderedSteps`
   - `currentStep`
   - per-step validity
   - step activators
   - compact progress summary
   - desktop support rail

3. Explicit wizard flow
   - `CreateDocumentWizard.tsx` is still a classic staged workflow.

4. Separate preview/export mode
   - `app/invoice/preview/page.tsx` is a second route-level UX model driven by persisted state rather than shared live state.

### Component system in the repo today

#### Shared primitives that already exist

- `lib/ui-foundation.ts`
- `lib/layout-foundation.ts`
- `components/ui/AppSelectField.tsx`
- `components/ui/ChoiceCards.tsx`
- `components/ui/UploadToast.tsx`
- `components/ui/app-icons.tsx`
- `components/ui/motion-primitives.tsx`

#### But there are still multiple component systems in practice

1. Invoice section shell system
   - Each invoice section supports `embedded` mode.
   - The outer shell lives in `InvoiceEditorPage.tsx`.
   - Each section still contains its own standalone shell when `embedded === false`.

2. Flow/wizard panel system
   - `components/flow/*` assemble their own panels and headings independently.

3. Document template system
   - `components/documents/*` use plain template markup and do not behave like the invoice editor or preview surfaces.

## 2. Conflicting architectures found

### Conflict A: Two coexisting products disguised as one codebase

- The invoice editor is a domain-rich, structured invoice product.
- The `/create` wizard is a simpler brief-to-document generator with a different data model and a different extraction pipeline.
- These are not two views of the same architecture. They are two separate product architectures.

### Conflict B: Two extraction architectures

1. Invoice extraction path
   - `BriefIntakeCard` -> OCR/text -> `/api/brief-extract` -> AI + heuristics -> invoice mapping.

2. Legacy document extraction path
   - `BriefInputStep` -> `/api/extract` -> regex-ish field extraction -> review/edit.

These pipelines do not share the same schema, confidence model, merge model, or output contract.

### Conflict C: Two state models

1. Monolithic domain state
   - Invoice editor uses a single `InvoiceFormData` object with section prop drilling.

2. Fragmented wizard state
   - Create wizard uses multiple independent state slices and output flags.

They produce different editing behaviors, different persistence expectations, and different opportunities for hidden mutation.

### Conflict D: Two progress/interaction models

1. Invoice editor
   - continuous form
   - step badges
   - compact mobile progress
   - right-rail progress
   - preview gating

2. Create wizard
   - sequential card stack
   - explicit stage transitions
   - generate-at-end model

Even inside the invoice editor, residual step/wizard semantics still exist alongside continuous-form behavior.

### Conflict E: Two document-generation architectures

1. Invoice preview architecture
   - `app/invoice/preview/page.tsx`
   - full invoice domain, compliance-aware, print/export oriented

2. Legacy invoice/scope templates
   - `components/documents/InvoiceTemplate.tsx`
   - `components/documents/ScopeTemplate.tsx`
   - simple preview components from the wizard

Both create “invoice outputs,” but they are not based on the same system.

### Conflict F: Hidden domain logic split across layers

- `lib/invoice-brief-intake.ts` maps extraction into form values.
- `types/invoice.ts` normalizes and derives state during merge.
- `InvoiceEditorPage.tsx` also introduces bootstrapped defaults and preview persistence.

This means there is not one clear domain boundary. Multiple layers believe they are allowed to shape canonical invoice state.

## 3. Which files/components appear legacy

### Strong legacy/sidecar candidates

- `app/create/page.tsx`
- `components/flow/CreateDocumentWizard.tsx`
- `components/flow/ProjectPresetStep.tsx`
- `components/flow/BriefInputStep.tsx`
- `components/flow/LicensingStep.tsx`
- `components/flow/ReviewStep.tsx`
- `components/flow/GenerateButtons.tsx`
- `components/flow/Paywall.tsx`
- `components/flow/VoiceInputButton.tsx`
- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`
- `types/document.ts`
- `components/documents/InvoiceTemplate.tsx`
- `components/documents/ScopeTemplate.tsx`
- `components/documents/WatermarkedNotice.tsx`

Why they look legacy:
- They belong to the older create-document wizard architecture.
- They are not the main homepage path.
- They use a separate schema and extraction model.
- They duplicate invoice-generation concepts outside the canonical invoice editor.

### Mixed/transition files

- `components/invoice/InvoiceEditorPage.tsx`
  - canonical editor shell, but still carries stepper DNA and storage bootstrapping.
- `app/invoice/preview/page.tsx`
  - likely part of the canonical invoice product, but still depends on route-local `localStorage` handoff.
- `types/invoice.ts`
  - canonical domain shape, but currently also acts as a merge/normalization engine.

## 4. Which architecture should become canonical

### Recommended canonical architecture

The canonical product architecture should be:

**Invoice-first, continuous-form, single-domain architecture**

That means:

1. One primary product flow
   - `/invoice/new` as the only creation surface for invoices.

2. One canonical domain model
   - `InvoiceFormData` in `types/invoice.ts` remains the main form schema.

3. One canonical extraction boundary
   - invoice intake and extraction should feed invoice candidates into the invoice domain only.

4. One canonical editor state owner
   - the invoice editor route owns the invoice draft state.
   - section components are presentational editors over that one state tree.

5. One canonical UX model
   - continuous form with optional guided navigation.
   - no parallel wizard-based invoice generation model.

6. One canonical output architecture
   - `app/invoice/preview/page.tsx` as the invoice preview/export surface.
   - not the legacy document template components.

### Why this should be canonical

- It is already the main user-facing route.
- It contains the actual invoice business rules.
- It owns the richer schema and the real compliance model.
- It is the architecture most worth stabilizing because it is closest to the intended product.

## 5. Which files should be preserved

### Preserve as the canonical invoice product base

- `app/invoice/new/page.tsx`
- `app/invoice/preview/page.tsx`
- `components/invoice/InvoiceEditorPage.tsx`
- `components/invoice/BriefIntakeCard.tsx`
- `components/invoice/AgencyDetailsSection.tsx`
- `components/invoice/ClientDetailsSection.tsx`
- `components/invoice/DeliverablesSection.tsx`
- `components/invoice/TermsPaymentSection.tsx`
- `components/invoice/InvoiceMetaSection.tsx`
- `components/invoice/TotalsTaxesSection.tsx`
- `types/invoice.ts`
- `lib/invoice-brief-intake.ts`
- `lib/ai-brief-extractor.ts`
- `lib/invoice-calculations.ts`
- `lib/invoice-validation.ts`
- `lib/invoice-compliance.ts`
- supporting invoice libs:
  - `lib/invoice-address.ts`
  - `lib/name-role-inference.ts`
  - `lib/location-inference.ts`
  - `lib/identifier-classifier.ts`
  - `lib/gstin-parser.ts`
  - `lib/sez-lookup.ts`
  - `lib/international-billing-options.ts`

### Preserve as shared UI/system primitives

- `components/AppHeader.tsx`
- `components/LogoutButton.tsx`
- `components/ui/AppSelectField.tsx`
- `components/ui/ChoiceCards.tsx`
- `components/ui/UploadToast.tsx`
- `components/ui/app-icons.tsx`
- `components/ui/motion-primitives.tsx`
- `lib/layout-foundation.ts`
- `lib/ui-foundation.ts`

## 6. Which files should be isolated/deleted later

### Isolate first

These should be isolated behind a legacy route group or moved out of the main product path before deletion decisions:

- `app/create/page.tsx`
- all `components/flow/*`
- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`
- `types/document.ts`
- all `components/documents/*`

### Delete later if the product no longer needs the old create-document flow

Delete only after confirming the business no longer wants the brief-to-scope/proposal wizard:

- `app/create/page.tsx`
- `components/flow/*`
- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`
- `types/document.ts`
- `components/documents/*`

### If not deleted, then they need formal isolation

If the document wizard remains a supported product, it should be treated as a separate product line with:

- a separate route group
- a separate data model
- a separate extraction boundary
- no shared claim on invoice architecture

## 7. Recommended migration order to a single architecture

### Stage 1: Declare the canonical product surface

1. Officially mark `/invoice/new` + `/invoice/preview` as the primary creation architecture.
2. Treat `/create` as legacy or experimental immediately.
3. Remove `/create` from any future product planning unless it is intentionally revived as a separate product.

### Stage 2: Freeze cross-architecture bleed

1. Stop sharing invoice expectations across the legacy wizard and invoice editor.
2. Keep invoice fixes inside:
   - `components/invoice/*`
   - `types/invoice.ts`
   - `lib/invoice-*`
3. Stop evolving `app/api/extract/route.ts` as if it belongs to the invoice system.

### Stage 3: Clarify state ownership

1. Keep one canonical invoice draft owner: the invoice editor route.
2. Treat preview as a derivative view of the editor state, not a second architecture.
3. Reduce hidden write paths over time so domain shaping stops being split between:
   - `InvoiceEditorPage.tsx`
   - `lib/invoice-brief-intake.ts`
   - `types/invoice.ts`

### Stage 4: Clarify UX ownership

1. Keep the invoice editor as a continuous form.
2. Keep `currentStep` as navigation/highlight metadata only.
3. Remove any remaining wizard semantics from the invoice editor over time.
4. Keep only one progress system hierarchy:
   - primary: section shell + right rail
   - secondary: compact mobile summary

### Stage 5: Clarify component ownership

1. Keep shared UI primitives in `components/ui/*`.
2. Keep invoice-specific shells/layouts in `components/invoice/*`.
3. Decommission or isolate `components/flow/*`.
4. Avoid reintroducing duplicate invoice shells or duplicate creation panels elsewhere.

### Stage 6: Decide the fate of legacy document generation

1. Either:
   - archive/remove the wizard stack entirely
2. Or:
   - explicitly reposition it as a separate “documents” product area

Do not leave it half-integrated. That is what creates architectural ambiguity.

## Recommended single-architecture direction

If the team wants one clean architecture, the repo should converge on:

**A single invoice-native architecture**

- one entry flow: `app/invoice/new/page.tsx`
- one canonical state model: `InvoiceFormData`
- one extraction pipeline: invoice brief intake -> invoice candidate mapping
- one editor model: continuous form
- one preview model: invoice preview route
- one shared component system: `components/ui/*` + `components/invoice/*`

Everything outside that boundary is either:

- shared infrastructure, or
- legacy and should be isolated before later deletion.

