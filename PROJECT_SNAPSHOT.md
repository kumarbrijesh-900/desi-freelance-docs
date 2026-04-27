# LanceInvoice: Project Snapshot

## 1. PROJECT META
- **Framework versions:** Next.js 16.2.1, React 19.2.4
- **Package manager:** npm (`package-lock.json` is present)
- **Deployment target:** Vercel (indicated by `vercel.json` and standard Next.js deployment)
- **Environment variables in use:** 
  - `PLAYWRIGHT_BASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `OPENAI_API_KEY`
  - `OPENAI_BRIEF_EXTRACTION_MODEL`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `CRON_SECRET`
- **Total file count:** 274 files
- **Total LOC:** 57,559 lines
- **Breakdown by language:**
  - TypeScript: 172 files, 38,594 LOC
  - JSON: 11 files, 7,841 LOC
  - HTML: 11 files, 4,216 LOC
  - Markdown: 23 files, 3,179 LOC
  - CSV: 24 files, 1,456 LOC

## 2. DIRECTORY STRUCTURE
```text
.
├── _archived/                 # Deprecated legacy code & types
├── app/                       # Next.js App Router root
│   ├── api/                   # Server API routes
│   ├── clients/               # Client management pages
│   ├── internal/              # Internal tools (e.g. design system)
│   ├── invoice/               # Invoice creation & preview routes
│   ├── invoices/              # User invoice dashboard
│   ├── login/                 # Authentication page
│   ├── onboarding/            # New user onboarding flow
│   ├── profile/               # User profile settings
│   └── view/                  # Public shared invoice viewer
├── audits/                    # Code audits and migration maps
├── components/                # React components
│   ├── faq/                   # FAQ section components
│   ├── feedback/              # User feedback forms/modals
│   ├── invoice/               # Core invoice editor components
│   ├── landing/               # Marketing landing page components
│   └── ui/                    # Base UI elements and primitives
├── docs/                      # Documentation and KT files
├── hooks/                     # Custom React hooks
├── lib/                       # Utilities, external clients, type parsers
│   ├── supabase/              # Supabase client instantiation
│   └── templates/             # Invoice templates logic
├── prototypes/                # Early stage prototype concepts
├── public/                    # Static assets
├── supabase/                  # Supabase configurations and Edge Functions
│   ├── functions/             # Deno Edge Functions
│   └── migrations/            # DB Schema migrations
├── test-results/              # Test outputs
├── tests/                     # Automated testing suite
│   ├── compliance/            # GST Compliance verification
│   ├── e2e/                   # Playwright E2E UI tests
│   └── extraction/            # OCR & LLM brief extraction benchmarks
└── types/                     # Global TypeScript definitions
```

## 3. ROUTING MAP
- **`/`** (app/page.tsx) - Client Component - Marketing Landing Page (Public)
- **`/clients`** (app/clients/page.tsx) - Server/Client - Clients list (Protected)
- **`/clients/[id]`** (app/clients/[id]/page.tsx) - Server/Client - Client detail view (Protected)
- **`/internal/design-system`** (app/internal/design-system/page.tsx) - Client Component - UI Demo (Protected/Internal)
- **`/invoice/new`** (app/invoice/new/page.tsx) - Client Component - Create invoice (Protected)
- **`/invoice/preview`** (app/invoice/preview/page.tsx) - Client Component - Preview invoice (Protected)
- **`/invoices`** (app/invoices/page.tsx) - Client Component - Invoices dashboard (Protected)
- **`/login`** (app/login/page.tsx) - Client Component - Login page (Public)
- **`/onboarding`** (app/onboarding/page.tsx) - Client Component - User onboarding (Protected)
- **`/privacy`** (app/privacy/page.tsx) - Client Component - Privacy Policy (Public)
- **`/profile`** (app/profile/page.tsx) - Client Component - User profile settings (Protected)
- **`/sandbox`** (app/sandbox/page.tsx) - Client Component - Sandbox testing area (Internal)
- **`/support`** (app/support/page.tsx) - Client Component - Support request page (Protected)
- **`/terms`** (app/terms/page.tsx) - Client Component - Terms of Service (Public)
- **`/view/[token]`** (app/view/[token]/page.tsx) - Client Component - View shared invoice (Public)

## 4. DATA MODEL
- **Database/ORM:** Supabase (PostgreSQL) using auto-generated standard TypeScript definitions.
- **Migration count:** Supabase migrations are used (specific count N/A in immediate view).
- **Seed Data:** No direct SQL seed files detected.
- **Schema Dump:**
```typescript
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string; user_id: string; agency_name: string; address: string; address_line1: string;
          address_line2: string; city: string; pin_code: string; state: string; gstin: string;
          pan: string; logo_url: string; signature_url: string; qr_code_url: string;
          gst_registration_status: string; lut_availability: string; lut_number: string;
          no_lut_tax_handling: string; bank_name: string; account_name: string;
          account_number: string; ifsc_code: string; bank_address: string; swift_bic_code: string;
          iban_routing_code: string; created_at: string; updated_at: string;
        }
      }
      clients: {
        Row: {
          id: string; user_id: string; client_name: string; client_email: string;
          client_address: string; client_postal_code: string; city: string; state: string;
          gstin: string; client_location: 'domestic' | 'international';
          sez_status: 'yes' | 'no' | 'not_sure'; client_currency: string;
          msa_payment_terms_days: number; msa_late_fee_rate: number;
          msa_notes_boilerplate: string; invoice_count: number; last_invoiced_at: string | null;
          created_at: string; updated_at: string;
        }
      }
      client_msas: {
        Row: {
          id: string; client_id: string; user_id: string; title: string; content: string;
          status: 'draft' | 'active' | 'expired'; created_at: string; updated_at: string;
        }
      }
      invoices: {
        Row: {
          id: string; user_id: string; invoice_number: string; form_data: Json;
          status: 'DRAFT' | 'SAVED' | 'SENT' | 'PARTIAL' | 'SETTLED'; share_token: string | null;
          shared_at: string | null; shared_to_email: string | null; template_id: string;
          msa_id: string | null; msa_response: 'PENDING' | 'ACCEPTED' | 'REVISION ASKED';
          msa_status: 'PENDING' | 'ACCEPTED' | 'REVISION ASKED'; msa_responded_at: string | null;
          client_msa_note: string | null; is_rcm_enabled: boolean;
          applied_payment_terms: number | null; applied_late_fee_rate: number | null;
          applied_license_type: string | null; created_at: string; updated_at: string;
        }
      }
      read_receipts: {
        Row: {
          id: string; invoice_id: string; viewed_at: string; viewer_ua: string | null;
          viewer_ip: string | null;
        }
      }
      faqs: {
        Row: {
          id: string; category: string; question: string; answer: string;
          is_published: boolean; display_order: number | null; created_at: string;
        }
      }
      user_feedback: {
        Row: {
          id: string; user_id: string | null; type: 'bug' | 'feature' | 'general';
          message: string; status: 'new' | 'reviewed'; created_at: string;
        }
      }
    }
  }
}
```

## 5. AUTH & SECURITY
- **Auth provider:** Supabase Auth
- **Session strategy:** Database-backed sessions accessed via JWT (`@supabase/ssr` cookies strategy).
- **Middleware files:** `proxy.ts` (Renamed from `middleware.ts` per KT.md notes). Protects `/invoices` and `/invoice` paths.
- **API rate limiting:** Upstash Redis is used for rate limiting (e.g., in `/api/share-invoice`).
- **CORS/CSP config:** `next.config.ts` enforces strict security headers: `Strict-Transport-Security`, `X-Frame-Options` (SAMEORIGIN), `X-Content-Type-Options` (nosniff), `Referrer-Policy`, and strict `Permissions-Policy`.

## 6. FRONTEND ARCHITECTURE
- **Component library:** Custom UI components built natively (no Shadcn library imports found; generic HTML elements wrapped in functional components).
- **Styling approach:** Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS variables for design tokens.
- **State management:** Native React state (`useState`, `useEffect`) heavily leveraged. No Zustand, Jotai, or Context APIs detected in core loops.
- **Form handling:** Native React state with controlled components.
- **Data fetching:** Supabase Client via standard `useEffect` hooks and Next.js server component async fetches.
- **Animation library:** Framer Motion (`framer-motion` v12).

## 7. KEY COMPONENT INVENTORY
- **`InvoiceEditorPage`** (`components/invoice/InvoiceEditorPage.tsx` | ~3000+ lines)
  - Props: None (Route-level component)
  - Description: The core monolithic container component for the entire invoice drafting flow.
- **`ClientDetailsSection`** (`components/invoice/ClientDetailsSection.tsx` | ~800+ lines)
  - Props: `interface ClientDetailsSectionProps { value: ClientDetails; onChange: (v: ClientDetails) => void; /* ... */ }`
  - Description: Form section handling client metadata, MSA attachment, and address entry.
- **`DeliverablesSection`** (`components/invoice/DeliverablesSection.tsx` | ~900+ lines)
  - Props: `interface DeliverablesSectionProps { value: DeliverablesData; onChange: (v: DeliverablesData) => void; /* ... */ }`
  - Description: Interactive line-item editor for services rendered, including tax rate selection.
- **`TermsPaymentSection`** (`components/invoice/TermsPaymentSection.tsx` | ~750+ lines)
  - Props: `interface TermsPaymentSectionProps { value: TermsPaymentData; onChange: (v: TermsPaymentData) => void; /* ... */ }`
  - Description: Bank details, UPI, and terms input section.
- **`BriefIntakeCard`** (`components/invoice/BriefIntakeCard.tsx` | ~400+ lines)
  - Props: `interface BriefIntakeCardProps { onExtracted: (data: Partial<InvoiceFormData>) => void; /* ... */ }`
  - Description: AI-powered document/text dropzone for automatic invoice field extraction.
- **`BentoFeatureGrid`** (`components/landing/BentoFeatureGrid.tsx` | 153 lines)
  - Props: None
  - Description: Marketing component displaying the platform's architectural features using Framer Motion.

## 8. BACKEND / API ROUTES
- **`/api/auth/callback`** (`app/api/auth/callback/route.ts`)
  - Method: GET | Auth: Public
  - Purpose: Exchange Supabase Auth codes for sessions.
- **`/api/brief-extract`** (`app/api/brief-extract/route.ts`)
  - Method: POST | Auth: Protected
  - Input: FormData (Files or text) | Output: JSON (Extracted brief data)
  - Services: OpenAI API
- **`/api/invoice/request-milestone`** (`app/api/invoice/request-milestone/route.ts`)
  - Method: POST | Auth: Protected
  - Services: Resend API, Supabase
- **`/api/share-invoice`** (`app/api/share-invoice/route.ts`)
  - Method: POST | Auth: Protected
  - Input: Invoice ID, Target Email | Output: Success/Error JSON
  - Services: Resend API, Upstash Redis
- **`/api/cron/check-invoices`** (`app/api/cron/check-invoices/route.ts`)
  - Method: GET/POST | Auth: Protected via `CRON_SECRET`
  - Purpose: Background job to check stale invoices and send reminders via Resend.
- **`/api/track-view`** (`app/api/track-view/route.ts`)
  - Method: POST | Auth: Public
  - Input: Invoice Token, Viewer Data
  - Purpose: Logs read-receipts into Supabase.

## 9. EXTERNAL INTEGRATIONS
- **Supabase:** Authentication and Database (`@supabase/supabase-js`, `@supabase/ssr`). Wired up across all API routes and client components.
- **OpenAI:** Used in `/api/brief-extract` for AI brief parsing (`OPENAI_API_KEY`). Wired up.
- **Resend:** Used for outgoing emails in sharing and cron tasks (`RESEND_API_KEY`). Wired up.
- **Upstash Redis:** Used for rate limiting API endpoints (`@upstash/ratelimit`). Wired up.
- **Tesseract.js:** Used for OCR parsing in the brief extraction flow. Wired up.
- **Playwright:** E2E visual and functional testing suite. Wired up.

## 10. UX FLOWS (CRITICAL SECTION)
**A) New user signup → first invoice created → invoice sent**
1. User visits `/login` and authenticates via Supabase Auth.
2. Next.js proxy redirects authenticated user to `/invoices` (Dashboard).
3. User clicks "Create Invoice" and lands on `/invoice/new` (`InvoiceEditorPage`).
4. User drops a brief into `BriefIntakeCard`, which hits `/api/brief-extract` and autofills the form.
5. User steps through Client, Deliverables, and Terms sections, state updates locally.
6. User clicks Save, persisting data to Supabase `invoices` table.
7. User clicks Share, opening `ShareLinkModal`, which calls `/api/share-invoice` to send an email via Resend.

**B) Returning user → loads dashboard → edits existing invoice → resends**
1. User visits `/invoices`, Supabase client fetches their existing `invoices`.
2. User selects an invoice and clicks Edit, routing them to `/invoice/new` with pre-filled state.
3. User modifies `DeliverablesSection` data, local `useState` is updated.
4. User hits Save, Supabase updates the specific row.
5. User copies the `share_token` link or emails it again via the Share Modal.

**C) Client receives invoice link → views → pays via UPI**
1. Client clicks email link, lands on `/view/[token]` (Public Viewer).
2. Page mounts, `useEffect` triggers `/api/track-view` to log their IP/UA into `read_receipts`.
3. Client reviews MSA and invoice totals rendered securely on the server.
4. Client accepts MSA (triggers `/api/msa-response`).
5. Client scans the dynamically generated QR code (rendering UPI intent strings) and pays externally.

## 11. CURRENT LANDING PAGE STRUCTURE
Located in `app/page.tsx` (281 lines):
1. **`AppHeader`**: Top navigation and auth states.
2. **Hero Section**: Contains `InteractiveHeroGraphic` and Framer Motion animated geometries.
3. **`BentoFeatureGrid`**: Grid showcasing features (imports `/components/landing/BentoFeatureGrid.tsx`).
4. **CTA Banner**: Bottom section encouraging signup ("Start invoicing with precision").
5. **Footer**: Simple copyright and legal links.
6. **Sample Invoice Lightbox**: Conditional rendering wrapper to preview a mock invoice (`/lance-invoice-mockup.png`).

## 12. KNOWN ISSUES / TECH DEBT
- `audits/migration-todo-map.md`: Contains a `# Migration TODO Map` indicating ongoing refactoring or version migrations.
- Build Warning: `⚠️ Upstash Redis environment variables are missing. Ratelimiting will be disabled.` during build indicates production config needs parity.
- Renamed Middleware (`proxy.ts`): The project uses `proxy.ts` instead of `middleware.ts` for routing logic.

