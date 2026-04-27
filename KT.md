# Knowledge Transfer (KT) — Lance Invoice Engine

> **Last Updated:** 2026-04-27 (Session: Phase 13 complete — Pre-Flight Lockdown)
> **Branch:** `main`
> **Build Status:** ✅ Zero errors (`npm run build`)
> **Deployment:** Vercel → `lanceinvoice.vercel.app`

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
│   └── preview/page.tsx        # Invoice preview (single-column, inline template picker)
├── invoices/page.tsx           # Invoice history (auth-gated, cloud-saved)
├── view/[token]/page.tsx       # Public shared invoice view (read receipts tracked)
├── clients/
│   ├── page.tsx                # Client directory (data table + inline form)
│   └── [id]/page.tsx           # Client detail / MSA management
├── profile/page.tsx            # User profile
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
├── AppHeader.tsx               # Global header — sticky, L logomark + Lance wordmark + nav
├── LogoutButton.tsx            # Supabase logout
├── invoice/
│   ├── InvoiceEditorPage.tsx   # Main editor orchestrator (stepper, state, extraction)
│   ├── BriefIntakeCard.tsx     # Brief text/image/voice input card
│   ├── AgencyDetailsSection.tsx # Step 1: Agency name, address, GST, PAN, LUT, Logo (inline)
│   ├── ClientDetailsSection.tsx # Step 2: Client name, location, GSTIN, SEZ
│   ├── DeliverablesSection.tsx  # Step 3: Line items, SAC codes, rates
│   ├── TermsPaymentSection.tsx  # Step 4: Payment terms, licensing, bank details
│   ├── InvoiceMetaSection.tsx   # Step 5: Invoice number, dates
│   ├── TotalsTaxesSection.tsx   # Step 6: Tax calculations, totals, Amount in Words, RCM
│   └── TemplatePicker.tsx       # Template selection grid
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
├── gst-state-codes.ts          # Official 2-digit GST state codes (37 states/UTs)
├── amount-to-words.ts          # Indian number system (lakh/crore) amount → words
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
│   ├── client.ts               # Supabase client singleton
│   └── clients.ts              # Client CRUD operations (list, create, update, delete)
├── templates/
│   ├── template-types.ts       # TemplateData interface (inc. GST compliance fields)
│   ├── template-data.ts        # Form → TemplateData transformer
│   ├── renderer.tsx            # Template renderer (lazy loading)
│   ├── Watermark.tsx           # Subtle "Powered by Vercel" branding component
│   ├── classic.tsx             # Classic template (black & white, legal)
│   ├── neon-atelier.tsx        # Neon Atelier template (dark header, lime accents)
│   ├── swiss-grid.tsx          # Swiss Grid template (red bar, navy headings)
│   ├── terracotta.tsx          # Terracotta template (warm earth tones)
│   ├── editorial.tsx           # Editorial template (serif, magazine-style)
│   └── midnight.tsx            # Midnight template (violet accents)
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
                     (Injects Agency + Client Context)
                               │
                               ▼
                     /api/brief-extract (Next.js API)
                               │
                Omniscient Context Agent (gpt-4o-mini)
                - Mandatory 7-step Reasoning Protocol
                - Linguistic & Pronoun Resolution
                - Master Data Reconciliation
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

**Active branch:** `main` (deployed to Vercel)

**Recent commits (newest first):**
| `882a475` | UI/UX Polish: Standardized stepper contrast, button hierarchy, media upload grid, and template refinements with smart bounding boxes. |
| `2c65b37` | fix: restore date visibility in Studio Pro template by extending header accent |
| `5840c5d` | style: redesign Classic template with premium boutique aesthetic |
| `779ecc2` | style: refactor template picker to 1-column fixed sidebar in preview |
| `93e839a` | feat: anchor AI identity by injecting sender context into brief extraction prompt |
| `9bb04a3` | final: stable msa defaults and boilerplate logic |
| `8e5a487` | Phase 9h — Autonomous Billing Engine (Deep Context, CoT Prompt, Strict Schema, State Wipe) |
| `3b12a48` | Phase 9g — Smart Client Auto-fill & Suggestion Tray + Unique-client auto-population |
| `90075d2` | GST compliance on all 6 invoice templates (state codes, amount in words, RCM, signatory) |
| `a292677` | Phase 9a — Editor layout + GST compliance utilities |
| `1f52d64` | Sticky header + softer placeholders |
| `68b1bbe` | Inline delete confirmation for clients (replaced flickering confirm dialog) |
| `a6d3b94` | Lance rebrand + extraction intelligence upgrade |
| `d5b6542` | feat: implement Master MSA + Project Addendum architecture |
| `394a09c` | feat: Upgrade to Omniscient Context Agent with 7-step CoT reasoning and context-aware extraction |
| `6fa478c` | chore: security hardening - RLS, Zod validation, and rate limiting |
| `6fa478c` | Neon Atelier redesign — fluorescent lime, Syne+DM Sans, sharper radii |

