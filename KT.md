# Knowledge Transfer (KT) — Lance Invoice Engine

> **Last Updated:** 2026-04-23 (Session: Phases 1–6 complete — persistence, extraction upgrade, hardening)
> **Branch:** `design-system-foundation`
> **Build Status:** ✅ Zero errors (`npm run build`)

---

## 1. What Is Lance?

Lance is a **smart invoice generation platform** for Indian creative freelancers (designers, illustrators, motion artists, videographers). The core value proposition:

> **Describe your project in plain text → Get a GST-compliant invoice in under 10 seconds.**

The name "Lance" is a verb — as in "lance it" (nail it). A lance is a weapon; here it's a tool to create faster, legally compliant invoices. The branding reflects speed, precision, and creative empowerment.

### Key Facts
- **Product Name:** Lance (formerly "Klapped", formerly "DesiFreelanceDocs")
- **Target Users:** Creative freelancers in India (designers, illustrators, motion artists)
- **Stack:** Next.js 16.2.1, React 19.2.4, Framer Motion 12.38, Tailwind CSS, Supabase
- **Design System:** "Neon Atelier" — light canvas, fluorescent lime accents, editorial typography
- **Extraction Backend:** OpenAI API (gpt-4o-mini default) via `/api/brief-extract`
- **Auth:** Supabase OAuth (Google sign-in)
- **Repo:** `kumarbrijesh-900/desi-freelance-docs` on GitHub

---

## 2. Brand Identity

### Visual Language — "Neon Atelier"
| Token | Value | Usage |
|-------|-------|-------|
| Canvas | `#F8F8FA` | Page background |
| Text Primary | `#111118` | Headings, body |
| Fluorescent Lime | `#BEFF00` | Primary accent, CTA buttons, active states |
| Hot Coral | `#FF4D2A` | Emphasis, warnings |
| Cyan | `#00D4A0` | Success states |
| Typography (Display) | **Syne** (Google Fonts) | Headings, hero text |
| Typography (Body) | **DM Sans** (Google Fonts) | Body, labels, fields |
| Border Radius | 6px (fields) – 12px (panels) | Sharp, intentional — NOT blobby |
| Shadows | Single-layer minimal | No multi-layer soft shadows |
| Motion Easing | `cubic-bezier(0.16, 1, 0.3, 1)` | All transitions — smooth, emphasized |

### Copy Rules
- **Never use "AI"** in user-facing text. Use: Smart, Fast, Instant, Engine.
- The header shows an `L` logomark (lime square) + "Lance" wordmark.
- Footer: `© Lance. Built for Indian freelancers.`
- Extraction spinner: "Lance is scanning your brief to structure the invoice..."

---

## 3. Architecture Overview

### Route Map
```
app/
├── page.tsx                    # Homepage — marketing/landing
├── login/page.tsx              # Auth — Google OAuth via Supabase
├── invoice/
│   ├── new/page.tsx            # Invoice editor (stepper)
│   └── preview/page.tsx        # Invoice preview (PDF-ready view)
├── invoices/page.tsx           # Invoice history (auth-gated, cloud-saved)
├── terms/page.tsx              # Terms of Service
├── privacy/page.tsx            # Privacy Policy
├── internal/design-system/     # Internal design system reference page
├── api/
│   └── brief-extract/route.ts  # Brief → structured extraction (rate-limited)
├── layout.tsx                  # Root layout (Syne + DM Sans fonts, metadata)
└── globals.css                 # Design system tokens + component styles
```

