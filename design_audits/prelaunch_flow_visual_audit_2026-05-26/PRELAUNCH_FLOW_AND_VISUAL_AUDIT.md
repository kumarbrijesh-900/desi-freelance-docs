# Pre-launch Flow and Visual Audit

Generated: 2026-05-26T08:59:10.506Z

Scope: production session at https://lanceinvoice.xyz, using the already-running authenticated Chrome context over CDP.

## Executive Summary

- Authenticated production pages were accessible in the existing Chrome session.
- Primary page headers are inconsistent across routes; standardize page chrome before launch.
- `/projects` currently resolves to `/dashboard` in the production session, and the visible global nav does not show a PROJECTS item. Decide whether Projects is intentionally merged into Dashboard or restore first-class Projects navigation.
- Potential stale copy was detected and should be reviewed.
- Invoice send/share was not clicked to avoid sending live emails; verify with a controlled test recipient.

## Page Coverage

| Page | Auth | URL | H1/H2 count | Visual flags | Overflow flags | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| dashboard | page-accessible | https://lanceinvoice.xyz/dashboard | 0 | 1 | 5 | screenshots/dashboard.png |
| projects | page-accessible | https://lanceinvoice.xyz/dashboard | 0 | 1 | 5 | screenshots/projects.png |
| invoices | page-accessible | https://lanceinvoice.xyz/invoices | 1 | 1 | 0 | screenshots/invoices.png |
| clients | page-accessible | https://lanceinvoice.xyz/clients | 1 | 1 | 0 | screenshots/clients.png |
| profile | page-accessible | https://lanceinvoice.xyz/profile | 2 | 1 | 1 | screenshots/profile.png |
| invoice-new | page-accessible | https://lanceinvoice.xyz/invoice/new | 2 | 15 | 5 | screenshots/invoice-new.png |
| invoice-preview | page-accessible | https://lanceinvoice.xyz/invoice/preview | 1 | 13 | 3 | screenshots/invoice-preview.png |

## Page Header Consistency

| Page | Text | Size | Weight | Transform | Letter spacing | Color |
| --- | --- | --- | --- | --- | --- | --- |
| dashboard | No visible main heading detected |  |  |  |  |  |
| projects | No visible main heading detected |  |  |  |  |  |
| invoices | Invoices · 10 | 36px | 900 | none | -1.8px | rgb(17, 17, 24) |
| clients | Clients | 32px | 700 | none | -0.8px | rgb(17, 17, 24) |
| profile | Your Profile | 32px | 700 | none | -0.8px | rgb(17, 17, 24) |
| invoice-new | New Invoice | 32px | 700 | none | -0.8px | rgb(17, 17, 24) |
| invoice-preview | INVOICE | 30px | 900 | none | -1.5px | rgb(17, 17, 24) |

## Findings

| Severity | Area | Finding | Recommendation |
| --- | --- | --- | --- |
| P1 | Global page chrome | Primary heading styles vary. Sizes found: 36px, 32px, 30px; transforms: none. | Create a shared PageHeader component/token set and migrate dashboard, projects, invoices, clients, profile, invoice editor, and preview pages onto it. |
| P1 | dashboard | 5 horizontal overflow candidates detected. | Check mobile and tablet responsive behavior for the listed selectors in raw JSON. |
| P3 | dashboard | Project-selection empty/select state present. | Review visible copy in the screenshot and normalize to the launch copy standard. |
| P2 | dashboard | Self-link visible: "DASHBOARD" -> /dashboard | Self-links are acceptable for nav active states, but action CTAs should use refresh/hard reset if they are meant to restart a flow. |
| P1 | projects | 5 horizontal overflow candidates detected. | Check mobile and tablet responsive behavior for the listed selectors in raw JSON. |
| P3 | projects | Project-selection empty/select state present. | Review visible copy in the screenshot and normalize to the launch copy standard. |
| P2 | projects | Self-link visible: "DASHBOARD" -> /dashboard | Self-links are acceptable for nav active states, but action CTAs should use refresh/hard reset if they are meant to restart a flow. |
| P2 | invoices | Self-link visible: "INVOICES" -> /invoices | Self-links are acceptable for nav active states, but action CTAs should use refresh/hard reset if they are meant to restart a flow. |
| P2 | clients | Self-link visible: "CLIENTS" -> /clients | Self-links are acceptable for nav active states, but action CTAs should use refresh/hard reset if they are meant to restart a flow. |
| P1 | profile | 1 horizontal overflow candidates detected. | Check mobile and tablet responsive behavior for the listed selectors in raw JSON. |
| P1 | invoice-new | 5 horizontal overflow candidates detected. | Check mobile and tablet responsive behavior for the listed selectors in raw JSON. |
| P1 | invoice-preview | 3 horizontal overflow candidates detected. | Check mobile and tablet responsive behavior for the listed selectors in raw JSON. |

## Human UX / Visual Review

### Auth And Session State

- The existing Chrome session is signed in: `/dashboard`, `/invoices`, `/clients`, `/profile`, `/invoice/new`, and `/invoice/preview` all loaded application content instead of redirecting to login.
- This proves session persistence in the current browser context, not full sign-in correctness. A separate smoke test should still sign out, sign in, and confirm redirect behavior.

### Global Navigation

- Header styling is consistent as a black app bar with lime active accents, but route coverage is not: the production nav shows Dashboard, Invoices, Clients, FAQ. Projects is missing.
- `/projects` resolved to `/dashboard` in this audit. If Projects is meant to be a first-class entity, this is a launch blocker for that IA decision.
- `+ NEW INVOICE` is visible and styled consistently in the header. The recent hard-reset fix should be validated manually from `/invoice/new?id=...` because same-route reset behavior cannot be proven by static scanning alone.

### Page Header Consistency

