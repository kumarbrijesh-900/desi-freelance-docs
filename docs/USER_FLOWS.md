# LanceInvoice User Flows

This document details the end-to-end user-facing flows across the LanceInvoice platform, explicitly mapped to the actual codebase logic and behavior.

---

## Flow 1: New User Signup → Onboarding → First Invoice

**1. Authentication:**
- An unauthenticated visitor lands on `/` or `/login` (`app/login/page.tsx`).
- Clicking "Sign in with Google" triggers Supabase OAuth integration (`app/login/page.tsx:L120`).
- The OAuth callback is processed by `app/api/auth/callback/route.ts`, which exchanges the code for a Supabase session and redirects the user into the app.

**2. Onboarding:**
- New users without a complete profile are routed to `app/onboarding/page.tsx`.
- The onboarding flow collects the agency's baseline configuration, including:
  - Agency Name, Location (City/State), Address, GSTIN (if registered), and Logo (`app/onboarding/page.tsx:L120`).
- The system automatically assigns **"Sniper Defaults"** to the profile:
  - Payment Terms: Net 15 days
  - Late Fee: 1.5% monthly
  - IP Trigger: Upon full payment (mapped to "full-assignment" license) (`components/invoice/ClientDetailsSection.tsx:L68-L74`).
- Once submitted, this data is saved to the `user_profiles` table via Supabase RPCs/client (`app/onboarding/page.tsx:L160`).

**3. First Invoice Creation:**
- Upon successful onboarding, the user is redirected to the `/invoices` dashboard (`app/onboarding/page.tsx:L175`).
- Clicking "Create Invoice" navigates to `/editor` which loads `components/invoice/InvoiceEditorPage.tsx`.
- The editor initializes with a blank state hydrated with the agency's default data pulled from their profile.

---

## Flow 2: AI Brief Extraction (Screenshot/Text → Editor)

**1. Initiation:**
- Within the editor, the user can open the `BriefIntakeCard` (`components/invoice/BriefIntakeCard.tsx:L268`).
- They can provide a written text brief (`components/invoice/BriefIntakeCard.tsx:L288`), upload screenshots (PNG/JPG) (`components/invoice/BriefIntakeCard.tsx:L338`), or use voice (currently marked as mocked/future) (`components/invoice/BriefIntakeCard.tsx:L351`).

**2. Extraction Request:**
- Clicking "Extract & Autofill" fires a request to `app/api/brief-extract/route.ts` (`components/invoice/BriefIntakeCard.tsx:L127`).
- The API handler enforces Supabase session validation and Upstash rate limiting (`app/api/brief-extract/route.ts:L30`).
- It leverages `@ai-sdk` (e.g., `generateObject`) with a specific schema defined in `lib/ai-brief-extractor.ts:L300` to parse 34 deep matrix fields covering agency details, client details, line items, and payment terms.

**3. State Hydration:**
- The resulting structured JSON is processed by `hydrateInvoiceFormFromParsedExtraction` (`lib/invoice-parsed-extraction-hydration.ts:L50`).
- It intelligently merges the extracted data into the `InvoiceFormData` state, retaining existing user inputs where appropriate and auto-filling the relevant stepper sections (`components/invoice/InvoiceEditorPage.tsx:L735`).

---

## Flow 3: GST Math & Compliance (LUT vs No LUT, SEZ, International)

This logic is centralized in `lib/invoice-tax.ts` (`calculateTax()`) and `lib/invoice-calculations.ts` (`calculateInvoiceTotals()`).

**1. GST Registration Check:**
- If the agency is **NOT** GST registered (`gstRegistered === false`), `Total Tax = 0` (Type: `NONE`) (`lib/invoice-tax.ts:L29`).

**2. International Clients:**
- If LUT is available (`lutAvailability === "yes"`): `Total Tax = 0` (`lib/invoice-tax.ts:L37`).
- If no LUT is available (`noLutTaxHandling === "add-igst"`): `IGST = subtotal * rate`, `Total Tax = IGST` (`lib/invoice-tax.ts:L44`).
- Otherwise: `Total Tax = 0` (`lib/invoice-tax.ts:L54`).

**3. Domestic SEZ Units:**
- Treated as interstate/exports.
- If LUT available: `Total Tax = 0` (`lib/invoice-tax.ts:L61`).
- If no LUT: `IGST = subtotal * rate`, `Total Tax = IGST` (`lib/invoice-tax.ts:L68`).

**4. Standard Domestic Clients (Non-SEZ):**
- **Intrastate (Agency State == Client State):** Splits the tax rate in half (`lib/invoice-tax.ts:L84`). 
  - `CGST = subtotal * (rate / 2)`
  - `SGST = subtotal * (rate / 2)`
  - `Total Tax = CGST + SGST`
- **Interstate (Agency State != Client State):** 
  - `IGST = subtotal * rate` (`lib/invoice-tax.ts:L96`)
  - `Total Tax = IGST`

*Note: Missing or invalid states fall back to `Total Tax = 0` (`lib/invoice-tax.ts:L77`).*
*Note: UNCLEAR — needs founder clarification on the exact behavior of state-based GST calculations when LUT metadata is missing or partial.*

---

## Flow 4: Invoice Sharing (MSA Gating vs Direct Link)

**1. Configuration:**
- After finalizing the invoice, the user clicks "Share" to open `components/invoice/ShareLinkModal.tsx:L115`.
- The modal allows sending the invoice directly or **gating it behind a Master Service Agreement (MSA)** (`components/invoice/ShareLinkModal.tsx:L284`).
- If MSA gating is chosen, the user selects an active MSA from their library, or the system auto-selects the default active MSA (`components/invoice/ShareLinkModal.tsx:L153`).

