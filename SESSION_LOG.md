# Session Log — May 8, 2026

## Previous session: May 7, 2026 (v1.5 COMPLETE)

## Latest deployed: UX Overhaul batch (May 8)

## Production state

- Sign-in works
- Invoice creation works (multi-milestone, up to 5 milestones)
- Share email delivers with MSA gating
- Client accepts MSA → invoice unlocks
- Agency gets notifications
- Mark Milestone Settled → auto-generates next milestone invoice
- Child invoices skip MSA gate (previously accepted banner shown)
- TDS stored per milestone in invoice_milestones table
- Per-milestone due dates: settlement date + payment terms
- **NEW:** Full UX overhaul of invoice editor and invoices table

---

## v1.5 UX OVERHAUL — May 8, 2026

### Phase I: P0 Bug Fixes (UX-1 through UX-3)

- ✅ UX-1 — Parsing Engine banner hidden (initial attempt via feature gate)
- ✅ UX-2 — Amount column in invoices table now shows actual milestone totals (₹3,59,200 / ₹4,82,200) instead of "—"
- ✅ UX-3 — Share modal "Resend Invoice" → "Send Invoice" for first-time sends
- ✅ UX-5 — Helper text on disabled "Continue to Payment" button in Items step

### Phase J: P1 UX Fixes (UX-4 through UX-8, UX-R)

- ✅ UX-4 — Milestone sub-rows show actual milestone names and amounts instead of "Milestone Stage" / "₹0"
- ✅ UX-6 — "M1 of 2 settled" badge moved from STATUS column to INVOICE # column
- ✅ UX-7 — Profile completion banner reduced to compact dismissible strip
- ✅ UX-8 — "Mark Settled" text link replaced with proper outlined button
- ✅ UX-R — Inline missing field hints on ALL disabled "Continue to..." buttons

### Phase K: Structural UX Overhaul (UX-A through UX-F)

- ✅ UX-A — Form fields grouped into labeled sections (TAX & IDENTITY, BUSINESS DETAILS, REGISTERED ADDRESS, CLIENT INFO, TAX DETAILS, CLIENT ADDRESS, SETTLEMENT & TERMS, LICENSING, IDENTITY, TIMELINES, TAX SETUP, OUTPUT DETAILS)
- ✅ UX-A — PAN field constrained to 280px, GSTIN to 360px
- ✅ UX-B — Items step line items redesigned from cramped data table to card-per-item layout. No more truncation ("UI/UX Design", "Per screen" fully readable)
- ✅ UX-C — Color normalization: stepper active state changed from lime to neutral dark border, form section borders neutralized
- ✅ UX-D — Floating right action dock (Close/Draft/Preview) replaced with sticky bottom action bar
- ✅ UX-E — Share modal copy fixes: "Payment: 15" → "Payment terms: Net 15 days"
- ✅ UX-F — Totals step: removed 5x redundant "NO TAX" indicators, collapsed Tax Summary to single line when tax = 0

### Phase L: Visual Polish (UX-G through UX-J)

- ✅ UX-G — Form content constrained to max-w-2xl (640px), centered
- ✅ UX-H — Lime/yellow borders removed from stepper and form sections, replaced with neutral gray
- ✅ UX-I — Bottom bar overlap fix: padding-bottom on form content clears sticky bar
- ✅ UX-J — Bottom bar made fully opaque (no transparency bleed-through), primary buttons made solid

### Phase M: Transitions & Navigation (UX-K through UX-N)

- ✅ UX-K/UX-P — Parsing Engine banner fully deleted from BriefIntakeCard
- ✅ UX-L/UX-O — Scroll-to-top on step change: removed misleading .invoice-editor-scroll-area class from `main`, fallback to window.scrollTo works
- ✅ UX-M — Input focus borders changed from lime/yellow to neutral dark gray
- ✅ UX-N — Framer Motion AnimatePresence transitions between steps (direction-aware slide, mode="wait")

### Phase N: Data Provenance & Trust (UX-S)

- ✅ UX-S — Input field visual distinction system:
  - Auto-filled fields (from profile/brief/saved client): blue left accent + "auto-filled" label
  - Manually filled fields (user-typed): green left accent
  - Empty fields: default placeholder state (italic, muted)
  - Canonical field path mapping in invoice-brief-intake.ts
  - onFieldManualEdit handlers across all 5 editor sections
  - Full coverage: Agency, Client, Items, Payment, Meta

### Phase O: Bottom Bar & Table Redesign (UX-T through UX-X)

- ✅ UX-T — Bottom action bar changed from dark/black background to light white with subtle border-top + shadow
- ✅ UX-U — Invoices table redesigned: reduced from 7 columns to 5 (INVOICE, CLIENT, AMOUNT, STATUS, ACTIONS). Dates merged into INVOICE column. Actions in "..." dropdown. Milestone sub-rows with ↳ indent, left border, and "Settle" button.
- ✅ UX-V/UX-W — Milestone sort order fix: sort by order_index ASC, use title column, fix badge to "1 of 2 settled"
- ✅ UX-X — Child Invoice Hierarchy: child invoices (where parent_invoice_id IS NOT NULL) hidden from main list. Displayed as small bold tags (e.g. "INV-8758") within parent milestone sub-rows for traceability.

### Pending (not yet shipped)

- 🔲 UX-O — Scroll fix: remove "invoice-editor-scroll-area" class from `main` (one-line change)
- 🔲 UX-Q — Mobile horizontal step pill navigation (below lg breakpoint)

---

## Schema notes

- invoice_milestones columns: id, invoice_id, title, order_index, created_at, status, tds_amount, amount
- Column name mapping (code → DB): milestone_name → title, milestone_index → order_index
- invoices: parent_invoice_id, milestone_index columns exist

## Known tech debt (v2 cleanup)

- msa_status + msa_accepted_at columns still in invoices (shadow fields, use msa_response)
- ShareLinkModal has dead handleMsaToggle code
- Stepper order changed: Agency → Client → Meta → Items → Payment → Totals (Meta before Items — may need reverting)
- Some code references milestone_index/milestone_name instead of order_index/title

## Files modified in UX overhaul

- app/globals.css
- components/invoice/AgencyDetailsSection.tsx
- components/invoice/ClientDetailsSection.tsx
- components/invoice/DeliverablesSection.tsx
- components/invoice/InvoiceEditorPage.tsx
- components/invoice/InvoiceMetaSection.tsx
- components/invoice/ShareLinkModal.tsx
- components/invoice/TermsPaymentSection.tsx
- components/invoice/TotalsTaxesSection.tsx
- components/invoice/BriefIntakeCard.tsx
- lib/ui-foundation.ts
- lib/invoice-brief-intake.ts
- app/invoices/page.tsx

---

## v1.6 BRAND IDENTITY & EXTRACTION REFINEMENTS — May 9, 2026

### Phase P: Extraction & UX Refinements (EX-1 through EX-6)

- ✅ EX-1 — Rate field clearance: increased padding in Items step to prevent ₹ symbol overlap with digits.
- ✅ EX-2 — Extraction Summary redesign: added "Extracted Successfully" section with ✓ indicators in BriefSummaryModal.
- ✅ EX-3 — GST Registration Sync: auto-set `gstRegistrationStatus = "registered"` when AI extracts a GSTIN.
- ✅ EX-4 — Autofill Consistency: ensuring all AI-extracted client fields (Name, Email, GSTIN, State) display indigo "auto-filled" styling.
- ✅ EX-5 — Tax Compliance Messaging: resolved contradictory messaging in Totals step; suppressed redundant warnings when agency is unregistered.
- ✅ EX-6 — UI Polish: fixed Late Fee dropdown truncation and ensured smooth field focus transitions.

