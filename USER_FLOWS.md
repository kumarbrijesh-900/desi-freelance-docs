# LanceInvoice — User Flows

> **Purpose:** End-to-end documentation of every user-facing flow in LanceInvoice. Read this when working on any specific flow. Companion to `PROJECT_OPERATING_MANUAL.md`.
>
> **Last updated:** April 27, 2026
> **Source:** Antigravity codebase analysis + founder clarifications
> **Note:** File:line references are from the date above. They may drift over time. Trust the code over this document if conflicts arise.

---

## Flow 1: New User Signup → Onboarding → First Invoice

### 1. Authentication
- An unauthenticated visitor lands on `/` or `/login` (`app/login/page.tsx`)
- Clicking "Sign in with Google" triggers Supabase OAuth (`app/login/page.tsx:L120`)
- The OAuth callback is processed by `app/api/auth/callback/route.ts`, which exchanges the code for a Supabase session and redirects into the app

### 2. Onboarding
- New users without a complete profile are routed to `app/onboarding/page.tsx`
- The onboarding flow collects the agency's baseline configuration:
  - Agency Name, Location (City/State), Address, GSTIN (if registered), Logo (`app/onboarding/page.tsx:L120`)
- The system automatically assigns **"Sniper Defaults"** to the profile:
  - Payment Terms: Net 15 days
  - Late Fee: 1.5% monthly
  - IP Trigger: Upon full payment (mapped to "full-assignment" license)
  - Reference: `components/invoice/ClientDetailsSection.tsx:L68-L74`
- Once submitted, data is saved to the `user_profiles` table (`app/onboarding/page.tsx:L160`)

### 3. First Invoice Creation
- After onboarding, user is redirected to `/invoices` dashboard (`app/onboarding/page.tsx:L175`)
- Clicking "Create Invoice" navigates to `/editor` which loads `components/invoice/InvoiceEditorPage.tsx`
- The editor initializes with a blank state hydrated with the agency's default data pulled from their profile

### Risk areas
- 🟡 Master data sync — if onboarding fails partway, the agency's defaults won't be available for invoice creation, breaking downstream flows

---

## Flow 2: AI Brief Extraction (Screenshot/Text → Editor)

### 1. Initiation
- Within the editor, the user opens the `BriefIntakeCard` (`components/invoice/BriefIntakeCard.tsx:L268`)
- Three input modes:
  - Written text brief (`BriefIntakeCard.tsx:L288`)
  - Screenshot upload, PNG/JPG (`BriefIntakeCard.tsx:L338`)
  - Voice (currently mocked / future) (`BriefIntakeCard.tsx:L351`)

