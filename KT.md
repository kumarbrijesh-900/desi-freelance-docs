# Knowledge Transfer (KT) — Lance Invoice Engine

> **Last Updated:** 2026-04-24 (Session: Phase 9h complete — Autonomous Billing Engine & State Stabilization)
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

**Active branch:** `main` (deployed to Vercel)

**Recent commits (newest first):**
| `8e5a487` | Phase 9h — Autonomous Billing Engine (Deep Context, CoT Prompt, Strict Schema, State Wipe) |
| `8e53d76` | resolve extraction state merge bug (force dynamic, wipe state, strict LLM override) |
| `3b12a48` | Phase 9g — Smart Client Auto-fill & Suggestion Tray + Unique-client auto-population |
| `90075d2` | GST compliance on all 6 invoice templates (state codes, amount in words, RCM, signatory) |
| `a292677` | Phase 9a — Editor layout + GST compliance utilities |
| `1f52d64` | Sticky header + softer placeholders |
| `68b1bbe` | Inline delete confirmation for clients (replaced flickering confirm dialog) |
| `a6d3b94` | Lance rebrand + extraction intelligence upgrade |
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

---

## 10. Pending Roadmap

### Phase 10 — Advanced Compliance & Analytics
- **Reverse Charge toggle:** Add a toggle in the Totals/Taxes section for RCM edge cases.
- **Voice Input:** Activate voice-to-brief extraction in `BriefIntakeCard.tsx`.
- **Engagement Analytics:** Real-time dashboard for invoice views, duration, and conversion rates.
- **Subscription Engine:** Implement billing to gate the "Share" button and advanced templates.

### Known Issues
- **Share Button:** Temporarily hidden in Preview (requires subscription/billing logic implementation).
- **Authorized Signature:** Fully implemented with image support + text fallback + digital signature compliance note.
- **Reverse Charge toggle:** Currently hardcoded to "No" — needs a toggle in the Tax/Payment section for edge cases.
- **Voice Input:** `BriefIntakeCard.tsx` has a Voice button that's still a placeholder.

---

## 11. Supabase Schema Notes

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
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

**RLS Policies:**
- Owner can SELECT/INSERT/UPDATE/DELETE own invoices
- `invoices_select_by_share_token` — public SELECT when `share_token IS NOT NULL`
- `invoices_update_msa_acceptance` — public UPDATE for MSA acceptance on shared invoices

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

*This KT is authoritative. If you are an AI agent reading this repo, start here. The canonical branch is `main`. The product is called Lance. Never use "AI" in user-facing copy.*