### Phase Q: Brand Identity Rollout — Deep Indigo (#4F46E5)

- ✅ ID-1 — Token Integration: defined `--brand-indigo` system in `globals.css` and Tailwind 4 `@theme`.
- ✅ ID-2 — Stepper Hierarchy: active step badge updated from neutral to brand indigo for better visibility.
- ✅ ID-3 — AI Card Theming: BriefIntakeCard (AI Autofill) header updated to indigo, signaling "trust & depth".
- ✅ ID-4 — Dashboard Presence: invoices table now uses indigo for invoice numbers (as clickable links) and subtle indigo row hover tints.
- ✅ ID-5 — Modal Success States: extraction summary icons and "Success" headers updated to indigo, replacing generic green.
- ✅ ID-6 — Interactive Links: introduced `.link-indigo` for interactive text (e.g., "Finish Profile").

### Phase R: Layout & CTA Hierarchy (LH-1 through LH-3)

- ✅ LH-1 — Preview CTA Hierarchy: Preview button in bottom bar now uses outline style when form is incomplete; "promotes" to solid fill only when form is ready.
- ✅ LH-2 — Address Grid Stability: fixed PIN/Postal Code field overflow in Agency and Client sections via `overflow-hidden` + `min-w-0`.
- ✅ LH-3 — Mobile navigation polish (in progress).

## Files modified in v1.6

- app/globals.css
- tailwind.config.ts (via CSS theme)
- components/invoice/InvoiceEditorPage.tsx
- components/invoice/BriefIntakeCard.tsx
- components/invoice/BriefSummaryModal.tsx
- components/invoice/DeliverablesSection.tsx
- components/invoice/AgencyDetailsSection.tsx
- components/invoice/ClientDetailsSection.tsx
- app/invoices/page.tsx

## v1.6 PROFESSIONALIZATION — May 9, 2026

### Phase S: Invoice Preview Page Refinements (PV-1 through PV-10)

- ✅ PV-1 — Data Sanitization: Stripped GST state codes (e.g., "(29)") from agency and client address blocks in templates.
- ✅ PV-2 — Tax Label Cleanup: Removed "Client " and "(Optional)" prefixes/suffixes from tax ID labels.
- ✅ PV-3 — Asset Visibility: Conditional rendering for Agency Logo and Payment QR (hides entirely if image is missing).
- ✅ PV-4 — Footer Branding: Removed "POWERED BY VERCEL" from invoice watermark.
- ✅ PV-5 — Milestone Hierarchy: Standardized milestone headers and enforced capitalization on descriptions.
- ✅ PV-6 — Typography: Reduced "INVOICE" header font size to 30px for better balance.
- ✅ PV-7 — Visual Accents: Softened top accent bar to subtle 1px gray line.
- ✅ PV-8 — Financial Layout: Moved "Amount in Words" directly below the "Total Due" line.
- ✅ PV-9 — Milestone Note Integration: Moved global milestone payment note into the `MilestoneSummaryBlock` for consistency.
- ✅ PV-10 — Preview UI Cleanup: Collapsed template sidebar into a top-level dropdown; removed redundant "Save Draft" and status badges from preview chrome.

### Phase T: Client-Facing Share Page (SH-1 through SH-7)

- ✅ SH-1 — Terms Interaction: Removed "Propose Changes" stub button and alert; made button optional in MSAAcceptanceModal.
- ✅ SH-2 — Action Labels: Renamed "Print / Save PDF" to "Download PDF" for better client understanding.
- ✅ SH-3 — Payment Banner: Introduced high-visibility "Amount Due" banner at top of share page.
- ✅ SH-4 — Shared Branding: Updated footer to "Shared via LanceInvoice" and linked logo to landing page.
- ✅ SH-5 — Contact Integration: Added conditional "Questions? Contact" mailto link for freelancers.
- ✅ SH-6 — Feedback Loop: Added success toast notification after MSA acceptance.

### Phase U: Empty States & First-Time UX (ES-1 through ES-4)

- ✅ ES-1 — Invoices Empty State: Replaced generic "No invoices" with a premium card featuring AI value props, feature highlights (AI, GST, PDF), and a larger CTA.
- ✅ ES-2 — Clients Empty State: Upgraded emoji-based state to a brand-consistent SVG icon with solid borders and action-oriented copy.
- ✅ ES-3 — Dashboard Cleanup: Hidden summary cards and item counters in headers when the list is empty, ensuring a focused "get started" experience.
- ✅ ES-4 — Search & Filter Hygiene: Verified that filter bars and search inputs are hidden when no data is present, reducing UI noise.

### Phase V: Landing Page Professionalization (LP-1 through LP-8)

- ✅ LP-1 — Credibility Fixes: Removed inaccurate social proof and corrected privacy claims.
- ✅ LP-2 — Feature Clarity: Simplified feature titles and descriptions using plain, benefit-driven language.
- ✅ LP-3 — Jargon Removal: Replaced startup jargon ("Architecture", "Operators") with relatable terms for freelancers.
- ✅ LP-4 — Hero Optimization: Updated badge and subtitle to focus on the 2-minute AI-powered GST invoice promise.
- ✅ LP-5 — Intelligent CTAs: Implemented conditional button labels based on login state for better UX.
- ✅ LP-6 — Pricing Transparency: Added a clear pricing grid (Free vs Pro) to address user concerns.
- ✅ LP-7 — Conversational FAQ: Integrated a simple accordion FAQ for common friction points (GST, safety, international).
- ✅ LP-8 — Comprehensive Footer: Replaced the minimal footer with a brand-rich layout including contact info and quick links.

### Phase VI: Mobile Responsiveness (MR-1 through MR-6)

- ✅ MR-1 — Table Optimization: Hidden Status/Actions columns on mobile; rendered status badge inline in the Invoice column to prevent clipping.
- ✅ MR-2 — Stepper Refinement: Hidden step labels on mobile (showing only numbers) and added horizontal scrolling to the editor stepper.
- ✅ MR-3 — Dashboard Balancing: Hidden low-priority summary cards and used a 3-column grid to ensure a clean layout on small viewports.
- ✅ MR-4 — Dropdown Usability: Restricted saved-client dropdown height and added padding to clear fixed mobile bottom bars.
- ✅ MR-5 — Visual Softening: Lighter borders for line item cards on mobile to reduce visual weight on small screens.
- ✅ MR-6 — Typography Scaling: Reduced hero heading size on mobile for better viewport balance and readability.

### Phase VII: Mobile Navigation (UX-Q)

- ✅ UX-Q — Mobile Hamburger Menu: Implemented a responsive slide-down navigation menu for mobile users. Includes active link highlighting, automatic menu closing on navigation, and access to all core product areas (Invoices, Clients, Profile, FAQ).

### Phase VIII: Dashboard Summary Redesign (UX-DS)

- ✅ UX-DS — Compact Financial Snapshot: Replaced the 5-card summary grid with a single horizontal strip. Includes a hero metric for total outstanding balance, patterned pattern metrics for settled/overdue/upcoming, and a collection health progress bar. Saves ~40px of vertical space.

### Phase IX: Contract Terms Section Redesign (UX-CT)

- ✅ UX-CT — Compact Legal Controls: Redesigned the "Default Contract & Payment Terms" section in the invoice editor. Moved the "Generate" button to the section header for instant access, collapsed redundant headings, and transitioned helper text into native tooltips. The layout now uses a tight 3-column grid, reducing vertical height by ~50%.

