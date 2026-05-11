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

## Deployment & Production state

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

## Deployment & Production state

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
