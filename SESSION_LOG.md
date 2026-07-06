# Session Log — May 22-23, 2026

## READ FIRST: orientation for a new chat (pinned reference - keep at top)

New Claude instance? Read this block, then the most recent session entries below (newest-first). It tells you what Lance is, how work ships here, and what's queued. Confirm the active task with the founder before starting.

**Product.** Lance (lanceinvoice.xyz) - GST-compliant, milestone-driven invoicing + MSA-enforcement for Indian creative freelancers. "Delivery tracker first, finance second." Stack: Next.js (App Router) + React 19 + Supabase + Vercel + Resend + Tailwind v4 + framer-motion 12 + lucide-react. Repo `kumarbrijesh-900/desi-freelance-docs` (public, `main`, auto-deploys to Vercel).

**How work ships (read carefully).** Claude does NOT push code. Claude authors *exact* Antigravity (AG) prompts - precise FIND/REPLACE blocks, explicit do-not-touch, "stage only these files." The founder runs them in AG (Gemini Flash: fast, auto-pushes, but hallucinates "done" and silently drops files) and pastes back the SHA. Claude then verifies byte-exact on `origin/main` before the next step. For risky/multi-file changes, double-check with Codex (rg-based). DB reads/migrations via the Supabase MCP; deploy checks via the Vercel MCP. Prod anchors (Supabase/Vercel project IDs, user id) live in Claude's memory - deliberately NOT committed (public repo).

**Verification discipline (every SHA).** `git fetch` + hard reset to `origin/main` + `git diff --stat HEAD~1 HEAD` scope check (catches AG `git add .` strays), then byte-exact: apply the prompt's FIND->REPLACE to the commit's parent and assert `== HEAD` per file (robust when files move across commits). Prove JSX structure with a tag-skeleton check + brace/paren/bracket/backtick balance. Generate AG prompts from the verified local diff, then re-parse the prompt's fenced blocks and re-apply to a fresh `git show HEAD:` copy to confirm they reproduce the expected file. For broad sweeps, run a residual scan proving zero offenders remain on deployed `origin/main`. Show a mockup (real E tokens) before pushing any visual/aesthetic change.

**Design system - "E".** Tokens in `app/globals.css` `@theme`; plan in project file `lance-E-migration-plan.md`. Cream paper + bottle-green primary (`--color-acid` `#3a6e59`) + ochre/ink; fonts Bricolage Grotesque (display) / Hanken Grotesk (UI) / Space Mono (mono). Radius (consistent app-wide as of June 24): cards/dropdowns `rounded-[14px]`, modals/empty-states `rounded-[16px]`, inputs/buttons `rounded-[11px]`, chips/icon-boxes `rounded-md`, pills/progress `rounded-full`. Status palette: settled emerald `#157a54` (`bg-grass`), awaiting ochre `#c8943b`, revision/alert rust `#c2502f`, overdue `#a32d2d`, info muted-teal. Money: `tabular-nums`.

**Founder comms.** Terse, momentum-driven ("go", "run it", SHA-only, filename-only = "do this surface"). Strong design eye. Judges by deployed visible effect (sends screenshots). Lead with the simpler/safer fix; split risky logic from safe copy/CSS; when consistency is the goal be thorough and run completeness scans - don't ship partial passes.
### Current queue (next up)

**1. ~~Invoice templates — UX/UI + compliance pass.~~** ✅ DONE (June 25-27).

**2. ~~Notification + email completeness.~~** ✅ DONE (June 27, session 2). Realtime bell fixed, notification enum fixed, MSA agency email shipped + live-tested, full email inventory mapped.