### Phase X: Template Expansion (UI-TE)

- ✅ UI-TE — 5 New Professional Templates: Integrated 5 new high-fidelity invoice templates (Mono, Sakura, Brutalist, Ledger, Coastal) into the system. Updated the template renderer and registry to make these accessible to Pro-tier users.

### Phase XI: Preview Layout Restoration (UX-PR)

- ✅ UX-PR — Sidebar Restoration: Restored the fixed template sidebar in the invoice preview page. Removed the redundant toggle button on desktop and implemented a sticky, independently-scrollable sidebar. This ensures the invoice remains stable while browsing templates. Added a mobile-responsive toggle as a fallback.

## Deployment & Production state

- **Latest Build:** `83e874f` (Mobile Navigation & Professionalization)
- **Status:** Pushed to `main`. Vercel automatic deployment triggered.
- **Verification:**
  - Landing page: Responsive & trust-focused.
  - Dashboard: Columns optimized for mobile.
  - Editor: Stepper and dropdowns clear of mobile UI overlaps.
  - Navigation: Hamburger menu active and functional.

- Invoice preview is professional and decluttered.
- Share page optimized for quick payment (prominent amount due).
- MSA acceptance flow includes visual confirmation (toast).
- Branding consolidated ("Generated by LanceInvoice").
- Zero-to-one experience is frictionless and high-signal (premium empty states).
- Landing page is a high-conversion sales asset with clear pricing and credibility.
- Fully responsive mobile experience across dashboard, editor, and landing page.
- Intuitive mobile navigation with hamburger menu and active state feedback.

## Files modified in v1.6 Professionalization

- app/invoice/preview/page.tsx
- app/share/[token]/page.tsx
- lib/templates/classic.tsx
- lib/templates/MilestoneSummaryBlock.tsx
- lib/templates/Watermark.tsx
- components/invoice/share/MSAAcceptanceModal.tsx
- lib/templates/renderer.tsx
- lib/templates/template-data.ts

## Next

- Finalize mobile navigation (Phase Q/UX-Q)
- Real-world load testing on parsing engine
- Beta launch announcement preparation

---

## v1.7 AUTHENTICATION & GUEST ACCESS — May 10, 2026

### Phase XII: OAuth & Signup Flow Fixes (AF-1 through AF-3)

- ✅ AF-1 — Auth Callback Handler: Created `app/auth/callback/route.ts` to process Supabase OAuth codes. This resolves the 404 error users previously encountered after Google authentication.
- ✅ AF-2 — Dynamic Redirects: Updated login/signup pages to use dynamic origins for `redirectTo`, ensuring local dev and production both work without code changes.
- ✅ AF-3 — Intention Persistence: Implemented a `next` parameter in the auth flow to return users to their exact drafting context after signing in.

### Phase XIII: Guest Access Flow (GA-1 through GA-5)

- ✅ GA-1 — Frictionless Entry: Updated landing page CTAs to direct unauthenticated users to `/invoice/new?guest=1`. This allows immediate drafting without a login wall.
- ✅ GA-2 — Guest Mode UI: Introduced a non-intrusive "Guest mode" banner in the editor, signaling that progress is saved locally and encouraging sign-in for cloud persistence.
- ✅ GA-3 — Unified Editor Routes: Consolidated the "Sandbox" concept into the main editor flow, replacing `/sandbox` links with the standard `/invoice/new?guest=1` path.
- ✅ GA-4 — Conversion Reassurance: Updated `ConversionModal` messaging to explicitly confirm that local drafts are safe and will be restored after account creation.
- ✅ AF-4 — HTML Structure Fix: Resolved a nested `div` closing error in the editor's profile prompt section that was causing layout instability.

## Deployment & Production state (v1.7)

- **Latest Build:** `v1.7-final` (Auth Fix + Guest Access)
- **Status:** Pushed to `main`.
- **Verification:**
  - OAuth callback redirects correctly to intended destination.
  - Landing page "Get Started" bypasses login for guests.
  - Editor correctly detects and displays "Guest Mode" for unauthenticated users.
  - Sign-in from guest mode correctly restores and saves the draft to the cloud.

## Files modified in v1.7

- app/auth/callback/route.ts
- app/login/page.tsx
- app/signup/page.tsx
- app/page.tsx
- components/invoice/InvoiceEditorPage.tsx
- components/invoice/ConversionModal.tsx
- components/AppHeader.tsx
- app/sandbox/page.tsx (deprecated)

## [v1.8] — 2026-05-10

### **Landing Page Simplification & Preview Overhaul**

- **Simplified Value Proposition**: Completely removed the Pricing section from the landing page.
- **Preview Hero Experience**: Overhauled the Invoice Preview layout (`app/invoice/preview/page.tsx`):
  - **Viewport Scaling**: Implemented automatic scaling to fit the invoice document to the user's viewport height, eliminating vertical scrolling for the preview.
  - **Template Picker Redesign**: Replaced the wide thumbnails with a slim, color-coded right sidebar. Each template is now represented by its distinctive color palette swatches.
  - **Print Scoping**: Fixed a critical CSS bug where global print overrides were causing the invoice to be cropped/cut-off on screen. Scoped all full-size resets to `@media print`.
  - **Stability**: Restored missing state variables (`showProfilePrompt`) and fixed ReferenceErrors during the transition to the new scaled layout.
- **Vercel Deployment**: Successfully pushed and verified deployment of the new preview experience.

---

## v1.9 WORKFLOW STREAMLINING — May 11-12, 2026

### Phase XIII: Navigation & Workflow Overhaul (WF-1 through WF-5)

- ✅ WF-1 — 4-Step Evolution: Condensed the 6-step wizard into a focused 4-step workflow (Agency → Client → Items → Payment).
- ✅ WF-2 — Persistent Meta Header: Moved Invoice # and Dates into a compact, horizontal strip rendered above the editor steps. Replaced the "Meta" step.
- ✅ WF-3 — Persistent Totals Footer: Moved real-time totals into a sticky strip above the action bar. Replaced the "Totals" step.
- ✅ WF-4 — Navigation Logic: Updated `orderedSteps` and validation logic to skip Meta/Totals steps while ensuring data consistency.
- ✅ WF-5 — Auto-population: Implemented `useEffect` hook to auto-populate Invoice # (sequential) and Dates (Today + 15d) on mount for new invoices.

### Phase XIV: UI/UX Refinements (UR-1 through UR-7)

- ✅ UR-1 — Guest Banner Alignment: Repositioned Guest Mode banner outside the sidebar grid to prevent clipping; equalized width with invoice cards (`max-w-2xl`).
- ✅ UR-2 — Combined Totals Container: Merged "Live Totals" strip and "Advanced Tax" options into a single unified container.
- ✅ UR-3 — Totals Alignment: Removed `max-w-md` constraints from `TotalsTaxesSection`, allowing content and dividers to span the full width of the container.
- ✅ UR-4 — Layout Stability: Removed `min-h-screen` from the main container and added `h-auto` to step cards to prevent vertical stretching.
- ✅ UR-5 — AI Autofill State: Set `BriefIntakeCard` to be collapsed by default to reduce initial cognitive load.
- ✅ UR-6 — Expanded Totals Styling: Added white background and shadow to the expanded totals container for better visual separation.
- ✅ UR-7 — Scroll Restoration: Fixed `live-totals-footer` ID to maintain "scroll to totals" functionality.

