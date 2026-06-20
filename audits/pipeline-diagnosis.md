> ⚠️ **SUPERSEDED — June 2026.** This describes the April 2026 invoice-pipeline instability, which has since been largely resolved. For current state see the June audits in `/outputs` (readiness · parsing-write-path · UI/cross-device/export). Kept for historical context — do not action items here without re-verifying against the live code.

# Invoice Pipeline Diagnosis

Date: 2026-04-02

Scope: analysis only. No application code changes.

## 1. ENTRY POINT MAP

### Typed brief entry
- UI entry starts in `components/invoice/BriefIntakeCard.tsx`.
- `briefText` is local component state.
- Clicking `Extract & Autofill` calls `onExtract({ text, imageFiles, voiceTranscript: "" })`.
- In practice, `onExtract` is `handleBriefAutofill` in `components/invoice/InvoiceEditorPage.tsx`.
- `handleBriefAutofill` builds `normalizedInput.text` from typed text plus any OCR text.
- If `normalizedInput.text` is non-empty, the page posts JSON to `app/api/brief-extract/route.ts`.
- The route normalizes text with `normalizeBriefText(...)` and calls `extractInvoiceBriefWithAi(...)`.
- Back in the page, `runBriefAutofill(...)` is called with:
  - `currentFormData`
  - `input`
  - `aiExtraction`
- `runBriefAutofill(...)` performs heuristic extraction, AI normalization, merge, form mapping, and returns `nextFormData`.
- The page then calls `setFormData(mergeInvoiceFormData(nextFormData))`.

### Screenshot / OCR entry
- Screenshot input also starts in `components/invoice/BriefIntakeCard.tsx`.
- Uploaded files are stored in local `imageFiles` state.
- `handleBriefAutofill` in `components/invoice/InvoiceEditorPage.tsx` loops over `input.imageFiles`.
- Each file is OCR’d client-side by `extractTextFromImage(file)` in `lib/ocr-extractor.ts`.
- `extractTextFromImage(...)` uses Tesseract in the browser and returns plain text only.
- OCR text is concatenated into `normalizedInput.text` together with any typed brief.
- From that point onward, screenshot/OCR follows the exact same text pipeline as typed brief:
  - `/api/brief-extract`
  - AI extraction
  - heuristic extraction
  - merge
  - mapping
  - `setFormData(...)`

### Initial / default / bootstrapped invoice state
- Canonical state is created in `components/invoice/InvoiceEditorPage.tsx`.
- `formData` starts as `defaultInvoiceFormData` from `types/invoice.ts`.
- `currentStep` starts as `"agency"`.
- Real state is loaded in a mount-only `useEffect` in `InvoiceEditorPage.tsx`.
- That effect:
  - reads `DRAFT_STORAGE_KEY` from `localStorage`
  - if draft exists, restores it via `mergeInvoiceFormData(parsedDraft.formData)`
  - otherwise calls `getFreshInvoiceData()`
- `getFreshInvoiceData()`:
  - calls `mergeInvoiceFormData()`
  - sets `meta.invoiceNumber = getNextInvoiceNumber()`
  - sets `meta.invoiceDate = getTodayDateString()`
  - leaves `dueDate` empty
- The editor returns `null` until `isBootstrapped` becomes `true`.

## 2. PIPELINE TRACE

Important note: typed brief and screenshot/OCR share the same downstream pipeline after `handleBriefAutofill`. Screenshot/OCR differs only in the source text creation step.

