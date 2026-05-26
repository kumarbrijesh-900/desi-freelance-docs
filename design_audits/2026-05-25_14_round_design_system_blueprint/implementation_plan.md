# Implementation Plan — Lance Pre-Launch Hardening

Covers Phase 0 (schema/data fixes from 14-round audit) + Phase 2 (pre-launch visual polish from Codex production audit).
Items are ordered by severity. Do not start Phase 2 visual work until Phase 0 data issues are confirmed resolved.

---

## Phase 0 — Schema & Data Persistence (Already Partly Shipped)

### 0-1. Invoice Save Schema-Cache Fix (P0)
Supabase/PostgREST schema-cache error on invoices→clients embed causes partial persistence (client/project created, invoice insert fails).

#### [MODIFY] `lib/supabase/invoices.ts`
- Audit `saveInvoice` to ensure `client_id` / `project_id` constraints are resolved before the invoice upsert.
- Implement strict manual rollback if invoice insertion fails after client/project creation.
- Force schema cache awareness: ensure TypeScript payload exactly matches the updated PostgREST schema.

### 0-2. Profile & Global MSA Save Reliability (P0/P1)
Silent save failure leaves users with a false sense of legal-term persistence.

#### [MODIFY] `lib/supabase/profiles.ts` & `lib/supabase/msa-resolver.ts`
- Explicitly check `if (error) throw error` in `upsertProfile` and `syncGlobalMsaFromProfile`.
- Return typed `{ success: false, error: string }` objects instead of swallowing errors.
- Wire failure state to a loud neo-brutal banner: "Global MSA save failed — your terms were not updated."

#### [MODIFY] Profile page component
- Apply the atomic save RPC migration (`20260526000000_atomic_profile_global_msa_save.sql`) in the target environment and run a manual save smoke test to confirm.

### 0-3. Contract Defaults Validation (P1)

#### [MODIFY] `lib/supabase/profiles.ts`
- Add Zod/runtime validation to `upsertProfile`: `late_fee_rate` must be a valid number, `payment_terms` a positive integer, `revision_rounds` >= 0.

### 0-4. Type Model Watch — Milestone Date Drift (Technical Debt)
Phase 1B surfaced that `MilestoneRow` exposes `trigger_date/order_index/status` but not `due_date`. Frontend components cast to `any` to access it.

#### Action
- Either add `due_date?: string` explicitly to `MilestoneRow`, OR
- Derive all due/timing display from `invoice.due_date` or `form_data` with documented fallback rules.
- Remove `(m as any).due_date` casts once the type is formally extended.

---

## Phase 2 — Pre-Launch Visual & UX Polish

*Source: Codex CDP audit 2026-05-26 + own analysis layered on top.*

### 2-1. Dashboard Missing `<h1>` Landmark (P0 — Accessibility + Brand)
The dashboard has 0 visible H1/H2 elements. The phase 1B shell (`flex-1 overflow-y-auto`) has no heading landmark, which breaks WCAG 2.1 and is inconsistent with every other page.

#### [MODIFY] `app/dashboard/page.tsx`
- Add a visually appropriate `<h1>` inside `DashboardContent`, either:
  - A permanent page-level heading above the Rail+Main zone (e.g., "Dashboard"), or
  - A project-context heading that updates when a project is selected (e.g., project name as `<h1>` inside the main zone).
- Keep it visually integrated; it should not break the full-screen rail layout.

### 2-2. Page Heading Style Contract — Unify to 36px/900 (P1)
Sizes found across pages: 36px/900 (Invoices), 32px/700 (Clients, Profile, New Invoice), 30px/900 (Invoice Preview). All authenticated index pages should use one contract.

**Proposed standard:** `text-4xl font-black uppercase tracking-tighter` (36px / 900 / uppercase) — consistent with the Invoices heading, which is the strongest neo-brutal expression.

#### Files to update:
| Page | File | Current | Change |
|---|---|---|---|
| Clients | `app/clients/page.tsx` | 32px/700 | → 36px/900 uppercase |
| Profile | `app/profile/page.tsx` | 32px/700 | → 36px/900 uppercase |
| New Invoice | `app/invoice/new/page.tsx` | 32px/700 | → 36px/900 uppercase |
| Invoice Preview | Around the preview chrome | 30px/900 | → Match or explicitly keep as client-surface exception |