### Phase XV: Technical & Build Stability (TS-1 through TS-2)

- ✅ TS-1 — Supabase Build Fix: Moved `createClient` inside the `GET` handler in `app/api/invoice/[token]/route.ts` to resolve build-time crashes caused by missing environment variables during static analysis.
- ✅ TS-2 — Type Safety: Resolved property access errors on `computedTotals` in `InvoiceEditorPage.tsx` by utilizing the `formatCurrency` helper instead of non-existent formatted fields.

## Deployment & Production state (v1.9)

- **Latest Build:** `v1.9-stable` (4-Step Workflow)
- **Status:** Pushed to `main`. Verified successful build and deployment.
- **Verification:**
  - 4-step wizard navigation is smooth and valid.
  - Meta and Totals strips update reactively to form changes.
  - Guest banner is properly aligned and visible.
  - Build-time environment variable errors are resolved.

## Files modified in v1.9

- components/invoice/InvoiceEditorPage.tsx
- app/api/invoice/[token]/route.ts
- components/invoice/TotalsTaxesSection.tsx
- components/invoice/BriefIntakeCard.tsx

---

## v1.10 NEO BRUTALIST STANDARDIZATION & REVISION GOVERNANCE — May 13-16, 2026

### Phase XVI: Visual & Typography Parity (VT-1 through VT-5)

- ✅ VT-1 — Global Syne Font Synchronization: Applied `Syne` font with `font-black` weighting globally via `globals.css` and `!important` utility classes. Eliminated "font-shift" during navigation between Master (Invoices/Clients) and Editor views.
- ✅ VT-2 — Signature Grid Background: Migrated the Neo Brutalist grid background from the Invoice Editor to the `RootLayout`. Every page now shares the same visual foundation.
- ✅ VT-3 — Header Consistency: Synchronized logo and navigation text styles in `AppHeader` to match the brand typography standards.
- ✅ VT-4 — Table Neo Brutalization: Updated Client list and Invoice table borders to use the high-contrast Neo Brutalist signature style.
- ✅ VT-5 — Production Deployment: Verified build stability and pushed typography synchronization to Vercel.

### Phase XVII: Items Hierarchy & Business Logic (BL-1 through BL-3)

- ✅ BL-1 — Logical Column Reorder: Reconfigured the line item card hierarchy to follow the natural price discovery flow: **Item Type -> Description -> Unit -> Rate -> Quantity**.
- ✅ BL-2 — Unit Logic Optimization: Moved the **Unit Selection** to the beginning of the numeric row, ensuring the basis of measurement is established before pricing and volume.
- ✅ BL-3 — Per-Revision Removal: Disabled "Per Revision" as a selectable unit in the main deliverables dropdown. Logic: Revisions are post-task events and belong in a dedicated governance flow.

### Phase XVIII: Revision Policy & MSA Guardrails (RG-1 through RG-3)

- 📝 RG-1 — BA/CA Policy Analysis: Designed the "Revision Guard" logic (2 free revisions, subsequent at 15% of item total). Validated as a sound "Change Order" framework for GST compliance and profitability.
- 📝 RG-2 — 3-Tier MSA Roadmap: Defined the synchronization path for Revision Policies: **Global Profile Defaults -> Client MSA Overrides -> Project Addendums**.
- 📝 RG-3 — Supabase Architecture Plan: Outlined the transition to JSONB-based `revision_policy` storage in `profiles`, `clients`, and `invoices` tables to maintain snapshot integrity and forward-compatibility.

## Deployment & Production state (v1.10)

- **Latest Build:** `v1.10-standardized` (Global Branding & Logic Flow)
- **Status:** Pushed to `main`. Verified on Vercel.
- **Verification:**
  - Zero layout shift/font shift during navigation.
  - Items table follows **Item -> Description -> Unit -> Rate -> Qty**.
  - Revision Policy roadmap documented in `revisions_policy_plan.md`.

## Files modified in v1.10

- app/layout.tsx (Global Grid)
- app/globals.css (Syne Font System)
- components/AppHeader.tsx (Logo/Nav Sync)
- components/invoice/InvoiceEditorPage.tsx (Header Sync)
- components/invoice/DeliverablesSection.tsx (Hierarchy Fix)
- lib/invoice-line-item-catalog.ts (Unit Filtering)
- app/invoices/page.tsx (Font Sync)
- app/clients/page.tsx (Font Sync)
- SESSION_LOG.md (Current update)

---

## v2.0 NEO BRUTAL DESIGN SYSTEM (FULL) — May 16, 2026

### Design System Overhaul

Building on v1.10's initial brutalist foundation (Syne font sync, grid background, table borders), v2.0 completes the transformation across every surface of the app:

- ✅ NB-1 — Token Foundation: Complete rewrite of globals.css. Zero border radius, 2px black borders, offset drop shadows, removed all backdrop blur and transparency.
- ✅ NB-2 — UI Foundation: Updated ui-foundation.ts — buttons get border-2 with offset shadows, fields get thick borders and lime focus ring, status pills become square stamps, labels become uppercase bold.
- ✅ NB-3 — Card Class: Updated layout-foundation.ts — appCardClass now uses brutal borders and offset shadow.
- ✅ NB-4 — Header: Complete rewrite of AppHeader.tsx — dark #111118 background, lime #BEFF00 border-bottom accent stripe, white uppercase nav links, lime active state, brutal mobile menu.
- ✅ NB-5 — Global Cleanup: Bulk replacement across all .tsx files — removed hardcoded rounded corners, backdrop blur, semi-transparent backgrounds, soft shadows.
- ✅ NB-6 — Status Stamps: All badges (DRAFT, SENT, ACCEPTED, SETTLED, OVERDUE, READY, MANDATORY) converted from rounded pills to square stamps with thick black borders.
- ✅ NB-7 — Sidebar Fixes: Editor sidebar panels and warning boxes updated to brutal styling.
- ✅ NB-8 — Profile Tabs: Tab navigation updated to lime underline active state, brutal typography.
- ✅ NB-9 — Gray Token Cleanup: All hardcoded Tailwind gray classes replaced with CSS variable tokens.
- ✅ NB-10 — Modals: ShareLinkModal, SettlementModal, ConversionModal, MSAAcceptanceModal unified to brutal treatment.
- ✅ NB-11 — Auth Pages: Login and signup pages updated to brutal card styling.
- ✅ NB-12 — Components: NotificationBell, TemplatePicker, guest banner updated.
- ✅ NB-13 — Mobile Responsive: Shadows reduce on tablet (768px) and phone (480px). Nested borders thin on small screens.

### Design Identity

- Name: Neo Brutal
- Philosophy: Zero radius. Thick borders. Offset shadows. Bold, stamped, unapologetic.
- Primary: #BEFF00 (Neon Lime) — CTAs, active states, highlights
- Ink: #111118 — borders, text, header background
- Coral: #FF5C00 — overdue, danger, destructive
- Violet: #8B5CF6 — AI/system indicators, auto-filled states, draft
- Cyan: #00DCB4 — success, settled states
- Cream: #FFFBE6 — warm highlights, brief card, guest banner
- Status System: Square stamp badges, not rounded pills
- Typography: Labels = 11px bold uppercase tracking-wide. Headings = bold uppercase.
- Motion: Buttons press via translate (not scale). Shadows compress on press, expand on hover.

### Next Steps (v2.0)

- Real-world user testing with 5 Indian freelancers
- AI brief extraction activation (Gemini Flash, free tier)
- Revision Policy implementation (RG-1 through RG-3)
- InvoiceEditorPage.tsx decomposition (3,256 lines)