| Field | Source | Parser / extractor | Normalization step | Inference step | Merge step | Final form binding |
|---|---|---|---|---|---|---|
| Agency name | Typed brief text or OCR text | Heuristic: `extractAgencyName(...)` in `lib/invoice-brief-intake.ts`; AI: `agencyName` in `lib/ai-brief-extractor.ts` | AI path: `normalizeExtractedData(...)` creates `fallbackAgencyName` | `inferNameRolesFromText(...)` in `lib/name-role-inference.ts`; fallback can also use `payment.accountName` as agency name | `mergeBriefExtractions(...)` then `mapBriefExtractionToInvoiceForm(...)` assigns `nextFormData.agency.agencyName` | `InvoiceEditorPage.formData.agency.agencyName` -> `AgencyDetailsSection` input |
| Client name | Typed brief text or OCR text | Heuristic: `extractClientName(...)`; AI: `clientName` | AI path normalized in `normalizeExtractedData(...)` | `inferNameRolesFromText(...)` uses client role cues like `bill to`, `invoice for`, `client`, `recipient`, `brand` | `mergeBriefExtractions(...)` then `mapBriefExtractionToInvoiceForm(...)` assigns `nextFormData.client.clientName` | `InvoiceEditorPage.formData.client.clientName` -> `ClientDetailsSection` input |
| Agency state | Typed brief text or OCR text | Heuristic: agency address/GSTIN/state extractors; AI: `agencyState` + `gst.gstin` + `locations.agency` | AI path in `normalizeExtractedData(...)` builds `agencyStateValue` from location details or GSTIN | `inferLocationDetailsFromText(...)`, `getStateFromGstin(...)`, `getStateFromText(...)`, `evaluateStateSignals(...)` | `mapBriefExtractionToInvoiceForm(...)` assigns `agency.agencyState`; later `mergeInvoiceFormData(...)` re-normalizes agency | `AgencyDetailsSection.syncAgencyDetails(...)` can auto-fill state again when any agency field changes |
| Client state | Typed brief text or OCR text | Heuristic: explicit state, GSTIN/tax ID, address; AI: `clientState`, `clientTaxId`, `locations.client` | AI path in `normalizeExtractedData(...)` builds `clientStateValue` | `inferLocationDetailsFromText(...)`, `getStateFromGstin(...)`, `getStateFromText(...)`, `evaluateStateSignals(...)` | `mapBriefExtractionToInvoiceForm(...)` assigns `client.clientState`; `mergeInvoiceFormData(...)` re-normalizes domestic clients only | `ClientDetailsSection.syncClientDetails(...)` can auto-fill state again for domestic clients |
| Client location type | Typed brief text or OCR text | Heuristic: `extractInvoiceIsInternational(...)` and `inferLocationTypeFromText(...)`; AI: `locations.inferredType`, `currency`, `clientCountry` | AI path normalizes to `clientLocationCandidate` | Country, foreign-city, payment mode, currency, and explicit location cues can force international | `mapBriefExtractionToInvoiceForm(...)` assigns `client.clientLocation`; applying client country or currency also forcibly sets `clientLocation = "international"` | `ClientDetailsSection` segmented control reads `value.clientLocation` |
| Deliverable description | Typed brief text or OCR text | Heuristic: `extractDeliverableDescription(...)`, `extractHeuristicLineItems(...)`, `buildLineItemDescriptionFromContext(...)`; AI: `deliverables[].description` | Scalar fallback is built with `buildScalarLineItemFallback(...)`; line items merged with `mergeLineItemsWithScalarFallback(...)` | Type-specific context inference from nearby phrases like `landing page`, `illustration`, `video`, `shots` | `mergeBriefExtractions(...)` merges AI and heuristic line items; `mapBriefExtractionToInvoiceForm(...)` writes by line item index | `InvoiceEditorPage.formData.lineItems[index].description` -> `DeliverablesSection` input |
| Quantity | Typed brief text or OCR text | Heuristic: `extractQuantity(...)` and `extractHeuristicLineItems(...)`; AI: `deliverables[].quantity` | Scalar fallback and line-item normalization as above | Quantity inferred from patterns like `3 screens`, `40 images`, `5 reels` | Merged in `mergeBriefExtractions(...)`; applied by index in `mapBriefExtractionToInvoiceForm(...)` | `DeliverablesSection` number input |
| Rate | Typed brief text or OCR text | Heuristic: `extractRate(...)`, `extractStandaloneRateAmount(...)`, `extractHeuristicLineItems(...)`; AI: `deliverables[].rate` or `totalAmount` | Scalar fallback can treat a single amount as either total or line-item rate | Rate inference depends on nearby unit phrases, budget wording, and amount parsing | Merged in `mergeBriefExtractions(...)`; applied by index in `mapBriefExtractionToInvoiceForm(...)` | `DeliverablesSection` rate input |
| Unit | Typed brief text or OCR text | Heuristic: `extractRateUnit(...)`, `extractHeuristicLineItems(...)`; AI: `deliverables[].unit` | AI units are normalized to internal `InvoiceRateUnit` values | Unit inference comes from phrases like `per screen`, `per image`, `per video`, `per item` | Merged in `mergeBriefExtractions(...)`; applied by index in `mapBriefExtractionToInvoiceForm(...)` | `DeliverablesSection` unit select |
| Payment terms | Typed brief text or OCR text | Heuristic: `extractPaymentTerms(...)`; AI: `paymentTerms` and `paymentSchedule` | AI path in `normalizeExtractedData(...)` may turn payment schedule into a terms string | `normalizePaymentTermsValue(...)` rewrites terms into a normalized string | `mapBriefExtractionToInvoiceForm(...)` assigns `meta.paymentTerms` | `TermsPaymentSection` input; then `InvoiceEditorPage` may auto-manage due date from payment terms |
| Bank name | Typed brief text or OCR text | Heuristic: `extractPaymentField(text, ["bank name"])`; AI: `payment.bankName` | AI normalized in `normalizeExtractedData(...)` | Minimal inference beyond label/context | `mapBriefExtractionToInvoiceForm(...)` assigns `payment.bankName` | `TermsPaymentSection` domestic/international bank name input |
| Account number | Typed brief text or OCR text | Heuristic: `extractPaymentAccountNumber(...)`; AI: `payment.accountNumber` | Identifier is normalized/classified in `lib/identifier-classifier.ts` | Classification uses account-number heuristics and context scoring | `mapBriefExtractionToInvoiceForm(...)` assigns `payment.accountNumber` | `TermsPaymentSection` account number input |
| IFSC | Typed brief text or OCR text | Heuristic: `extractPaymentIfscCode(...)`; AI: `payment.ifscCode` | Identifier normalized/classified in `lib/identifier-classifier.ts` | Context scoring prefers `ifsc` labels | `mapBriefExtractionToInvoiceForm(...)` assigns `payment.ifscCode` | `TermsPaymentSection` IFSC input |
| Invoice date | Bootstrapped default or extracted text | Default path: `getFreshInvoiceData()`; extracted path: heuristic `extractDateCandidate(...)` and AI `timeline.invoiceDate` | AI path uses `formatDateCandidate(...)`; default path uses `getTodayDateString()` | None beyond date parsing | `mapBriefExtractionToInvoiceForm(...)` can overwrite `meta.invoiceDate`; fresh bootstrap writes it directly | `InvoiceMetaSection` date input |
| Due date | Bootstrapped blank, extracted text, or derived from terms | Heuristic: `extractDateCandidate(...)`; AI: `timeline.dueDate`; derived path: `getSuggestedDueDate(...)` | AI path uses `formatDateCandidate(...)`; derived path is normalized date string | `InvoiceEditorPage` due-date effect infers due date from `paymentTerms + invoiceDate` if still auto-managed | `mapBriefExtractionToInvoiceForm(...)` can set `meta.dueDate`; then the due-date effect may overwrite it again | `InvoiceMetaSection` date input |