- Page titles are visually inconsistent:
  - Invoices: 36px / 900 / heavy display style.
  - Clients, Profile, New Invoice: 32px / 700.
  - Invoice Preview: 30px / 900.
  - Dashboard/Projects workbench: no visible main heading.
- Recommended launch standard: create one `PageHeader` contract with title, subtitle, right action slot, and optional count. Use the heavier Invoices display style only if every index page moves to that same treatment.

### Dashboard / Project Workbench

- The empty state is now sentence case and visually calm: “Select a project / Or click + New invoice to start.”
- The left rail is dense and functional, but long project/client names overflow. It needs truncation rules plus a hover/title affordance or a slightly wider content strategy.
- Duplicate-looking historical projects are visible. This may be expected test data, but it weakens user trust during demos.

### Invoice Wizard

- The Items-step blocker is visible from the Agency step: “Name your project to continue.” This confirms the project-required change is surfaced in the progress system.
- The editor still shows some soft/rounded micro-controls (`?` helper chips and toggle pills). These are probably acceptable functional controls, but they technically break strict square neo-brutal rules.
- The bottom sticky bar is clear and useful. It partially covers lower form content in the screenshot; mobile/tablet should be checked manually.

### Invoices Page

- Filter chips, count, semantic status pills, and row actions are present.
- Currency currently renders as `₹0` for all visible invoices in the screenshot. That may be data-driven, but it should be verified against database totals because this page is a finance trust surface.
- Row density and hierarchy are strong. This page is currently one of the cleaner surfaces.

### Clients Page

- Client table is clean and readable, but it uses a different page header scale and a quieter action placement than Invoices.
- Repeated test clients and GSTIN-looking placeholders are visible. Clean demo data before external launch.

### Profile / Global MSA

- Profile has a useful incomplete-profile warning and the sticky Save Profile action is visible.
- The page uses a different header style from Invoices and Preview.
- The atomic save RPC exists in codebase/migrations from earlier hardening, but this audit did not apply or verify the migration. Profile save should be tested once the RPC migration is applied in the target environment.

### Invoice Preview / Client-Facing Document

- The preview route loads and shows an invoice sheet plus template picker.
- Preview UI intentionally uses softer controls and sheet styling; this is acceptable for client-facing output, but the app chrome around it should still use consistent action buttons.
- Export/Share actions were not clicked. Final validation must use a real saved test invoice and a controlled recipient.

## Launch Verification Plan

### No SQL Needed For

- Header visual consistency.
- Button visibility and layout.
- Empty/loading copy.
- Responsive overflow.
- Basic auth session presence in the already-open Chrome session.

### SQL Recommended After Controlled Smoke Test

Use SQL only after creating a deliberate test invoice and sharing it to a safe test recipient. Verify:

```sql
-- Replace with the test invoice number or id used in the smoke test.
select
  id,
  invoice_number,
  status,
  client_id,
  project_id,
  shared_at,
  share_token,
  grand_total,
  created_at,
  updated_at
from invoices
where invoice_number = 'INV-TEST-REPLACE-ME'
order by created_at desc;

select
  id,
  name,
  client_id,
  status,
  created_at,
  updated_at
from projects
where id = (
  select project_id
  from invoices
  where invoice_number = 'INV-TEST-REPLACE-ME'
  limit 1
);

select
  id,
  client_name,
  client_email,
  client_type,
  created_at,
  updated_at
from clients
where id = (
  select client_id
  from invoices
  where invoice_number = 'INV-TEST-REPLACE-ME'
  limit 1
);

select
  id,
  invoice_id,
  title,
  status,
  trigger_mode,
  trigger_status,
  trigger_date,
  trigger_fired_at,
  amount
from invoice_milestones
where invoice_id = (
  select id
  from invoices
  where invoice_number = 'INV-TEST-REPLACE-ME'
  limit 1
)
order by order_index asc;
```

### Manual Smoke Test Required Before Launch

1. Sign out, sign in, and confirm redirect lands on dashboard.
2. Click `+ NEW INVOICE` from Dashboard and from `/invoice/new?id=...`; both should start a clean invoice.
3. Create a new invoice with an existing client and a new project name; save draft.
4. Confirm Dashboard, Invoices, Clients, and Preview all show the same invoice/project/client.
5. Open Preview, inspect invoice content, export PDF, and confirm the download modal copy.
6. Share invoice to a controlled recipient; confirm `shared_at` and `share_token` via SQL.
7. Open the client share link in an unauthenticated/incognito browser and verify no draft-only app chrome or placeholders leak to the client.

## Flow Verification Notes

- Auth check: pages were opened in the existing authenticated Chrome context. If a page redirects to /login, session persistence is broken or the account lacks access.
- Create invoice check: /invoice/new loaded as a route; a full form-submit flow should be run with a deliberate test invoice and test email before launch.
- Share check: no live send action was performed. Use a test recipient, then verify invoices.shared_at/share_token and the client share URL.
- Client-facing check: /invoice/preview was scanned if available, but final validation requires opening a real share token in an unauthenticated/incognito session.
- Milestone check: dashboard/project pages were scanned. Triggering scheduled/send-now actions was not performed in this audit.

## SQL Guidance

- No SQL is needed just to confirm header styling or button behavior.
- Use read-only SQL after a controlled test send to verify invoices, projects, clients, invoice_milestones, and share_token rows.
- Run migrations/backfills only when a schema or historical-data issue is explicitly identified.

## Raw Artifacts

- Consolidated JSON: `prelaunch_flow_visual_audit.json`
- Screenshots: `screenshots/*.png`

## Important Constraints

- No production data was modified by this audit.
- No invoice was sent from the audit script.
- No Supabase SQL was executed by this audit.
- Existing local code changes outside audit artifacts were not staged or committed.
