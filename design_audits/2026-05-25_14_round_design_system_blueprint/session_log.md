# Session Log

## Addendum 1 — Type Model Watch (2026-05-25)
**Type model watch:** Phase 1B surfaced frontend/backend drift around milestone date fields. Milestone rows expose `trigger_date`, `order_index`, and `status`, but not every UI-assumed field like `due_date`. Future dashboard lifecycle work should either extend `MilestoneRow` deliberately or derive due/timing from invoice/form_data with explicit fallback rules.

---

## Addendum 2 — Pre-Launch Flow & Visual Audit Analysis (2026-05-26)

*Source: Codex CDP audit of production session at https://lanceinvoice.xyz, 2026-05-26T08:59:10Z.*
*This section adds my own analysis layered on top of the Codex-generated findings.*

### High-Confidence Signals (Trust These)

**1. The dashboard heading gap is real and is actually two bugs in one.**
The Codex audit correctly flags that `/dashboard` has 0 visible H1/H2 elements, but what it doesn't call out explicitly is *why*: the Phase 1B redesign collapsed the dashboard into a full-screen rail+main shell with no traditional page header zone. The stepper and drilldown components are functional UI, but they live inside a `flex-1 overflow-y-auto` container with no labelled heading landmark. This is both an accessibility gap (`<h1>` is required per WCAG 2.1) and a brand inconsistency. Every other page has a heading except this one.

**2. The `/projects → /dashboard` redirect is the right call, not a bug.**
Phase 1B explicitly killed the standalone Projects index route and replaced it with a server-side redirect to `/dashboard`. The audit treats this as a question mark, but from my perspective it's a known and intentional architectural decision. What *is* missing is removing the `/projects` nav item entirely from `AppHeader` if it still appears there — or conversely, making the Dashboard nav item also be the mental anchor for "Projects". The audit finding about the nav not showing PROJECTS is the more actionable piece.

**3. The ₹0 currency rows on `/invoices` need investigation before launch.**
This is a trust-critical surface — it's the financial ledger. The `InvoiceEventRow` component now correctly reads `grand_total` with a fallback to `form_data.totals.total`. If the DB rows have neither field populated (e.g., invoices were drafted and abandoned before totals were calculated), the display will always show ₹0. This is not a UI bug — it's a data completeness issue for existing test/draft invoices. Before launch: confirm whether `grand_total` is populated on finalized invoices specifically. Draft ₹0 values are fine.

**4. Profile page header drift is a genuine P1.**
Profile currently renders a `32px / 700` heading ("Your Profile") while Invoices renders `36px / 900` ("Invoices · 10"). Both are app-internal authenticated pages. The weight/size delta is visible and will feel inconsistent to a careful user. The Invoices style is stronger and more on-brand for neo-brutalism — that should be the standard, not the 32px/700 variant.

**5. The invoice wizard's soft controls are a known deliberate exception.**
The audit correctly flags rounded/soft micro-controls inside the invoice wizard (helper chips, toggle pills). This is worth acknowledging as a deliberate functional exception. These controls manage complex subforms (rate units, milestone triggers, line item types) and rounding them was an intentional choice to reduce cognitive weight inside an already-dense step. They are not a neo-brutalism violation that blocks launch — they are a scope decision.

### Lower-Confidence Signals (Verify Before Acting)

**6. The 5 horizontal overflow candidates on `/dashboard` may be phantom.**
The `overflow-x: hidden` on the rail container can fool many DOM-walking scanners into reporting "potential overflows" even when nothing visually breaks. Before acting on this, I'd want a manual mobile screenshot (375px) rather than trusting the scanner's inference. The `truncate` classes we added to the rail in Phase 1B should be absorbing the worst offenders.

**7. The self-link findings (P2) are expected nav active-state behavior.**
Active nav links pointing to the current page are standard UX. The audit flags `DASHBOARD → /dashboard` as a self-link, but that is the nav bar correctly highlighting the active route. Not a bug; skip.

**8. Demo data noise is real but pre-launch scoped.**
Duplicate test clients, repeated project names, and GSTIN placeholders are visible in screenshots. This is cleanup work, not code work. It needs a manual data purge in Supabase before any external demo or launch, but nothing in the codebase needs to change for it.

### Net Assessment

The Codex audit is accurate and well-structured. The truly blocking items for launch are:

| Priority | Item | Owner |
|---|---|---|
| P0 | Dashboard has no `<h1>` landmark | Code |
| P1 | Page heading style contract — unify to 36px/900 across all index pages | Code |
| P1 | ₹0 rows on Invoices — verify grand_total population on finalized invoices | Data check |
| P1 | Nav still shows Projects route or doesn't reflect redirect decision clearly | Code |
| P2 | Profile page header style alignment | Code |
| P2 | Left rail overflow on long names — manual mobile test to confirm | Manual |
| P3 | Demo data cleanup in Supabase before external launch | Manual |
| P3 | Sign-out → Sign-in smoke test to confirm auth redirect | Manual |

The export/share, milestone send-now, and settlement drawer flows are listed as manual verifications in the Codex plan and I agree — those are not auditable via static scanning and need a real controlled test-recipient run.