## 3. STATE OWNERSHIP MAP

### Canonical invoice state owner
- Canonical invoice state lives in `components/invoice/InvoiceEditorPage.tsx`.
- Owner: `const [formData, setFormData] = useState<InvoiceFormData>(defaultInvoiceFormData)`.

### Files that mutate canonical state
- `components/invoice/InvoiceEditorPage.tsx`
  - mount bootstrap effect
  - due-date auto-management effect
  - `handleBriefAutofill(...)`
  - `handleMetaChange(...)`
  - section `onChange` callbacks inside `renderStepContent(...)`
  - demo/clear handlers
- `components/invoice/AgencyDetailsSection.tsx`
  - does not own canonical state
  - mutates outbound payload via `syncAgencyDetails(...)` before calling parent `onChange(...)`
- `components/invoice/ClientDetailsSection.tsx`
  - mutates outbound payload via `syncClientDetails(...)`
- `components/invoice/DeliverablesSection.tsx`
  - mutates outbound line item array via local row operations
- `components/invoice/TermsPaymentSection.tsx`
  - mutates outbound payment/meta payloads directly
- `components/invoice/InvoiceMetaSection.tsx`
  - mutates outbound meta payload directly
- `types/invoice.ts`
  - not a state owner, but `mergeInvoiceFormData(...)` rewrites values during nearly every important state transition