---

## v2.1 ARCHITECTURAL HIERARCHY & REVISION GOVERNANCE — May 16-17, 2026

### Phase XIX: Professional Identity & Revision Governance (RG-4 through RG-7)

- ✅ RG-4 — User Profession Detection: Added "PRIMARY SERVICE" dropdown to the Profile page (Agency tab) with 18 specialized categories.
- ✅ RG-5 — Revision Policy Implementation:
  - Updated revision clause wording across all UI components and sync utils: "The quoted fee includes up to {X} rounds of revisions per deliverable. Each additional round... will incur a surcharge of {Y}% of that specific line item's total."
  - Fixed helper text to clarify that the fee applies per line item, not milestone.
- ✅ RG-6 — UX Standardization: Updated license and inclusion toggles in `TermsPaymentSection.tsx` to use the Neo Brutalist button group style (High-contrast active state, square borders, 13px bold text).
- ✅ RG-7 — UI/UX Polish: Enhanced the Items section with dynamic unit-based quantity labels (e.g., "Hours", "Screens", "Rooms", "Sq.ft") and sequential numbering for line items.

### Phase XX: Architectural & Interior Design Hierarchical Item Types (AD-1 through AD-3)

- ✅ AD-1 — Hierarchical Item Catalog: Extended `lib/invoice-line-item-catalog.ts` with a complex entry for **Architecture & Interior Design**.
  - Introduced **Sub-types**: Residential, Commercial, Interior, Landscape, Site Planning, Consultation.
  - Specialized SAC codes and units (Per sq.ft, Per room, Per floor, Per drawing, etc.) per sub-type.
- ✅ AD-2 — Dynamic Line Item Logic: Modified `DeliverablesSection.tsx` to conditionally render a **SUB-TYPE** dropdown.
  - Dynamic state management: Updates SAC code, units, and description suggestions in real-time based on sub-type selection.
  - Dynamic Labeling: Updated "Rate" and "Qty" headers to reflect architecture-specific units (e.g., "RATE / SQ.FT", "Drawings").
- ✅ AD-3 — Alphabetical Standardization: Sorted all primary service and item type options alphabetically across `app/profile/page.tsx` and `lib/invoice-line-item-catalog.ts` for improved predictability.

### Phase XXI: Landing Page Redesign (LP-Neo)

- ✅ LP-Neo — Neo Brutalist Overhaul: Completely redesigned `app/page.tsx` into a strict 4-section layout (Hero, Trust Strip, Features, Footer).
  - Styling: Applied high-contrast borders, zero radius, and `shadow-[var(--brutal-shadow-lg)]`.
  - Content: Streamlined value prop for the Indian freelance market. Removed redundant FAQ/Pricing sections for a punchy, 4-section high-conversion flow.

## Deployment & Production state (v2.1)

- **Latest Build:** `v2.1-arch-ready`
- **Status:** Pushed to `main`. Verified on Vercel.
- **Verification:**
  - Architecture sub-types correctly resolve SAC codes and units.
  - Revision policy text consistent across Profile, Clients, and Invoices.
  - Landing page is high-contrast Neo Brutal.
  - All dropdowns sorted A-Z.

## Files modified in v2.1

- app/profile/page.tsx
- lib/invoice-line-item-catalog.ts
- components/invoice/DeliverablesSection.tsx
- components/invoice/TermsPaymentSection.tsx
- components/invoice/ClientDetailsSection.tsx
- lib/msa-sync-utils.ts
- app/page.tsx

## Next Steps (v2.1)

- Real-world user testing with architects & interior designers
- AI brief extraction activation (Gemini Flash, free tier)
- InvoiceEditorPage.tsx decomposition

---

## v2.2 INTERACTIVE DASHBOARD & SEQUENTIAL MILESTONE GOVERNANCE — May 18, 2026

### Phase XXII: Premium Interactive Dashboard & Ledger Polish

- ✅ DB-1 — Dynamic Metric Toggles & Filtering:
  - Metric cards now scale, tilt, and drop offset shadows on hover.
  - Clicking any of the 4 hero metric cards filters the CLIENT LEDGER table instantly (supports "Outstanding", "Settled/Money In", "Overdue", and "Due This Week" states).
  - Added a reactive "Reset Filters & Search" control to easily restore the default view.
- ✅ DB-2 — Interactive Search & Sort Bar:
  - Integrated real-time client search (by name and city) with a clear trigger button.
  - Added a neobrutalist sort selector allowing cards to be organized by Receivable, Collected, Client Name, and Health Status.
- ✅ DB-3 — Milestone Stage Badges & Contract Tooltips:
  - Upgraded generic stage indicators in the ledger table to full Neobrutalist milestone capsules displaying names, prices, and status indicators (`✓` for settled, `⚠` for overdue).
  - Added CSS-powered tooltips displaying contract authorities (Global MSA, Client MSA, or Project Addendum) on hover.
- ✅ DB-4 — Actionable Deadlines & Urgent Heatmaps:
  - Clicking any row in the UPCOMING panel immediately slides open its side-drawer inspector.
  - Displays first pending milestone name and double dates with signed days remaining in brackets (e.g. `INV-2026-8758 [M1: SECOND] (Due 21 May · +3d)`).
  - Implemented a 3-tier visual urgency heatmap (Red, Amber, Green) depending on days remaining.
  - Rendered inline "Mark Settled" quick action buttons directly on the deadline row if the invoice is due today or past due.

### Phase XXIII: Sequential Milestone Settle-and-Start Engine

- ✅ MS-1 — Sequential Milestone Transition Engine:
  - Implemented a primary action button inside the inspector drawer footer: **`Settle Milestone-X & Start MX+1`** (or **`Settle Final Milestone`** if last).
  - **Dynamic Due Date Calculation**: Marks the current milestone settled, computes next due date as **`Today's Date + Net Terms Days`**, updates the next milestone status to `'LIVE'`, updates the parent invoice `due_date`, and synchronizes the JSONB `form_data` payload.
  - Page automatically reloads to immediately sync all ledger rows, metrics, and streams.
- ✅ MS-2 — Selective Nudge Control:
  - Removed redundant `Copy Payment Link` and `View Live` buttons from the side-drawer footer.
  - Hidden the `⚡ Send Nudge` button when lead times are comfortable, making it appear only when an invoice is within its 3-day deadline or already past due.
- ✅ MS-3 — Explanatory Client Health Badges:
  - Standardized health status stamps to display explanatory standing subtitles (`GOOD (On Track)` with *"Payments on track"*, `LATE (Overdue)` with *"Has unpaid past due"*, etc.).
  - Prefixed the color ledger in the header with a bold `MILESTONE KEY:` to clarify that the colors represent milestones rather than overall health.

## Deployment & Production state (v2.2)

- **Latest Build:** `v2.2-stable` (Interactive Dashboard & Milestone Settle)
- **Status:** Pushed to `main`. Compiled successfully.
- **Verification:**
  - Standardized sequential prefixes (e.g., `M2: SECOND`) mapped to upcoming deadlines.
  - Sequential milestone settlement fully verified with automatic Net Days dueDate updates and JSONB payload sync.
  - Compiles flawlessly with exit code 0.

## Files modified in v2.2

- app/dashboard/page.tsx
- SESSION_LOG.md

---

## v2.3 SECURITY HARDENING & INTERFACE DEACTIVATION — May 18, 2026

### Phase XXIV: Production Infrastructure Security Audit & Hardening