**2. Sending the Link:**
- A POST request is sent to `app/api/share-invoice/route.ts` with `invoiceId`, `clientEmail`, and the optional `msaId` (`components/invoice/ShareLinkModal.tsx:L178`).
- The route generates a secure 12-byte random `share_token` (if one doesn't exist) and updates the invoice record (`status: "SENT"`, `shared_to_email`, `msa_id`) (`app/api/share-invoice/route.ts:L100`).
- **Crucial Detail:** The raw link is NEVER returned to the UI. Instead, the route uses `Resend` to deliver an HTML email directly to the client containing the secure link (`/view/[token]`) (`app/api/share-invoice/route.ts:L130`).
- An in-app notification (`invoice_sent`) is recorded for the agency owner (`app/api/share-invoice/route.ts:L196`).

---

## Flow 5: Client MSA Workflow (Accept vs Propose Changes)

**1. Client Access:**
- The client clicks the link in their email, opening `app/view/[token]/page.tsx:L26`.
- If the invoice is MSA-gated and the status is `PENDING` or `REVISION ASKED`, the actual invoice preview is **blurred** and visually locked (`app/view/[token]/page.tsx:L528`).

**2. Reviewing Terms:**
- The client is presented with a summary of the enforced terms (Payment, Late Fee, IP Rights, Jurisdiction) and the full text of the custom MSA (if provided) (`app/view/[token]/page.tsx:L302`).
- Any project-specific deviations (Addendums) are clearly highlighted (`app/view/[token]/page.tsx:L374`).

**3. Client Actions:**
- **Acceptance:** 
  - Client clicks "Accept" (`app/view/[token]/page.tsx:L439`).
  - POST to `app/api/msa-response/route.ts:L12` with `response: "ACCEPTED"`.
  - The invoice `msa_status` updates to `ACCEPTED` (`app/api/msa-response/route.ts:L30`).
  - The blurred overlay is removed, granting full view/print access to the invoice.
  - The agency owner receives an email and in-app notification of the approval (`app/api/msa-response/route.ts:L88`).
- **Proposing Changes:**
  - Client clicks "Propose Changes" and enters a note (`app/view/[token]/page.tsx:L454`).
  - POST to `app/api/msa-response/route.ts` with `response: "REVISION ASKED"` and the `note` (`app/view/[token]/page.tsx:L142`).
  - The invoice remains locked.
  - The agency owner receives an email and in-app notification detailing the proposed changes, requiring them to renegotiate/reissue the invoice (`app/api/msa-response/route.ts:L65`).

---

## Flow 6: Deliverables & Milestones

Managed via `components/invoice/DeliverablesSection.tsx`.

**1. Standard Line Items:**
- Users add items, specifying Type, Description, Quantity, Rate, and Rate Unit (`components/invoice/DeliverablesSection.tsx:L162`).
- The `sacCode` (Services Accounting Code) is automatically resolved based on the selected Type via `lib/invoice-sac.ts`. Some types require manual SAC entry (`components/invoice/DeliverablesSection.tsx:L139`).

**2. Milestone Sections:**
- Users can insert a "Milestone Section" header by clicking "Add Milestone Section" (`components/invoice/DeliverablesSection.tsx:L178`).
- This creates a specialized line item (`is_milestone_header: true`, `qty: 0`, `rate: 0`) (`components/invoice/DeliverablesSection.tsx:L189`).
- The UI dynamically calculates and displays a **"Section Subtotal"** for all standard line items that fall *beneath* a milestone header until the next header is encountered (`components/invoice/DeliverablesSection.tsx:L311`).
- When viewing the final invoice, the client sees these milestone subtotals and a prompt to "PLEASE PAY RELEVANT MILESTONE SUBTOTAL" (`app/view/[token]/page.tsx:L611`).

---

## Flow 7: Background Cron Jobs (Invoices & Reminders)

**1. Trigger:**
- A cron job is scheduled via `vercel.json` to hit `app/api/cron/check-invoices/route.ts` daily at 02:00 UTC.
- The route is protected by a `CRON_SECRET` authorization header (`app/api/cron/check-invoices/route.ts:L15`).

**2. Execution:**
- The script queries Supabase for active, unpaid invoices (`SENT`, `VIEWED`, `OVERDUE`) (`app/api/cron/check-invoices/route.ts:L45`).
- It evaluates the `due_date` against the current date.
- **Reminders:** Using `Resend`, it dispatches automated email reminders to clients for invoices that are approaching their due date or are actively overdue (`app/api/cron/check-invoices/route.ts:L120`).
- **Spam Prevention:** It updates tracking columns (e.g., `reminder_sent_at`) on the invoice records to ensure clients are not repeatedly spammed on subsequent cron runs (`app/api/cron/check-invoices/route.ts:L160`).

---

## Flow 8: Read Receipts & Owner Notifications

**1. View Tracking:**
- When a client loads the public view page (`app/view/[token]/page.tsx`), a silent `POST` is sent to `app/api/track-view/route.ts` (`app/view/[token]/page.tsx:L86`).
- The request includes the `invoiceId` and the browser's `userAgent`.

**2. Recording the Receipt:**
- The API inserts a new row into the `read_receipts` table (`app/api/track-view/route.ts:L25`).
- It then counts the total number of views for that invoice (`app/api/track-view/route.ts:L31`).

**3. Owner Notification:**
- If the count equals exactly `1` (meaning this is the **first** time the client has opened the link), the API queries the invoice details and inserts a new row into the `notifications` table (`type: "invoice_viewed"`) (`app/api/track-view/route.ts:L46`).
- This triggers an in-app alert for the agency owner, letting them know the client has successfully accessed the invoice.
- *Note: UNCLEAR — needs founder clarification on the exact behavior of the "Rush Invoice" override path logic referenced elsewhere.*