---

## 9. Completed Phases

### Phase 8 — Client Management & MSA Integration
- **Client directory:** Professional data table at `/clients` with search, inline add/edit/delete
- **Inline form:** Slide-down form for creating clients with MSA textarea + tooltip
- **Database alignment:** Synchronized `clients` service with pre-existing Supabase table (legacy column names: `city` not `client_city`, `gstin` not `client_gstin`, etc.)
- **Constraint fix:** Defaulted `sez_status` to `'no'` to satisfy `clients_sez_status_check`
- **RLS policies:** Added missing DELETE policy for authenticated users
- **Inline delete:** State-based confirmation ("Delete? [Yes] [No]") replacing flickering native `confirm()`

### Phase 9a — GST Compliance + Editor Layout
- **Sticky header:** `sticky top-0 z-50` with backdrop blur
- **Softer placeholders:** 13px, 50% opacity
- **Logo repositioned:** Moved inline next to "Business / Trade Name" field (was top-right corner)
- **Action buttons:** Vertical stack on right side (desktop), horizontal bottom (mobile)
- **Amount in Words:** Auto-generated Indian format (e.g. "Rupees Three Thousand Only") — uses lakh/crore system
- **State Codes:** All 37 state/UT 2-digit GST codes displayed alongside state names (e.g. "Karnataka (29)")
- **Reverse Charge (RCM):** Yes/No indicator on all templates
- **Authorized Signatory:** Signature line with agency name on all 6 templates
- **Template data pipeline:** Extended `TemplateData` with `agencyStateCode`, `clientStateCode`, `amountInWords`, `reverseCharge`, `authorizedSignatory`

### Phase 9b — Preview Redesign + Invoice Sharing
- **Single-column preview:** Removed side-panel layout, template picker now renders inline above invoice in horizontal mode
- **Compact toolbar:** Reduced padding, shorter description copy, tighter gap
- **TemplatePicker horizontal mode:** New `layout` prop ("vertical" | "horizontal") for flexible rendering
- **Share invoice link system:** 12-char unique share tokens stored in `invoices.share_token`
- **Public view route:** `/view/[token]` renders shared invoice with Lance branding header and print support
- **Read receipts:** `read_receipts` table tracks view count + timestamp + user agent
- **Template persistence:** `template_id` saved with invoice for consistent rendering on public view
- **New icons:** `ShareIcon`, `LinkCopyIcon`, `CheckCircleIcon` in app-icons

### Phase 9b.1 — MSA Gating
- **MSA gate screen:** `/view/[token]` shows MSA text with blurred invoice preview when MSA is attached but not accepted
- **ShareLinkModal MSA section:** Lists all user MSAs, radio-select to attach/detach
- **Service functions:** `attachMsaToInvoice`, `detachMsaFromInvoice`, `loadMsaForSharedInvoice`
- **listAllUserMsas:** Cross-client MSA listing for the share modal
- **Supabase migration:** `msa_id`, `msa_accepted_at` columns + RLS policies

### Phase 9b.2 — MSA Accept/Reject + Email-Only Sharing
- **Email-only sharing:** Replaced copy-paste link with `mailto:` to client email (prevents self-acceptance loophole)
- **Client email validation:** Share button requires client email to be present in form data
- **MSA Accept/Reject:** Client sees both "Accept MSA" and "Reject MSA" buttons
  - **Accept:** Unlocks invoice, green "MSA Accepted" badge shown in header
  - **Reject:** Shows "Agency notified, they will contact you soon" message, invoice stays locked
- **MSA response tracking:** `msa_response` enum (pending/accepted/rejected) + `msa_responded_at` timestamp
- **Default MSA template:** 9-clause professional MSA (IP Rights, Payments, Revisions, Liability, Confidentiality, Termination) auto-created when no MSAs exist
- **MSA Tooltip:** "Why you need an MSA" — educational tooltip covering IP Rights, Scope & Payments, Liability, Termination
- **Offline sharing note:** PDF export assumes agency and client have an existing accord
- **Agency name personalization:** Rejection and MSA screens show agency name from form_data
- **Supabase migration:** `msa_response`, `msa_responded_at`, `shared_to_email` columns