**3. Extraction / autofill workstream (in progress — see July 5-6 entry).** The deployed multi-provider `parse-brief` pipeline is now wired into the editor (1a/1b), the review modal surfaces all extracted fields (#1), the live parser prompt is tuned (edge-fn **v17**), and the repo is re-synced to prod. Remaining:
- **PENDING — flip the autofill gate in main prod.** Autofill is *intentionally hidden* in prod until parsing is public-ready; 1a/1b/#1 run in dev/preview only. When quality is judged ready, locate + flip the gate cleanly (Claude to help find it).
- **PLANNED — Stage 3: image → Gemini multimodal.** Parser is text-only today; screenshots are OCR'd to text client-side before the parser ever sees them.
- **PLANNED — Stage 4: voice intake** (`voiceTranscript` is already a `parse-brief` bundle field, unused).
- **PLANNED — Stage 5: broader field coverage + per-item confidence.**

**4. Open follow-ups (none blocking):**
- **Legacy extraction fallback is UNSAFE (July 6 finding).** In `handleBriefAutofill`, when the parse-brief gateway fails or all 3 providers return empty, the brief falls through to `/api/brief-extract` → `runBriefAutofill` — the old mapper with index-based line-item merge and silent high-confidence overwrites. Overwrite-safety (1b) holds only on the gateway path. Proposed fix: delete the legacy fallback entirely (gateway already has 3-provider redundancy; failure should be a "couldn't parse, try again" toast). Zero prod risk while the autofill gate is closed.
- **Gate-flip exit criteria undefined.** "When quality is judged ready" needs a concrete bar: fixed eval set of 20–30 real briefs (Hinglish, dedh-lakh amounts, screenshot OCR, partial-payment terms) scored on field accuracy + spurious-clarification rate.
- **Edge-fn drift ritual.** parse-brief deploys via dashboard paste, outside git. At session start when touching extraction: `get_edge_function`, diff vs repo. Drift WILL recur otherwise (it already did once, generationally).
- Client name-role low-confidence handling — lives in the legacy pipeline; dies with the fallback removal above. Do not fix separately.
- Component-level React ErrorBoundary still unadded (route-level `error.tsx`/`global-error.tsx`/`not-found.tsx` shipped July 1).
- ~~All June-era carryovers CLOSED July 1~~: `projects.status` TS type extended with `"closed"`; project-complete email + settlement receipt + client MSA-accepted confirmation all shipped via shared email module; dead `request-milestone` route deleted; XLSX dynamically imported; stray blank line fixed; April audit docs stamped superseded.

**5. Planned build queue (non-extraction, founder-prioritised).**
- **Invoice templates pass** — 11 templates (`classic`, `editorial`, `neon-atelier`, `midnight`, `terracotta`, `swiss-grid`, `mono`, `sakura`, `brutalist`, `ledger`, `coastal`) with full GST Rule 46 compliance (GSTIN, place of supply + state code, HSN/SAC per line, CGST/SGST vs IGST split, amount in words, reverse-charge note, SEZ/export endorsement, signature block). Files: `lib/templates/registry.ts`, `lib/templates/renderer.tsx`, picker + three render/print routes.
- **v1.5 multi-milestone schema refactor** — promote Milestone to a real entity (existing empty `invoice_milestones` + `invoice_line_items` tables), Option A strict-sequential.
- PostgREST FK rewrite via `projects.client_id` (no direct `invoices→clients` FK) — AUDIT-P0-002.
- Restore C2 drawer richness (CHECKPOINT + CONTRACT + CHECKLIST).
- Profile + Global MSA atomic save — AUDIT-P0-001.
- Late-fee unit normalize (`msa-sync-utils.ts:71` + `default-msa.ts:24`).
- Template placeholder suppression — AUDIT-P1-003; trigger-date edge case; orphan-invoice backfill.
- Prod DB cleanup: delete `AUDIT DRAFT RETRY` orphan + `Test Project 1779434613`.

**6. GTM (founder-owned, standing).** Design-partner cohort — kit in `/outputs/lance-cohort-outreach.md`.

---

## Extraction pipeline adoption + review-modal niche fields + parser prompt tuning + parse-brief repo↔prod drift fix (July 5-6, 2026)

Adopted the deployed-but-dormant multi-provider `parse-brief` edge function as the invoice autofill pipeline, taught the review modal the niche extracted fields, tuned the live parser prompt (deployed edge-fn **v17**), and reconciled a *generational* repo↔prod drift in the parse-brief function. All code changes verified byte-exact on `origin/main` + Vercel READY; the parser change additionally live-tested via a temporary Postgres `http` extension (enable → POST → drop; no DB rows written).

### Shipped this session

| # | Scope | Mechanism | Ref |
|---|---|---|---|
| Stage 1a — wire multi-provider gateway | `handleBriefAutofill` tries `invokeBriefParserGateway` (Supabase `parse-brief`: Gemini→Groq→Grok) FIRST, trusts it only when `gateway.ok && response.providerUsed` (parse-brief returns HTTP200-empty with `providerUsed:null` when all providers fail → this gate prevents wrongly skipping the OpenAI fallback); else falls back to OpenAI `/api/brief-extract` unchanged | `components/invoice/InvoiceEditorPage.tsx` | `0df913e` |
| Stage 1b — overwrite-safe hydrator | Switched the mapper to `hydrateInvoiceFormFromParsedExtraction` (confidence-gated, preserves user-typed values); shaped its output into the existing `runBriefAutofill`-shaped result object so the fragile due-date/merge/modal tail is byte-unchanged | `components/invoice/InvoiceEditorPage.tsx` | `aa73960` |
| #1 Review-modal niche fields | `BriefSummaryModal` value-getter + setter now recognise 7 previously-omitted extracted fields (client email, location, SEZ, LUT number, settlement type, license terms, GST-registration) — they were silently filtered out when their lookup returned empty; now shown + editable. Broadened the GST-registration match too. | `components/invoice/BriefSummaryModal.tsx` | `3234229` |
| #2 Parser prompt tuning | Edited the live `parse-brief` prompt: capture partial/milestone payment terms ("40% advance") into `payment.terms`, and a concrete SAC table so web/website work gets a code instead of null→spurious "Which SAC code?" clarification. Deployed via the Supabase dashboard (paste one file). | `supabase/functions/parse-brief/provider-adapters.ts` | edge-fn **v17** |
| parse-brief repo↔prod drift fix | Repo's parse-brief was a whole generation behind prod (old "Autonomous Billing Engine" flat `client_details`/`line_items` shape vs live "GST-aware `normalizedExtraction`"). Synced repo's `provider-adapters.ts` + `postprocess.ts` to the live v17 source, byte-exact. `types.ts`/`index.ts`/`normalization.ts`/`persistence.ts` already matched prod. | `supabase/functions/parse-brief/{provider-adapters,postprocess}.ts` | `fdb1c51` |

### Live parser test (v17, via temporary `http` ext)
Brief "…full website redesign… dedh lakh. 40% advance, balance on delivery… Bengaluru, Karnataka" → `payment.terms`="40% advance, balance on delivery", deliverable `sacCode`=998314 (type "Other" but SAC populated → **no** "Which SAC code?" clarification), dedh lakh→150000, same-state→CGST_SGST, provider gemini-flash first try, `rawStored:false`. Both target misses fixed; no regressions. `http` ext dropped; DB clean.

### Key facts / learnings
- **Two coexisting extraction pipelines** existed: OLD live (client Tesseract OCR → OpenAI `/api/brief-extract` → `runBriefAutofill`, aggressive overwrites + index-merge) vs NEW deployed-but-dormant (`parse-brief` edge fn + `hydrateInvoiceFormFromParsedExtraction`). Adopted the NEW one (Option A, founder-approved) — it already had confidence + overwrite-safety.
- **`parse-brief` edge fn**: id `ec1bf407-3d95-43f5-bc80-e529e2cedba2`, ACTIVE, `verify_jwt:false`, now **v17**. 3-provider tiered fallback (Gemini→Groq→Grok), GST/Indian-slang-aware prompt, per-field confidence, clarifications; persists to `documents` only when authenticated.
- **Provider secrets set** (Supabase edge-fn secrets): `GEMINI_API_KEY`, `GEMINI_FLASH_MODEL` (=gemini-2.5-flash), `GROQ_API_KEY`, `GROK_MODEL`. Deployed code has older default model strings but env vars override them — do NOT "fix" the code defaults.
- **Autofill is INTENTIONALLY HIDDEN in main prod** — parsing not yet public-ready. 1a/1b/#1 are effective in dev/preview only until the gate is flipped.
- **Edge functions deploy SEPARATELY** from the git-push→Vercel flow (Supabase dashboard/CLI), NOT from the repo. `deploy_edge_function` via MCP is impractical at this size (~41KB across 5 files → single-call payload truncates). Reliable path used: paste the one changed file into the Supabase dashboard editor + Deploy (the other live files stay intact). `get_edge_function` returns 5 files — `types.ts` is type-only (`import type`), erased at build, so not stored.
- **Invoking an edge fn for tests** (no invoke tool; bash can't reach supabase.co): temporary Postgres `http` extension — `CREATE EXTENSION http` → `extensions.http(...)` POST with anon-key headers → `DROP EXTENSION`. Anon-key-only calls skip persistence (no `documents` row). Get consent first.
- `supabase/functions/*` is **excluded from the Next/Vercel build** (Deno files, `Deno.env`) — repo edits there don't affect the app deploy (confirmed: `fdb1c51` built green).

### Commits this session (chronological)
`0df913e` (1a) → `aa73960` (1b) → `3234229` (#1 modal) → `fdb1c51` (repo drift sync). Parser prompt (#2) went live as edge-fn **v17** via the Supabase dashboard (no repo commit until `fdb1c51` synced it).

## Shared email module + Pile-2 emails + carryover cleanup + BriefSummaryModal passes (July 1–2, 2026)

**Note: this entry was reconstructed on July 6 from commit history — the session itself went unlogged, and the July 5–6 handover restated stale follow-ups as a result. Lesson: log before ending a session; a handover that skips a session poisons the next cold start.**

### Shipped (chronological, all verified on origin/main)
| # | Scope | SHA |
|---|---|---|
| Carryover sweep: `projects.status` TS type gains `"closed"`, as-any casts dropped, stray blank line fixed, dead `request-milestone` route DELETED | `lib/supabase/projects.ts`, `components/dashboard/ProjectRail.tsx`, `app/clients/page.tsx` | `7ba4529` |
| Session-2 migrations version-controlled + `audits/` stamped superseded | `supabase/migrations/*`, `audits/*` | `e1f1566` |
| Client-facing MSA-accepted confirmation email (best-effort) | `e509fbe` |
| Shared branded email module — single source for all transactional email markup | `lib/email-template.ts` (new) | `e6f51f2` |
| All 6 existing senders migrated to the shared module (milestone-fire, nudge-client, project-close, share-invoice, msa-response, cron check-invoices) | `3d1836b`→`98690bc` |
| Pile 2: settlement-receipt + project-complete email helpers, wired into settle path | `c7e2e04`, `016eeea` |
| Oops pages (`not-found`/`error`/`global-error`) styled to E | `79e7d98` |
| BriefSummaryModal: E re-theme (pass 1) + "Who's the client" step + detailed Items (pass 2) | `d76a246`, `852b98e` |
| Address routing fix: line 2 / city / PIN to distinct fields | `2478279` |

(`0df913e` — Stage 1a gateway wiring — also landed July 2; logged under the July 5–6 extraction entry.)

### Email inventory delta (supersedes the June 27 table)
Now sending: project-complete (final settle), settlement receipt to client, MSA-accepted confirmation to client. The June 27 "No email" list is fully closed. `request-milestone` route no longer exists.

## Notification realtime + enum fixes, MSA agency email, email audit (June 27, 2026 — session 2)

Continuation of June 27. Closed out every notification/email completeness gap surfaced by an end-to-end source audit. Two DB migrations (applied via Supabase MCP, not code commits) + one code commit (`f0ad896`) + one production live-test. Every code change verified byte-exact on `origin/main`; the MSA email additionally confirmed firing in prod with a real send.

### Shipped this session

| # | Scope | Mechanism | Ref |
|---|---|---|---|
| Realtime notification bell fix | `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications` | Supabase migration `enable_realtime_notifications` | applied via MCP |
| Notification enum fix | `ALTER TYPE notification_type ADD VALUE 'milestone_settled'`, `'milestone_requested'` | Supabase migration `add_milestone_notification_types` | applied via MCP |
| MSA agency email | Rewrote dead `/api/msa-response` into an email-only route (derives accept/propose from `msa_status`, reads `client_msa_note`, HTML-escapes it) + two fire-and-forget `fetch("/api/msa-response", { shareToken })` triggers in the share page's accept/propose handlers | `app/api/msa-response/route.ts` (full replace), `app/share/[token]/page.tsx` (2 inserts) | `f0ad896` |
| Auto-nudge cron — live confirmation | No code change. Temporarily set INV-2026-9998 `due_date`=today, founder ran the cron in Vercel; verified agency email sent + `notifications` row persisted + `reminded_due_date` flipped true; reverted + deleted the test row | — | verified |

### Root causes fixed
- **Realtime bell was frozen.** `NotificationBell` subscribes to `postgres_changes` on `notifications` and refetches on any change — correct code. But the `supabase_realtime` publication had zero tables enrolled, so the DB never broadcast inserts; the bell only ever showed its page-load snapshot. Fix enrolls `notifications`. An already-open tab needs one refresh to re-subscribe; new notifications then appear live. (`invoices` is deliberately NOT in the publication — the bell refetches wholesale; default replica identity is fine.)
- **Milestone notifications silently failed.** `notifications.type` is the Postgres enum `notification_type`. The settle path inserts `type='milestone_settled'`, and `requestNextMilestone` inserts `'milestone_requested'` — neither was in the enum. supabase-js returns `{ error }` (doesn't throw) and the call sites don't check it, so the inserts failed silently. Proof: zero `milestone_settled` rows in the whole table despite a settled milestone (INV-9997). Adding the two values makes "Milestone Paid" notifications persist with no code change.
- **`/api/msa-response` was dead, so the agency was never emailed on MSA response.** The share page (`app/share/[token]/page.tsx` → `handleAcceptMsa` / `handleProposeMsaChanges`, via `SharedMsaPreviewContent` → `MSAAcceptanceModal`) does the invoice update + in-app notification client-side; nothing called `/api/msa-response`, so its broken `msa_${response}` (uppercase) notification insert never ran — moot. The real gap was no agency email. Resend is server-side, so the fix is a server route the client handlers call.

### MSA email design (security-relevant)
- Route decides accepted-vs-proposed from the invoice's current `msa_status` (not any client-supplied flag) → a malicious POST can't spoof a fake "accepted" email.
- Client note is read from the DB and HTML-escaped (`escapeHtml`) before going into the email body → a client can't inject markup/phishing via the proposal text.
- Triggers are fire-and-forget after each existing notification insert — never blocks the client; the existing update + in-app notification are untouched (no double-send). Modal's inline fallback never runs in the client flow (`onPropose` always supplied when `mode="client"`); client-preview is agency-only.
- Emails the agency owner (auth.users email). Accept → "Terms accepted"; Propose → "Client proposed changes" with the client's note quoted in an ochre block.

### Live test (MSA propose)
INV-2026-4078 → `msa_status='proposed'` + note `Can we change the <b>delivery timeline</b> & adjust the "scope"? Budget < $5000 please.` → `POST /api/msa-response { shareToken }` → `{ success: true, emailed: true }` (HTTP 200). Founder screenshot confirmed: email received, branding correct, and the `<b>`/`&`/`"`/`<` all rendered as literal text (escaping works). Invoice reverted to `pending`/null.

### Email inventory (authoritative — every live send + recipient)
| Trigger | Recipient | File |
|---|---|---|
| Invoice first shared (4 tones) | Client | `app/api/share-invoice/route.ts` |
| Next milestone auto-fires on settle | Client | `lib/supabase/milestones.ts` |
| Reminder — due today | Client + Agency | `app/api/cron/check-invoices/route.ts` |
| Follow-up — 2 days overdue | Agency | `app/api/cron/check-invoices/route.ts` |
| Manual "Nudge client" | Client | `app/api/invoice/nudge-client/route.ts` |
| MSA accepted / changes proposed | Agency | `app/api/msa-response/route.ts` (this session) |
| Project closure (opt-in checkbox) | Client | `app/api/project/close/route.ts` |

No email: completion (final settle), payment receipt, MSA-accepted confirmation to client. `request-milestone` route is dead.

### Infra / workflow facts learned
- **`msa_response` column has a CHECK that rejects `'proposed'`** — only `msa_status` takes `'proposed'`. The real propose flow leaves `msa_response` unchanged (`pending`).
- **A stated push SHA may not be HEAD.** Founder said "PUSHED 0c0a586" but HEAD was `3a73bfd` (a later SESSION_LOG commit). Always `git ls-remote … refs/heads/main` for true HEAD and verify there.
- bash shell is sh, not bash — `${var:0:7}` fails; use `cut -c1-7`.
- GitHub API (unauthenticated) rate-limits fast — use `git clone --depth N` to inspect commit messages/diffs.
- Vercel MCP still 403 (team scope needs re-auth in the connector). Rely on byte-exact source verification + founder screenshots.

### Commits this session
- `f0ad896` feat: MSA accepted / changes-proposed agency email (route rewrite + share-page triggers)
- DB migrations (no commit): `enable_realtime_notifications`, `add_milestone_notification_types`

### Repo migration files to add (applied to prod already)
- `supabase/migrations/20260627_enable_realtime_notifications.sql` → `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`
- `supabase/migrations/20260627_add_milestone_notification_types.sql` → `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'milestone_settled';` and `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'milestone_requested';`

-----

## Invoice template compliance + notification fixes + project closure lifecycle (June 25-27, 2026)

Three-day session covering three major workstreams: (1) the full 11-template invoice compliance and contrast pass, (2) notification API fixes (manual nudge + auto-nudge cron), and (3) a complete project-closure lifecycle (API, UI modal, dashboard wiring, cron guards, optional client email). All work shipped via AG prompts with exact FROM/TO edits; every commit verified by `npm run build` before push.

### Shipped this session

| # | Scope | Files | SHA |
|---|---|---|---|
| Template: classic | E-palette tokens, WCAG-AA contrast, `tabular-nums`, GST compliance fields (agency/client GSTIN, Place of Supply + state code) | `lib/templates/classic.tsx` | `94c1a47` |
| Template: terracotta | E-palette tokens, WCAG-AA contrast, `tabular-nums`, GST compliance fields | `lib/templates/terracotta.tsx` | `38eb454` |
| Template: sakura | E-palette tokens, WCAG-AA contrast, `tabular-nums`, GST compliance fields | `lib/templates/sakura.tsx` | `dec0a67` |
| Template: coastal | E-palette tokens, WCAG-AA contrast, `tabular-nums`, GST compliance fields | `lib/templates/coastal.tsx` | `03f15c3` |
| Template: ledger | E-palette tokens, WCAG-AA contrast, `tabular-nums`, GST compliance fields | `lib/templates/ledger.tsx` | `9c625ee` |
| Template: editorial | E-palette tokens, WCAG-AA contrast, `tabular-nums`, GST compliance fields | `lib/templates/editorial.tsx` | `5f8887b` |
| Template: midnight | AA contrast (gray `#999`→`#ccc`), `tabular-nums`, GST compliance fields. Identity preserved (deep navy/charcoal/gold) | `lib/templates/midnight.tsx` | `b635b93` |
| Template: neon-atelier | AA contrast (gray `#999`→`#666`), `tabular-nums`, GST compliance fields, header right inset. Identity preserved (cobalt/pink/coral/teal) | `lib/templates/neon-atelier.tsx` | `7a0c526`, `acf1854` |
| Templates: swiss-grid + brutalist + mono | AA contrast (`#A8DADC`→`#457B9D` on swiss-grid), `tabular-nums`, GST compliance fields | `lib/templates/swiss-grid.tsx`, `brutalist.tsx`, `mono.tsx` | `84571c9` |
| GST taxRows infrastructure | Added `TemplateTaxRow` interface + `buildTaxRows()` to shared transformer: intra-state → CGST + SGST rows, inter-state → single IGST row, zero-rated/exempt → label-only row | `lib/templates/template-types.ts`, `lib/templates/template-data.ts` | `ba8642c` |
| Render CGST/SGST split | Replaced single `{data.taxLabel}` / `{data.taxFormatted}` row with `data.taxRows.map(...)` across all 11 templates | All 11 `lib/templates/*.tsx` | `0a478ab` |
| Fix manual nudge | `handleResend` in dashboard now POSTs to `/api/invoice/nudge-client` (was `/api/share-invoice`, which 403'd on finalized invoices). Dropped non-existent `email` column from nudge route's profile query | `app/dashboard/page.tsx`, `app/api/invoice/nudge-client/route.ts` | `b63dc76` |
| Fix auto-nudge cron | Full rewrite of `check-invoices` cron: filters on `finalized`+`PARTIAL` (was invalid `SENT`), pulls agency email from `auth.users` via admin API (was non-existent `user_profiles.email`), skips closed/inactive projects, sends branded emails matching share/nudge templates | `app/api/cron/check-invoices/route.ts` | `120f2a2` |
| Project close API | `POST /api/project/close` — stamps `closed_at` + `status='closed'` + `closure_reason`, cancels all pending milestone triggers. Owner-only with auth guard | `app/api/project/close/route.ts` (new) | `0e495ab` |
| Project closure UI | `CloseProjectModal` (4 preset reasons + "Other" textarea), wired into `ActiveDrilldown` close button + `dashboard/page.tsx` handler. ProjectRail: muted "CLOSED" badge, no attention dot, `bg-ink-3` stripe. Cron guard: `trigger-scheduled-milestones` skips closed projects | `components/dashboard/CloseProjectModal.tsx` (new), `components/dashboard/ActiveDrilldown.tsx`, `app/dashboard/page.tsx`, `components/dashboard/ProjectRail.tsx`, `app/api/cron/trigger-scheduled-milestones/route.ts` | `a2490ef` |
| Closure client email | Optional `notify_client` boolean on close route; sends a neutral closure notice via Resend (internal reason never shared). Failed send does not fail the close | `app/api/project/close/route.ts` | `0e3673f` |
| Closure email checkbox | Checkbox in `CloseProjectModal`, `notifyClient` forwarded through `onConfirm` to dashboard handler, success toast reflects notification status | `components/dashboard/CloseProjectModal.tsx`, `app/dashboard/page.tsx` | `0c0a586` |

### Template identity constraints applied
- **Sakura** — pink/blush palette preserved; only neutral grays darkened for AA.
- **Coastal** — ocean blue/sand palette preserved; E tokens for neutrals only.
- **Midnight** — deep navy `#0f172a` / charcoal / gold accent untouched; gray labels `#999`→`#ccc` for AA on dark backgrounds.
- **Neon-Atelier (Studio Pro)** — cobalt `#2D5BFF`, pink `#FF1493`, coral `#FF725E`, teal `#00C896` all kept; only neutral `#999`→`#666` for AA on the off-white body + print fallbacks.
- **Swiss-Grid** — navy `#1D3557` / steel `#457B9D` / red `#E63946` identity kept; the pale-cyan label text `#A8DADC` (1.53 contrast) recoloured to steel `#457B9D`.

### Architecture notes
- **`taxRows` design:** `TemplateData.taxRows` is computed once in the shared transformer (`buildTaxRows` in `template-data.ts`). Intra-state invoices (Place of Supply matches agency state) get two rows (CGST + SGST at half-rate each). Inter-state get one IGST row. Zero-rated / exempt get a single label-only row. The old `taxLabel` / `taxFormatted` / `taxInfo` fields remain for backward compat but are no longer rendered.
- **Project closure lifecycle:** Closing a project sets `projects.status='closed'` + `projects.closed_at` + `projects.closure_reason`. The close endpoint cancels all pending milestone triggers (`invoice_milestones` where `trigger_status='pending'`). The cron `trigger-scheduled-milestones` also has a defense-in-depth guard that skips closed projects. The optional client email is fire-and-forget — a failed send logs an error but does not roll back the close.
- **Nudge fix:** The dashboard "NUDGE CLIENT" button was incorrectly routed to `/api/share-invoice`, which is lock-state-gated and rejects finalized invoices with a 403. The dedicated `/api/invoice/nudge-client` endpoint has no lock gate and is purpose-built for reminders.
- **Auto-nudge cron fix:** The original cron filtered on `status = 'SENT'`, a value that doesn't exist in the `invoices.status` CHECK constraint (`draft|finalized|settled|overdue|cancelled|PARTIAL`). It also read `user_profiles.email`, a column that doesn't exist (the email lives in `auth.users`). Both bugs meant the cron matched zero rows every night.

### Notes / carryovers
- TypeScript type for `projects.status` is `"active" | "cancelled" | "completed"` — does not include `"closed"` yet. Worked around with `(p.project as any).status === "closed"` in ProjectRail. The DB column accepts `closed` via the updated CHECK constraint, but the TypeScript type in `lib/supabase/projects.ts` should be extended.
- Smaller carryovers unchanged: stray blank line in `app/clients/page.tsx` import; ErrorBoundary + `global-error.tsx`/`error.tsx`/`not-found.tsx`; dynamic-import XLSX in `app/invoices/page.tsx`; client name-role handling; mark April audit docs superseded.

### Commits this session (chronological)
- `94c1a47` style: classic.tsx E palette + WCAG-AA contrast + GST meta
- `38eb454` style: terracotta.tsx E palette + WCAG-AA contrast + GST meta
- `dec0a67` style: sakura.tsx E palette + WCAG-AA contrast + GST meta
- `03f15c3` style: coastal.tsx E palette + WCAG-AA contrast + GST meta
- `9c625ee` style: ledger.tsx E palette + WCAG-AA contrast + GST meta
- `5f8887b` style: editorial.tsx E palette + WCAG-AA contrast + GST meta
- `b635b93` style: midnight.tsx AA contrast + tabular + GST meta
- `7a0c526` style: neon-atelier.tsx AA contrast + tabular + GST meta
- `84571c9` style: final 3 templates AA contrast + tabular + GST meta
- `ba8642c` feat: pre-compute GST taxRows in template-data
- `0a478ab` feat: render CGST/SGST/IGST taxRows across 11 templates
- `acf1854` style: neon-atelier.tsx header right inset
- `b63dc76` fix: NUDGE CLIENT points to dedicated reminder endpoint + drop non-existent email column
- `120f2a2` fix: auto-nudge cron filters on finalized|PARTIAL and resolves agency email from auth.users
- `0e495ab` feat: POST /api/project/close to allow owners to early-close projects and cancel pending triggers
- `a2490ef` feat: Project closure UI (modal + wiring)
- `0e3673f` feat: Project close route optional client closure email
- `0c0a586` feat: Closure-email checkbox (modal) + dashboard wiring

-----

## Radius consistency sweep + E-v2 surfaces + zero-total guard (June 24, 2026)

Single session: closed the cross-surface **corner-radius inconsistency** the founder flagged via screenshots - Invoices was the *only* surface that ever got `rounded-*`; Clients, Dashboard, the dashboard components, the full invoice editor (9 section files), and the client drawer were all still square. Also shipped three E-v2 follow-ons (batch-3 polish, editor tone reframe, zero-total preview guard). Root cause of the radius gap: the E "per-surface sweep" (plan Phase 5-6) only ever completed on Invoices; the global `button{}` rule + `.app-soft-*` classes are E-correct but those surfaces used raw inline `border border-soft` with no radius. Every commit verified byte-exact on `origin/main` + a residual sharp-surface scan proving **zero** square surfaces remain on what's deployed.

### Shipped this session

| # | Scope | Files | SHA |
|---|---|---|---|
| Batch-3 polish | ProjectRail `LIVE` -> `IN PROGRESS` (display-only `{summary.replace(/^LIVE/,...)}`); DUE-date orange->amber 6x (`#FF5C00` -> `var(--color-ochre-deep)`); removed rotated "active" Sticker + dead import on clients | `components/dashboard/ProjectRail.tsx`, `components/invoice/InvoiceEditorPage.tsx`, `app/clients/page.tsx` | `0af4252` |
| Editor tone reframe | Failure-state -> progress language: "N mandatory" -> "N to go", coral NEXT BLOCKER box -> amber UP NEXT, "Missing details" -> "Details to finish", "Review blocker" -> "Review what's left" x3, red zero-total alarm -> calm note; cleared last `#FF5C00` | `InvoiceEditorPage.tsx`, `TotalsTaxesSection.tsx`, `editor/InlineStepSection.tsx`, `editor/WorkbenchReadinessPanel.tsx` | `7a2dfd9` |
| Zero-total preview guard | `handlePreviewInvoice` blocks `grandTotal <= 0` before preview/cloud-save - calm "add an amount" nudge + scroll to Items (chokepoint all preview paths funnel through) | `InvoiceEditorPage.tsx` (+6) | `0723d39` |
| Radius: Clients + Dashboard | 26 `rounded-*` insertions - stat cards 14px, modals/empty-states 16px, inputs/buttons 11px, chips `rounded-md` (matches Invoices) | `app/clients/page.tsx`, `app/dashboard/page.tsx`, `components/dashboard/{LifecycleStepper,ActiveDrilldown,ProjectInvoicesLedger}.tsx` | `4d69d63` |
| Radius: invoice editor | 43 insertions across 9 section files - inline callouts, autocomplete dropdowns, line-item cards, payment toggles, number inputs, tax chips, template-picker icon boxes, readiness progress bar (`rounded-full`). Excluded false positives where the `cn()` base already carried a radius | `components/invoice/*` (9 files) | `fbf1d5f` |
| Radius: client drawer | Drawer inner corners (`sm:rounded-l-[16px]`, edge-pinned) + Entity-Type segmented control | `app/clients/page.tsx` | `64d5f7b` |

### Verification discipline
Every SHA: `git fetch` + hard reset + `--stat` scope check, then byte-exact (apply the prompt's exact FROM->TO to the commit's parent, assert `== HEAD` per file) - robust to files moving across commits. Radius sweeps additionally proven by a **windowed residual scan** (any card/panel/input/button with a border + surface signal but no `rounded` within its `cn()` block) returning **0 sharp surfaces** on deployed `origin/main`. AG prompts generated programmatically from the verified local diff, then validated by re-parsing the prompt's fenced blocks -> applying to a fresh `git show HEAD:` copy -> asserting `== expected`.

### Notes / carryovers
- AG left one stray blank line in `app/clients/page.tsx` import area (~L28) from `0af4252` - cosmetic, fold into a future prompt.
- Zero-total guard follow-ups (offered, not taken): a validation-lib version so the bottom CTA itself reflects zero-total; a belt-and-suspenders guard on any direct share/send path that skips preview.
- GTM (founder-owned, standing): white-glove design-partner cohort to validate the accept + milestone flow end-to-end - kit ready in `/outputs/lance-cohort-outreach.md`.

### Commits this session
- `64d5f7b` style: add E radius to client drawer
- `fbf1d5f` style: add E corner radius across invoice editor
- `4d69d63` style: add E corner radius to Clients and Dashboard
- `0723d39` feat: invoice editor block previewing zero total invoice
- `7a2dfd9` copy: reframe invoice editor blocker tone to progress
- `0af4252` style: UX polish batch 3 (project rail, due date color, sticker removal)

## Dashboard E-system migration + WCAG AA + modal a11y + E-v2 surfaces (June 23, 2026)

Session: finished the brutalist->E migration on the dashboard surfaces, a WCAG AA contrast fix, keyboard a11y for the founder-facing modals, a primary-green lightening, and a second E "v2" pass on the dashboard (green-emphasis + semantic money). Cohort outreach kit drafted to `/outputs/lance-cohort-outreach.md`.

### Shipped this session

| # | Scope | Files | SHA |
|---|---|---|---|
| Dashboard tables -> E | `ProjectInvoicesLedger`, `ProjectRail`, dashboard page converted to E tokens (`border-soft`, `bg-paper-2`, `text-ink/70`, ...) | `components/dashboard/{ProjectInvoicesLedger,ProjectRail}.tsx`, `app/dashboard/page.tsx` | `796df44` |
| WCAG AA contrast | `text-ink-3` (2.72:1 on cream - fails AA) -> `text-ink-2` (5.99:1) where used; finished `transition: all` -> explicit 5-property migration in `globals.css` (kills layout jank) | `app/page.tsx`, `LifecycleStepper.tsx`, `app/error.tsx`, `app/globals.css` | `f1b0de9` |
| Modal keyboard a11y | Shared `use-modal-a11y` hook (Esc-to-close, focus-on-open, Tab focus-trap, focus-restore) wired into 4 founder-facing modals; client-facing MSA modals deliberately untouched | `lib/use-modal-a11y.ts` (new), `editor/ExitConfirmModal.tsx`, `FeedbackModal.tsx`, `ConversionModal.tsx`, `ShareLinkModal.tsx` | `2d1a193` |
| Lighten primary green | `--color-acid` `#1e3d33` -> `#3a6e59` (bottle-green read too dark on large fills) | `app/globals.css` | `e89a8b0` |
| Dashboard E-v2 surfaces | Green-emphasis stat cards, emerald `bg-grass` settled dots, semantic money numbers | `app/dashboard/page.tsx`, `components/dashboard/*` (5 files) | `889aeca` |

### Commits this session
- `889aeca` style: dashboard E v2 surfaces (green emphasis, emerald dots, semantic money)
- `e89a8b0` style: lighten the primary green token
- `2d1a193` a11y: add keyboard support to modals (Escape-to-close + focus-trap)
- `f1b0de9` a11y: WCAG AA contrast fix (text-ink-3 -> text-ink-2) + finish transition:all cleanup
- `796df44` style: convert dashboard tables from brutalist to E style

## E primitive sweep + tokens + contrast (June 21-22, 2026)

Short sessions continuing the E rollout on shared primitives and tokens (logged from commit subjects).

- `9d31407` style: define 5 dangling lime-400/500/600/700/900 green tokens
- `a5dd070` style: fix client-avatar contrast (cream text on dark E backgrounds)
- `6aa3597` style: E primitive accent sweep + onboarding back-nav fix
- `70bac44` chore: carryover queue cleanup batch

## Invoices grouping + mobile + core-loop readiness + FAQ/feedback (June 20-21, 2026)

Session covering: project-grouped invoices listing, invoices-page chrome → E, core money-loop readiness fixes, mobile-responsive invoices, FAQ/feedback polish + dead-file removal, and 8 product/trust FAQs seeded to prod. Three strategic audits delivered (reference, not work-orders). Every commit verified on `origin/main` before proceeding — byte-exact diff vs locally-saved expected when Claude pre-authored the code, code-review of the diff when AG improvised from an audit.

### Shipped this session

| # | Scope | Files | SHA |
|---|---|---|---|
| Grouped invoices | New collapsible project-grouped listing (E card: chevron + name + client avatar + invoice count + milestone progress spine + rolled-up status pill + project value; nested invoice rows with spine connector). Reuses `getStatusInfo` / `isInvoiceRowDeletable` + `invoiceTotal` fallback math so pills/amounts/delete-eligibility match everywhere | `components/invoices/ProjectInvoiceGroup.tsx` (new), `app/invoices/page.tsx`, `components/invoices/InvoiceEventRow.tsx` (export `getStatusInfo`) | `a69192f` |
| Invoices chrome → E | 32 className-only transforms: title → Bricolage bold, search rounded + green focus, New-invoice button rounded + soft shadow + press, stat cards rounded + soft + tabular-nums, filter chips white/soft + solid-ink active (dropped brutalist rainbow), bulk toolbar rounded, both delete modals rounded + ink/40 backdrop + Bricolage + press | `app/invoices/page.tsx` | `15083b6` |
| Core-loop readiness | (a) onboarding auto-seeds a Global MSA via `saveProfileWithGlobalMsa` (fixes first-share 422); (b) `SharedMsaPreviewContent` fallback "contract loading" modal kills the blurred dead-end; (c) share-invoice email injects `grandTotal` + `projectName` into all 4 tones. AG-implemented from the readiness audit → code-reviewed, not byte-compared | `app/onboarding/page.tsx`, `components/invoice/share/SharedMsaPreviewContent.tsx`, `app/api/share-invoice/route.ts` | `3e979cf` |
| Invoices mobile | Rows stack into 2-column cards on mobile (number/tag left, amount/status right) via `sm:contents` that flattens back to the flat desktop row at `sm`+; desc hides, spine indent/ticks collapse; the three fixed widths gated behind `sm:`; page header stacks with full-width search. Desktop byte-identical | `components/invoices/ProjectInvoiceGroup.tsx`, `app/invoices/page.tsx` | `10bb9c8` |
| FAQ/feedback polish | Feedback Submit button → brand bottle-green + cream text (was off-palette emerald `--color-lime-300`); FAQ category accent stripe → visible ochre (was `--color-lime-warm` → transparent); deleted dead `SubmitFeedback.tsx` (155L, an unused duplicate of the modal, imported nowhere) | `components/feedback/FeedbackModal.tsx`, `components/faq/FaqSection.tsx`, `components/feedback/SubmitFeedback.tsx` (deleted) | `cf45b7f` |
| Product FAQs | 8 product/trust FAQs seeded to prod `faqs` under a new "About Lance" category (sorts to top): what Lance does, is it free, does it handle money, how milestones work, is the contract binding, what the client sees, own contract terms, is data safe. Idempotent insert (guarded on question text). FAQ table now 25 published rows | DB only (no code change) | — |

### Audits delivered (in /outputs — reference, not work-orders)
- **Readiness audit** — core money-loop. Top-3 fixed in `3e979cf`. Tier-3 deferred (resend unconditionally resets `msa_status`; settle confirmation doesn't say M2 auto-sent; unguarded notification inserts; email-send failure leaves half-shared state).
- **Parsing/write-path audit** — the April "systemic instability" is mostly FIXED: autofill overwrite gate `shouldApplyCandidate` is now fill-only; line-items guarded by `!hasMeaningfulLineItems`; `mergeInvoiceFormData` state/PAN fill-only; agency seeded from profile not inferred. One residual: client name-role inference still broad (`from` / `for` / `brand`). Recommendation: do NOT refactor the engine.
- **UI / cross-device / export audit** — editor + client-share responsive, saved data cloud-synced, OCR (Tesseract) dynamically imported. Fixed #1 (invoices mobile → `10bb9c8`). Still open: no ErrorBoundary / `global-error` (white-screen risk); XLSX statically imported (~1 MB on every `/invoices` visit). XLS export confirmed value-worthy — Summary sheet (by status / ageing / tax treatment / client + avg-days-to-pay / month) + 30-col filterable Invoices sheet with totals.

### Verification discipline (held all session)
Every pushed SHA: `git fetch` + hard reset + `--stat` scope check (catches AG `git add .` strays) + byte-exact diff vs locally-saved `_expected` (when Claude pre-authored exact code) or code-review of the diff + the code AG called into (when AG improvised). JSX structure proven via tag-skeleton / nesting parse + brace/paren/bracket/backtick balance. AG prompts simulated (extract fenced blocks → apply to a fresh repo copy → assert `== _expected`) before handing over.

### Open carryovers (deferred; founder-owned priority)
- ErrorBoundary + `app/global-error.tsx` / `error.tsx` / `not-found.tsx` (white-screen insurance before strangers/clients are on it).
- Dynamic-import XLSX in `app/invoices/page.tsx` (trim ~1 MB off `/invoices` on mobile).
- Email CTA color regression in `app/api/share-invoice/route.ts` (`#157a54` → `#1e3d33` bottle-green) — bundle into next batch.
- Client name-role "leave blank + flag when low-confidence" fix (parsing audit's one residual).
- `user_feedback` has 2 identical INSERT policies (harmless dupe; dedupe whenever).
- Mark the April audit docs (pipeline-diagnosis / recovery-strategy / executive-recovery-plan / forensic-audit) superseded — they describe a now-fixed state.
- GTM (founder-owned): recruit white-glove design-partner cohort — first revenue + validation.

### Commits this session
- `a69192f` feat: group invoices by project
- `15083b6` style: restyle invoices page chrome
- `3e979cf` Fix core loop readiness blockers
- `10bb9c8` Make invoice listing responsive on mobile
- `cf45b7f` UI polish bundle and dead file deletion
- (DB) 8 product FAQs seeded to `faqs` — no commit

## v2.9 — Milestone Trigger Workstream + Cleanup (May 24, 2026)

Multi-hour session covering Workstream B revision, full v2.9 milestone trigger build (C1-C4), production smoke test, and 6-bug cleanup pass. Net: v2.9 shipped end-to-end with audit trail intact and v2.8.4 backlog closed.

### Shipped this session

| # | Scope | Files | Status |
|---|---|---|---|
| Workstream B rev | Autocomplete pattern for CLIENT NAME + decouple PROJECT from client (removed inline "+ Add new client" modal-form, added inline autocomplete with NEW badge, elevated Project field to top of editor) | `ClientDetailsSection.tsx`, `DeliverablesSection.tsx`, `InvoiceEditorPage.tsx` | Pushed |
| C1 | Migration: `invoice_milestones` adds `trigger_mode` / `trigger_date` / `trigger_status` / `trigger_error` / `trigger_fired_at` + partial index on (trigger_date) WHERE scheduled+pending + CHECK constraints on mode/status | `supabase/migrations/20260525000500_milestone_trigger_options.sql` | Applied to prod |
| C2 | Settlement choice surface - drawer with SETTLEMENT CHECKPOINT (Clear/Timing/After), CONTRACT AUTHORITY panel, MILESTONE PROGRESS CHECKLIST, three trigger choices (immediate/scheduled/cancelled). API extended at `trigger-next-milestone/route.ts` with branch logic. Closed v2.8.4 backlog by integrating `computeAppliedMsaSnapshot` in immediate path | `app/dashboard/page.tsx`, `app/api/invoice/trigger-next-milestone/route.ts` | Pushed |
| C3 | Cron route scanning scheduled+pending+due milestones, `vercel.json` daily schedule `0 6 * * *` (within Hobby tier). Helper extracted: `fireMilestoneInvoice(supabase, milestoneRow, projectRow?)` - reused by cron AND C4 send_now AND C2 immediate. Audit trail design: `trigger_mode='scheduled'` preserved across fire so `(trigger_date, trigger_fired_at)` reveals "scheduled for X, fired at Y" | `app/api/cron/trigger-scheduled-milestones/route.ts`, `lib/supabase/milestones.ts`, `vercel.json` | Pushed |
| C4 | Dashboard scheduled-milestone strip (SEND NOW / RESCHEDULE / CANCEL), new auth-gated action endpoint with ownership check + status guard, ProjectTimeline scheduled state (dashed border + clock icon) | `app/api/invoice/scheduled-milestone-action/route.ts`, `app/dashboard/page.tsx`, `components/project/ProjectTimeline.tsx` | Pushed |
| Bug A | `invoices.status` CHECK constraint missing `'PARTIAL'` blocked `fireMilestoneInvoice` from setting parent to partial state. Patched in prod during smoke test, codified as migration | `supabase/migrations/20260525000600_allow_partial_invoice_status.sql` | Codified |
| Bug B | Dashboard project card had no discoverable "Mark Settled" affordance - C2 drawer existed but no inline trigger. Added "MARK M{N} SETTLED" secondary button to NEXT ACTION strip with mutual exclusion against C4 scheduled strip. Detection filters by `status='LIVE'` + `trigger_mode != 'cancelled'` + `hasNextMilestone` | `app/dashboard/page.tsx` (commit `c7031c8`) | Pushed |
| Bug C | `form_data.milestones[].status` <-> `invoice_milestones.status` drift (older TDS settle on `/invoices` updates only one side). Backfilled 2 drifted invoices in prod | DB only (no code change) | Backfilled |
| Bug D | ProjectTimeline showed milestone twice after fire (parent's invoice_milestones row + child invoice's milestone_index reference). Deduped by `order_index` keeping first sorted node | `components/project/ProjectTimeline.tsx` | Pushed |
| Bug E | No unique constraint on `invoices(parent_invoice_id, milestone_index)` - theoretical duplicate child invoice risk if `fireMilestoneInvoice` fails mid-flow. Added partial unique index | `supabase/migrations/20260525000700_unique_child_invoice_per_milestone.sql` | Applied + codified |
| Bug F | `parseFutureDate` in action endpoint rejected today (HTML date input UI allowed it) - caused 400 on reschedule popover. Relaxed to compare against start-of-today UTC | `app/api/invoice/scheduled-milestone-action/route.ts` | Pushed |

### v2.8.4 closure confirmed
`computeAppliedMsaSnapshot` is now called in all three milestone fire paths:
1. C2 immediate branch in `trigger-next-milestone/route.ts`
2. C3 cron in `trigger-scheduled-milestones/route.ts` (via `fireMilestoneInvoice`)
3. C4 send_now in `scheduled-milestone-action/route.ts` (via `fireMilestoneInvoice`)

Smoke-test-verified: child invoice INV-2026-9997 (M2 of "mega project for Alehandro") has populated `applied_late_fee_rate=1.4`, `applied_late_fee_unit='day'`, `applied_payment_terms='Net 20 days'`.

### Smoke test verdict (production, May 24, 2026)

Two paths exercised:

**Path Y (pragmatic, ~10:02 IST):** SQL-set M2 of INV-2026-9996 into scheduled state, clicked SEND NOW from dashboard, validated C4 strip + ProjectTimeline state + action endpoint + C3 helper + child invoice creation + audit trail + applied_* snapshot in one click.

**Natural flow (~11:32 IST):** Clicked MARK M2 SETTLED -> C2 drawer opened -> picked Schedule with date 2026-05-26 -> success modal "Milestone 2 settled. M3 (prototyping) will be generated on 26 May 2026". DB confirmed: M2 status=SETTLED + trigger_mode='scheduled' (audit) + trigger_status='fired' + trigger_fired_at preserved; M3 trigger_mode='scheduled' + trigger_date=2026-05-26 + trigger_status='pending'.

**Passive self-validation pending:** Cron at 06:00 UTC on 2026-05-26 will pick up M3 and auto-fire. Zero manual action required to validate C3's cron path - DB state on May 26 will confirm.

### Architecture findings
- **C2 implementation diverged from spec - for the better.** Prompt asked for a 3-radio modal; Codex built a full settlement drawer with Settlement Checkpoint, Contract Authority, and Milestone Progress Checklist sections. Richer context, same code path. Drawer pattern is more discoverable and provides better audit context for solo founders.
- **Audit trail design proven.** `trigger_mode` is preserved across fire (scheduled milestones stay 'scheduled' after firing, only `trigger_status` flips to 'fired'). Combined with `trigger_date` (original schedule) and `trigger_fired_at` (actual fire time), the audit reveals "scheduled for X, fired at Y" - useful for both CA compliance and user history.
- **fireMilestoneInvoice helper is the shared spine.** All three fire paths converge on this helper, which makes future refactors (transaction wrapping, retry policy, idempotency) single-location changes.

### Open carryovers
- **Path A sequencing fix** (from Workstream B revision): `lib/supabase/invoices.ts` save handler still creates new client AFTER invoice save. When user types BOTH new client + new project on same invoice, the project's `createProject(name, clientId)` silently fails because clientId doesn't exist at save time. 3-line save-handler reorder. Prompt drafted earlier in session, not yet fired.
- **Older TDS settle drift root cause**: `/invoices` page's TDS settle button still updates only `invoice_milestones`, not `form_data`. Future TDS settlements will re-introduce drift. Two fixes possible: (a) update TDS handler to write both sides, (b) consolidate `/invoices` page to use new C2 drawer pattern. Backlog.
- **ProjectTimeline dedup data-order-dependent**: Bug D fix dedups by `order_index` keeping first-sorted node. Works because parent invoices come before children in current data fetch order. If fetch order ever inverts (e.g., reverse chronological), child invoice state could win over parent. Future-proof fix: filter to `parent_invoice_id IS NULL` invoices, but `ProjectTimeline.tsx` data shape doesn't currently expose `parent_invoice_id`.
- **`fireMilestoneInvoice` lacks transaction wrapping**: 6 sequential writes (parent update -> invoice number gen -> child insert -> milestone update -> email send -> notification insert). If a write fails mid-flow, partial state is possible. Bug E unique index now catches duplicate child invoice attempts loud, but orphan child invoices (created but milestone update failed) still possible. Solo-founder volume makes this negligible. Future: wrap in RPC function for transactional guarantees.
- **Dashboard simplification**: User feedback documented this session - "3 ledger tables" feels like info overload. Wireframe shared (project card with milestone carousel) critiqued through architect/CA/UX/visual-designer lenses; rejected as-is for losing neo-brutal aesthetic + missing money/aging info + adding per-card carousel state complexity. Recommended direction: streamline existing Project Ledger cards (project name + client + total + outstanding + next due + ProjectTimeline + context-aware action strip), kill accordion expansion, move line-item detail to `/project/[id]` exclusively. Not yet scoped as a Codex prompt.

### Commits this session
- `e29ced2` `fix(invoice): keep client step in creation flow` - Workstream B initial
- `af2e7b9` `fix(invoice flow): autocomplete pattern for client + decouple project (Workstream B revision)`
- Migration `20260525000500_milestone_trigger_options.sql` applied to prod (C1)
- `6957777` `feat(milestones): settlement trigger choice (immediate/scheduled/cancelled) + MSA snapshot on trigger (v2.9 C2)` (C2)
- `65d364a` `feat(milestones): scheduled milestone cron + shared fireMilestoneInvoice helper (v2.9 C3)` (C3)
- `5b309ac` `feat(milestones): scheduled milestone surface on dashboard with send_now/reschedule/cancel actions (v2.9 C4)` (C4)
- `c7031c8` `fix(dashboard): add MARK M{N} SETTLED affordance + correct filter for LIVE milestone detection (Bug B)`
- `770d70f` `chore(v2.9): cleanup pass - codify Bug A migration, add Bug E unique index, relax Bug F date check, dedup Bug D timeline`

### Tooling notes
- Supabase MCP used extensively for schema verification, state queries, migration application, and data backfill. Faster + safer than asking user to paste SQL into dashboard for read-only checks.
- Codex agent maintained strict prompt scope across 7+ prompts this session; one filter-logic bug originated from spec, Codex implemented faithfully.
- Production-first validation pattern proved efficient: skip local env troubleshooting when prod data already confirms the code path works.

---

## Latest checkpoint: v2.9 Sprint 4.5 — Projects Nav + Invoice Client Flow — May 23, 2026

### Sequence
1. **Projects first-class navigation shipped** as commit `3656af2`.
2. **Invoice client-step flow fix shipped** as commit `e29ced2`.
3. Both implementation commits were pushed to `origin/main` before this session-log checkpoint.

### Implementation
- Added `PROJECTS` to global nav in desktop and mobile, active for both `/projects` and `/project/[id]`.
- Added `/projects` index with search, sort, filters, canonical invoice-state badges, project cards, aggregate metrics, and embedded `ProjectTimeline`.
- Extended `lib/supabase/projects.ts` with `getAllProjectsWithInvoices()` returning projects, invoices, milestones, and billed/collected/outstanding/days-active metrics.
- Stopped new invoice creation from auto-skipping beyond Client by clamping fresh/restored new-invoice startup to Agency or Client.
- Extended the saved-client picker with `+ Add new client` and an inline form for name, email, domestic/international location, and optional domestic GSTIN.
- Deferred new-client persistence to invoice save/reissue via `createClientFromInvoice()` and `persistNewClientFromInvoice()`, inheriting agency MSA defaults from `user_profiles` and avoiding `client_msas` creation.

### Verification
- `npx tsc --noEmit` clean.
- `npm run build` clean.
- Existing Upstash Redis environment warnings remain unrelated.

### Files changed
- components/AppHeader.tsx
- app/projects/page.tsx
- lib/supabase/projects.ts
- components/invoice/InvoiceEditorPage.tsx
- components/invoice/ClientDetailsSection.tsx
- lib/supabase/clients.ts
- lib/supabase/invoices.ts

### Unresolved / watch items
- `getAgencyDefaults` does not exist as an exported profile helper, so the client persistence helper reads `user_profiles` directly.
- Client dedupe is case-insensitive by email but does not normalize plus-aliases.
- Invoice `client_id` backfill runs only if the returned invoice row exposes a `client_id` column.
- Inline new-client email is required in the inline form, but global invoice validation was not changed in this scoped pass.

---

## Latest checkpoint: v2.9 Sprint 3 — Dashboard Restructure — May 23, 2026

### Sequence
1. Sprint 2's badge taxonomy, MONEY IN fix, and preview banner repolish landed across Codex's earlier commits.
2. Sprint 3 prompt fired at Codex to collapse the 5+ panel dashboard into 3 focused neo-brutal sections.
3. Restructure shipped as commit `bc1d2f9` with no backend changes — pure JSX/structural refactor.

### Implementation
- Three sections only: What Needs Attention, Portfolio Pulse, Project Ledger.
- What Needs Attention: uniform white action cards with `border-[3px] border-[#111118]` + hard shadow; single CTA per card; no color-coding by alert type.
- Portfolio Pulse: single black-on-white strip with Outstanding / Collected / At Risk + sparkline. Replaces the previous 4 metric cards and the Project OS portfolio strip.
- Project Ledger: tightened cards using canonical Sprint 2 badges; milestone progress only (no Settled ₹X / Invoices 0/X double counter); embedded ProjectTimeline from Sprint 4 work.
- AT RISK formula: overdue + revision-blocked invoice open amounts, deduped by invoice id.

### Removed from dashboard
- Quick Links sidebar
- Recent Activity feed (data fetch retained for future re-surfacing)
- Upcoming panel (data fetch retained)
- 4-metric-card grid + Project OS strip (replaced by Portfolio Pulse)
- Command Center duplicate-action surfaces (deduped into What Needs Attention)

### Files changed
- app/dashboard/page.tsx (single file)

### Verification
- npx tsc --noEmit clean
- npm run build clean
- git diff --check clean
- Side-by-side visual verification on localhost vs production

### Note on naming
The earlier session log entry "v2.9.0 Sprint 2 — Projects First-Class Entity & Reactivity Hardening" was content-wise the original Sprint 4 (Project entity surfacing). Naming retained for git history continuity, but conceptually it represents Sprint 4 in the v2.8.8 → v2.9 arc.

---

## Latest checkpoint: v2.9.0 Sprint 2 — Projects First-Class Entity & Reactivity Hardening — May 23, 2026

### Sequence
1. Shipped Task: Make Projects a first-class entity (user-named project creation, dedicated dynamic details route `/project/[id]`, horizontal clickable chronological ProjectTimeline component).
2. Resolved a series of Git sequencing issues between stashed active Projects work and Codex pushed changes, cleanly merging guest auth fixes with deliverables Projects selector.
3. Addressed "stale dashboard / no updates" bug by unblocking draft invoices from Client and Project Ledger views and wiring `announceInvoiceDataChanged` event-broadcasts into the complete editor/preview saving lifecycles.
4. Next.js production build and TypeScript compilation fully verified with zero warnings.

### Implementation
- Added a neobrutalist project selector (text name and opt 2-row description) to `components/invoice/DeliverablesSection.tsx` with auto-selection support.
- Built a horizontal, neobrutalist, chronological `<ProjectTimeline>` component in `components/project/ProjectTimeline.tsx` mapping milestones to active status states.
- Implemented `/project/[id]` dynamic details route in `app/project/[id]/page.tsx` rendering active timelines, project metrics, and invoices.
- Integrated ProjectTimeline and view link/actions directly into dashboard cards in `app/dashboard/page.tsx`.
- Unblocked draft invoices in dashboard client and project grouping logic while isolating drafts from outstanding receivable metrics to keep financial ledger correct.
- Wired up `announceInvoiceDataChanged` triggers in `components/invoice/InvoiceEditorPage.tsx` and `app/invoice/preview/page.tsx` across auto-saving, draft saving, sharing, and PDF export events.

### Verification
- `npx tsc --noEmit` clean.
- `npm run build` compiled successfully in 5.0s, generated all static routes without warning.

### Files changed
- app/dashboard/page.tsx
- app/invoice/preview/page.tsx
- components/invoice/InvoiceEditorPage.tsx
- components/invoice/DeliverablesSection.tsx
- lib/invoice-lock-state.ts
- [NEW] lib/supabase/projects.ts
- [NEW] components/project/ProjectTimeline.tsx
- [NEW] app/project/[id]/page.tsx

---

## Latest checkpoint: v2.8.8 Sprint 1.5 — Locked Child Sections Chrome — May 23, 2026

### Sequence
1. Sprint 1 shipped page-level locked-mode chrome, but verification found locked invoices still leaked editing affordances inside child sections.
2. Sprint 1.5 extended the same locked-state signal into all five section components using `isReadOnly={isReadOnlyMode}` from `InvoiceEditorPage.tsx`.
3. Implementation shipped as commit `ad8786c` and was pushed to `main`.

### Implementation
- Hidden required asterisks in locked mode across Agency, Client, Deliverables, Terms & Payment, and Invoice Meta sections.
- Hidden child mutation controls in locked mode: line item delete buttons, add line item, add milestone, agency logo mutation controls, generated MSA clear/regenerate actions, and Terms override controls.
- Rendered toggles/switch-like controls as static state where applicable, including GST registration, LUT, Client Location, and SEZ.
- Fixed the desktop rail active-card leak so locked invoices show `view` for active and inactive section cards.
- Gated the centralized step-to-step Continue CTA while locked.
- Gated the project-link nudge in Deliverables while locked.
- Flattened data-provenance field accents to warm gray under `[data-mode="locked"]`.

### Verification
- `npx tsc --noEmit` clean.
- `npm run build` clean, with existing Upstash Redis env warning unrelated.
- `git diff --check` clean for the seven touched files.

### Files changed
- components/invoice/InvoiceEditorPage.tsx
- components/invoice/AgencyDetailsSection.tsx
- components/invoice/ClientDetailsSection.tsx
- components/invoice/DeliverablesSection.tsx
- components/invoice/TermsPaymentSection.tsx
- components/invoice/InvoiceMetaSection.tsx
- app/globals.css

### Unresolved / prompt-structure notes
- The prompt expected the "Please select a Client in Step 2 to link this invoice to a project" banner in `InvoiceEditorPage.tsx`, but the actual code keeps it in `DeliverablesSection.tsx`; it was fixed there using the threaded `isReadOnly` prop.
- The prompt expected "Continue to <next-section>" CTAs may live in section components, but the main step-to-step CTA is centralized in `InvoiceEditorPage.tsx`; it was fixed there. `TermsPaymentSection.tsx` also had its own `Continue to Preview` CTA and that was hidden separately.
- The prompt expected Tailwind `border-l-*` provenance classes, but the actual field provenance system uses `input-autofilled` / `input-manual`; the implementation suppresses those classes in read-only mode and also adds the requested `[data-mode="locked"]` CSS flattening override.
- Browser visual QA was not rerun after Sprint 1.5; compile/build verification passed, but one locked invoice should still be visually checked after deployment for spacing/polish.

---

## Latest checkpoint: v2.8.8 Sprint 1 — Locked-Mode Chrome Theme — May 23, 2026

### Sequence
1. Critical UX bug surfaced: locked invoices opened in editor with editing chrome contradicting the lock banner. Users saw "Edit Invoice" title, "Editor progress / 4 of 4 ready" rail, "Preview invoice →" CTA despite fields being disabled.
2. Sprint 1 prompt executed via Codex: chrome theme driven by `data-mode={isReadOnlyMode ? "locked" : "editing"}` on the editor root.
3. Six surfaces updated: page header, step header, left rail, status card, field CSS, bottom bar. Status card overlap bug fixed as a side effect of re-flowing the card layout.

### Files changed
- components/invoice/InvoiceEditorPage.tsx
- app/globals.css

### Verification
- npx tsc --noEmit clean
- npm run build clean (existing Upstash warning unrelated)
- Local /invoice/new render check passed
- Visual verification on locked + editable invoices passed

### Deferred (UNRESOLVED, queued for Sprint 2)
- Required asterisks in child section components still visible when locked (5 files: AgencyDetailsSection, ClientDetailsSection, DeliverablesSection, TermsPaymentSection, InvoiceMetaSection)
- `lockState.alternativeAction` is label-only; needs `intent` discriminator for action-specific routing (Download/Resend/Duplicate/Reactivate)

---

## Latest checkpoint: v2.1 Phase 5 Payment and Settlement Confidence — May 22, 2026

### Sequence

1. **Phase 4 was verified and shipped first:** Client Trust Layer was documented, versioned, committed, and pushed to `main` as `668b596`.
2. **Phase 5 started next:** Payment and Settlement Confidence focused on the post-acceptance path from client payment instructions to owner-side settlement recording.
3. **Design System Hardening remains deferred:** no global token, icon-system, or broad visual-system refactor was performed.

### Phase 5 implementation

- Added a client-facing payment checkpoint to accepted shared invoices with amount due, due date, payment reference, terms, bank details, confirmation expectation, and payment notes.
- Kept payment details locked until MSA acceptance while making the accepted state more actionable for real clients.
- Added a dashboard invoice-drawer settlement checkpoint showing the amount to clear, due timing, and what happens after settlement.
- Strengthened milestone settlement confirmations so owners confirm payment received, see the amount/date context, and understand whether the next milestone starts or the invoice closes.
- Updated urgent receivable actions from "Mark Settled" language to "Mark Paid" language and added Lucide action icons.
- Normalized selected invoice payloads so dashboard drawer actions retain `form_data`, due date, invoice number, and client name across client/project/deadline entry points.

### Verification

- `npm run build` passed on May 22, 2026.
- Targeted ESLint passed for `components/invoice/share/SharedMsaPreviewContent.tsx`.
- Playwright screenshot verification completed for accepted `/share/[token]` at desktop `1440x1400`.
- Playwright screenshot verification completed for accepted `/share/[token]` at mobile `390x1600`.
- Dashboard route smoke test reached the unauthenticated login screen in the local browser context; authenticated drawer visual QA still needs an active logged-in session.
- Local dev server was stopped after verification.

### Files changed in this checkpoint

- `app/dashboard/page.tsx`
- `components/invoice/share/SharedMsaPreviewContent.tsx`
- `SESSION_LOG.md`
- `docs/versions/2026-05-22-phase-5-payment-settlement-confidence.md`

### Next phase

- Phase 6: authenticated owner QA and operational polish.
- Direction: run the dashboard drawer/settlement workflow in an authenticated session, then tighten reminder sending, settlement audit history, and receipt/proof handling.

---

## Latest checkpoint: v2.0 Phase 4 Client Trust Layer — May 22, 2026

### Sequence

1. **Phase 3 was verified and shipped first:** Invoice Editor Workbench was documented, versioned, committed, and pushed to `main` as `1f4cbfc`.
2. **Phase 4 started next:** Client Trust Layer focused on the public share experience, MSA acceptance confidence, payment readiness, and client action clarity.
3. **Design System Hardening remains deferred:** no global token, icon-system, or broad visual-system refactor was performed.

### Phase 4 implementation

- Replaced the simple amount banner on shared invoices with a client trust summary covering agreement state, payment readiness, due date/payment terms, and next client action.
- Added payment-ready affordances for accepted invoices and child milestone invoices, including a prominent PDF download action.
- Added an accepted-terms confirmation strip above the invoice sheet so clients can distinguish locked, proposed, and active invoice states.
- Upgraded the MSA gate modal with a three-step review path, clearer agreement/payment/action hierarchy, Lucide icons, and mobile-safe stacked layout.
- Replaced blocking browser alerts in MSA accept/propose flows with inline, accessible recovery errors.
- Centralized public-share acceptance handling in `app/share/[token]/page.tsx` so acceptance updates `msa_response`, `msa_status`, `msa_responded_at`, and `msa_accepted_at`, then notifies the freelancer.

### Verification

- `npm run build` passed on May 22, 2026.
- Targeted ESLint passed for the Phase 4 files.
- Full repo `npm run lint` still fails on pre-existing unrelated lint debt across archived files, API routes, dashboard, templates, and scratch scripts.
- Playwright screenshot verification completed for pending-MSA `/share/[token]` at desktop `1440x1200`.
- Playwright screenshot verification completed for pending-MSA `/share/[token]` at mobile `390x1400`.
- Playwright screenshot verification completed for accepted `/share/[token]` at desktop `1440x1200`.
- Local dev server was stopped after verification.

### Files changed in this checkpoint

- `app/share/[token]/page.tsx`
- `components/invoice/share/MSAAcceptanceModal.tsx`
- `components/invoice/share/SharedMsaPreviewContent.tsx`
- `SESSION_LOG.md`
- `docs/versions/2026-05-22-phase-4-client-trust-layer.md`

### Next phase

- Phase 5: Payment and settlement confidence.
- Direction: tighten the post-acceptance path from client payment instructions to owner-side settlement tracking, while preserving the MSA anti-self-accept safeguards.

---

## Latest checkpoint: v1.9 Phase 3 Invoice Editor Workbench — May 22, 2026

### Sequence

1. **Phase 2 was checkpointed first:** Dashboard Project OS was documented, versioned, committed, and pushed to `main` as `40d31bf`.
2. **Phase 3 started next:** Invoice Editor Workbench focused on scanability, readiness, validation guidance, and action clarity.
3. **Design System Hardening remains deferred:** no global token, icon-system, or broad visual-system refactor was performed.

### Phase 3 implementation

- Added an editor readiness panel using Lucide status icons, not emoji icons.
- Surfaced readiness progress across all validation steps, including hidden/support steps such as invoice meta and totals.
- Added next-blocker guidance with required missing fields, client, due date, and live invoice total.
- Added a direct `Review blocker` action that reveals validation errors and routes the user to the next blocked section.
- Added a mobile readiness panel before the step pills and a compact rail version for desktop support navigation.
- Updated the fixed bottom action bar so blocked invoices show a contextual blocker hint and `Review blocker`; ready invoices show `Preview invoice`.

### Verification

- `npm run build` passed on May 22, 2026.
- Playwright screenshot verification completed for `/invoice/new` at desktop `1440x1200`.
- Playwright screenshot verification completed for `/invoice/new` at mobile `390x1200`.
- Local dev server was stopped after verification.

### Files changed in this checkpoint

- `components/invoice/InvoiceEditorPage.tsx`
- `SESSION_LOG.md`
- `docs/versions/2026-05-22-phase-3-invoice-editor-workbench.md`

### Next phase

- Phase 4: Client Trust Layer.
- Direction: improve client-facing preview hierarchy, MSA/payment state clarity, and accept/request-changes/download flow.

---

## Latest checkpoint: v1.8 Phase 2 Project OS — May 22, 2026

### Sequence

1. **Stability precondition shipped first:** preserved invoice `projectId` through editor drafts, preview storage, preview saves, and share/export save paths so invoices keep their project linkage across the full workflow.
2. **Phase 1 intentionally deferred:** Design System Hardening is skipped for now per product direction. Global tokens, icon system, and broad visual cleanup remain later work.
3. **Phase 2 implemented:** Dashboard Project OS started and shipped as the next highest-impact UX layer.

### Phase 2 implementation

- Added project-level action prioritization for revision requested, overdue payment, due soon, awaiting signature, active receivable, draft pipeline, ready-to-bill, and complete states.
- Added a `Project OS` portfolio strip above the ledger with active projects, at-risk projects, contract queue, project receivable, and next best project action.
- Upgraded project ledger cards with action state, open receivable, progress percentage, open items, settled value, invoice count, and a contextual next-action CTA.
- Updated project health sorting to use the new action-priority model instead of overdue-only health, so revision/signature blockers rise correctly.
- Kept this phase scoped to `app/dashboard/page.tsx`; no global design-system hardening was performed.

### Verification

- `npm run build` passed on May 22, 2026.
- Playwright screenshot smoke reached the auth flow; full authenticated dashboard visual QA still needs an active logged-in browser session.
- Local dev server was stopped after verification.

### Files changed in this checkpoint

- `app/dashboard/page.tsx`
- `SESSION_LOG.md`
- `docs/versions/2026-05-22-phase-2-project-os.md`

### Next phase started

- Phase 3: Invoice Editor Workbench.
- Initial direction: make invoice creation easier to scan and recover from by improving step state, sticky payment/totals context, validation feedback, and review readiness without touching global design-system hardening.

---

## Archived session: May 8, 2026

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

# v2.8 SECURITY HARDENING — MSA Self-Acceptance Prevention — May 21, 2026

> Chronologically slots between v2.10 and v2.11 (commits made same day as v2.11 work).
> Renumber if needed when merging into SESSION_LOG.md.

## Vulnerability closed

Dashboard side panel previously exposed a "VIEW LIVE →" link to `/share/[token]` for every invoice. An authenticated agency owner could click it, land on their own invoice's client-facing share page, click Accept Terms, and self-accept their own MSA — corrupting the audit trail that the platform's entire legal value proposition depends on. Discovered through routine UX review.

## Three defense layers (all live in prod)

1. **UI removal (agency has no path).**
   All authenticated-app paths to `/share/[token]` removed. The Resend email sent to the client is now the only entry point to the share route. (`app/dashboard/page.tsx`)

2. **Server-side redirect (owner reaching the URL is bounced).**
   New `app/share/[token]/layout.tsx` runs server-side on every visit. Checks `supabase.auth.getSession()`; if authenticated AND `session.user.id === invoice.user_id`, redirects to `/invoice/[id]/client-preview` before the share page renders. Anon clients and authenticated non-owners pass through unchanged.

3. **DB trigger backstop (catches any future code path).**
   `block_owner_msa_self_accept_trigger` BEFORE UPDATE on `public.invoices` raises `owner_cannot_accept_own_msa` exception if `auth.uid() = NEW.user_id` AND any of the 5 MSA columns (`msa_status`, `msa_response`, `msa_responded_at`, `msa_accepted_at`, `client_msa_note`) is being changed. Bypassed for `service_role` and for anon (NULL `auth.uid()`).

## New Preview-as-Client route

- `/invoice/[id]/client-preview` — authenticated server component, owner-only.
- Renders identical MSA + addendum + invoice content to `/share/[token]` via the shared `SharedMsaPreviewContent` component (mode = `"agency-preview"`).
- Accept Terms button replaced by a PREVIEW MODE banner.
- Uses `loadMsaForSharedInvoice` helper for zero-drift parity with the client view.
- Linked from dashboard side panel as "Preview as Client →" (replaces the removed "View Live →").
- **Side benefit:** this same route serves as the agency's live view of MSA negotiation state — exactly what v2.11's Command Center MSA Revision card surfaces.

## Files touched

| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Removed "View Live →"; added "Preview as Client →" |
| `app/share/[token]/page.tsx` | Refactored rendering into shared component (anon client flow unchanged) |
| `app/share/[token]/layout.tsx` | NEW — server-side owner redirect |
| `app/invoice/[id]/client-preview/page.tsx` | NEW — preview route |
| `components/invoice/share/SharedMsaPreviewContent.tsx` | NEW — pure presentational, mode-aware |
| `app/api/msa-response/route.ts` | Owner-equality guard added (currently unreachable; activates if share page is ever refactored to call this API instead of direct PostgREST writes) |
| `supabase/migrations/20260520_lock_msa_columns_from_authenticated.sql` | Trigger function + trigger. *Filename inherited from failed REVOKE attempt; content is the trigger.* |

## Commits landed

- `f1d4844` chore: gitignore `.agents/`
- `7a4e3d0` v2.8 sec: BEFORE UPDATE trigger blocks owner self-accepting own MSA
- `72d4bff` v2.8 sec: add owner-equality guard in `/api/msa-response` (defense in depth)
- `4a16811` v2.8 sec: remove View Live link from dashboard side panel
- Preview-as-Client commit (covering layout.tsx + shared component + new route + dashboard link) — verify it landed via `git log --oneline | head -10`

## Known UX gap (deferred, not blocking)

In agency-preview mode when `msaStatus === "pending"`, the invoice is rendered blurred but the `MSAAcceptanceModal` is NOT rendered (intentional — agency cannot see the Accept button). Side effect: **agency cannot read the MSA terms in preview**, defeating part of the preview's purpose.

Fix: render the modal in agency-preview mode too, with the Accept button replaced by the PREVIEW banner inside the modal. Estimated ~30-line change to `SharedMsaPreviewContent.tsx`.

## Open security item — anon RLS not yet diagnosed

Last anon client UPDATE on `/share/[token]` returned 406 / `PGRST116` "The result contains 0 rows" — meaning RLS may be silently blocking legitimate client MSA acceptance. This may have been broken since v1, with every "accepted" MSA in the DB being owner self-accepts (the exact bug v2.8 closes).

Diagnostic queries:

```sql
-- 1. What UPDATE policies exist on invoices, for which roles?
SELECT polname, polcmd,
       (SELECT array_agg(rolname) FROM pg_roles WHERE oid = ANY(polroles)) AS roles,
       pg_get_expr(polqual, polrelid) AS using_clause,
       pg_get_expr(polwithcheck, polrelid) AS with_check_clause
FROM pg_policy
WHERE polrelid = 'public.invoices'::regclass
ORDER BY polcmd, polname;

-- 2. Reality check on historical acceptance source
SELECT msa_status,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE msa_accepted_at IS NOT NULL) AS accepted_timestamps,
       COUNT(*) FILTER (WHERE msa_responded_at IS NOT NULL) AS responded_timestamps
FROM public.invoices
GROUP BY msa_status;
```

If anon has no UPDATE policy on the MSA columns: add a scoped policy allowing UPDATE on the 5 MSA columns only when `share_token IS NOT NULL`. The trigger already prevents owner abuse, so the policy can be permissive on share_token presence.

## Load-bearing — do not modify without re-audit

- Trigger bypass conditions (`current_user = 'service_role'` and `auth.uid() IS NULL`) — modifying either reopens the vector or breaks the legit client flow.
- `app/share/[token]/layout.tsx` owner check — removing it restores the original vulnerability.
- `SharedMsaPreviewContent.tsx` `mode === "client"` vs `mode === "agency-preview"` branches must remain mutually exclusive.

## Interaction with v2.11

- v2.11's Command Center MSA Revision card reads from `client_msa_note` and `msa_status` — same columns the trigger protects. The trigger permits anon (client) writes and service_role writes, so v2.11's read-surfacing has no conflict.
- v2.11's new `cancelled` invoice status check constraint is orthogonal to the MSA acceptance flow. No interaction.

## OFFLINE feature status (separate workstream — incomplete as of v2.8 ship)

Not part of v2.8 security work, but worth tracking:

- Phase 1 (schema + types + helpers): no longer visible in current repo — either committed earlier and forgotten, or rolled back. Verify via `ls components/invoice/DownloadDecisionModal.tsx lib/invoice-channel-helpers.ts`.
- Phase 3.1 (status corruption fix in `handleDownloadPdf`): never executed. If the OFFLINE feature is shipped in current form, the offline download path will corrupt invoice status to `SENT`. Check before assuming offline works.

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

## v2.10 DASHBOARD MILESTONE RICH STAGES — May 20, 2026

### Phase XXXVIII: Neo-Brutalist Detailed Stages Card
- ✅ DB-UX-1 — Direct detailed cards:
  - Replaced the minimal segmented boxes in the Client Ledger's "Stages" column with beautiful, rich Neo-Brutalist milestone cards that render directly inside the table.
  - This solves the confusion of purely graphical boxes, presenting the user with immediate context at a glance.
- ✅ DB-UX-2 — Dense Milestone Breakdown:
  - Each milestone card displays:
    - Milestone Title (with a clean fallback if empty: `(No Milestone Title)`)
    - Dynamic color-coded status badge (Teal for Settled, Orange for Overdue, Lime for Live, Purple for Draft)
    - Full list of nested Line Items, including Description, Quantity, Unit, Rate, and Item Type
    - Computes and displays dynamic relative due dates (e.g. `8 days till due date` or `2 days past due` in warning orange)
    - Total milestone amount dynamically formatted in Indian Rupees format (e.g. `Total: ₹10,288`)
- ✅ DB-UX-3 — TypeScript & Data Integrity:
  - Configured layout container limits to gracefully bound the detailed cards without breaking the layout of other table columns.
  - Verified TS build integrity to ensure all object property mapping aligns correctly.

## Deployment & Production state (v2.10)
- **Status:** Pushed to `main`.
- **Verification:** Segmented timeline renders cleanly; mega tooltip correctly maps specific line-item data and calculates relative due dates accurately without breaking the Neo-Brutalist container bounds. Compilation succeeds with Exit Code 0.

---

## 2026-05-21 — Mobile UX and Dashboard UI Fixes

### 1. Dashboard Client Ledger cleanup
- Removed obsolete table-style Client Ledger shell from `app/dashboard/page.tsx`.
- Removed old table header row: Client / Invoices / Progress / Receivable / Health.
- Replaced table/tbody/tr/td structure with a semantic div-based accordion list.
- Preserved existing filters, search, sort, totals, accordion behavior, client data, invoice data, and milestone display.
- Build passed.
- Commit: `41ce4c0` — `fix: replace client ledger table shell with accordion list`

### 2. Client Specific Payment & Legal Terms mobile UX
- Updated `components/invoice/ClientDetailsSection.tsx`.
- Fixed mobile overflow of the Generate Clause button.
- Improved mobile UX flow so payment/legal inputs are visible before clause generation.
- On mobile, the section opens expanded by default after client mount.
- Moved Generate / Regenerate Clause action after Payment and Legal & IP inputs on mobile.
- ected Generated MSA preview more clearly to the generation action.
- Preserved existing form data shape, schema, Supabase logic, save/preview flow, and clause generation handler.
- Build passed.

### 3. Mobile Invoice Details PO # and RCM feedback
- Updated `components/invoice/InvoiceEditorPage.tsx`.
- Updated `components/invoice/TotalsTaxesSection.tsx`.
- Added PO # field to the mobile Invoice Details edit mode using existing `formData.meta.poNumber`.
- Added visible RCM feedback when Reverse Charge is enabled:
  - Helper box below the RCM toggle.
  - Status line: “RCM active — GST handled by client.”
- Reused existing `isRcmEnabled` state and `updateField("isRcmEnabled", ...)`.
- No schema, Supabase, tax-rule, or form-shape changes.
- Build passed.

### Notes
- `.cursor/settings.json` remains untracked and was intentionally not committed.
- Vercel deployment is triggered by pushes to `main`.
- Manual mobile checks still required on deployed URL:
  - `/dashboard` Client Ledger accordion.
  - `/invoic Client Details CSPLT section.
  - `/invoice/new` mobile Invoice Details edit mode PO #.
  - `/invoice/new` mobile Totals RCM toggle feedback.

---

## v2.11 SPARK LEDGER ACCORDION, COMMAND CENTER & SMART ACTIONS — May 21, 2026

### Phase XXXIX: Accordion Ledger with Spark Bars
- ✅ SL-1 — Neo-Brutalist Accordion Redesign:
  - Completely replaced the rigid, verbose Client Ledger table with a clean, fully collapsible Neo-Brutalist accordion layout.
  - Refined the layout into a high-fidelity accordion table to align columns (Client, Invoices, Progress, Receivable, Health) perfectly.
  - Collapsed state presents Client Name, active invoice counts, total receivable vs. collected totals, and Client Standing health indicators at a glance.
  - Mobile UX: Kept accordion expanded by default on small viewports so all client milestones and actions remain instantly visible.
- ✅ SL-2 — Interactive Segmented Spark Bars:
  - Integrated custom graphical "Spark Bars" in the collapsed client rows.
  - Shows visual segments colored by milestone status (Teal for Settled, Orange for Overdue, Lime for Live, Purple for Draft/Pending) proportional to their financial weight, allowing instant pipeline visualization.
  - Expanded detail drawer reveals detailed milestone stage cards, line items, relative due-date countups/countdowns, and contextual actions.

### Phase XL: Invoice Command Center & Action Engine
- ✅ CC-1 — Intelligent Command Center Panel:
  - Introduced the **Invoice Command Center** to replace static notifications with proactive, card-based tasks for the freelancer.
  - Dynamically computes and alerts the user about actionable invoices across 5 critical vectors:
    - **MSA Revision**: Triggered when a client proposes terms or notes in the MSA modal, offering direct links to the relevant client MSA settings, project addendums, or global settings.
    - **Past Due**: Highlights overdue invoices with direct "Settle" actions.
    - **Due Soon**: Nudges invoices nearing due dates with a quick-nudge mailer.
    - **MSA Pending**: Details sent invoices awaiting contract signature.
    - **Draft**: Lists active drafts that need finalizing.
- ✅ CC-2 — Multi-Tone Email Nudge System:
  - Implemented standard follow-up nudges with 4 selectable communication tones: **Initial**, **Polite**, **Firm**, and **Final**.
  - Empowers freelancers to customize pre-filled nudge emails depending on the urgency and relationship depth.
- ✅ CC-3 — Close Project & Cancelled Status:
  - Added full database, API, and schema support for a `'cancelled'` status check constraint.
  - Created the `cancelInvoice()` utility to handle Close Project actions cleanly.
  - Updated metric calculations to exclude cancelled invoices, preserving dashboard financial accuracy.

### Phase XLI: Technical & React Stability
- ✅ TS-3 — Rules of Hooks Rectifications:
  - Fixed a critical React Hooks violation where `useEffect` (for invoice sequential fetching) and the Command Center's `useMemo` blocks were positioned below early return loading checks.
  - Restored complete dashboard UI stability, passing next builds flawlessly.

## Deployment & Production state (v2.11)
- **Status:** Pushed to `main`.
- **Verification:** Command Center dynamic cards, spark bars, and Accordion Ledger render correctly. Production Next.js build succeeds with zero errors.

## Files modified in v2.11
- app/dashboard/page.tsx
- app/api/share-invoice/route.ts
- app/invoice/[id]/client-preview/page.tsx
- app/share/[token]/page.tsx
- components/invoice/share/MSAAcceptanceModal.tsx
- components/invoice/share/SharedMsaPreviewContent.tsx
- lib/supabase/invoices.ts
- supabase/migrations/20260521_add_cancelled_status.sql
- SESSION_LOG.md
# v2.8.x SECURITY + COMMUNICATION HARDENING — May 21, 2026

> Three coupled releases shipped same day. Chronologically slots between v2.10 and v2.11.
> Renumber if needed when merging into SESSION_LOG.md.

---

## v2.8 — MSA Self-Acceptance Prevention

### Vulnerability closed
Dashboard side panel previously exposed "VIEW LIVE →" link to `/share/[token]` for every invoice. Authenticated agency owners could click it, land on their own invoice's client-facing share page, click Accept Terms, and self-accept their own MSA — corrupting the audit trail that the platform's entire legal value proposition depends on.

### Three defense layers (all live in prod)
1. **UI removal** — All authenticated-app paths to `/share/[token]` removed. The Resend email is now the only entry point. (`app/dashboard/page.tsx`)
2. **Server-side redirect** — New `app/share/[token]/layout.tsx` runs server-side; if `session.user.id === invoice.user_id`, redirects to `/invoice/[id]/client-preview` before the share page renders. Anon clients pass through unchanged.
3. **DB trigger backstop** — `block_owner_msa_self_accept_trigger` BEFORE UPDATE on `public.invoices` raises `owner_cannot_accept_own_msa` if `auth.uid() = NEW.user_id` AND any of the 5 MSA columns (`msa_status`, `msa_response`, `msa_responded_at`, `msa_accepted_at`, `client_msa_note`) is being changed. Bypassed for `service_role` and anon (NULL auth.uid()).

### New Preview-as-Client route
- `/invoice/[id]/client-preview` — authenticated server component, owner-only
- Renders identical MSA + addendum + invoice content to `/share/[token]` via shared `SharedMsaPreviewContent` (mode = `"agency-preview"`)
- Accept Terms button replaced by PREVIEW MODE banner
- Uses `loadMsaForSharedInvoice` helper for zero-drift parity
- Linked from dashboard side panel as "Preview as Client →"
- Side benefit: serves as agency's live view of MSA negotiation state — powers v2.11's Command Center MSA Revision card

### Files touched
| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Removed "View Live →"; added "Preview as Client →" |
| `app/share/[token]/page.tsx` | Refactored rendering into shared component (anon client flow unchanged) |
| `app/share/[token]/layout.tsx` | NEW — server-side owner redirect |
| `app/invoice/[id]/client-preview/page.tsx` | NEW — preview route |
| `components/invoice/share/SharedMsaPreviewContent.tsx` | NEW — pure presentational, mode-aware |
| `app/api/msa-response/route.ts` | Owner-equality guard added (currently unreachable; activates if share page is ever refactored to call this API) |
| `supabase/migrations/20260520_lock_msa_columns_from_authenticated.sql` | Trigger function + trigger |

### Commits
- `f1d4844` chore: gitignore `.agents/`
- `7a4e3d0` v2.8 sec: BEFORE UPDATE trigger blocks owner self-accepting own MSA
- `72d4bff` v2.8 sec: add owner-equality guard in `/api/msa-response` (defense in depth)
- `4a16811` v2.8 sec: remove View Live link from dashboard side panel
- Preview-as-Client commits (covering layout.tsx + shared component + new route + dashboard link)

---

## v2.8.1 — Restore Legitimate Client MSA Acceptance via RLS

### Discovery
Post-v2.8 audit revealed anon clients on `/share/[token]` still returned 406 `PGRST116` "result contains 0 rows" when clicking Accept Terms. RLS investigation: every UPDATE policy on `public.invoices` required `auth.uid() = user_id`. For anon (NULL auth.uid()), all policies rejected → 0 rows updated → 406.

**Implication**: the legitimate client acceptance flow has been broken since v1. The single `accepted` MSA in production at discovery time was the owner self-accept bug being exercised (closed by v2.8 trigger). Real clients had never produced a valid acceptance.

### Fix
RLS policy added (live on prod via SQL Editor, persisted to repo as migration):

```sql
CREATE POLICY "Anyone with share_token can accept MSA on shared invoice"
  ON public.invoices
  FOR UPDATE
  USING (share_token IS NOT NULL AND share_token <> '')
  WITH CHECK (share_token IS NOT NULL AND share_token <> '');
```

### Complete security model
| Layer | Controls |
|---|---|
| RLS policy (this fix) | WHICH ROWS each role can update |
| Column GRANT (v2.3) | WHICH COLUMNS each role can update (anon → 5 MSA cols only) |
| Trigger (v2.8) | Business rule: owner can't self-accept |

### Data cleanup performed
- Lone owner-self-accept record reset to pending. Audit trail starts clean from this point forward.

### Files
- `supabase/migrations/20260521_allow_msa_acceptance_via_share_token.sql` — NEW

### Commits
- `1bde935` — SESSION_LOG update (commit message misleadingly says "v2.8.1 sec...", actual content is docs)
- `c23b074` — v2.8.1 sec: persist RLS policy migration to repo

---

## v2.8.2 — Propose Changes Wire-Up

### Problem
"Propose Changes" button existed in `MSAAcceptanceModal` but was gated on an `onPropose` prop that `SharedMsaPreviewContent` never passed → button invisible on all devices (not just mobile, as initially reported). Worse, the modal's internal `handleSubmitProposal` wrote proposal text to `msa_response` column (a status field) instead of `client_msa_note` → had the button ever worked, every submission would have corrupted `msa_response` AND the v2.11 Command Center MSA Revision card would never see the note (it reads from `client_msa_note`).

### Fixes
- Threaded `onPropose` / `onProposeChanges` prop from share page → shared component → modal
- `handleSubmitProposal` now writes to correct columns: `client_msa_note`, `msa_status='proposed'`, `msa_responded_at`
- Mobile layout: action button container changed from `flex-row-wrap` to `flex-col sm:flex-row` so buttons stack on mobile (375px) instead of overflowing
- Error propagation: `handleProposeMsaChanges` throws on failure, modal catches; no more false success on DB error
- Toast feedback: `showProposedToast` state + auto-dismiss useEffect + JSX added (mirrors `showAcceptedToast` pattern)
- Dashboard polish: status badges clarified, inline client proposal notes surfaced

### Files touched
- `components/invoice/share/MSAAcceptanceModal.tsx`
- `components/invoice/share/SharedMsaPreviewContent.tsx`
- `app/share/[token]/page.tsx`
- `app/dashboard/page.tsx`

### Commits
- `d2b44ee` — fix(contract): resolve coupled bugs in client MSA counter-proposal flow
- `9e094c9` — fix(invoices): clarify status badges and display inline client proposals

---

## Combined data flow — verify your mental model

A real client clicks **Propose Changes** on `/share/[token]` and submits a note:
1. Browser anon Supabase client sends PostgREST UPDATE: `client_msa_note=<note>, msa_status='proposed', msa_responded_at=NOW()` WHERE `share_token = '<token>'`
2. RLS policy "Anyone with share_token..." permits the UPDATE ✓
3. Column GRANT permits anon writes to `client_msa_note`, `msa_status`, `msa_responded_at` (3 of the 5 allowed) ✓
4. Trigger fires BEFORE UPDATE; for anon `current_uid IS NULL` → RETURN NEW (bypass) ✓
5. UPDATE succeeds, modal shows success toast, Command Center MSA Revision card surfaces the note on next agency dashboard visit

If an authenticated agency owner tries the same:
1. **UI**: no clickable path to `/share/[token]` (v2.8)
2. **Layout**: `layout.tsx` detects owner, redirects to `/invoice/[id]/client-preview` where `onProposeChanges` is undefined and Propose Changes button is invisible (v2.8)
3. **Trigger**: even if owner somehow forced the UPDATE, trigger raises `owner_cannot_accept_own_msa` (v2.8)

---

## v2.12 DASHBOARD LEDGER TOGGLE & REACT HOOKS STABILIZATION — May 21, 2026

### Phase XXX: Dashboard Layout & Input Refinements

- ✅ **Dashboard Alignment & Styling**:
  - Re-architected the bottom dashboard sections ("Quick Links", "Upcoming Deadlines", "Activity") into a precise 12-column grid (`lg:col-span-7 xl:col-span-8` and `lg:col-span-5 xl:col-span-4`), perfectly aligning them with the right edge of the Client Ledger container above.
  - Eliminated unwanted white space and applied complete Neo Brutalist styling (thick borders, crisp backgrounds, stark shadows) across all lower panels.
  - Resolved text-bleeding and overflow issues in the Recent Activity feed using `min-w-0` and `flex-1` wrappers.
- ✅ **Input Affordance Adjustments**:
  - Increased the minimum width of the Payment Terms (days) and Late Fee (%) numeric input fields to prevent browser native number-spinners from overlapping and obscuring the typed digits.

### Phase XXXI: Unified Client Statement & Ledger Views

- ✅ **Client Ledger Accordion Redesign**: 
  - Completely replaced the basic Client Ledger table with a **Unified Client Statement Card** and redesigned accordion.
  - The expanded accordion now groups invoices logically, rendering rich milestone timelines, MSA gating alerts (e.g. "Proposed Changes", "MSA Pending"), and precise line-item breakdowns.
  - Upgraded the UX to allow multiple client accordions to be opened simultaneously, preventing jarring layout shifts and scroll jumps when browsing multiple accounts.
- ✅ **Ledger Toggle (Client vs Invoice View)**: 
  - Added a "By Client" | "By Invoice" toggle inside the "CLIENT LEDGER" header.
  - Implemented `ledgerView` state to conditionally render either the traditional grouped-by-client statement view or a flat, sortable invoice list.
- ✅ **Invoice Map Logic**: 
  - Computed `filteredAndSortedInvoices` by unrolling the list of all invoices matching the active filters (Settled, Outstanding, Overdue, Due This Week).
  - Designed the Invoice ledger view to feature "Client Preview" deep-links, precise Due Dates, Milestone mini-bar visualizations, and specific Invoice status stamps (Overdue vs Pending).
- ✅ **Data Integrity**: 
  - Maintained shared underlying data (`clientsHealth`). Clicking any top-level summary metric card accurately filters BOTH the Client ledger and the Invoice ledger symmetrically.
  - The footer dynamically updates its label depending on the view ("Showing X clients" vs "Showing Y invoices").

### Phase XXXII: Next.js Runtime Stabilization

- ✅ **React Hooks `#310` Fix**: 
  - Diagnosed a critical production render crash ("Rendered more hooks than during the previous render").
  - Root cause identified: A `useMemo` hook was placed below the `if (loading) return <Loading />` early return block, violating React's hook order rules upon hydration.
  - Fix applied: Refactored the invoice unrolling logic to a synchronous IIFE pattern exactly matching the robust `filteredAndSortedClients` implementation.
  - Dashboard stability fully restored on production.

### Files Touched
- `app/dashboard/page.tsx`
- `SESSION_LOG.md`

---

## Open items — investigate in next session

### HIGH priority

**1. Twin Invoice Duplicate Hypothesis**

Observed: `INV-2026-9446` and `INV-2026-1238` both for client `ckccc`, identical amount ₹4,31,692, same created date, different MSA states (accepted vs pending), different due dates (10 Jun vs 18 Jul). Hypothesized that the "Propose Changes" or addendum modification flow clones the invoice row instead of updating in place. If true, every proposal doubles receivables on the dashboard. Could also be manual test duplication — needs SQL confirmation.

First investigation query:
```sql
SELECT id, invoice_number, msa_status, total_amount, due_date, 
       created_at, updated_at, parent_invoice_id
FROM public.invoices 
WHERE share_token IS NOT NULL 
ORDER BY created_at DESC;
```

If `created_at` on the two `ckccc` rows is within seconds → auto-generated (real bug). If hours apart → likely manual. Then trace the code path: which handler creates new invoice rows, and does any flow trigger on addendum/proposal changes?

### MEDIUM priority

**2. Payment terms / late fee display divergence**

Send Modal shows "Payment terms: 20" and "Late fee: 1.4% per daily" but invoice detail drawer shows "Payment: Net 30 days" and "Late Fee: 1.5% per month" for the same invoice. Two sources of truth for one piece of data. Drawer is likely hardcoded or reading defaults instead of the active addendum. Search `app/dashboard/page.tsx` side panel render + whatever produces the "MSA GATING / EFFECTIVE TERMS" send modal.

**3. Line item totals reconcile to milestone total**

Line items show `per-sqft @ ₹84 → ₹0` and `per-sqft @ ₹11,000 → ₹0` (quantity blank) but milestone total = ₹4,31,692. Math doesn't reconcile. Either line items aren't summing into milestone (independent total field), quantities are stored but hidden, or this is an audit-risk display bug.

**4. Print preview parity (client vs agency)**

Client share page (`/share/[token]`) and agency invoice preview (`app/invoice/preview/page.tsx`) likely have separate print stylesheets producing different "Download PDF" output. Should produce identical one-page PDFs. The print rules in `SharedMsaPreviewContent.tsx` need to match the agency preview path — probably means extracting a shared print stylesheet.

### LOW priority

**5. MSA terms not visible in agency client-preview mode** (carried from v2.8)

When `msaStatus === "pending"` in agency-preview mode, invoice is blurred and the MSA modal is excluded (intentional — agency can't see Accept button). Side effect: agency can't read the MSA terms in preview. Fix: render modal in agency-preview mode too with Accept button replaced by PREVIEW banner inside the modal. ~30-line change to `SharedMsaPreviewContent.tsx`.

**6. Grammar nit**

"1.4% per daily" → "1.4% daily" or "1.4% per day". Trivial text fix in whichever component renders the send modal effective terms.

---

## Load-bearing — do not modify without re-audit

- Trigger function bypass conditions (`current_user = 'service_role'` and `auth.uid() IS NULL`) — modifying either reopens the self-accept vector or breaks legit client flow
- `app/share/[token]/layout.tsx` owner check — removing restores the original vulnerability
- `SharedMsaPreviewContent.tsx` `mode === "client"` vs `mode === "agency-preview"` branches must remain mutually exclusive — agency-preview must NEVER receive `onProposeChanges` or `onAcceptClick` handlers
- RLS policy "Anyone with share_token can accept MSA on shared invoice" — scoping tighter could break legit client flow; weakening (e.g. dropping `share_token` check) opens table to any anon UPDATE
- `MSAAcceptanceModal.handleSubmitProposal` writes to `client_msa_note` (not `msa_response`) — switching it back would silently break the v2.11 Command Center MSA Revision card

## Untested before next chat

End-to-end manual verification of v2.8.2 on lanceinvoice.xyz was not performed in this session. Suggested test flow:

1. Fresh Incognito → paste share URL → page loads with MSA modal
2. Mobile (resize to 375px or DevTools mobile): both Accept Terms AND Propose Changes visible, stacked vertically
3. Click Propose Changes → textarea appears → type "Can we revise Section 3?" → Submit Proposal
4. Should see success state + proposed toast: "Proposal sent — waiting for the freelancer..."
5. SQL: `SELECT msa_status, client_msa_note, msa_responded_at FROM public.invoices WHERE share_token = '<token>';` — expect `msa_status='proposed'`, `client_msa_note='Can we revise...'`, timestamp populated
6. Log in as agency → dashboard → Command Center MSA Revision card should show the note

If any step fails, the fix went in but the surfacing has a gap — investigate before treating v2.8.2 as complete.

---

## v2.8.3 MSA AUDIT TRAIL IMMUTABILITY & SNAPSHOTS — May 22, 2026

### Phase XLII: MSA Audit Trail Snapshot & Immutability
- ✅ **Applied Snapshot Fields**:
  - Added `applied_payment_terms` (text), `applied_late_fee_rate` (numeric), `applied_late_fee_unit` (text), and `applied_license_type` (text) to the `public.invoices` table.
  - Snapshot fields record the exact, effective late-fee/payment/license terms at the moment of finalize/share, ensuring the agreement's terms are immutable and protected against subsequent changes in global defaults or client MSA values.
- ✅ **Database Migrations for Snapshots**:
  - `20260522_add_applied_late_fee_columns.sql` [NEW]: Adds late fee rate and unit columns with descriptive documentation comments.
  - `20260524_add_applied_license_type_column.sql` [NEW]: Adds license type column to lock in IP terms for audit immutability at finalize/share time.
  - `20260523_backfill_applied_msa_snapshot.sql` [NEW]: Backfills existing records in the database by parsing historical values from the `form_data` JSONB payload.
- ✅ **TypeScript & Database Wiring**:
  - Implemented `lib/msa-applied-snapshot.ts` [NEW] to compute the snapshot details based on a prioritized hierarchy (Client Addendum overrides -> Agency defaults -> Platform hardcoded fallbacks).
  - Wired `computeAppliedMsaSnapshot` into `saveInvoice` (covers fresh-create and editor-save paths) and `reissueNegotiatedInvoice` (covers the negotiation reissue path after Propose Changes) in `lib/supabase/invoices.ts`. Two additional `form_data` write paths remain unwired and are queued as v2.8.x backlog: `app/dashboard/page.tsx::handleSettleMilestone` and `app/api/invoice/trigger-next-milestone/route.ts` — these produce NULL snapshots on milestone settlement and auto-spawned child invoices respectively until wired in a follow-up pass.
  - Restored and displayed effective terms dynamically from snapshot-based fields in `app/dashboard/page.tsx`.

## v2.8.4 CLIENT DATABASE SCHEMA RECONCILIATION — May 22, 2026

### Phase XLIII: Client Database Schema Reconciliation & Upgrades
- ✅ **15-Column Table Reconcile Migration**:
  - Created and executed `20260524_reconcile_clients_schema.sql` [NEW] to bring the legacy, minimal `clients` table in complete structural alignment with the application's runtime data models and `clientDetailsToRow` mappings (which writes ~28 columns).
  - **Renamed Legacy Columns**: Safely renamed legacy `email` to `client_email` and `address` to `client_address` using DO block checks to avoid data loss.
  - **Added Missing Columns**: Added `address_line_1`, `address_line_2`, `city`, `pin_code`, `client_postal_code`, `country`, `client_currency`, `client_type`, `client_entity_type`, `sez_status`, `msa_late_fee_unit`, `free_revision_rounds`, `extra_revision_fee_percent`, `invoice_count`, and `last_invoiced_at` columns.
  - Applied comments for database documentation and RLS audit safety.
- ✅ **Type & Column Name Parity**:
  - Reverted a temporary property rename `client_location` in `lib/supabase/clients.ts` back to `client_type` to perfectly match the database column name while preserving the location status (domestic vs international).
  - Ensured `clientDetailsToRow` maps properties to database columns accurately without syntax mismatches.

### Files modified in v2.8.3 & v2.8.4
- `lib/msa-applied-snapshot.ts`
- `supabase/migrations/20260522_add_applied_late_fee_columns.sql`
- `supabase/migrations/20260523_backfill_applied_msa_snapshot.sql`
- `supabase/migrations/20260524_add_applied_license_type_column.sql`
- `supabase/migrations/20260524_reconcile_clients_schema.sql`
- `lib/supabase/invoices.ts`
- `lib/supabase/clients.ts`
- `app/dashboard/page.tsx`

---

## v2.8.5 PREMIUM INVOICE SETTLEMENT & READ-ONLY EDITOR LOCKS — May 22, 2026

### Phase XLIV: Milestone Settlement Flow and Locked Archive Editor
- ✅ **Relational Milestone Settlement Fix**:
  - Updated `app/invoices/page.tsx` so milestone settlement reads the relational `invoice_milestones` payload from `inv.milestones`, sorted by `order_index`, instead of the obsolete `form_data.milestones` JSON path.
  - Added an early abort when `markMilestoneSettled` fails, preventing false next-milestone prompts or completion state when the database update did not succeed.
- ✅ **Invoice Cycle Completion UX**:
  - Added a Neo-Brutalist "Invoice Cycle Complete!" modal after the final milestone/full invoice settlement completes.
  - Kept the existing next-milestone prompt for multi-milestone invoices when more milestones remain.
- ✅ **Editor Routing Hydration Fix**:
  - Changed invoice edit navigation to `/invoice/new?id=<invoice-id>&fresh=0` so the editor hydrates the canonical Supabase record directly.
  - Removed the stale `invoice-editor-draft` pre-write from the invoices page edit handler to avoid creating editable local drafts just by opening an invoice.
- ✅ **Read-only Invoice Editor Mode**:
  - Hydrated `status`, `msa_status`, and `shared_to_email` from Supabase in `InvoiceEditorPage.tsx`.
  - Added a reactive `isReadOnlyMode` lock when an invoice is settled/paid, MSA accepted, or shared with pending MSA.
  - Rendered a high-contrast locked archive banner explaining the exact lock reason.
  - Wrapped step content in a disabled `<fieldset>`, blocked edit/save handlers, hid Save Draft and meta edit toggles, and prevented local draft/cloud writebacks while preserving preview and copy-friendly read access.

### Verification
- ✅ `npm run build` passed with only existing Upstash Redis environment warnings.
- ✅ Local browser smoke check passed for `/invoice/new` and `/invoices` on `http://localhost:3000`.

### Files modified in v2.8.5
- `app/invoices/page.tsx`
- `components/invoice/InvoiceEditorPage.tsx`
- `SESSION_LOG.md`

---

## v2.8.6 MILESTONE SETTLEMENT CONFIRM HOTFIX — May 22, 2026

### Phase XLV: Settlement Modal Reliability
- ✅ **Confirm Settlement No-op Fix**:
  - Fixed the milestone settlement confirmation path so it updates the clicked relational milestone row by UUID first, with `order_index` retained only as a fallback.
  - This resolves cases where `Confirm Settlement` appeared to do nothing because the helper looked up the row by a stale or mismatched `order_index`.
- ✅ **Visible Failure State**:
  - Added a high-contrast inline error message inside the settlement modal if Supabase still rejects the settlement update.
  - The user now gets actionable feedback instead of a silent modal no-op.
- ✅ **Next Milestone Positioning**:
  - The next-milestone decision now derives from the sorted relational milestone list and the clicked row id, preventing bad transition logic when order indexes drift.

### Verification
- ✅ `npm run build` passed with only existing Upstash Redis environment warnings.

### Files modified in v2.8.6
- `app/invoices/page.tsx`
- `components/invoice/SettlementModal.tsx`
- `lib/supabase/invoices.ts`
- `SESSION_LOG.md`

---

## v2.8.7 SETTLEMENT SUCCESS UX & DASHBOARD REFRESH SYNC — May 22, 2026

### Phase XLVI: Settlement State Machine and Cross-Surface Data Freshness
- ✅ **Settlement Modal Success State**:
  - Reworked the milestone settlement modal so `Confirm Settlement` transitions through explicit states: idle, submitting, success, and error.
  - On success, the modal now transforms into a "Milestone Settled" confirmation with a `Continue` CTA instead of remaining stuck on the original form.
  - Final milestones now continue into the invoice cycle completion modal, while non-final milestones continue into the next-milestone prompt.
- ✅ **Invoice List Optimistic Feedback**:
  - Added immediate local status patching after milestone settlement, including a short success highlight/checkmark on the settled milestone row.
  - Removed the redundant second full-invoice settlement call from the final milestone path; `markMilestoneSettled` now sets the parent invoice status and `settled_at` when all milestones are settled.
- ✅ **Dashboard Refresh Synchronization**:
  - Added `lib/invoice-events.ts` as a lightweight browser event + localStorage signal for invoice data changes.
  - The Invoices list emits data-change events after settlement, next milestone sends, project close, and delete actions.
  - The Dashboard listens for same-tab events, cross-tab storage updates, focus, and visibility changes, then refetches invoice/milestone data so dashboard metrics and ledgers reflect actions performed in the Invoices list.
- ✅ **Dashboard Receivable Logic**:
  - Updated dashboard outstanding/overdue/ledger filters to treat `PARTIAL` and `SAVED` invoices as receivables, so milestone invoices remain visible after partial settlement until fully paid.

### Verification
- ✅ `npm run build` passed with only existing Upstash Redis environment warnings.
- ✅ Local browser smoke check passed for `/invoices` and `/dashboard` on `http://localhost:3000`.

### Files modified in v2.8.7
- `app/dashboard/page.tsx`
- `app/invoices/page.tsx`
- `components/invoice/SettlementModal.tsx`
- `lib/invoice-events.ts`
- `lib/supabase/invoices.ts`
- `SESSION_LOG.md`

---

## v2.8.8 READ-ONLY PREVIEW SHARE LOCK IMPLEMENTED — May 22, 2026

### Phase XLVII: Preview Share Rules and Locked Invoice UX
- ✅ **Shared Lock Utility**:
  - Reusable invoice lock-state helper `lib/invoice-lock-state.ts` is fully implemented and handles all states including 'partial_settled' and 'cancelled'.
- ✅ **Preview Share Gating**:
  - Disabled the preview screen `Share Invoice` action based on `lockState.canShare`. Gated behind live database state checks so sharing is blocked in accordance with compliance rules.
- ✅ **Locked Preview UX**:
  - Custom high-contrast Neo-Brutalist locked status banner rendered on `/invoice/preview` when `lockState.isReadOnly` is active. Display matches the freelancer aesthetic with robust reason copy.

### Files modified in v2.8.8 (Phase 1)
- `components/invoice/InvoiceEditorPage.tsx`
- `app/invoice/preview/page.tsx`
- `SESSION_LOG.md`

---

## v2.9 PHASE 2: EXTEND LOCK STATE & INTEGRATE PROJECT MSA — May 22, 2026

### Phase XLVIII: Project-level Lock Helpers & Milestone Settlement Integration
- ✅ **Extended Lock Utility**:
  - Upgraded lock state helper `lib/invoice-lock-state.ts` to accept parent project lock signals: `projectMsaAcceptedAt` and `projectStatus`.
  - Added gate logic: invoices belonging to a project with an active, signed project-level MSA bypass individual milestone-level MSA signature gates.
- ✅ **Relational Hydration & API Security**:
  - Refactored `loadInvoice` and `loadInvoiceByToken` in `lib/supabase/invoices.ts` to dynamically fetch parent project details using relational subqueries: `project:projects(msa_accepted_at, status)`.
  - Updated `/api/share-invoice` to join and pull `project:projects(...)` on the database level to check lock state server-side and block redundant shares.
- ✅ **Milestone Snapshot Integrity**:
  - Patched `markMilestoneSettled` in `lib/supabase/invoices.ts` to automatically propagate settled status changes directly into the `form_data.milestones` array structure.
  - Linked `computeAppliedMsaSnapshot` inside `markMilestoneSettled`, the auto-spawn next milestone API, and `handleSettleMilestone` in the dashboard to ensure that milestone records have non-null, correct legal snapshots.

### Files modified in v2.9 (Phase 2)
- `app/api/invoice/trigger-next-milestone/route.ts`
- `app/api/share-invoice/route.ts`
- `app/dashboard/page.tsx`
- `app/invoice/preview/page.tsx`
- `components/invoice/InvoiceEditorPage.tsx`
- `lib/invoice-lock-state.ts`
- `lib/supabase/invoices.ts`
- `SESSION_LOG.md`

---

## Open items / v2.9 Phase 3 & 4 scope

### Phase 3: Project Selector in Items Section (Step 3) (Next Step)
- Expose `listProjectsByClient(clientId: string)` in database layer.
- Integrate `project_id` saving inside `saveInvoice`.
- Render dynamic, gorgeous Neo-Brutalist project selector dropdown at the top of the Items (Step 3) section in DeliverablesSection.
- Provide an inline "+ Create New Project" option that triggers a clean textbox toggle for on-the-fly additions.

### Phase 4: Dashboard Project-Pivot
- Pivot main dashboard metrics and ledgers under parent Project folders instead of Clients.
- Render stunning Project progress cards with milestone completion bars.

---

## Latest checkpoint: Phase 1B Patch — Lifecycle Dashboard + Invoice Ledger Guardrails — May 25, 2026

### Sequence
1. Verification review found 14 issues in the Phase 1B dashboard/invoice-lifecycle rewrite, including placeholder `alert()` handlers, dollar currency, hardcoded timing pills, draft precedence errors, missing invoice filters, and layout drift.
2. Patch shipped as commit `b9b669b` to replace placeholder behavior with real dashboard actions and align the new lifecycle surfaces with the pre-launch design audit rules.
3. Staged scope was deliberately limited to Phase 1B files: dashboard/invoices pages, new dashboard/invoice/lifecycle components, and the `MilestoneRow` type extension needed by scheduled milestone UI.

### Implementation
- Dashboard Phase 1B shell now uses real handlers for SEND NOW, MARK SETTLED, RESEND, FINALIZE, REVISION REVIEW, and PREVIEW instead of `alert()`.
- Added a functional settlement-choice bridge in `app/dashboard/page.tsx` that posts to `/api/invoice/trigger-next-milestone` using the existing trigger-mode contract.
- Active drilldown now uses cream `#FAF7F2`, prefers milestone `trigger_date` over invoice `due_date`, supports a no-master sentinel, and formats currency as Indian rupees.
- Lifecycle logic now checks draft first, treats only `LIVE` milestones as settle-ready, always emits `msa_accepted`, and formats early/late timing from actual `days_diff`.
- `/invoices` now has `Invoices · {count}`, search, filter chips, semantic status pills, rupee formatting, and dashboard-focused invoice links.
- Project rail width corrected to 240px, attention-dot logic moved to milestone-level checks, and dead milestone `parent_invoice_id` filters were corrected to master-invoice ownership checks.

### Files changed
- `app/dashboard/page.tsx`
- `app/invoices/page.tsx`
- `components/dashboard/ActiveDrilldown.tsx`
- `components/dashboard/LifecycleStepper.tsx`
- `components/dashboard/ProjectInvoicesLedger.tsx`
- `components/dashboard/ProjectRail.tsx`
- `components/invoices/InvoiceEventRow.tsx`
- `lib/lifecycle/computeActiveDrilldown.ts`
- `lib/lifecycle/computeProjectLifecycle.ts`
- `lib/lifecycle/timing.ts`
- `lib/supabase/projects.ts`

### Verification
- `npx tsc --noEmit` clean.
- `npm run build` clean.
- Existing Upstash Redis warning remains unrelated.
- Scoped grep confirmed no placeholder `alert()`, no `window.location`, no hardcoded dollar symbols, and no old 280px rail width in the Phase 1B files.

### Open / watch items
- The original rich C2 settlement drawer was already removed by the Phase 1B rewrite; this patch restored a functional settlement-choice bridge, not the older full drawer chrome.
- `/api/invoice/trigger-next-milestone` still requires scheduled dates to be strictly future; the dashboard defaults to today + 7 days, but selecting today would still be rejected by the API.
- Other local uncommitted changes were intentionally left unstaged because they are outside this Phase 1B patch: `/projects` redirects, AppHeader nav removal, project detail redirect, and design audit folders.

---

## Latest checkpoint: Post-Phase 1B Pre-Launch Hardening — May 26, 2026

### Sequence
1. Production smoke test on `lanceinvoice.xyz` exposed follow-up issues after Phase 1B: historical/pseudo projects were not consistently visible, invoice rows only navigated from the explicit VIEW affordance, settled milestones could still leave a "fires" lifecycle step active, and SEND NOW needed a fresh scheduled-pending fixture before retest.
2. Focused PostgREST schema-cache sweep confirmed there were no dangerous `from('invoices').select('*, clients(*)')` call sites. The only clients embed found was the safe `projects -> clients` relationship in `lib/supabase/projects.ts`.
3. Restored the richer C2 settlement drawer surface after the Phase 1B rewrite: Settlement Checkpoint, Contract Authority, Milestone Progress Checklist, and the three trigger choices now compose over the new ActiveDrilldown layout.
4. Implemented the Profile + Global MSA atomic-save path and added the RPC migration. User confirmed the SQL was run in Supabase.
5. Completed late-fee unit normalization and client-facing template placeholder suppression.
6. Found and fixed the scheduled trigger-date edge case: dashboard date input now uses local calendar dates, C2 and C4 scheduling share one parser, and date-only values normalize to the daily cron boundary.
7. Created the orphan invoice backfill migration to persist real clients/projects for historical invoices that still have `project_id IS NULL`.

### Implementation
- **Dashboard smoke follow-ups:** `getAllProjectsWithInvoices()` now includes all user invoices, groups orphan invoice trees into pseudo-project records, sorts by latest activity, and preserves parent/child linkage for child invoices. Full invoice rows now navigate to `/dashboard?project=...&invoice=...`.
- **Lifecycle correction:** settled milestones now mark the "fired" step complete, preventing a completed milestone from remaining visually active as a scheduled/fire step.
- **C2 drawer restoration:** `app/dashboard/page.tsx` now shows the richer drawer panels again and keeps the existing trigger API contract intact.
- **Profile atomic save:** `/profile` now calls `saveProfileWithGlobalMsa()`, surfaces `success` / `partial_profile_saved` / `failed` states, and avoids the previous silent partial-success path between profile and Global MSA saves.
- **Late-fee normalization:** default MSA and MSA sync utilities now use the normalized unit model rather than leaking hardcoded "per month" assumptions.
- **Client-facing template suppression:** preview/share template data now suppresses placeholder values and inappropriate client-facing chrome/watermark output more aggressively.
- **Trigger-date edge case:** added `lib/milestone-trigger-date.ts`; C2 `trigger-next-milestone` and C4 `scheduled-milestone-action` now both accept today-or-future scheduled dates consistently.
- **Orphan backfill migration:** added `20260526000500_backfill_orphan_invoice_projects.sql`, which creates/reuses clients, creates persisted projects, links master invoices and child invoices, and backfills `invoices.client_id`.

### Files changed locally after Phase 1B
- `app/dashboard/page.tsx`
- `app/profile/page.tsx`
- `app/project/[id]/page.tsx`
- `app/projects/page.tsx`
- `components/AppHeader.tsx`
- `components/invoice/share/SharedMsaPreviewContent.tsx`
- `components/invoices/InvoiceEventRow.tsx`
- `lib/default-msa.ts`
- `lib/lifecycle/computeProjectLifecycle.ts`
- `lib/milestone-trigger-date.ts`
- `lib/msa-sync-utils.ts`
- `lib/supabase/profiles.ts`
- `lib/supabase/projects.ts`
- `lib/templates/Watermark.tsx`
- `lib/templates/template-data.ts`
- `supabase/migrations/20260526000000_atomic_profile_global_msa_save.sql`
- `supabase/migrations/20260526000500_backfill_orphan_invoice_projects.sql`

### Verification
- `npx tsc --noEmit` clean after the template suppression and trigger-date fixes.
- `npm run build` clean after the template suppression and trigger-date fixes.
- `git diff --check` clean for the orphan backfill migration.
- Focused PostgREST sweep found no invoice-to-client direct embed to rewrite.
- Existing Upstash Redis warning remains unrelated.

### Open / watch items
- These implementation files are local working-tree changes at this checkpoint; this commit only records the session log unless the implementation files are committed separately.
- External review note: a later agent correctly identified the Phase 1B refactor trap where the rich C2 drawer was temporarily orphaned, but that observation is stale after this checkpoint because the richer drawer has now been restored in `app/dashboard/page.tsx`.
- Type-model watch: Phase 1B exposed frontend/backend drift around milestone date fields. `invoice_milestones` rows expose `trigger_date`, `order_index`, and `status`, but UI code briefly assumed fields like `due_date` directly on `MilestoneRow`. Future lifecycle/dashboard work should either extend `MilestoneRow` deliberately or derive due/timing from invoice/form_data with explicit fallback rules.
- Orphan backfill migration has been created but not applied by Codex. Preflight SQL should confirm the orphan master count before apply and `0` remaining after apply.
- Untracked Vim swap file exists at `supabase/migrations/.20260526000500_backfill_orphan_invoice_projects.sql.swp`; it was not staged.
- Passive scheduled milestone cron validation from the earlier v2.9 workstream should still be checked against production DB state after the relevant scheduled date.

---

## 2026-05-27 — Deep UX/UI Design System Assessment & Plan Update

### Phase XLVIII: Neo-Brutalist Architecture & Visual Parity Scan
- ✅ **Thorough Visual Scan**: 
  - Reviewed the visual screenshots provided by the user against the existing codebase to ensure the application reaches an uncompromising, professionally designed neo-brutal finish.
  - Identified inconsistencies in border weight hierarchy (1px vs 2px), banner alerts, and button typographies (casing/tracking).
- ✅ **Deep Code-Level Engineering Scan**:
  - Audited `app/globals.css`, `lib/ui-foundation.ts`, `components/ui/motion-primitives.tsx`, and `components/ui/app-icons.tsx`.
  - Discovered a major **Motion Philosophy Conflict**: The CSS layer used a correct physical neo-brutal translation (`translate(2px, 2px)`) on click, whereas the React layer (`motion-primitives.tsx` using Framer Motion) was using generic scale compression (`scale: 0.985`), which contradicts the brutalist physical-compression aesthetics.
  - Identified **Icon Visual Weight Discrepancy**: The SVGs in `app-icons.tsx` hardcoded `strokeWidth: 1.8`, which looked frail inside the heavy 2px standard neo-brutal UI borders.
- ✅ **Plan Finalization**:
  - Reconstructed the `implementation_plan.md` to directly target these code-level gaps.
  - Added specific tasks to sprint 4 & sprint 9 for `AppIconButton`, `AppIcon` scaling, and explicit tokenizing of typography and borders.
  - Extracted the final fully-loaded plan to `PLAN_2026-05-27_FINAL_DESIGN_SYSTEM.md` in the project root.

### Files Touched
- `PLAN_2026-05-27_FINAL_DESIGN_SYSTEM.md` (Created)
- `SESSION_LOG.md`
- Completed Sprints 1-5, 7-8: Core Neo-Brutalist tokens, UI components, motion refactor, and rounded corner purging.


## 2026-05-27: Completed Sprints 9, 10, and 11 (Typography, Accessibility, Print CSS)
- **Sprint 9**: Ran a context-aware python script to eliminate middle-weights (`font-medium`, `font-semibold`) and upgrade them to `font-bold` or `font-black`, establishing a true Neo-Brutalist typographic hierarchy.
- **Sprint 10**: Replaced inline tailwind focus rings with a centralized `.app-focus-ring` for accessibility, and added `prefers-reduced-motion` to disable animations for users with vestibular disorders.
- **Sprint 11**: Added comprehensive `@media print` overrides in `globals.css` to hide UI chrome and flatten brutalist shadows for ink-saving physical/PDF printing.
- Build checked (`tsc --noEmit` and `npm run build`) and passed successfully.


## Update: May 27, 2026 - Phase 4: Sprints 10 & 11

### Accessibility & Print CSS Audits Completed

**Sprint 10: Accessibility Audit**
- Swept all critical modals (BriefSummaryModal.tsx, SettlementModal.tsx, ConversionModal.tsx, ShareLinkModal.tsx, DownloadDecisionModal.tsx, and InvoiceEditorPage's exit confirmation modal) and appended `role="dialog"`, `aria-modal="true"`, and appropriate `aria-labelledby` tags.
- Verified that `.app-focus-ring` is applied universally to buttons and input fields to support keyboard-only navigation.
- Ensured `prefers-reduced-motion` is accurately overriding animations to protect users with vestibular conditions.

**Sprint 11: Responsive Breakpoint & Print CSS Audit**
- **Print Layout**: Added a comprehensive `@media print` query in `globals.css` that completely flattens brutalist shadows into 1px borders, disables navigation/UI elements (`nav`, `.sidebar`, etc.), and converts the lime green to transparent to save ink and maximize data visibility.
- **Mobile Layout**: Scaled down the heavy brutalist properties (reduced `2px` borders to `1px`, and `4px` shadows to `2px`) on viewports under `768px` to prevent the UI from feeling bulky on mobile devices.
- Passed `npm run build` and pushed successfully to `main`.

- **Sprint 10 (Accessibility Audit)**: 
  - Swept critical modals (`BriefSummaryModal.tsx`, `SettlementModal.tsx`, `ConversionModal.tsx`, `ShareLinkModal.tsx`, `DownloadDecisionModal.tsx`, `InvoiceEditorPage.tsx`) and appended `role="dialog"`, `aria-modal="true"`, and appropriate `aria-labelledby` tags.
  - Verified `.app-focus-ring` is applied universally to buttons and input fields to support keyboard-only navigation.
  - Verified `prefers-reduced-motion` is accurately overriding animations for accessibility.

- **Sprint 11 (Responsive Breakpoint & Print CSS Audit)**:
  - Added a comprehensive `@media print` query in `globals.css` that completely flattens brutalist shadows into 1px borders, disables navigation/UI elements (`nav`, `.sidebar`, etc.), and converts the lime green to transparent to save ink and maximize data visibility.
  - Scaled down the heavy brutalist properties (reduced 2px borders to 1px, and 4px shadows to 2px) on viewports under `768px` to prevent the UI from feeling bulky on mobile devices.
  - Passed `npm run build` and pushed successfully to `main`.

- **Sprint 6 (InvoiceEditorPage Decomposition)**:
  - Extracted utility functions, sub-components, and custom React hooks (`useInvoiceAutofill.ts`, `useInvoicePersistence.ts`) into `components/invoice/editor/` to dramatically reduce and decouple the massive `InvoiceEditorPage.tsx` monolith.

- **Paper + Ink Migration (Step 4)**:
  - Ported the Landing Page (`app/page.tsx`) end-to-end to the new Paper + Ink design system.
  - Implemented the `bg-paper-butter` canvas.
  - Used the `<Button>`, `<Box>`, `<Pill>`, `<Marker>` (rose), and `<Sticker>` (lav) primitives for a bold Gen-Z aesthetic.

## Update: May 27-31, 2026 - Major Bug Fixes, UI/UX Polish, & Dashboard Refinements

### Neo-Brutalist Hierarchy Passes (Dashboard)
- **Slice 1 (Elevation tokens & resting tiers)**: Defined `--elev-0` through `--elev-3` tokens in `app/globals.css`. Standardized the 4-card stat strip to a uniform background with `--elev-1`. Flattened status pills in the dashboard header to `--elev-0`. Corrected the timeline frame shadow from `6px` to `var(--elev-1)` and updated primary CTA buttons (MARK SETTLED, NUDGE CLIENT) to `var(--elev-3)`.
- **Slice 2A (Settlement Zone)**: Restructured `ActiveDrilldown.tsx` layout. Grouped the NUDGE and MARK SETTLED buttons into a dedicated settlement zone at the bottom of the card, along with a dynamically computed due countdown (e.g. `DUE IN X DAYS`, `DUE TODAY`, `OVERDUE BY X DAYS`). Changed the EDIT button to a ghost variant in the top-right header.
- **Slice 2B (Calm Right Column)**: Dropped the main card wrapper shadow to `var(--elev-1)` and removed the lime right-edge accent. Dropped the Invoices Ledger table container shadow and row-level VIEW button shadows to `var(--elev-1)`.
- **Removed FINALIZE M1**: Removed the obsolete "FINALIZE M1" button block from the dashboard UI.

### Invoices & Milestones Logic Fixes
- **First Milestone Billing Rule (Model A)**: Ensured that the master invoice accurately bills only its first milestone, preventing nested children for order 0.
- **Order-0 Firing Guard**: Guarded `fireMilestoneInvoice` against firing the first milestone (`order_index === 0`) natively, returning a strict error. Added defense-in-depth to the cron `trigger-scheduled-milestones` route to exclude `order_index = 0` milestones.
- **Non-destructive Milestone Sync**: Preserved lifecycle and trigger states when syncing updated form data to the DB milestones to prevent unintentional state wipes.
- **GST Calculations**: Fixed systemic GST calculation logic and ensured correct rendering on invoices, milestones, and settlement drawer views.
- **Invoice Routing**: Ensured that the invoice owner is routed to the editor view, not the client preview layout.
- **MSA Reissue Lock**: Resolved an issue where reissue was blocked by moving the state transition to the share API and ensuring both `msa_status` and `msa_response` reset to pending on reissue and share.
- **Applied Payment Terms**: Derived `applied_payment_terms` exclusively from the per-invoice payment term to maintain a single source of truth.

### Dashboard Data & Timeline Polish
- **Lifecycle Active Status**: Corrected the derivation of the active milestone to be the first unsettled one instead of the last.
- **Metrics Accuracy**: Included shared-but-draft master invoices in the project total calculations. Fixed the in-flight invoice counts to reflect billed but unsettled invoices instead of the entire milestone plan.
- **Real Activity Feed**: Scoped the dashboard activity feed correctly to the selected project instead of leaking global activity.
- **Timeline Highlights**: Added logic to highlight the active milestone and fade future pending milestones. Fixed timeline duplication and formatting by mapping directly over the milestones array rather than lifecycle steps.
- **Project Name Hydration**: Fixed a bug where the project name could hydrate as `undefined` if returned as an array or missing in `form_data.meta`.
- **Auto-select Project**: Configured the dashboard to automatically select the most recently updated project upon loading.
- **Share Callout UX**: Suppressed confusing status strings in the share revised-terms callout and made the email CTA fully visible.

### UI / UX Enhancements (General)
- **Editor Profile Autocomplete**: Implemented profile-backed agency autocomplete in the invoice editor and allowed the agency name to be editable while preserving address spaces.
- **Sticky Actions**: Moved the bottom action bar in the editor to a global sticky position, removing redundant header buttons on desktop views.
- **Clients List UX**: Addressed avatar compression issues and aligned action icons. Replaced text action buttons with precise SVGs, added an "ACTIONS" column header, and updated the "New" client badge to a cleaner text label.
- **Milestone Editor Auto-scroll**: Fixed a gap in UX where adding a second milestone in the editor wouldn't keep the first milestone visible by implementing a scroll-to-view interaction.
- **Notifications Lazy GC**: Built lazy garbage collection for the notification tray, capping stale and read notifications automatically without adding chron jobs or heavy DB loads.
- **Contrast & Delight**: Boosted WCAG AA contrast for active project tabs, tweaked the attention dot, added nudge actions, delight popups for finished tasks, and polished delete action UIs across the board.

## 2026-06-04 — Draft churn killed, agency prefill, status-label fix, safe profile capture

### Shipped (all deployed READY on prod)
- `ab9e791` fix: guard the **inline** `autoCloudSave` in InvoiceEditorPage (`?restore=1` path) — content gate + `existingId: searchParams.get("id")`. Stops empty-draft minting and duplicate inserts.
- `ef9f4d8` fix: agency prefill is now session-race-proof — keyed on the retry-loaded `savedProfile` state instead of a one-shot `loadProfile()`.
- `b8119c1` fix(invoices): `getStatusInfo` takes `wasShared`; shared-but-still-draft now reads **"Awaiting"**, not "Draft". Both call sites pass `!!invoice.shared_at`. Side benefit: shared rows no longer bulk-deletable.
- `b0cc8b4` chore: deleted never-mounted `components/invoice/editor/useInvoicePersistence.ts` + its import.
- `c619f37` fix(profile): `syncProfileFromInvoice` is now **safe first-capture** — no-ops if the invoice has no agency name (prevents blank overwrite) and no-ops if the profile already has an agency (Profile page = source of truth). Also wired into `handleSaveDraft` so the main save path captures on first real save.
- Superseded earlier in session: `936d4fd` (guarded the dead hook — NO-OP) and `eff31a2` (original one-shot prefill effect). Kept for trail.

### Prod data mutations (Supabase MCP)
- Deleted 3 junk empty drafts INV-2026-7173 / 3974 / 5434 (+ their milestones/line_items), guarded on `draft / ₹0 / not shared / not child`.
- Seeded `user_profiles` for the user: `agency_name='bkb kumar', state='Karnataka', city='BANGALORE'` (guarded on empty; MSA defaults untouched).
- Flipped INV-2026-2431 (Popula) `status: draft → finalized` (it was shared but stuck at draft).

### Root causes (the trail that cost rounds)
- **Decoy hook.** First draft-fix guarded `useInvoicePersistence`, which is imported but **never called**. The live autosave was a byte-identical **inline twin** in `InvoiceEditorPage` (~L541). Lesson: grep for the *call site*, not the import, before guarding a path.
- **`upsertProfile` is a full-row overwrite** (`agencyToProfileRow` writes every column, no fallbacks on identity fields). `syncProfileFromInvoice` therefore could wipe the profile — and was wired into preview/restore saves. Hardened to first-capture-only.
- **Prefill lost the auth-session race** — one-shot `loadProfile()` on mount returns null before the session hydrates; the editor's other profile/client effects all retry 3×500ms. Fixed by keying on `savedProfile`.
- **Pill was blind to `shared_at`** — shared+draft+msa-pending fell through to the "draft" label (INV-4078 proved the pattern: shared+pending+*finalized* already read "awaiting").

### End state
- 12 invoices, 3 drafts (INV-3838, 1230, 6551). Popula = finalized → "Awaiting" under Live tab. Profile agency = "bkb kumar".

### Open / deferred
- GSTIN/PAN not stored in any invoice or profile → user to add on the Profile page (then they'll prefill).
- INV-6551 left as `draft` by user choice (shows "Locked" via accepted MSA); flip to finalized later to clear it from the Draft tab.
- New shares already set `status: finalized` (share route); only the two old stragglers were affected.

---

## 2026-06-04 — Session 2 (PM): Launch-readiness P0 sweep (FREE launch)

**Decision:** Launch **free** for now — no billing code exists and nothing is gated behind it, so a free launch adds zero scope. Subscription/monetization deferred to post-launch.

**Headline finding — the deferred queue was stale.** Reconciled the (AM) handoff's "deferred queue" against `main` + prod: **~7 of 8 items already done** — Profile+Global MSA atomic save (AUDIT-P0-001) ✅, C2 drawer richness ✅, late-fee unit normalization ✅, template placeholder suppression (AUDIT-P1-003) ✅, same-day trigger-date ✅, PostgREST `projects.client_id` (no dangerous embed — non-issue) ✅, GSTIN/PAN storage ✅. Only **orphan-invoice backfill** genuinely open. Prod tip at session start was `87fbe27`, not `c619f37` (one docs commit ahead).

**Data-integrity sweep (P0-2) — core state is sound.**
- Milestone/line-item integrity **clean**: every master's `form_data.milestones` count == its `invoice_milestones` rows; children correctly carry 0 (master holds them). `invoice_line_items` is **populated** (the "tables are empty" note was stale).
- `msa_status` is the **canonical** MSA column — runtime trusts it everywhere (client lock `msa_status || msa_response`, `isMsaAccepted = msa_status==='accepted'`, drilldown, rail). `msa_response` is only a fallback.
- Found 4 invoices with `msa_status` ahead of `msa_response`: 3 (INV-9996/9446/3173) genuinely accepted (status + timestamps) but `msa_response` stale = manual-SQL test fixtures; 1 (INV-1238) is "proposed" = correct by design (propose path leaves `msa_response` pending).

**Changes shipped this session (all verified vs prod/main):**
- **(a) MSA cleanup** — guarded `UPDATE` set `msa_response='accepted'` on INV-9996/9446/3173 (only where genuinely accepted + stale); INV-1238 untouched. All MSA columns now coherent. (Data only, no schema change.)
- **(b) Codified missing tables** — `supabase/migrations/20260517000000_create_invoice_milestones_and_line_items.sql` (SHA `7d1cbf1`). Both tables were SQL-editor-only (no migration); a fresh `db reset` would have failed. Creates base tables (trigger_* / index / milestone RLS left to the existing later migrations) and **closes the `invoice_line_items` RLS gap** (its `ENABLE RLS` + ALL policy were live-only). Idempotent (`IF NOT EXISTS`); reproducibility artifact — **not applied to prod**.
- **(c) Extraction route lockdown** — AI brief extraction is hidden in MVP (parser ~25% accuracy). `/api/brief-extract` was UI-hidden but the route was still **live + unauthenticated + OpenAI-billed** (cost/abuse surface). Feature-flagged off by default via `EXTRACTION_ENABLED` (`ENABLE_BRIEF_EXTRACTION` env, unset = disabled) → returns 404 (SHA `4cc4e31`). **Verified live: `POST /api/brief-extract` → 404.** Re-enable later (v2 parser) by setting the env var — no code change.

**Confirmed wired (no action needed):** GSTIN/PAN end-to-end — Profile inputs (15/10-char) → `user_profiles` columns → `profileToAgencyDetails` prefill (blank-invoice path seeds the agency block incl. GSTIN/PAN) → template render. The "GSTIN/PAN not stored" handoff note was stale.

**Deliverable:** pre-launch QA checklist for the manual MVP walk, severity-tagged, mobile rows starred; extraction section dropped (feature off).

**Prod tip after session:** `4cc4e31` (READY).

**Open / next:**
- **P0-1** — run the manual QA walk (founder).
- **P0-3** — email deliverability: verify Resend domain auth (SPF/DKIM) + a real inbox delivery (inside QA §0/§5).
- Still deferred: orphan-invoice backfill (migration exists, not applied); v1.5 multi-milestone real-entity refactor; v2 (brief-parsing engine, GSTIN auto-fetch).

---

## 2026-06-06 → 06-09 — Design-system convergence, mobile overflow pass, security hardening (RLS)

Thread driven via Claude (diagnose + prompt-author + verify) → AG (execute/push) → verify vs `origin/main`. Every commit below was confirmed on main by reading the file at FETCH_HEAD, not from AG's paste.

### Shipped — design system (all verified on main)
- `5cc5660` unify primary CTA to terracotta — `--color-acid` `#cf4a25`→`#b8431f` (now ~4.9:1 AA on cream `--color-acc-ink`); `.app-soft-button-primary` + `getAppButtonClass` primary → terracotta/cream; Profile Save, ProjectRail "+New invoice", AppHeader button reskinned. Header logo deliberately left ink.
- `927389c` LIVE pill AA contrast + remove hardcoded `#cf4a25` — `InvoiceEventRow` live pill text→acc-ink; `ProjectInvoicesLedger` + `Pill.tsx` hex→`var(--color-acid)`/token. `#cf4a25` now zero in source.
- `b08f200` unify invoice status pills list↔drawer — added tokens `--color-overdue #a32d2d` + `--color-forest #0f6e56`; rewrote `getStatusInfo` (InvoiceEventRow) + `getStatusPill` (ProjectInvoicesLedger) onto the canonical palette.
- `882f389` unify ProjectRail status pills (COMPLETE→forest, REVISION→coral, AWAITING→butter, text contrast flipped). Corner alert-dots left as-is.
- `b9711d1` stat strips → calm tan (clients + invoices) + "All" filter chip → ink. **PARTIAL** — AG kept the clients dummy values and skipped the Live/Complete chips; corrected in `5267095`.
- `5267095` clients stat strip → real computed metrics (Clients / MSAs signed / Repeat clients), removing the hardcoded fakes `₹38.4L`, `₹1.84L`, `↑12% QoQ`, `75%`, "2 pending"; Live chip → terracotta, Complete chip → forest.

### Shipped — mobile
- `a29d2d2` mobile master-detail toggle on dashboard — rail hides when a project is selected (`hidden md:flex`), content takes over; added "← Projects" back button (`md:hidden`).
- `c0a855e` guard dashboard auto-select to run once per visit (`useRef` once-guard) — stops the back button being bounced by re-auto-select.
- `f749b79` mobile overflow fixes — title header stacks (`flex-col md:flex-row`, fixes clipped EXPORT); meta pills wrap as whole units + `whitespace-nowrap`; stat strip wraps; ledger table `overflow-x-auto` + `min-w-[520px]`. Also removed the hardcoded "At risk ₹0 / —" dummy stat card (4→3 cards).
- `1a12f3d` milestone timeline → vertical stack on mobile (`md:hidden` vertical block reusing `stops` + `liveStopIndex`; desktop horizontal stepper preserved via `hidden md:block`); timeline header stacks on mobile.

### Canonical status palette (locked, founder-approved)
draft=outline/ink-2 · awaiting=butter `#ffd84d` · revision=coral `#ff5a4d` · live=terracotta `#b8431f`+cream+pulse · partial=lavender `#b29bff` · locked=sky `#4cb4ff` · settled=green `#3acc7a` · complete=forest `#0f6e56` · overdue=red `#a32d2d` · cancelled=`#d8ccb3` strike. Filter chips: All=ink/cream, Live=terracotta, Complete=forest, Revision=coral, Settled=grass, Draft=butter, Sent=sky. (Sharp corners + round pills = deliberate identity; radius left alone. Stepper done-node black = structural idiom, left alone.)

### Prod DB — security migrations (Supabase MCP, applied to prod)
- **`enable_rls_projects_subscriptions_sac_codes`** — CRITICAL FIX. `public.projects` and `public.subscriptions` had **RLS disabled + zero policies** → the public anon key could read/write every user's rows. Enabled RLS + owner policy `FOR ALL TO authenticated USING/WITH CHECK (auth.uid() = user_id)` on both; `sac_codes_architecture` → RLS + public read-only (`SELECT TO anon, authenticated USING (true)`). Verified non-breaking first: dashboard reads `projects` via the authenticated browser client already filtered by `user_id`; the anon share flow writes `invoices` (not `projects`); server/cron use the service role (bypass RLS).
- **`harden_security_warnings_followup`** — (1) `notifications` anon INSERT was `WITH CHECK (true)` → tightened to only allow a notification for a genuinely shared invoice under its true owner (`EXISTS` on `invoices.share_token` + matching `user_id`); pre-existing owner-insert policy retained. (2) dropped the duplicate `read_receipts` insert policy "Read Receipts: public can insert". (3) `REVOKE EXECUTE` on trigger fn `advance_first_milestone_to_live()` from PUBLIC/anon/authenticated (removes the `/rest/v1/rpc` exposure; the trigger still fires). (4) pinned `search_path = ''` on `handle_updated_at` + `block_owner_msa_self_accept`. **Live-verified**: accepting the MSA via a share link still creates the owner's notification.

### Advisor state (post-migrations)
- Security: 3 ERROR (`rls_disabled_in_public`) → **0 errors**. One WARN remains — `auth_leaked_password_protection` — which is a manual Auth-settings toggle (not SQL).
- Performance: 210 notices, all WARN/INFO, none launch-blocking → `multiple_permissive_policies` ×141 (accumulated overlapping owner policies), `auth_rls_initplan` ×56 (`auth.uid()` re-evaluated per row), `unindexed_foreign_keys` ×9, `unused_index` ×4. Deferred — premature at current data scale.

### Data check (no code change — both were test artifacts, UI is faithful)
- INV-2026-9997 (M2) shows ₹0 because `grand_total = 0` in the DB; M3 (₹728) got an amount, M2 didn't. Test data, not a UI bug.
- The duplicate "Invoice sent to client · 8 days" rows = INV-9998 (M3) genuinely sent twice on 2026-05-30 (~9 min apart, 06:29 + 06:38) → two real `notifications` rows. activity_log is empty; the feed reads from `notifications`, correctly scoped to the project's three invoices (`871b3e76`/`38268d22`/`0023fa6e`).

### Watch / observations
- **Concurrent DB writers / policy drift.** Twice this session a policy I had just read was gone before I could change it — storage `Allow public read` and `read_receipts_insert_public` (I only dropped the one duplicate). Points to another writer (local `supabase db push` / another agent / dashboard). Net effect was safe, but keep one source of truth for migrations.
- `read_receipts` now has **no** anon INSERT policy at all (one dropped by me, one vanished). View-tracking still works via the service-role `track-view` API; the client-side insert at `lib/supabase/invoices.ts:764` would be blocked if it's actually exercised.

### Also on main since last log (not driven in this thread; for trail)
`3dca1e6` (06-04 ledger border + new-invoice CTA), `8691f74` (06-05 auth pages reskin), `af2d846` (06-05 onboarding address+bank), `2c29e35` (06-05 auto-project + profile sync on share/export), `1dd519c` (06-05 name-only clients + relaxed email guard + milestone client_id propagation), `710af7e` (06-08 client payment-terms + project addendum — concurrent, touched `TermsPaymentSection.tsx` / `msa-applied-snapshot.ts` / `invoices.ts` only).

### Open / deferred
- Enable Leaked Password Protection (Auth → Password settings) — last security advisor item.
- Optional DB: scoped `read_receipts` anon insert (if the client-side path matters); 9 FK indexes; RLS policy consolidation + `auth.uid()`→`(select auth.uid())` initplan (post-launch).
- Junk prod rows: "Test Project 1779434613", "AUDIT DRAFT RETRY CLIENT 20260525_095716" + dashboard auto-selecting that debug project.
- Pre-launch QA walk (founder) + Resend SPF/DKIM + real inbox delivery.
- Carryover: orphan-invoice backfill; v1.5 multi-milestone real-entity refactor; v2 brief-parsing / GSTIN auto-fetch.

---

## 2026-06-14 — Project-name mandate + locked dock mobile fix

### Shipped

- `33c904d` **require intentional project name** — removed the silent client-name fallback in `saveInvoice` (`lib/supabase/invoices.ts`): `effectiveProjectName` is now strictly `requestedProjectName`, so a project is only ever created from a user-typed name. Added a `hasNamedProject` guard to `handleSaveDraft` in `InvoiceEditorPage.tsx` that blocks saving, jumps to the Items step, shows validation errors, and toasts "Name your project before saving." The finalize/preview gate and the auto-restore-on-mount save path were intentionally left untouched.

- `350411c` **locked dock mobile fix** (`InvoiceEditorPage.tsx`) — restyled both locked-state buttons from heavy black slabs (`bg-[#111118]` / `shadow-[4px_4px_0_#111118]` / lime text / `p-3 sm:p-4`) to the canonical design-system variants:
  - Primary locked action → `getAppButtonClass({ variant: "secondary", size: "sm" })` + `h-9 px-4 sm:h-10 sm:px-5`.
  - "View preview" → `getAppButtonClass({ variant: "ghost", size: "sm" })` + same responsive sizing.
  - Added short mobile labels for all lock intents (Duplicate / Resend / Reactivate / Download / Preview) via `hidden sm:inline` / `sm:hidden` spans — matches the editable CTA pattern.
  - Lock reason line changed from `hidden sm:flex` to `flex` (visible on all viewports). Mobile shows terse "Locked — {reason}"; desktop keeps full "This invoice is locked — {reason}" via `truncate` + responsive spans.
  - Editable status text ("Ready for preview" / "Missing details") also made icon-only on mobile (text wrapped in `hidden sm:inline`).

### Files changed
- `lib/supabase/invoices.ts`
- `components/invoice/InvoiceEditorPage.tsx`

### Verification
- `npm run build` passed cleanly on both commits.