### Which logic writes defaults
- `types/invoice.ts`
  - `defaultInvoiceFormData`
- `components/invoice/InvoiceEditorPage.tsx`
  - `getFreshInvoiceData()`
  - `getNextInvoiceNumber()`
  - `getTodayDateString()`
  - due-date effect using `getSuggestedDueDate(...)`
- `types/invoice.ts`
  - `mergeInvoiceFormData(...)` fills missing nested defaults
- `components/invoice/AgencyDetailsSection.tsx`
  - `syncAgencyDetails(...)` writes default-like derived `city`, `agencyState`, `pan`, and `address`
- `components/invoice/ClientDetailsSection.tsx`
  - `syncClientDetails(...)` writes derived `clientCity`, `clientState`, and `clientAddress`

### Which logic overwrites existing values
- `lib/invoice-brief-intake.ts`
  - `applyCandidateToForm(...)` can overwrite non-default values when candidate confidence is `high`
- `lib/invoice-brief-intake.ts`
  - applying `clientCountry` or `clientCurrency` also forces `clientLocation = "international"`
- `types/invoice.ts`
  - `mergeInvoiceFormData(...)` can rewrite address/state/PAN from derived signals
- `components/invoice/AgencyDetailsSection.tsx`
  - `syncAgencyDetails(...)` can rewrite city/state/PAN/address during normal typing
- `components/invoice/ClientDetailsSection.tsx`
  - `syncClientDetails(...)` can rewrite city/state/address for domestic clients
- `components/invoice/InvoiceEditorPage.tsx`
  - due-date effect can overwrite `meta.dueDate` while it considers the field auto-managed

## 4. OVERWRITE / CONFLICT RISKS

### Where extracted values can overwrite user values
- `lib/invoice-brief-intake.ts` -> `shouldApplyCandidate(...)`
  - High-confidence candidates overwrite existing non-default values.
  - Medium-confidence candidates apply when current value is empty or still equal to the default.
- `lib/invoice-brief-intake.ts` -> `mapBriefExtractionToInvoiceForm(...)`
  - `clientCountry` assignment also sets `clientLocation = "international"`.
  - `clientCurrency` assignment also sets `clientLocation = "international"`.
- `components/invoice/InvoiceEditorPage.tsx`
  - `setFormData(mergeInvoiceFormData(nextFormData))` means extracted state is normalized again after mapping.

### Where row merge by index is risky
- `lib/invoice-brief-intake.ts` -> `mapBriefExtractionToInvoiceForm(...)`
  - extracted line items are applied by array index, not by row identity or semantic match.
  - existing user-entered row 1 can be overwritten by extracted row 1 even if they refer to different deliverables.
  - new extracted rows are created as `brief-line-${index + 1}` without reconciling against current user-created row IDs.

### Where normalization changes meaning unexpectedly
- `types/invoice.ts` -> `mergeInvoiceFormData(...)`
  - this is not a passive merge; it derives PAN from GSTIN, infers states, hydrates address line fields from legacy address strings, and recomposes addresses.
- `lib/invoice-brief-intake.ts` -> `normalizeBriefText(...)`
  - all typed text is run through OCR normalization, not just screenshot text.
  - that means OCR cleanup heuristics can alter perfectly typed user input.
- `lib/invoice-brief-intake.ts` -> `normalizeExtractedData(...)`
  - fallback agency name can come from `payment.accountName`, which changes semantic meaning from payout identity to business identity.

### Where inference is too aggressive
- `lib/name-role-inference.ts`
  - agency cues include `from`, `thanks`, `best`, `regards`
  - client cues include `for`, `to`, `brand`
- `lib/invoice-brief-intake.ts` -> `extractAgencyName(...)`
  - label list includes `"from"`
- `lib/invoice-brief-intake.ts` -> `extractClientName(...)`
  - patterns include `invoice for`, `brand`, and generic `client`
- `lib/invoice-brief-intake.ts`
  - international inference can be triggered by country, currency, foreign-city hints, or payment mode hints like `wise` or `payoneer`

## 5. HYDRATION / BOOTSTRAP RISKS