## 13. TEST COVERAGE
- **Test frameworks in use:** Playwright (UI testing) and `tsx` scripts for benchmark/compliance runs.
- **Total test file count:** 46 files (including visual snapshots).
- **Key Test Suites:** 
  - `tests/e2e/invoice-editor-visual.spec.ts` (Visual regression testing for editor states).
  - `tests/compliance/run-gst-compliance-tests.ts` (Validating GST math and RCM logic).
  - `tests/extraction/run-brief-extraction-benchmark.ts` (Testing OpenAI parsing accuracy).
- **Status:** Test results folder exists (`test-results/`), indicating tests are run actively.

## 14. BUILD & DEPLOY HEALTH
- **Build Status:** Successfully builds. `next build` executed in 322ms for generating static pages.
- **TypeScript strict mode:** Enabled by default.
- **ESLint config:** Standard `eslint-config-next` applied.
- **Build Warnings:** "Upstash Redis environment variables are missing" prevents Ratelimiting. Next.js optimizes standard pages successfully.

## 15. OPEN QUESTIONS FOR REVIEWER
1. **Form State Management:** `InvoiceEditorPage.tsx` uses native React `useState` for a massive form object (over 80kb file size). Given the complexity, should this be migrated to `react-hook-form` + `zod` for performance and easier validation, or `Zustand` to decouple state from the view?
2. **Middleware Implementation:** `KT.md` mentions `middleware.ts` was renamed to `proxy.ts`. Next.js strictly expects `middleware.ts` at the root for Edge proxying. Is `proxy.ts` actually functioning as a middleware, or is it broken/bypassed on Vercel deployments?
3. **Component Monoliths:** Several sections (like `ClientDetailsSection` and `DeliverablesSection`) are massive monolithic components containing sub-modals, data-fetching, and complex layout logic. Should we adopt a more aggressive composition pattern?
4. **Rate Limiting Fallback:** If Upstash variables are missing, the API disables rate limits entirely. Should we implement an in-memory fallback for standard deployments to prevent abuse?
