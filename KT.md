# Knowledge Transfer (KT) - DesiFreelanceDocs / Klapped Invoice Engine

## 1. Project Inception & Legacy Architecture
The project originated as a broader document generation toolkit bootstrap. Historically, the application featured a complex "Document Wizard" workflow housed under `/create`, leveraging `components/flow/*` and `types/document.ts` to build out various generic documents.
- **Legacy Flow:** Relied heavy on `/api/extract` for complex structured text dumps.
- **Current Status:** **FROZEN**. As per the canonical roadmap, the old document-generation stack is completely deprecated. We are strictly converging on an **Invoice-First Architecture**.

## 2. The Pivot: AI-First Invoice Generation
The platform's core directive was refined to solve a highly specific latency gap: helping creative freelancers generate 100% compliant, GST/Tax-ready invoices in under 10 seconds.
- Instead of forcing users to manually enter dense tax tables (CGST, SGST, IGST, LUT codes, PAN lookups), the platform was redesigned around a single "AI Brief Intake".
- **Canonical Flow:** User provides a raw brief ("Designed 3 website landing pages for Metro Shoes for $4,500 via wire transfer") -> `/api/brief-extract` parses this via LLM -> The structured data automatically hydrates `InvoiceFormData`.

## 3. Core Technical Implementations & Workflows

### The Stepper Architecture (Cognitive Load Reduction)
The vertical, infinitely-scrolling form structure was scrapped. It was overwhelming. We built a robust **"One Modal at a Time"** stepper in `InvoiceEditorPage.tsx`:
- The UI holds context on the left (Topological Desktop Support Rail) displaying exactly where the user is (Agency → Client → Deliverables → Payment → Meta → Totals).
- A full-screen "Extraction Loader" takeover cleanly masks the UI while the backend AI (`/api/brief-extract`) does the heavy lifting, dropping the user directly into validation mode when done.

### Design System & Visual Re-Architecture
The brand identity shifted to a "Pro Max" / Neo-Glassmorphic aesthetic targeting high-end creative professionals.
- **Tokens Mapping (`globals.css`):** Utilizing a deep "Space Indigo" / "Midnight Stripe" primary (`#383861`) coupled with warm parchment backgrounds (`#f7f1ee`).
- **Geometry Override:** Stripped out brutalist, sharp 0px borders. Universally applied approachable, premium 12px & 16px soft radii.
- **Forms & Validation:** Missing form fields traditionally used jarring, low-contrast solid yellow backgrounds. This was stripped. Instead, empty required fields sit tightly on standard `var(--color-surface)` (`#ffffff`) but utilize an aggressive, pulsing CSS keyframe `box-shadow` called the "Amber Glow" (`missing-field-glow`) to loudly indicate user intervention is required.
- **Contrast Integrity:** Corrected cascaded CSS specificity errors in button generation (`ui-foundation.ts:getAppButtonClass`) by firmly binding tailwind `text-white` to primary components.

### UI Rendering & Performance Optimizations
- **Choppy Nested Animations Fixed:** Highly dynamic nested form blocks (like toggling GST registration states exposing PAN/LUT fields inside `AgencyDetailsSection.tsx`) were previously wrapped in `framer-motion`'s `<AnimatePresence>`. These layout-shifting height transitions were incredibly shaky for users. They have been stripped safely and migrated to rigid React conditional (`&&`) evaluations, ensuring instantaneous, confident DOM paints.

### Safe State Persistence & Ghost-Draft Handling
- The editor seamlessly utilizes LocalStorage (`DRAFT_STORAGE_KEY`) to persist session state on unmounts and intentional Draft saves.
- **Crucial Override:** To prevent "Zombie Drafts," an interceptor was deployed on the `ExitConfirmModal`. If a user manually drops out of an invoice attempt and clicks "Skip" to discard, the platform strictly calls `window.localStorage.removeItem(DRAFT_STORAGE_KEY)` safely returning them to `/` so the next invoice generation session boots cleanly.

## 4. Platform Infrastructure

### Authentication Layer
- Integrated Supabase (`@/lib/supabase/client`).
- Single-click OAuth onboarding live via `app/login/page.tsx` ("Continue with Google" securely tied to `.app-soft-button-primary` styling).

### Data Modeling
- Custom logic built internally (`getInvoiceDisplayCurrency`, `getSuggestedDueDate`, `evaluateStateSignals`) guarantees robust logic fallbacks if the AI engine misses context.
- Cross-state IGST computations and domestic SGST/CGST splitting operate mathematically via frontend safety bounds in `calculateInvoiceTotals`.

## 5. Pending & Roadmap (To-Dos)

1. **Deploy Pipeline Configuration:**
   - Validate and ensure `.env.production` in Vercel securely inherits the active `GROQ_API_KEY` (or chosen LLM provider) mirroring the edge architecture built in `brief-extract/route.ts`. Local `.env` is solid, but cloud lambda provisioning needs regression testing.
   
2. **Legacy Cleanup (`/create` Deprecation):**
   - Safely archive and totally purge the `components/flow/*` and `/create` directories. Though frozen successfully, their physical removal will reduce repo bloat prior to stable v1 launch.

3. **Backend Invoice Publishing Check:**
   - Supabase schema migrations for saving finalised invoice blobs. The `InvoiceEditorPage.tsx` manages standard forms brilliantly, but hitting "Preview" pushes to a static view. Generating the final PDF chunk / writing to the Supabase Postgres Database upon "Finalize & Export" is the ultimate last step for the core engine loop.

4. **Legal Compliance Checks:**
   - Ensuring Terms & Privacy placeholders (traditionally held tightly before Vercel release) accurately reflect the AI Data Processing constraints tied to the user prompts submitted to the LLMs.

5. **Extended Input Vectors (Future Bet):**
   - Building native Web Audio API hooks into `BriefIntakeCard.tsx` so users can literally speak their invoice terms rather than typing them.