### 2. Extraction Request
- "Extract & Autofill" fires a request to `app/api/brief-extract/route.ts` (`BriefIntakeCard.tsx:L127`)
- API handler enforces:
  - Supabase session validation (returns 401 if unauthenticated)
  - Upstash rate limiting (returns 429 on abuse)
  - Whitelist check (locked to founder's account ID — implementation unverified)
- Schema-driven extraction parses ~34 fields covering agency, client, line items, payment terms (`lib/ai-brief-extractor.ts:L300`)

### 3. State Hydration
- Resulting structured JSON is processed by `hydrateInvoiceFormFromParsedExtraction` (`lib/invoice-parsed-extraction-hydration.ts:L50`)
- Intelligently merges extracted data into `InvoiceFormData` state, retaining existing user inputs where appropriate (`InvoiceEditorPage.tsx:L735`)

### 🚨 Reality check (April 27, 2026)
- Brief extraction has **never worked in production**. OpenAI account has zero credits.
- The `OPENAI_API_URL = "https://api.openai.com/v1/responses"` is hardcoded at line 105 of `lib/ai-brief-extractor.ts`.
- Antigravity's prior description mentioned `@ai-sdk` / `generateObject` — this may be aspirational or stale; the actual implementation calls OpenAI's REST API directly.
- See `PROJECT_OPERATING_MANUAL.md` Section 6 for the migration path discussion.

### Risk areas
- 🟡 Field mapping accuracy — if extraction returns confidently wrong values, the user accepts them and ships incorrect invoices

---

## Flow 3: GST Math & Compliance (LUT vs No LUT, SEZ, International)

🔴 **CRITICAL FLOW — silent data corruption risk if broken.**

Logic centralized in `lib/invoice-tax.ts` (`calculateTax()`) and `lib/invoice-calculations.ts` (`calculateInvoiceTotals()`).

### Decision tree

**1. GST Registration Check**
- If agency is NOT GST registered (`gstRegistered === false`):
  - `Total Tax = 0` (Type: `NONE`)
  - Reference: `lib/invoice-tax.ts:L29`

**2. International Clients**
- If LUT is available (`lutAvailability === "yes"`):
  - `Total Tax = 0`
  - `lib/invoice-tax.ts:L37`
- If no LUT, but `noLutTaxHandling === "add-igst"`:
  - `IGST = subtotal * rate`
  - `Total Tax = IGST`
  - `lib/invoice-tax.ts:L44`
- Otherwise:
  - `Total Tax = 0`
  - `lib/invoice-tax.ts:L54`

**3. Domestic SEZ Units** (treated as interstate/exports)
- If LUT available:
  - `Total Tax = 0`
  - `lib/invoice-tax.ts:L61`
- If no LUT:
  - `IGST = subtotal * rate`
  - `Total Tax = IGST`
  - `lib/invoice-tax.ts:L68`

**4. Standard Domestic Clients (Non-SEZ)**
- **Intrastate (Agency State == Client State):**
  - `CGST = subtotal * (rate / 2)`
  - `SGST = subtotal * (rate / 2)`
  - `Total Tax = CGST + SGST`
  - `lib/invoice-tax.ts:L84`
- **Interstate (Agency State != Client State):**
  - `IGST = subtotal * rate`
  - `Total Tax = IGST`
  - `lib/invoice-tax.ts:L96`

### Edge cases
- Missing or invalid states fall back to `Total Tax = 0` (`lib/invoice-tax.ts:L77`)
- ❓ **UNCLEAR** — exact behavior of state-based GST calculations when LUT metadata is missing or partial; needs founder clarification

### Risk areas
- 🔴 Silent miscalculation — wrong tax type chosen → invoice goes out with incorrect amount → client tax filing problems → legal/reputational damage to agency
- **Pre-flight check before any change here:** Run `tests/compliance/run-gst-compliance-tests.ts` before AND after the change

---

## Flow 4: Invoice Sharing (MSA Gating vs Direct Link)

### 1. Configuration
- After finalizing the invoice, user clicks "Share" → opens `components/invoice/ShareLinkModal.tsx:L115`
- Two modes:
  - Direct link (no MSA gate)
  - **MSA-gated** — invoice locked behind contract approval (`ShareLinkModal.tsx:L284`)
- If MSA gating is chosen, user selects an active MSA from their library, OR the system auto-selects the default active MSA (`ShareLinkModal.tsx:L153`)

### 2. Sending the Link
- POST to `app/api/share-invoice/route.ts` with `invoiceId`, `clientEmail`, optional `msaId` (`ShareLinkModal.tsx:L178`)
- Route generates a secure 12-byte random `share_token` (if one doesn't exist) and updates invoice:
  - `status: "SENT"`
  - `shared_to_email: <client email>`
  - `msa_id: <selected msa id>`
  - `app/api/share-invoice/route.ts:L100`
- **Important:** The raw share link is NEVER returned to the UI. Resend delivers the email directly to the client containing the `/view/[token]` link (`app/api/share-invoice/route.ts:L130`)
- An in-app notification (`invoice_sent`) is recorded for the agency owner (`app/api/share-invoice/route.ts:L196`)

### Risk areas
- 🟡 Email delivery — if Resend fails silently, agency thinks invoice was sent but client never gets it
- 🔴 MSA selection — if the wrong MSA gets attached to a high-value invoice, contract enforcement is wrong

---

## Flow 5: Client MSA Workflow (Accept vs Propose Changes)

🔴 **CRITICAL FLOW — legally-binding contract enforcement.**

### 1. Client Access
- Client clicks email link → opens `app/view/[token]/page.tsx:L26`
- If invoice is MSA-gated AND status is `PENDING` or `REVISION ASKED`:
  - Invoice preview is **fully blurred** and visually locked (`app/view/[token]/page.tsx:L528`)

### 2. Reviewing Terms
- Client sees a summary of enforced terms:
  - Payment, Late Fee, IP Rights, Jurisdiction (`app/view/[token]/page.tsx:L302`)
- Plus the full text of the custom MSA (if provided)
- **Project-specific deviations (Addendums)** are clearly highlighted (`app/view/[token]/page.tsx:L374`)

### 3. Client Actions

**Acceptance:**
- Client clicks "Accept" (`app/view/[token]/page.tsx:L439`)
- POST to `app/api/msa-response/route.ts:L12` with `response: "ACCEPTED"`
- Invoice `msa_status` updates to `ACCEPTED` (`app/api/msa-response/route.ts:L30`)
- Blurred overlay is removed; full view/print access granted
- Agency owner gets email + in-app notification (`app/api/msa-response/route.ts:L88`)

**Proposing Changes:**
- Client clicks "Propose Changes", enters a note (`app/view/[token]/page.tsx:L454`)
- POST to `app/api/msa-response/route.ts` with `response: "REVISION ASKED"` and the `note` (`app/view/[token]/page.tsx:L142`)
- Invoice **remains locked** — blur stays
- Agency owner gets email + in-app notification with proposed changes; must renegotiate/reissue (`app/api/msa-response/route.ts:L65`)

### MSA + Addendum mental model

(This is where the "rush mode" terminology came from — there is no separate rush feature.)

- Each agency has a **base MSA** in master data
- Every invoice **inherits** MSA defaults
- In Terms & Payment section, user can override any MSA term for this specific invoice
- System detects the override → treats it as an **Addendum**
- Client sees: base MSA terms + highlighted Addendums in the popup
- Client accepts/rejects the whole package (MSA + Addendums together)

### Risk areas
- 🔴 MSA override misdetection — if system fails to flag an override as an Addendum, client accepts a contract they didn't realize was different from the base MSA
- 🔴 State race condition — if client accepts twice or simultaneously, ensure idempotency

---

## Flow 6: Deliverables & Milestones

Managed via `components/invoice/DeliverablesSection.tsx`.

### 1. Standard Line Items
- Users add items: Type, Description, Quantity, Rate, Rate Unit (`DeliverablesSection.tsx:L162`)
- `sacCode` (Services Accounting Code) is auto-resolved based on Type via `lib/invoice-sac.ts`
- Some types require manual SAC entry (`DeliverablesSection.tsx:L139`)

### 2. Milestone Sections
- Users insert a "Milestone Section" header by clicking "Add Milestone Section" (`DeliverablesSection.tsx:L178`)
- Creates a specialized line item: `is_milestone_header: true`, `qty: 0`, `rate: 0` (`DeliverablesSection.tsx:L189`)
- UI dynamically calculates and displays a **"Section Subtotal"** for all standard line items beneath a milestone header (until the next header is encountered) (`DeliverablesSection.tsx:L311`)

### 3. Client View of Milestones
- On the client-facing invoice, milestone subtotals are shown along with a prompt:
  - *"PLEASE PAY RELEVANT MILESTONE SUBTOTAL"*
  - `app/view/[token]/page.tsx:L611`

### Settlement model (manual, offline-friendly)
- Client pays via UPI/bank transfer/SWIFT — **outside Lance**
- Agency sees payment confirmation in their bank/UPI app
- Agency comes back to Lance, navigates to invoice list
- Clicks **"Milestone 1 settled"** → triggers Milestone 2 to become active billable
- Repeats per milestone
- Clicks **"Final Settlement"** on the last milestone → invoice is closed
- ❓ **UNCLEAR** — exact API endpoint that handles the "settle" action; needs verification in code

### Risk areas
- 🟡 Settlement state corruption — if a settle action fails partway, milestone counter could be wrong
- 🟡 Missed milestone notification — if `request-milestone` doesn't fire correctly, client never knows next payment is due

---

## Flow 7: Background Cron Jobs (Invoices & Reminders)

### 1. Trigger
- Cron scheduled via `vercel.json` to hit `app/api/cron/check-invoices/route.ts` daily at 02:00 UTC
- Route protected by `CRON_SECRET` authorization header (`app/api/cron/check-invoices/route.ts:L15`)

### 2. Execution
- Queries Supabase for active, unpaid invoices (statuses: `SENT`, `VIEWED`, `OVERDUE`) (`app/api/cron/check-invoices/route.ts:L45`)
- Evaluates `due_date` against current date
- **Reminders:** Dispatches automated email reminders via Resend to clients for invoices approaching/past due (`app/api/cron/check-invoices/route.ts:L120`)
- **Spam Prevention:** Updates tracking columns (e.g., `reminder_sent_at`) to prevent repeated nudges (`app/api/cron/check-invoices/route.ts:L160`)

### Risk areas
- 🟡 Spam to clients — if `reminder_sent_at` logic breaks, clients could get hammered with daily reminders
- 🟡 Resend free tier (3K/month) — if a busy month hits this, reminders silently fail

---

## Flow 8: Read Receipts & Owner Notifications

### 1. View Tracking
- When a client loads the public view page (`app/view/[token]/page.tsx`), a silent POST is sent to `app/api/track-view/route.ts` (`app/view/[token]/page.tsx:L86`)
- Request includes `invoiceId` and browser `userAgent`

### 2. Recording the Receipt
- API inserts a new row into the `read_receipts` table (`app/api/track-view/route.ts:L25`)
- Counts total views for that invoice (`app/api/track-view/route.ts:L31`)

### 3. Owner Notification (clever logic)
- If count equals exactly `1` (the **first** time the client opened the link):
  - API queries invoice details
  - Inserts a new row into `notifications` table with `type: "invoice_viewed"` (`app/api/track-view/route.ts:L46`)
- Triggers an in-app alert for the agency owner: *"client has accessed the invoice"*
- Subsequent views increment the counter but DON'T re-notify (good UX, no notification spam)

### Risk areas
- 🟢 Mostly cosmetic — wrong notifications are annoying but don't affect billing correctness

---

## Open Questions for Founder

These came up during code analysis and need explicit clarification:

1. **Settlement API endpoint** — what specific route handles the "Milestone N settled" button click? The `request-milestone` route was found but it appears to NOTIFY the client of the next due milestone, not record settlement. Need to verify which file/endpoint actually mutates invoice status from SENT → PARTIAL → SETTLED.

2. **MSA library management** — how does an agency add new MSAs to their library? Is there a dedicated UI route or is it all derived from invoice creation?

3. **Default MSA loading for new agencies** — what's the source of the "default MSA loaded for new users/agencies"? Is it hardcoded text, a seed file, or fetched from somewhere?

4. **GST calculation when LUT metadata is missing** — does the system error out, fall back to zero tax, or use a different default?

5. **Invoice number generation** — couldn't locate the exact function that generates invoice numbers and ensures sequential ordering. File:line reference needed.

---

*End of user flows document. For high-level rules and project context, see `PROJECT_OPERATING_MANUAL.md`.*