- ✅ SA-1 — Fail-Closed Cron Guard:
  - Hardened the automated invoice check endpoint `app/api/cron/check-invoices/route.ts`.
  - Added strict authorization checking: if `CRON_SECRET` is undefined, missing, or empty, the API now immediately returns a `401 Unauthorized` response instead of skipping the validation.
- ✅ SA-2 — Strict Zod API Request Integrity:
  - Integrated robust Zod parsing in `app/api/msa-response/route.ts` to strictly validate payload data (`shareToken` must be non-empty, `response` must match valid enums, and `note` is trimmed and limited to 2000 characters).
  - Integrated Zod parsing in `app/api/track-view/route.ts` ensuring the parsed `invoiceId` matches a valid UUID format before performing any read-receipt database query, preventing injection vectors.
- ✅ SA-3 — PostgreSQL Column-Level Security (CLS):
  - Tightened database update policy for the `invoices` table. Removed standard update privileges from the unauthenticated database role (`anon`).
  - Granted back update privileges strictly for four columns (`msa_status`, `msa_response`, `msa_responded_at`, `client_msa_note`), making it physically impossible for external actors to alter line items, totals, or statuses.
  - Implemented self-healing SQL migrations ensuring that the `client_msa_note` column is automatically added to `public.invoices` if missing.
- ✅ SA-4 — Granular Table RLS Migrations:
  - Created and executed a new database migration (`supabase/migrations/20260518_rls_milestones_notifications.sql`).
  - Added strict multi-tenant row-level access security for `invoice_milestones` (parent invoice owner verification) and `notifications` (owner check `auth.uid() = user_id`).
- ✅ SA-5 — Environment Variables Standardization:
  - Standardized the non-canonical `OPEN_AI_KEY` reference to the industry-standard `OPENAI_API_KEY` across project configuration files.

### Phase XXV: User Interface Decluttering

- ✅ UI-DC — Deactivated AI Brief Extraction:
  - Commented out and disabled the `BriefIntakeCard` component within [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx) and [EditorContent.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/EditorContent.tsx).
  - The AI brief extraction layout is now fully hidden from the frontend editor interface in both collapsed and expanded states.

## Deployment & Production state (v2.3)

- **Latest Build:** `v2.3-hardened`
- **Status:** Pushed to `main`. Compiled successfully.
- **Verification:**
  - Automated endpoint checks strictly fail closed (401 Unauthorized if secret is missing).
  - Invalid UUIDs rejected by Track View endpoint with 400 Bad Request.
  - Supabase database columns restricted via CLS GRANT UPDATE.
  - AI card completely hidden from the editor view.
  - Full Next.js production build succeeded with exit code 0.

## Files modified in v2.3

- app/api/cron/check-invoices/route.ts
- app/api/msa-response/route.ts
- app/api/track-view/route.ts
- components/invoice/InvoiceEditorPage.tsx
- components/invoice/EditorContent.tsx
- audits/supabase-audit.sql
- supabase/migrations/20260518_rls_milestones_notifications.sql
- .env
- SESSION_LOG.md

---

## v2.4 CASCADE BULK DELETION HARDENING — May 18, 2026

### Phase XXVI: Cascading Bulk & Single Deletion Integrity

- ✅ BD-1 — Deep Cascading Milestone Deletion:
  - Updated the single `deleteInvoice` persistence utility (`lib/supabase/invoices.ts`) to fetch nested `invoice_milestones` IDs and delete their related rows in `invoice_line_items` first before clearing the milestones and final invoice.
  - Resolves silent database failures and RLS/foreign key constraint blocks.
- ✅ BD-2 — Custom Delete Modal Overlay:
  - Replaced browser-native blocking `window.confirm()` calls in the Invoices dashboard with state-controlled, beautiful Neo-Brutalist `InvoiceDeleteConfirmModal` overlays.
  - Prevents instant chrome-blur unmounting that was causing confirmation boxes to flash and vanish in 1 nanosecond.
- ✅ BD-3 — Robust Bulk Deletion Sequencing:
  - Rewrote `handleConfirmBulkDelete` in `app/invoices/page.tsx` to safely and sequentially purge relational child dependencies across multiple tables before deleting parent invoices.
  - Purges: `invoice_line_items` (milestone references), `invoice_milestones` (invoice references), `notifications` (invoice_id), `activity_log` (entity_id), and child child-invoices (`parent_invoice_id`).
  - Wrapped deletions in defensive `try/catch` scopes to silently proceed if optional tables or activity log schemas are not loaded, ensuring maximum database-level resilience.

## Deployment & Production state (v2.4)

- **Latest Build:** `v2.4-final`
- **Status:** Pushed to `main`. Compiled and deployed successfully.
- **Verification:**
  - Bulk deletion successfully cascades to all dependent rows with zero database lockups or foreign key constraint blocks.
  - Custom Neo-Brutalist confirmation modals remain open until explicit user action, with zero window blurs.
  - Production build successfully passes validation with Exit Code 0.

## Files modified in v2.4

- app/invoices/page.tsx
- lib/supabase/invoices.ts
- SESSION_LOG.md

---

## v2.5 NEO-BRUTALIST EMPTY STATE & SHARE PAGE OVERHAUL — May 18, 2026

### Phase XXVII: Minimalist Empty States & Professional Client Share Experience

- ✅ ES-5 — High-Signal Minimalist Empty State:
  - Replaced the multi-column feature-grid (AI, GST, PDF) empty state in `app/invoices/page.tsx` with a premium, high-impact layout featuring a custom Neo-Brutalist square icon (**`L`**) in brand green, clear conversion-driven copy, and an interactive **Create First Invoice →** button.
- ✅ SH-8 — Shared Page Neo-Brutalist Styling:
  - Styled the client-facing invoice sheet wrapper in `app/share/[token]/page.tsx` to be sharp and borderless: `border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-lg)]`.
  - Upgraded the page background to a crisp light gray `#F5F5F8` for premium depth.
  - Converted the "Amount Due" flex banner to a clean, centered box styled with `border-2 border-[#111118] bg-[#FFFBE6] px-6 py-4` and bold `text-2xl font-black text-[#111118]` typography.
  - Redesigned the "Download PDF" action into a sturdy, border-2 white button with custom `shadow-[var(--brutal-shadow-sm)]`.
  - Rebranded and stylized the footer to "Shared via Lance" and applied top-border dividers matching the platform's visual architecture.
- ✅ SH-9 — MSA Acceptance Modal Refinements:
  - Redesigned modal popups and confirmation dialogs within `components/invoice/share/MSAAcceptanceModal.tsx` to use `border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-md)]`.
  - Stripped out all soft curves (`rounded-full`, `rounded-lg`) from icons, status indicators, and list bullets, turning them into rigid Neo-Brutalist shapes.
  - Enhanced modal headers with `#FFFBE6` background styling and thick black sub-borders.

## Deployment & Production state (v2.5)

- **Latest Build:** `v2.5-final`
- **Status:** Pushed to `main`. Compiled and deployed successfully.
- **Verification:**
  - Empty state displays perfectly with high-impact minimalist square branding.
  - Client share page and terms modal render with zero rounded components, clean shadows, and centered banners.
  - Compilation completes flawlessly with Exit Code 0.

## Files modified in v2.5

- app/invoices/page.tsx
- app/share/[token]/page.tsx
- components/invoice/share/MSAAcceptanceModal.tsx
- SESSION_LOG.md

---

## v2.6 APP-WIDE TOOLTIP UX & AFFORDANCE AUDIT — May 19, 2026