### Where server-rendered values differ from client-rendered values
- The editor avoids classic mismatch by not rendering the real editor until mount.
- `InvoiceEditorPage.tsx` returns `null` until `isBootstrapped === true`.
- This avoids SSR/client mismatches, but it also means the page is effectively client-bootstrapped rather than truly server-stable.

### Where dynamic date or generated IDs are introduced
- `components/invoice/InvoiceEditorPage.tsx`
  - `getTodayDateString()` uses `new Date()`
  - `getNextInvoiceNumber()` uses `new Date().getFullYear()` plus `localStorage`
- These values are introduced during the mount bootstrap, not during a stable SSR render.
- `savedAt: new Date().toISOString()` is also written into draft/preview localStorage.

### Where initial render depends on browser-only state
- `InvoiceEditorPage.tsx` mount effect reads:
  - `DRAFT_STORAGE_KEY`
  - `INVOICE_SEQUENCE_KEY`
- Draft restore, invoice numbering, and initial invoice date all depend on browser-only `localStorage`.
- `app/invoice/new/page.tsx` sets `export const dynamic = "force-dynamic"`, but the real behavior still depends on client bootstrapping.

### Other hydration-risk signals
- There are many `suppressHydrationWarning` attributes across invoice sub-components.
- That indicates the current strategy is partly “render later” and partly “suppress mismatches” rather than making the initial HTML deterministic.

## 6. TOP 5 ROOT CAUSES FOR BROKEN FEEL

### 1. The same field is inferred and rewritten in too many places
- Main files:
  - `lib/invoice-brief-intake.ts`
  - `types/invoice.ts`
  - `components/invoice/AgencyDetailsSection.tsx`
  - `components/invoice/ClientDetailsSection.tsx`
- Result:
  - one field can be parsed, normalized, inferred, mapped, merged, normalized again, and then re-inferred during normal typing.

### 2. `mergeInvoiceFormData(...)` is doing hidden business-like work
- Main file:
  - `types/invoice.ts`
- Result:
  - simple “merge this state” calls can unexpectedly change address lines, state, PAN, and legacy address composition.
  - this makes state updates feel non-local and hard to reason about.

### 3. Screenshot flow is not a real image pipeline
- Main files:
  - `components/invoice/InvoiceEditorPage.tsx`
  - `lib/ocr-extractor.ts`
  - `app/api/brief-extract/route.ts`
- Result:
  - images are reduced to OCR text in the browser before extraction.
  - the server and AI only ever see text.
  - screenshot-specific structure and document semantics are lost early.

### 4. Name-role inference is too broad for conversational briefs
- Main files:
  - `lib/name-role-inference.ts`
  - `lib/invoice-brief-intake.ts`
- Result:
  - agency and client name extraction can flip based on broad words like `from`, `for`, `brand`, `thanks`, or `best`.
  - this directly affects the highest-visibility form fields.

### 5. Bootstrap is stable only because SSR is effectively bypassed
- Main files:
  - `components/invoice/InvoiceEditorPage.tsx`
  - `app/invoice/new/page.tsx`
- Result:
  - the editor feels less deterministic because the real state appears only after mount.
  - hydration mismatches are avoided by blank first render and suppression, not by truly stable server/client parity.

## 7. RECOMMENDED STABILIZATION ORDER

Diagnosis only. No implementation prescribed here.

### 1. Freeze the canonical state contract
- Decide whether `mergeInvoiceFormData(...)` is a pure merge or a normalization engine.
- Right now it is both, which makes every caller risky.

### 2. Stabilize the extraction-to-form mapping layer before touching UI again
- `mapBriefExtractionToInvoiceForm(...)` is the safest choke point for reducing destructive overwrites.
- It is the narrowest place to reason about confidence, conflict, and preservation of user input.

### 3. Separate screenshot/OCR handling from typed-text handling
- Even if both still end as text today, they should not be normalized identically.
- OCR cleanup being applied to all text is a structural smell.

### 4. Reduce role inference aggressiveness before adding more extraction features
- Agency/client name quality is still a fragile part of the pipeline.
- This is a high-value stabilization area because it affects user trust immediately.

### 5. Replace hydration suppression with a deliberate bootstrap model
- Decide whether the editor should be:
  - server-stable on first render
  - or explicitly client-only
- The current hybrid approach works by avoidance rather than clarity.