### Component Map
```
components/
├── AppHeader.tsx               # Global header — L logomark + Lance wordmark
├── LogoutButton.tsx            # Supabase logout
├── invoice/
│   ├── InvoiceEditorPage.tsx   # Main editor orchestrator (stepper, state, extraction)
│   ├── BriefIntakeCard.tsx     # Brief text/image/voice input card
│   ├── AgencyDetailsSection.tsx # Step 1: Agency name, address, GST, PAN, LUT
│   ├── ClientDetailsSection.tsx # Step 2: Client name, location, GSTIN, SEZ
│   ├── DeliverablesSection.tsx  # Step 3: Line items, SAC codes, rates
│   ├── TermsPaymentSection.tsx  # Step 4: Payment terms, licensing, bank details
│   ├── InvoiceMetaSection.tsx   # Step 5: Invoice number, dates
│   └── TotalsTaxesSection.tsx   # Step 6: Tax calculations, totals
├── ui/
│   ├── ChoiceCards.tsx         # Yes/No/Option cards (lime selection ring)
│   ├── motion-primitives.tsx   # Framer Motion presets, easing, transitions
│   ├── AppTextField.tsx        # Text input field
│   ├── AppTextareaField.tsx    # Textarea field
│   ├── AppSelectField.tsx      # Select/dropdown field
│   ├── AppSegmentedControl.tsx # Binary/ternary toggle control
│   ├── AppFieldShell.tsx       # Field wrapper with label/error
│   ├── UploadToast.tsx         # Toast notification
│   ├── app-icons.tsx           # SVG icon components
│   └── DesignSystemReference.tsx # Internal token reference
└── documents/
    └── WatermarkedNotice.tsx   # "Generated with Lance Free" watermark
```

### Library Map
```
lib/
├── ui-foundation.ts            # Button/field/panel/pill class generators
├── layout-foundation.ts        # Page container/shell layout classes
├── form-foundation.ts          # Form layout primitives (grid, spacing)
├── design-system-tokens.ts     # Canonical color/spacing token exports
├── interaction-feedback.ts     # Haptic/audio interaction cues
│
├── ai-brief-extractor.ts       # OpenAI structured extraction (system prompt + schema)
├── brief-parser-gateway.ts     # Parser orchestration (local regex + AI merge)
├── invoice-brief-intake.ts     # Brief → form data autofill logic (132KB, core engine)
├── invoice-parsed-extraction-hydration.ts # AI output → InvoiceFormData hydration
│
├── invoice-validation.ts       # Field-level validation rules
├── invoice-calculations.ts     # Tax math (CGST/SGST/IGST split)
├── invoice-tax.ts              # Tax rate logic
├── invoice-compliance.ts       # GST compliance checks
├── invoice-line-item-catalog.ts # Deliverable type catalog (16 categories)
├── invoice-sac.ts              # SAC code lookup
├── invoice-deliverables.ts     # Deliverable parsing helpers
├── invoice-address.ts          # Address parsing/formatting
├── invoice-field-ownership.ts  # Field source tracking (user vs extracted)
├── invoice-clarifications.ts   # Post-extraction clarification prompts
│
├── identifier-classifier.ts   # GSTIN/PAN/TIN classification
├── gstin-parser.ts             # GSTIN format validator
├── gstin-state-map.ts          # GSTIN prefix → state mapping
├── india-state-options.ts      # Indian state/UT dropdown options
├── location-inference.ts       # City → state inference
├── name-role-inference.ts      # Name/role extraction from text
├── pin-code-inference.ts       # PIN code → location inference
├── sez-lookup.ts               # SEZ unit lookup
├── amount-normalization.ts     # Currency amount parsing (₹, $, lakhs, etc.)
├── commercial-terms-inference.ts # Payment term normalization
├── deliverable-inference.ts    # Deliverable type classification
├── licensing-summary.ts        # License type → display text
├── ocr-extractor.ts            # Image → text extraction
├── ocr-normalization.ts        # OCR output cleanup
│
├── supabase/
│   └── client.ts               # Supabase client singleton
├── brief-intake-fixtures.ts    # Test fixtures for brief parsing
└── international-billing-options.ts # International currency/country options
```

---

## 4. Core Workflows

### Brief Extraction Pipeline
```
User pastes brief text ──→ BriefIntakeCard.tsx
                              │
                              ▼
                     InvoiceEditorPage.handleBriefAutofill()
                              │
                    ┌─────────┴──────────┐
                    │                    │
              Local Parser          /api/brief-extract (Edge)
          (regex heuristics)       (OpenAI gpt-4o-mini)
                    │                    │
                    └────────┬───────────┘
                             ▼
                  invoice-brief-intake.ts
                   runBriefAutofill() — merges both sources
                             │
                             ▼
              invoice-parsed-extraction-hydration.ts
                   Hydrates InvoiceFormData
                             │
                             ▼
                   Form fields auto-populated
                   User validates & corrects
```