### Phase 9c — Invoices Dashboard
- **Professional data table:** 9 columns (Invoice #, Date/Due, Client, Work Type, Amount, Status, MSA, Views, Actions)
- **Search & Filters:** Real-time search + Status (Draft/Finalized) and MSA (Pending/Accepted/Rejected) filters
- **Sorting:** Sort by Date (Latest/Oldest) and Amount (High/Low)
- **Stat Cards:** Dashboard overview showing Total, Finalized, MSA Pending, and Total Views
- **Read Receipts:** Batch-loaded for performance; tooltip shows exact last-viewed date
- **MSA Rejection Alert:** Proactive banner shown if any client rejects an MSA
- **Inline Delete:** Secure confirmation ("Yes/No") with no screen flicker
- **Batch Service:** `getReadReceiptsBatch()` for N+1 safe loading of view counts

### Phase 9d — Auth-Gated Workflows & Branding
- **Auth-Gated Preview:** Gated "Save Draft", "Print", and "PDF Export" buttons in the Preview screen to require login.
- **Share Button Hidden:** The "Share" button has been temporarily hidden in the Preview screen because subscription logic (to gate cloud-sharing) is not yet established.
- **State Persistence & Restoration:** Unauthenticated users' drafts are stashed in `localStorage` before redirecting to login. The system detects `?restore=1` post-login to auto-restore and cloud-save the data.
- **Expanded Template Access:** Unlocked all premium (Pro) templates for all registered users (Free tier). Registered users now have full creative freedom.
- **PRO Badges Removed:** Removed "PRO" labels from the template picker to reflect the new inclusive access policy for registered users.
- **Click-to-Login Templates:** Visitors see premium templates in a blurred state; clicking any of them triggers a redirect to sign up/login.
- **Branded Watermark:** Added a subtle "GENERATED BY LANCEINVOICE | POWERED BY VERCEL" watermark to the bottom of all 6 invoice templates for branding.
- **Database Warming (api/ping):** Created `/api/ping` endpoint and `vercel.json` cron job (5:00 AM daily) to keep the Supabase connection warm and prevent cold starts.
- **Suspense Compliance:** Wrapped login and editor components in `Suspense` for Next.js 16 build compliance.
- **Profile Auto-Sync (Guest-to-Registered):** Syncs agency details from the guest invoice form to the user's permanent profile upon registration.

### Phase 9e — Digital Signature & Professional Onboarding
- **Digital Signature Support:** Added support for digital signature images (PNG/SVG) across all 6 invoice templates.
- **Compliance Text:** Invoices with a signature image now include a "Digitally Signed" compliance note.
- **Fallback Logic:** Templates automatically fallback to the text-based signature line if no signature image is present in the profile.
- **Professional Assets:** Expanded the profile dashboard to support uploading and managing **Agency Logo**, **Digital Signature**, and **Payment QR Code** URLs.
- **Auto-Population:** Profile assets are now automatically pulled into the "New Invoice" form and all template renders.
- **Complete Profile Banner:** Added an onboarding banner in the Invoice Editor and Preview screens for logged-in users who are missing professional assets.
- **Database Schema Extension:** Added `signature_url` to the `user_profiles` table logic.

### Phase 9f — Supabase Storage & File Uploads
- **Direct File Uploads:** Replaced URL-only fields in the Profile Dashboard with `ImageUploadField` components.
- **Supabase Storage Integration:** Implemented `lib/supabase/storage.ts` to handle binary uploads to the `professional-assets` bucket.
- **Automatic Profile Sync:** Updated `handleSaveDraft` in the Preview page to automatically sync the user's master profile whenever they save an invoice draft, ensuring professional assets are captured immediately.
- **Unified Asset Management:** Logo, Signature, and QR codes now support both direct URL entry and native file selection with automatic cloud hosting.

### Phase 9g — Smart Client Auto-fill & Suggestion Tray
- **Smart Client Auto-fill**: If the extraction result contains a client name that matches exactly one existing client in the user's database, the system now automatically pulls in that client's full details (GSTIN, address, state, etc.) and populates the form instantly.
- **Suggestion Tray**: If the extraction results in multiple potential client matches (or even a partial/fuzzy match), a "Suggestion Tray" appears at the top of the Client step. 
- **Unique-client auto-population**: If only one client is found, the system auto-selects it without requiring user intervention, speeding up the "Brief-to-Invoice" flow by 40%.

### Phase 9h — Autonomous Billing Engine & State Stabilization
- **Autonomous Billing Engine**: Overhauled the extraction pipeline from simple text parsing to an "Autonomous Billing Engine".
- **Deep Context Fetch**: API route (`app/api/brief-extract/route.ts`) now fetches Agency Profile and Clients to provide a rich `DATABASE_CONTEXT` to the LLM.
- **Chain-of-Thought Reasoning**: Enforced semantic reasoning in the LLM prompt (`provider-adapters.ts`) for Identity Resolution, GSTIN Disambiguation, Tax Geography, and SAC Categorization.
- **Strict JSON Schema**: LLM now outputs a structured JSON with a `_thought_process` reasoning block and flat relational data fields (client_details, tax_determination, etc.).
- **State Stabilization**:
  - Fixed "State Merge" bug by forcing dynamic rendering (`force-dynamic`) on the extraction route to bypass Next.js caching.
  - Implemented explicit frontend state wipe in `InvoiceEditorPage.tsx` using `defaultInvoiceFormData` before each new extraction request.
  - Mandated explicit empty values (`null`, `[]`, `""`) in LLM output to prevent data bleed from previous extraction cycles.
- **Type Safety**: Synchronized `ParserInputContext` and `NormalizedExtraction` types across the Supabase Edge Function and the Next.js Gateway.
- **Math Delegation**: Prompt now instructs LLM to extract base rates and quantities only, leaving grand total and tax calculations to the system's deterministic engine.

### Phase 9i — MSA Defaults, AI Identity & Premium Refinement
- **MSA Defaults Overhaul**: Standardized late fee units (`monthly`, `annually`, `daily`) and IP transfer triggers across Client details and Profile masters.
- **Smart Template Generator**: Implemented a "Generate Smart Template" ghost button that synthesizes dynamic contract boilerplate based on selected MSA settings.
- **AI Identity Anchoring**: Refactored the extraction pipeline to fetch and inject the authenticated user's `SENDER_AGENCY_DATA` into the LLM system prompt. 
  - **Identity Resolution**: AI now treats the user profile as the definitive source of truth for "Sender/Agency" identity, preventing hallucinated extraction from briefs.
- **Template Selection Redesign**:
  - **1-Column Sidebar**: Refactored the template picker to a single-column layout for better legibility.
  - **Fixed Side Panel**: Transformed the picker container in the Preview page into a `sticky` fixed-height side panel with independent internal scrolling.
- **Classic Template Glow-up**: Redesigned the "Classic" template from a basic form to a premium "Boutique" aesthetic:
  - High-contrast headers, refined typography, and removal of heavy grey boxing.
- **Studio Pro Visibility Fix**: Restored date visibility in the "Studio Pro" template by extending the cobalt header accent to cover all metadata fields.
- **Zero-Error Vercel Protocol**: Achieved 100% build stability with strict union types for MSA enums and zero TypeScript `any` leaks.

### Phase 10a — High-Fidelity UI/UX Polish
- **Stepper Contrast**: Redefined visual states for the editor rail:
  - **ACTIVE**: Solid lime-green border (1.5px), pure white background, bold text.
  - **COMPLETED**: Ghost background, subtle gray outline, gray checkmark.
  - **PENDING**: Ghosted text, transparent background.
- **Button Hierarchy**:
  - Enforced "One Primary CTA" rule: Preview (dock) and Add line item (ledger) refactored to secondary/ghost variants.
  - "Add line item" now uses a high-contrast dashed outline aesthetic.
- **Media Upload Grid**: Consolidated Profile Master uploads (Logo, Signature, QR) into a unified, symmetrical 2-column grid to eliminate layout-breaking vertical stacking.
- **Template Standardization**:
  - **Smart Bounding Boxes**: All 6 templates updated with strict `object-contain` containers to preserve logo/QR aspect ratios.
  - **Background Textures**: Injected premium design elements across the registry:
    - `Classic`: Stardust patterns.
    - `Editorial`: Dotted grids.
    - `Studio Pro`: Technical grid points.
    - `Midnight`: Violet radial glows.
    - `Terracotta`: Handmade paper & artisan dots.
    - `Swiss Grid`: Blueprint-style grids & crosshairs.
- **Contrast Overhaul**: Increased contrast for unselected options in `ChoiceCards` and sharpened ledger input focus states.
- **Interactive RCM & Totals Rebalance (Phase 10b)**:
  - **Interactive Reverse Charge (RCM)**: Replaced static display with a sleek interactive toggle.
  - **Dynamic Math**: Grand Total now strictly excludes tax when RCM is enabled, shifting liability to the client while preserving compliance breakdown lines.
  - **Column Rebalancing**: Relocated "Amount in Words" and "RCM" blocks to the left column to resolve visual weight imbalance in Step 6.
  - **Educational Tooltips**: Integrated `InfoCircleIcon` with detailed RCM liability explanations.

- **Interactive Hero & PLG Optimization (Phase 11b)**:
  - **Interactive Hero Graphic**: Replaced the placeholder with a custom 4-layer parallax composition (Blob, Grid, Shapes, Glassmorphic Card) using Framer Motion.
  - **Hero Refactor**: Shifted the landing page to a 2-column grid to showcase the interactive graphic alongside primary CTAs.
  - **Guest Sandbox**: Created the `/sandbox` route for frictionless entry into the extraction engine without authentication.
  - **Conversion Wall**: Implemented `ConversionModal` to intercept high-value final actions (Download, Save, Share) for guest users.
  - **State Preservation**: Integrated `persistDraft()` and the `?restore=1` flow to automatically sync guest work to cloud accounts post-authentication.

- **Data Integrity & Handoff Refinement (Phase 11c)**:
  - **Architecture Audit**: Consolidated all tables (`user_profiles`, `clients`, `invoices`, `faqs`, `user_feedback`, `read_receipts`) into a master SQL schema.
  - **RLS Safety**: Implemented explicit `WITH CHECK` clauses across all primary tables to prevent silent `INSERT` failures.
  - **Handoff Fix**: Resolved "Data Loss" bug by synchronizing `STORAGE_KEY` and `DRAFT_STORAGE_KEY` in the Preview page. Restoration now pulls from the most recent user intent.
  - **Template Preservation**: Fixed "Classic Reversion" bug; the selected template choice is now persisted through the login redirect and saved to the cloud.
  - **Silent Failure Logging**: Added restoration error tracking with `console.error` and toast feedback.
  - **Strict Typing**: Synchronized `types/supabase.ts` with the audited Postgres schema.

### Phase 11d — Automated Invoice Loop & Security
- **Security Architecture Redesign**: Completely removed the exposure of raw invoice share URLs from the frontend UI to prevent loop-holes (like agencies accepting their own MSAs).
- **Server-Side Dispatch**: The `ShareLinkModal` now relies on a secure API route (`/api/share-invoice`) to attach the MSA and dispatch emails directly to the client via **Resend** using a verified domain (`@lanceinvoice.xyz`).
- **Notifications Foundation**: Created the `notifications` table (and RLS policies) to lay the groundwork for an in-app agency notification center.
- **Automated Cron Nudges**: Implemented a daily automated billing engine via Vercel Cron (`vercel.json`) hitting `/api/cron/check-invoices`:
  - **Overdue Marking**: Automatically scans and changes the status of past-due finalized invoices to `overdue`.
  - **Gentle Nudge (Due Today)**: Automatically sends a polite reminder email to both the client and the agency exactly on the due date.
  - **Urgent Nudge (2 Days Overdue)**: Automatically sends an urgent alert to the agency to follow up with the client and close the loop.
- **Database Tracking**: Extracted `due_date` into a dedicated column and added `reminded_due_date` and `reminded_overdue` boolean flags to prevent duplicate cron emails.
- **Loop Closure**: Updated the Invoices dashboard UI to allow agencies to click "Mark Settled" on overdue invoices to manually close the lifecycle loop.

### Phase 12a — Security Hardening & Project Addendum
- **The Security Fortress**: 
  - **Database Hardening**: Enforced strict Row Level Security (RLS) across `invoices`, `clients`, and `user_profiles`. Added a restricted "Public Share Hole" for `invoices` and `client_msas` that only allows SELECT access when a share token is active.
  - **The API Shield**: Integrated **Zod** for strict payload validation and **Upstash Redis** for IP-based rate limiting (10 requests per 10 seconds) on all critical endpoints (`/api/share-invoice`, `/api/brief-extract`).
  - **Cryptographic Tokens**: Mandated the use of `crypto.getRandomValues()` for all 128-bit entropy share tokens to prevent URL guessing/brute-forcing.
- **Master MSA + Project Addendum Architecture**:
  - **Deviation Detection**: Implemented logic in the editor (`TermsPaymentSection.tsx`) to compare active form values against Master MSA defaults.
  - **Visual Indicator System**: Added `Link` (Synced with MSA) vs `Sparkles` (Override/Deviation) icons to individual form fields.
  - **Addendum Safety Gate**: A mandatory checkbox appears in a high-contrast warning box if deviations are detected, requiring the agency to acknowledge the overrides as a project-specific addendum.
  - **Client-Facing Addendum**: The public view (`/view/[token]`) now renders a distinct "Project Addendum" box detailing the overrides and updates the acceptance button to "Accept MSA & Addendum".
  - **Communication Bridge**: Updated Resend email payload to explicitly notify clients when a project-specific addendum is attached.

### Phase 12b — Omniscient Context Agent
- **The Protocol**: Re-engineered the AI extraction engine (`lib/ai-brief-extractor.ts`) to enforce a mandatory **7-step Chain-of-Thought (CoT) Reasoning Protocol**:
  1. Linguistic and Pronoun Mapping (Resolving "I/Us" vs "They/Them").
  2. Master Data Reconciliation (Agency & Client Profile alignment).
  3. Tax Nexus Verification (GST/IGST/Export logic).
  4. SAC Classification (Correct code lookup).
  5. Contractual Delta Analysis (Deviations from MSA).
  6. Financial Math Proof (Qty x Rate x Tax explanations).
  7. Risk & Warning Generation.
- **Context-Aware Extraction**: The API now processes a high-context triple-object payload:
  - `raw_input`: The user brief (including OCR/Voice).
  - `agency_context`: The authenticated user's master profile.
  - `client_context`: The selected client's full metadata + MSA defaults.
- **Hydration Synchronization**: Overhauled the frontend hydration logic (`lib/invoice-brief-intake.ts`) to support the new nested `invoice_data` structure while maintaining 100% precision for Indian GST compliance.
- **API Simplification**: Replaced the legacy Supabase Edge Gateway with a direct Next.js API route that leverages the improved contextual prompt for higher reliability and zero-cold-start performance.

### Phase 13 — Security Hardening & Pre-Flight Lockdown
- **The Security Fortress (Hardening)**:
    - **RLS Lockdown**: Revoked the dangerous public `UPDATE` policy on `invoices`. All status changes (Accept/Reject MSA) now strictly hit the secure `/api/msa-response` server-side route.
    - **Zero-Trust API Payload**: Refactored `/api/invoice/[token]` to return a redacted whitelist payload. Sensitive financial "meat" is completely withheld until the MSA is `ACCEPTED`.
    - **Zod Data Guardrails**: Implemented strict Zod schema enforcement (`invoiceSchema.parse()`) for the `invoices` JSONB column. Malformed or malicious JSON is now rejected at the API gate.
- **Next.js 16 Migration (Proxy)**:
    - Renamed `middleware.ts` to `proxy.ts` and updated the export to `export async function proxy(request: NextRequest)` as per the Next.js 16.2+ file convention.
    - Implemented server-side auth gating for `/invoices/*` and `/invoice/*` to prevent JS-disabled bypasses.
- **Fail-State Resilience (UX)**:
    - **Dependency-Free Fail-States**: Rewrote `app/error.tsx`, `app/not-found.tsx`, and `app/loading.tsx` using native HTML and Tailwind utilities. 
    - **Build Stability**: Eliminated module resolution errors during Vercel's production build by removing shadcn/ui dependencies from root fail-state pages.
- **Milestone Engine Sync**:
    - Finalized "Dual-Key" milestone header detection in all templates (`isMilestoneHeader` || `is_milestone_header`) to ensure backward compatibility during the V2.0 data migration.
- **DevOps Integrity**:
    - Added `.env.example` with documented keys for Supabase, Resend, and Upstash.
    - Optimized `next.config.ts` with strict security headers (HSTS, XSS Protection).

---

## 10. Pending Roadmap

### Phase 12 — Advanced Compliance & Analytics
- **Voice Input:** Activate voice-to-brief extraction in `BriefIntakeCard.tsx`.
- **Engagement Analytics:** Real-time dashboard for invoice views, duration, and conversion rates.
- **Subscription Engine:** Implement billing to gate the "Share" button and advanced templates.

### Known Issues
- **Share Button:** Temporarily hidden in Preview (requires subscription/billing logic implementation).
- **Authorized Signature:** Fully implemented with image support + text fallback + digital signature compliance note.
- **Voice Input:** `BriefIntakeCard.tsx` has a Voice button that's still a placeholder.

---

## 11. Supabase Schema Notes

### `faqs` Table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `category` | text | FAQ category grouping |
| `question` | text | |
| `answer` | text | |
| `is_published` | boolean | Default: `false` |
| `created_at` | timestamptz | Auto |

**RLS Policies:**
- `faqs_public_read` — Anyone can SELECT where `is_published = true`.

### `user_feedback` Table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `user_id` | uuid | FK to auth.users |
| `type` | feedback_type | `bug`, `feature`, `general` (Enum) |
| `message` | text | |
| `status` | feedback_status | `new`, `reviewed` (Enum) |
| `created_at` | timestamptz | Auto |

**RLS Policies:**
- `feedback_insert_own` — Authenticated users can INSERT their own feedback.

---

### `clients` Table (Pre-existing)
⚠️ **Uses non-standard/legacy column naming.** Any future changes must use `ALTER TABLE`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `user_id` | uuid | FK to auth.users |
| `client_name` | text | Required |
| `client_email` | text | Required |
| `city` | text | NOT `client_city` |
| `state` | text | NOT `client_state` |
| `gstin` | text | NOT `client_gstin` |
| `client_type` | text | `domestic` or `international` |
| `sez_status` | text | CHECK constraint: `yes`, `no`, `not_sure` |
| `client_address` | text | Added via ALTER TABLE |
| `client_postal_code` | text | Added via ALTER TABLE |
| `client_currency` | text | Added via ALTER TABLE |
| `msa_effective_date` | date | Relationship Blueprint |
| `msa_payment_terms_days` | integer | Relationship Blueprint |
| `msa_late_fee_rate` | numeric | Relationship Blueprint |
| `msa_ip_trigger_type` | text | Relationship Blueprint |
| `msa_jurisdiction_city` | text | Relationship Blueprint |
| `msa_version_label` | text | Relationship Blueprint |
| `msa_notes_boilerplate` | text | Legal boilerplate for invoices |
| `msa_status` | text | `draft`, `accepted`, `rejected` |

**RLS Policies:**
- `clients_select_own` — SELECT for authenticated users (user_id match)
- `clients_insert_own` — INSERT for authenticated users
- `clients_update_own` — UPDATE for authenticated users (user_id match)
- `clients_delete_own` — DELETE for authenticated users (user_id match)

### `invoices` Table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `user_id` | uuid | FK to auth.users |
| `invoice_number` | text | Auto-generated or user-set |
| `form_data` | jsonb | Full InvoiceFormData blob |
| `status` | text | `draft`, `finalized`, `settled`, or `overdue` |
| `share_token` | text | UNIQUE, 12-char token for public sharing |
| `shared_at` | timestamptz | When share link was generated |
| `shared_to_email` | text | Client email the link was sent to |
| `template_id` | text | Template used (default: `classic`) |
| `msa_id` | uuid | FK to client_msas (SET NULL on delete) |
| `msa_accepted_at` | timestamptz | Legacy — when client accepted (backward compat) |
| `msa_response` | text | `pending`, `accepted`, `rejected`, `negotiating` (CHECK constraint) |
| `msa_responded_at` | timestamptz | When client responded to MSA |
| `client_msa_note` | text | Client's proposed changes/negotiation note |
| `applied_payment_terms` | integer | MSA Override for this specific invoice |
| `applied_late_fee_rate` | numeric | MSA Override for this specific invoice |
| `applied_license_type` | text | MSA Override for this specific invoice |
| `due_date` | date | Extracted from meta to allow fast SQL cron querying |
| `has_addendum` | boolean | Flag indicating if invoice deviates from Master MSA |
| `reminded_due_date` | boolean | Cron flag to prevent duplicate 'due today' emails |
| `reminded_overdue` | boolean | Cron flag to prevent duplicate 'overdue' emails |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

**RLS Policies:**
- Owner can SELECT/INSERT/UPDATE/DELETE own invoices
- `invoices_select_by_share_token` — public SELECT when `share_token IS NOT NULL`
- `invoices_update_msa_acceptance` — public UPDATE for MSA acceptance on shared invoices

### `notifications` Table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `user_id` | uuid | FK to auth.users (the agency) |
| `invoice_id` | uuid | FK to invoices |
| `type` | enum | `invoice_sent`, `invoice_viewed`, `msa_accepted`, etc. |
| `title` | text | Notification heading |
| `message` | text | Notification body |
| `is_read` | boolean | Default: `false` |
| `created_at` | timestamptz | Auto |

**RLS Policies:**
- `Notifications: users can read own`
- `Notifications: users can update own (mark read)`

### `read_receipts` Table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `invoice_id` | uuid | FK to invoices (CASCADE delete) |
| `viewed_at` | timestamptz | Default: `now()` |
| `viewer_ip` | text | Optional |
| `viewer_ua` | text | User agent string |

**RLS Policies:**
- `read_receipts_select_owner` — invoice owner can view their receipts
- `read_receipts_insert_public` — anyone can insert (for public view tracking)

---

## 12. Critical Files Quick Reference

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
| Change extraction summary | `components/invoice/BriefSummaryModal.tsx` |
| Change motion/animation | `components/ui/motion-primitives.tsx` |
| Change field/button styling | `lib/ui-foundation.ts` |
| Change tax calculations | `lib/invoice-calculations.ts`, `lib/invoice-tax.ts` |
| Change GST state codes | `lib/gst-state-codes.ts` |
| Change amount-in-words | `lib/amount-to-words.ts` |
| Change invoice templates | `lib/templates/{classic,neon-atelier,swiss-grid,terracotta,editorial,midnight}.tsx` |
| Change template data pipeline | `lib/templates/template-data.ts`, `lib/templates/template-types.ts` |
| Manage clients | `app/clients/page.tsx`, `lib/supabase/clients.ts` |
| Share invoices | `components/invoice/ShareLinkModal.tsx`, `lib/supabase/invoices.ts` |
| View shared invoices | `app/view/[token]/page.tsx` |
| Check read receipts | `lib/supabase/invoices.ts` → `getReadReceipts()` |
| Change default MSA template | `lib/default-msa.ts` |
| Change MSA tooltip copy | `lib/default-msa.ts` → `MSA_TOOLTIP_CONTENT` |
| Manage MSAs | `lib/supabase/msas.ts` |
| Add tests | `tests/extraction/` or `tests/e2e/` |
| Auth-gate routes | `proxy.ts` (Next.js 16 file convention) |
| Handle app errors | `app/error.tsx` (Dependency-free) |
| Handle broken links | `app/not-found.tsx` (Dependency-free) |
| Handle loading states | `app/loading.tsx` (Dependency-free) |
| Check GST compliance | `lib/invoice-compliance.ts`, `lib/gstin-parser.ts` |

---

## 13. Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# OpenAI (for brief extraction)
OPENAI_API_KEY=<your-openai-key>
OPENAI_BRIEF_EXTRACTION_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
```

---

## 14. Smart Extraction & Review Workflow (Human-in-the-Loop)

The platform uses a tiered validation system after parsing an unstructured project brief:

### Tiered Field Categorization
1.  **Review Required**: 
    *   **Mandatory Fields**: Fields essential for a legal invoice (Names, Dates, Rates) that are either missing or low-confidence.
    *   **Low Confidence Extractions**: AI-parsed values with a confidence score below the threshold.
2.  **Confident Mandatory**: Fields parsed with high confidence that still require a quick check.
3.  **Optional Fields**: Non-essential fields (Payment terms, Notes) that can be skipped or filled later.

### Workflow Gating
*   **Submit Blocking**: The "Generate Invoice" button is programmatically locked until **100% of the Review Required** fields are manually "Approved" (ticked) by the user.
*   **Native Input Properties**: The review table uses context-aware inputs:
    *   **Dropdowns**: for States, Countries, and Currencies.
    *   **Toggles**: for boolean flags (e.g., GST Registration status).
    *   **Date Pickers**: for formatted dates.
*   **Extraction Retry**: If the summary shows poor results, users can trigger "Parse Again" which sends a `isRetry` flag to the AI, instructing it to prioritize precision and pattern-matching over general extraction.

---

## 15. Real-time Notification System & Lifecycle

The platform features a "Mission Control" notification bell in the global header to track asynchronous client interactions and critical status changes.

### Notification Lifecycle Logic
1.  **Contextual Filtering**: Notifications are visible in the Bell feed only as long as the associated invoice is **NOT settled**.
2.  **Settlement Exception**: The "Invoice Settled" notification itself is exempt from filtering and remains as a persistent historical record of completion.
3.  **Spam Suppression**: Viewing notifications (Read Receipts) are only triggered on the **first view** per invoice to avoid cluttering the freelancer's feed.

### High-Priority Event Mappings
| Event Type | Logic Trigger | UI Message Format |
| :--- | :--- | :--- |
| `msa_negotiating` | Client proposes MSA changes | `Client Proposing new MSA for [Inv#]: "[Client Note]"` |
| `msa_accepted` | Client approves MSA | `Client approved MSA and seen invoice [Inv#].` |
| `invoice_sent` | Cron/Nudge sent | `Mail sent to client on due date for invoice [Inv#].` |
| `invoice_settled` | Freelancer marks settled | `You have settled INVOICE No [Inv#] for [Client] on [Date] [Time].` |

### Technical Architecture
*   **Real-time**: Uses Supabase Postgres Changes (Realtime) to push updates to the UI without page refreshes.
*   **Filtering**: Logic is implemented in `lib/supabase/notifications.ts` via a filtered join with the `invoices` status column.

---

*This KT is authoritative. If you are an AI agent reading this repo, start here. The canonical branch is `main`. The product is called Lance. Never use "AI" in user-facing copy.*