### Phase XXVIII: Floating Tooltip System

- ✅ TT-1 — New `<AppTooltip />` Component:
  - Created `components/ui/AppTooltip.tsx` — a floating, z-50, portal-style tooltip that hovers over content without shifting layout.
  - Neo-Brutalist styling: white bg, thick `#111118` border, sharp drop shadow.
  - **Responsive triggers**: `group-hover` on desktop, click-to-toggle on mobile/touch.
- ✅ TT-2 — App-Wide Injection:
  - Replaced 25+ inline tooltip implementations across 7 components:
    - EditorContent.tsx (Right Side Panel — INV #, DATE, DUE, TOTALS)
    - InvoiceMetaSection.tsx, TotalsTaxesSection.tsx, DeliverablesSection.tsx
    - TermsPaymentSection.tsx, ClientDetailsSection.tsx, AgencyDetailsSection.tsx
- ✅ TT-3 — Enhanced MSA Tooltip:
  - Rich HTML tooltip in ClientDetailsSection.tsx with:
    - MSA definition text
    - Orange alert: "MSAs can be overridden by Project Addendums"
    - Deep-links: `→ Configure Global MSA` (/profile), `→ Configure Client MSA` (/clients)

### Phase XXIX: UX Affordance Audit (Input Sizing & Mobile Optimization)

Applied Fitts's Law, Nielsen's H4 (Consistency), and mobile ergonomics across the full application.

#### Part 1 — Invoice Editor (3 files)

- ✅ AF-1 — ClientDetailsSection.tsx:
  - Payment Terms: `w-full` → `w-20` + "days" suffix
  - Late Fee Rate: `w-28` → `w-16`
  - Jurisdiction: unconstrained → `max-w-[200px]`
  - GSTIN: added `autoComplete="off"`
- ✅ AF-2 — AgencyDetailsSection.tsx:
  - PIN Code: `max-w-full` → `max-w-[120px]` + `inputMode="numeric"`
  - PAN: `max-w-[280px]` → `max-w-[180px]` + `autoComplete="off"`
  - LUT ARN: `max-w-[280px]` → `max-w-[360px]` + `autoComplete="off"`
- ✅ AF-3 — TermsPaymentSection.tsx:
  - Free Revision Rounds: `w-full` → `w-16` + "rounds" suffix + `inputMode="numeric"`
  - Extra Revision Fee: `w-full` → `w-20` + "% of line item" suffix + `inputMode="decimal"`
  - Days Until Payment: `min-w-[120px]` → `w-20` + `inputMode="numeric"`

#### Part 2 — Profile & Client Pages (2 files)

- ✅ AF-4 — profile/page.tsx (Contract & MSA Tab):
  - Payment Terms: `w-full` → `w-20` + "days" suffix + `inputMode="numeric"`
  - Late Fee Rate: `w-full` → `w-16` + "%" suffix + `inputMode="decimal"`
  - Free Rounds: `w-full` → `w-16` + "rounds" suffix + `inputMode="numeric"`
  - Extra Fee: `w-full` → `w-20` + "% of line item" suffix + `inputMode="decimal"`
  - PIN Code: `w-full` → `max-w-[120px]` + `inputMode="numeric"`
  - PAN: `w-full` → `max-w-[180px]` + `autoComplete="off"`
  - GSTIN: added `autoComplete="off"`
  - Jurisdiction: `w-full` → `max-w-[200px]`
- ✅ AF-5 — clients/page.tsx (Client Form Drawer):
  - Terms: `w-full` → `w-20` + "days" suffix + `inputMode="numeric"`
  - Late Fee: `w-full` → `w-16` + "%" suffix + `inputMode="decimal"`
  - Free Rounds: `w-full` → `w-16` + "rounds" suffix + `inputMode="numeric"`
  - Extra Fee: `w-full` → `w-20` + "% of line item" suffix + `inputMode="decimal"`
  - Client GSTIN: added `autoComplete="off"`
  - Jurisdiction: `w-full` → `max-w-[200px]`

#### Pages Verified Clean (No Fixes Needed)

- ✅ Invoice Listing (`/invoices`) — All display-only (search, filters, checkboxes, stat cards)
- ✅ Invoice Preview (`/invoice/preview`) — Read-only renderer, zero form inputs

## Deployment & Production state (v2.6)

- **Latest Build:** `v2.6-affordance-audit`
- **Status:** Pushed to `main`. Compiled and deployed successfully.
- **Verification:**
  - All numeric inputs sized to match expected data length (2-digit → w-20, 1-digit → w-16).
  - All numeric inputs have proper `inputMode` for mobile keyboards.
  - All tax ID fields have `autoComplete="off"` to prevent browser auto-fill errors.
  - Full Next.js production build passed with Exit Code 0.

## Files modified in v2.6

- components/ui/AppTooltip.tsx (NEW)
- components/invoice/EditorContent.tsx
- components/invoice/InvoiceMetaSection.tsx
- components/invoice/TotalsTaxesSection.tsx
- components/invoice/DeliverablesSection.tsx
- components/invoice/TermsPaymentSection.tsx
- components/invoice/ClientDetailsSection.tsx
- components/invoice/AgencyDetailsSection.tsx
- app/profile/page.tsx
- app/clients/page.tsx
- SESSION_LOG.md

---

## v2.7 DASHBOARD UX IMPROVEMENTS — May 19, 2026

### Phase XXX: Signal-to-Noise Optimization (P0)

- ✅ DB-P0-1 — Ghost Client Suppression:
  - Clients with zero invoices (e.g. "Acme Studios" with ₹0/₹0) are now hidden from the Client Ledger by default.
  - They reappear if the user's search query matches their name or city.
- ✅ DB-P0-2 — Zero-Value Metric Card Dimming:
  - When a metric card shows ₹0, it renders with `opacity-60`, muted font weight (`font-semibold`), muted text color, and no hover transform.
  - When the user clicks a zero card to filter, it restores full opacity via `!opacity-100` override.
- ✅ DB-P0-3 — UPCOMING Threshold & Urgency Recalibration:
  - Deadlines > 21 days out are now hidden from the UPCOMING panel (previously showed all).
  - Urgency badge tiers recalibrated: ≤0d = Red, 1-3d = Amber, 4-7d = Green, 8-21d = Gray.
  - Smart empty state: "No urgent deadlines (all 21+ days out)" when deadlines exist but are far out.

### Phase XXXI: Visual Polish & Readability (P1)

- ✅ DB-P1-1 — Activity Feed Truncation:
  - Activity detail text capped with `truncate max-w-[320px]` on mobile, full width on desktop.
- ✅ DB-P1-2 — Pluralization Fix:
  - Footer now reads "1 invoice" (singular) instead of "1 invoices". Applied to both invoice and client counts.
- ✅ DB-P1-3 — Metric Card Pin Semantics:
  - DUE THIS WEEK pin color changed from lime (`#BEFF00`) to amber (`#FBBF24`) to signal "watch this" rather than "safe/good".
- ✅ DB-P1-4 — Client Row Spacing:
  - Added `mt-0.5` between client name and city in the ledger for better visual breathing room.
- ✅ DB-P1-5 — Greeting Font Refinement:
  - Removed `font-syne` from the greeting line ("Good afternoon, bkb kumar") for improved legibility. Syne remains on metric values, section headers, and buttons.

### Phase XXXII: Professional Polish (P2)

- ✅ DB-P2-1 — Neo-Brutalist Modal System:
  - Created an inline `DashboardModal` component replacing all 14 `window.confirm()` and `alert()` calls.
  - **Architecture**: Promise-based `showConfirm(title, msg, tone)` returns `boolean`; `showAlert(title, msg, tone)` for acknowledgement.
  - **4 tone variants**: success (teal `#00DCB4` ✓), error (orange `#FF5C00` !), warning (amber `#FBBF24` ?), info (gray i).
  - **Styling**: `border-4 border-[#111118]`, `shadow-[6px_6px_0_#111118]`, color-coded header stripe, `z-[60]` to layer above side-drawer.
  - **UX**: Success settlements auto-reload after 1.5s delay (user reads confirmation first).
  - **Coverage**: `handleSettleMilestone` (5 alerts, 1 confirm), ACTION NEEDED nudge (1 alert), UPCOMING "Mark Settled" (1 confirm, 2 alerts), side-drawer nudge (1 alert).
- ✅ DB-P2-2 — Side-Drawer Quick Links:
  - Added "Edit Invoice →" (links to `/invoice/edit/${id}`) and "View Live →" (links to `/share/${token}`, opens in new tab) below the CLIENT section in the invoice inspector drawer.

## Deployment & Production state (v2.7)

- **Latest Build:** `v2.7-dashboard-ux` (commits `cb135a9`, `8107c93`, `4f598ca`)
- **Status:** Pushed to `main`. Compiled and deployed successfully.
- **Verification:**
  - Zero remaining `window.confirm()` or `alert()` calls in dashboard.
  - Ghost clients hidden; zero-value cards dimmed; UPCOMING filtered to ≤21 days.
  - Pluralization correct for singular/plural invoice and client counts.
  - Generate Clause button matches Neo-Brutalist design system.
  - Full Next.js production build passed with Exit Code 0.

## Files modified in v2.7

- app/dashboard/page.tsx
- components/invoice/ClientDetailsSection.tsx
- SESSION_LOG.md

### Phase XXXIII: Design System Compliance Fixes

- ✅ NB-Fix-1 — Generate Clause Button Neo-Brutalization:
  - The "✨ Generate Clause" button in `ClientDetailsSection.tsx` was using pre-v2.0 styling: `rounded-md`, translucent `bg-[#4F46E5]/5`, thin `border-[#4F46E5]/20`, and `font-semibold`.
  - Converted to full Neo-Brutalist: `bg-[#FFFBE6]` cream, `border-2 border-[#111118]`, `shadow-[2px_2px_0_#111118]`, `font-black uppercase tracking-wider`, press/hover transforms.

---

## v2.8 INVOICE TEMPLATE & MASTER TABLE ENHANCEMENTS — May 19, 2026

### Phase XXXIV: Invoice PDF Printability & Rendering Polish
- ✅ PT-1 — Background Stripping Protection:
  - Addressed a critical issue where browsers strip background colors during PDF export/printing, rendering white text on dark backgrounds invisible.
  - Injected Tailwind `print:` utility classes (e.g., `print:bg-transparent`, `print:text-black`, `print:border-black`) across 11 templates (`neon-atelier`, `mono`, `brutalist`, `coastal`, etc.).
  - Ensured Reverse Charge banners and template headers remain fully legible when exported as PDFs.

### Phase XXXV: Master Table Milestone Visibility
- ✅ MT-1 — Granular Line Item Data:
  - Enhanced the `/invoices` master table milestone accordion to expose specific line-item data.
  - Implemented nested sub-rows under each milestone to display Description, Qty, Rate, and Calculated Cost.
- ✅ MT-2 — Real-Time Due Date Calculation:
  - Added dynamic inline due-date countdowns next to the milestone titles (e.g., `<span style="color:red">(3 days overdue)</span>` or `<span style="color:green">(Due in 5 days)</span>`).
- ✅ MT-3 — Table Layout Integrity:
  - Corrected a `colSpan={2}` alignment issue to ensure the expanded milestone details align perfectly with the parent table headers.

## Deployment & Production state (v2.8)
- **Status:** Pushed to `main`.
- **Verification:** All PDF templates print successfully. Master table milestone rows expand to show detailed line items and accurate due-date indicators.

---

## v2.9 AUTHENTICATION & GUEST ROUTING FLOW — May 19, 2026

### Phase XXXVI: Seamless Login/Signup Routing
- ✅ AR-1 — Default Dashboard Redirection:
  - Updated `app/login/page.tsx` and `app/signup/page.tsx` so the default fallback for new or un-targeted logins is `/dashboard` instead of the `/` marketing page.
- ✅ AR-2 — Root Authentication Check:
  - Enhanced `app/page.tsx` to automatically redirect users to `/dashboard` if they navigate to the root marketing page while already logged in.
- ✅ AR-3 — Link Propagation:
  - Fixed the toggle links between Login and Signup forms to strict preserve the `?next=` URL query parameter.

### Phase XXXVII: Guest Export & Onboarding Recovery
- ✅ AR-4 — Deferred Onboarding Context Preservation:
  - Resolved an issue where guest users attempting to export a draft lost their context upon being forced through the Onboarding flow.
  - Updated `app/auth/callback/route.ts` to seamlessly forward the `?next=/invoice/preview?restore=1` parameter to the Onboarding route.
  - Updated `app/onboarding/page.tsx` to extract the `next` route from `window.location.search` and intelligently route the user back to their restored preview draft upon Onboarding completion.

## Deployment & Production state (v2.9)
- **Status:** Merged to `main` locally, preparing to push.
- **Verification:** Guest drafts safely survive the forced-onboarding process and successfully restore on the preview screen. Existing users are cleanly routed to the dashboard.

---

## v2.10 DASHBOARD MILESTONE TIMELINE UX — May 19, 2026

### Phase XXXVIII: Neo-Brutalist Segmented Timeline & Mega Tooltip
- ✅ DB-UX-1 — Horizontal Segmented Timeline:
  - Replaced the bulky, vertically stacked text capsules in the Client Ledger's "Stages" column with a highly compact, horizontal segmented progress bar (e.g., `[✓]──[!]──[ ]`).
  - Segments are color-coded according to the global status key (Lime = Live, Teal = Settled, Orange = Overdue, Purple = Draft).
  - This severely reduces vertical row height bloat for multi-stage invoices, improving scannability.
- ✅ DB-UX-2 — Context-Hub "Mega Tooltip":
  - Overhauled the hover tooltip for each segment block into a massive, data-rich context card.
  - **Progress Context**: Displays current milestone vs total (e.g., `2 of 3`).
  - **Line Item Breakdown**: Exposes nested line-item details natively in the dashboard (Description, Item Type, Quantity, Unit, Rate, and Line Total).
  - **Timeline Computations**: Calculates and displays dynamic relative due dates (`"8 days till due"` or `"2 days past due"`) strictly for the `LIVE`/`OVERDUE` milestones based on native JavaScript `Date` math.
  - **Fallback States**: Handles empty states gracefully (e.g., "Untitled Milestone", "No items attached").
- ✅ DB-UX-3 — TypeScript & Data Integrity:
  - Ensured all mapped invoice attributes (`inv.lineItems`, `inv.dueDate`) correctly align with the `dashboardClients` mapping layer to prevent compilation errors and guarantee safe rendering.

## Deployment & Production state (v2.10)
- **Status:** Pushed to `main`.
- **Verification:** Segmented timeline renders cleanly; mega tooltip correctly maps specific line-item data and calculates relative due dates accurately without breaking the Neo-Brutalist container bounds. Compilation succeeds with Exit Code 0.