> **Note:** Invoice Preview is a client-facing document surface. Its heading ("INVOICE") intentionally differs from app-chrome headings. This is an acceptable exception — document it as deliberate.

### 2-3. Nav Route Decision — Projects vs Dashboard (P1 — IA)
`/projects` is currently a server-side redirect to `/dashboard`. The nav bar needs to reflect the actual IA:

**Option A (Recommended): Remove Projects from nav, make Dashboard the single entry point for project work.**
#### [MODIFY] `components/AppHeader.tsx`
- Remove the `PROJECTS` nav item if present.
- Confirm `DASHBOARD` is the single nav item pointing to `/dashboard`.

**Option B: Restore `/projects` as first-class if re-instating project listing is in scope.**
- This is out of scope for the current workstream. Defer to post-launch.

### 2-4. ₹0 Currency on Invoices Page (P1 — Trust Surface)
The financial ledger currently shows ₹0 for all visible invoice rows. This is likely a data completeness issue for test/draft invoices, not a code bug.

#### Verification (no code change until confirmed)
Run in Supabase SQL:
```sql
select id, invoice_number, status, grand_total, form_data->'totals'->'total' as form_total
from invoices
where status in ('finalized', 'settled', 'live')
order by created_at desc
limit 20;
```
- If `grand_total` is populated on finalized rows → ₹0 is correct for draft-only data. No code change needed.
- If `grand_total` is NULL on finalized rows → `saveInvoice` is not writing `grand_total` correctly. Fix the `grand_total` computation in `InvoiceEventRow` fallback path.

### 2-5. Left Rail Overflow on Long Names (P2)
The Phase 1B rail was set to 240px with `truncate` classes. The audit reports 5 overflow candidates on `/dashboard`.

#### Verification first
- Manual mobile test at 375px viewport.
- If overflow is confirmed: add `title={project.name}` tooltip to truncated elements in `ProjectRail.tsx` so the full name is accessible on hover.
- Do not widen the rail — 240px is the spec.

### 2-6. Profile Page Header Style Alignment (P2)

#### [MODIFY] `app/profile/page.tsx`
- Update the "Your Profile" heading to use `text-4xl font-black uppercase tracking-tighter` to match the unified standard from 2-2.

---

## Manual Smoke Tests Required Before Launch

These cannot be automated or inferred from static scanning:

1. **Auth flow:** Sign out → Sign in → Confirm redirect lands on `/dashboard`.
2. **New invoice (clean start):** Click `+ NEW INVOICE` from Dashboard. Confirm a clean form, not a pre-populated stale state.
3. **New invoice (same-route reset):** Navigate to `/invoice/new?id=...` and confirm the reset behavior discards the prior state.
4. **Create → Save → Verify:** Create an invoice with a new client + project. Save draft. Confirm it appears in Dashboard, Invoices list, and Clients list.
5. **Share to controlled recipient:** Share a test invoice to a safe test email. Confirm `shared_at` and `share_token` via SQL.
6. **Incognito share link:** Open the share URL in an unauthenticated browser. Confirm no app-chrome, auth UI, or draft content leaks.
7. **Milestone send-now:** Trigger a scheduled milestone via the dashboard drilldown. Confirm child invoice created and status updated.
8. **PDF export:** Open Invoice Preview, export PDF, confirm download and content correctness.

---

## Verification Plan

### Automated
- `npx tsc --noEmit` — must pass clean before any commit.
- `npm run build` — must pass clean before any commit.

### Data
- Run the ₹0 SQL check above to determine if grand_total population is an issue.
- After profile atomic-save migration is applied, run a manual profile save and verify no error is swallowed.

### Manual (as listed above)

---

## Session Log Addendum (2026-05-26)

**Pre-launch audit cross-check:** The Codex production CDP audit confirms Phase 1B's restructured dashboard shell introduced a missing `<h1>` landmark. The `/projects → /dashboard` redirect is intentional and matches the architectural decision from Phase 1B. The ₹0 currency rows on Invoices are likely test-data driven and not a code regression, but must be SQL-verified on finalized invoices before external launch. The heading style contract divergence (36px vs 32px) is the highest-impact cosmetic fix and should be normalized in one pass across all authenticated pages.