### Extraction Intelligence (System Prompt)
The `ai-brief-extractor.ts` system prompt includes:
- **Placeholder detection** — `₹[Amount]`, `[Client Name]` → null (not 0)
- **Multi-deliverable splitting** — "Item 01", "Item 02" → separate objects
- **City → State mapping** — 13 major Indian cities + neighborhood inference (Koramangala → Karnataka)
- **GST state code mapping** — numeric codes 01-37 → state names
- **License intent detection** — "commercial usage rights" → paymentTerms context
- **Due-date inference** — Net 15 → invoice date + 15 days

### Invoice Stepper Flow
```
Step 1: Agency    → Business name, address, GST registration, PAN, LUT
Step 2: Client    → Client name, location (domestic/intl), GSTIN, SEZ
Step 3: Items     → Line items with type, description, qty, rate, unit, SAC
Step 4: Payment   → Payment terms, licensing (flat flow), bank details, QR
Step 5: Meta      → Invoice number (auto-generated), invoice date, due date
Step 6: Totals    → Subtotal, GST breakdown (CGST/SGST or IGST), grand total
```

### Licensing Flow (Step 4)
The licensing section uses a **flat progressive-disclosure** layout (NOT an accordion):
1. User selects License Included: Yes / No
2. If Yes → License Type dropdown appears
3. Once type selected → Help text mapped to that type appears
4. Business logic preserved, visual accordion removed

### State Persistence
- `localStorage` with `DRAFT_STORAGE_KEY` for session persistence
- ExitConfirmModal handles draft discard (removes localStorage key)
- "Skip" on exit → clean slate on next visit

---

## 5. Design System Reference

### CSS Architecture (`globals.css`)
All component styling uses CSS custom properties defined in `globals.css`:
- `--bg-canvas`, `--bg-surface`, `--bg-surface-soft` — background hierarchy
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-soft` — text hierarchy
- `--border-default`, `--border-subtle`, `--border-accent` — border hierarchy
- `--interactive-primary` (`#BEFF00`), `--interactive-secondary` — action colors
- `--color-lime-*`, `--color-coral-*`, `--color-cyan-*` — accent palette

### UI Foundation (`ui-foundation.ts`)
Class generators for consistent component styling:
- `getAppButtonClass({ variant, size })` — primary/secondary/tertiary/ghost buttons
- `getAppFieldClass({ hasValue, multiline })` — input/textarea fields
- `getAppSubtlePanelClass(tone)` — card/panel backgrounds
- `getAppPillClass(tone)` — status pills

### Motion System (`motion-primitives.tsx`)
- Easing: `[0.16, 1, 0.3, 1]` (emphasized) and `[0.22, 1, 0.36, 1]` (gentle)
- Spring transition: `0.18s`
- Step transition: `0.2s`
- Presets: `fade-in`, `fade-up`, `scale-in`, `modal`, `soft`, `blur-in`, `slide-spring`

---

## 6. Authentication & Infrastructure

- **Auth:** Supabase OAuth (Google) via `app/login/page.tsx`
- **API Keys:** `.env.local` holds `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- **Edge Function:** `/api/brief-extract/route.ts` calls OpenAI Responses API with structured JSON schema
- **Supabase Edge Function:** `supabase/functions/parse-brief/` (Deno) — alternative parser with postprocessing

---

## 7. Test Infrastructure

```
tests/
├── extraction/
│   ├── brief-extraction-benchmarks.ts   # Benchmark test cases
│   ├── run-brief-extraction-benchmark.ts # Benchmark runner
│   └── run-parsed-hydration-tests.ts    # Hydration unit tests
├── compliance/
│   └── run-gst-compliance-tests.ts      # GST calculation tests
└── e2e/
    ├── invoice-editor-visual.spec.ts    # Playwright visual tests
    ├── invoice-stepper-collapse.spec.ts # Stepper interaction tests
    ├── invoice-autofill-modal.spec.ts   # Autofill flow tests
    └── helpers/invoice-editor.ts        # E2E test helpers
```

**Run commands:**
- `npm run build` — Production build (TypeScript + static generation)
- `npm run dev` — Dev server (Turbopack)
- `npm run test:extraction` — Brief extraction benchmarks
- `npm run test:compliance` — GST calculation tests
- `npm run test:e2e` — Playwright E2E tests

---

## 8. Git History & Branch Strategy

**Active branch:** `design-system-foundation`

**Recent commits (newest first):**
| Hash | Description |
|------|-------------|
| `a6d3b94` | Lance rebrand + extraction intelligence upgrade |
| `6fa478c` | Neon Atelier redesign — fluorescent lime, Syne+DM Sans, sharper radii |
| `93a8f84` | Update KT with comprehensive project history and roadmap |
| `5239c4c` | Draft discard flow, syntax polish, and KT document |
| `029deb4` | Fix invoice form choppiness: strip expansion layer animations |
| `fded495` | Intelligent hydration overriding regex heuristics |
| `b269411` | Trace and repair final rendered form state for parsed fields |

---

## 9. Pending Roadmap & Known Issues

### High Priority
1. **Invoice Preview Redesign** — The preview page (`/invoice/preview`) still uses old styling. It needs the Neon Atelier treatment while ensuring the generated PDF representation looks correct on white paper.

2. **Legacy Cleanup** — The `/create` route and `components/flow/*` directory are frozen/deprecated. They should be archived and removed to reduce repo bloat.

3. **Supabase Invoice Persistence** — Currently invoices exist only in localStorage. Need Supabase schema migrations to save finalized invoice blobs when user clicks "Finalize & Export."

### Medium Priority
4. **License Schema in Extraction** — The `AiBriefExtraction` type doesn't have a `license` field yet. License signals are currently routed to `paymentTerms` as a stopgap. A proper `license` object should be added to the schema and wired through `invoice-parsed-extraction-hydration.ts`.

5. **Extraction Testing** — Run the same template brief through the updated extraction prompt to verify placeholder detection and multi-deliverable splitting work as expected.

6. **WCAG Contrast Audit** — Verify lime-on-white accent elements meet AA contrast ratios. The fluorescent lime (`#BEFF00`) on white (`#F8F8FA`) may need a darker text companion.

### Low Priority
7. **Voice Input** — `BriefIntakeCard.tsx` has a Voice button that's still a placeholder. Web Audio API hooks for speech-to-text are a future bet.

8. **Deploy Pipeline** — Validate `.env.production` on Vercel for `OPENAI_API_KEY` and Supabase keys. Local `.env` is solid but cloud provisioning needs regression testing.

9. **Legal Pages** — Terms & Privacy pages are placeholder links in the footer.

---

## 10. Critical Files Quick Reference

| Need to... | Look at... |
|---|---|
| Change brand name/logo | `components/AppHeader.tsx` |
| Change colors/fonts/tokens | `app/globals.css`, `lib/ui-foundation.ts` |
| Change homepage copy | `app/page.tsx` |
| Change login flow | `app/login/page.tsx` |
| Change extraction logic | `lib/ai-brief-extractor.ts` (prompt), `lib/brief-parser-gateway.ts` (orchestration) |
| Change form autofill | `lib/invoice-brief-intake.ts` (core), `lib/invoice-parsed-extraction-hydration.ts` (AI→form) |
| Change invoice steps | `components/invoice/InvoiceEditorPage.tsx` (orchestrator) |
| Change a specific step | `components/invoice/{AgencyDetails,ClientDetails,Deliverables,TermsPayment,InvoiceMeta,TotalsTaxes}Section.tsx` |
| Change motion/animation | `components/ui/motion-primitives.tsx` |
| Change field/button styling | `lib/ui-foundation.ts` |
| Change tax calculations | `lib/invoice-calculations.ts`, `lib/invoice-tax.ts` |
| Add tests | `tests/extraction/` or `tests/e2e/` |
| Check GST compliance | `lib/invoice-compliance.ts`, `lib/gstin-parser.ts` |

---

## 11. Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# OpenAI (for brief extraction)
OPENAI_API_KEY=<your-openai-key>
OPENAI_BRIEF_EXTRACTION_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
```

---

*This KT is authoritative. If you are an AI agent reading this repo, start here. The canonical branch is `design-system-foundation`. The product is called Lance. Never use "AI" in user-facing copy.*
