# LanceInvoice — Project Operating Manual

> Single source of truth for AI assistants (Claude, Antigravity, future LLMs) working on LanceInvoice. Read this BEFORE giving advice. If this manual disagrees with SESSION_LOG.md, the newer document wins. If it is >30 days old, verify claims before trusting them.
>
> **Last updated:** July 7, 2026 (supersedes the April 27, 2026 manual entirely)
> **Repo:** kumarbrijesh-900/desi-freelance-docs · **Prod:** lanceinvoice.xyz
> **Living log:** SESSION_LOG.md (newest-first; READ FIRST block is the current queue)

## 1. Product context
Milestone-driven billing and contract-enforcement engine for Indian creative freelancers. "Stop sending receipts; start sending living contracts." The contract IS the invoice IS the tracker — one living document evolving Draft → Sent → Settled. Lance is a **delivery tracker first**; money is deprioritized in favor of lifecycle visibility.

Hero archetypes (priority order): Creative Generalist · Agency-of-One · Compliance-Heavy Pro · Side-Hustler (later).

**Stage:** pre-launch, founder-only data (~104 rows). **Path to launch:** Phase 2 (v1.5 milestone schema) → Phase 3 (fresh-account QA walk) → Phase 4 (extraction gate-flip + Reddit/DM launch). NOT ProductHunt.

## 2. Budget & cost reality
Hard ceiling **₹500/month**. Paid: domain (~₹90/mo amortized) + $10 xAI prepaid credit (unused — see §6). Free tiers: Vercel Hobby, Supabase Free, Resend (3K emails/mo), Upstash Redis, **GitHub Actions (CI)**, Gemini + Groq APIs (the live extraction providers). Cost alerts: **still not configured** — manual TODO, founder dashboards only.

## 3. Access & gating
- **Auth:** Supabase Google OAuth; middleware lives in `proxy.ts` (works on Vercel despite the naming convention).
- **Brief extraction gate:** `NEXT_PUBLIC_ENABLE_BRIEF_AUTOFILL === "true"` renders the intake card (`InvoiceEditorPage.tsx`). Vercel: Preview scope = true, Production = unset. **The April manual's "account-ID whitelist" never existed** — the old gate was a JSX comment; it is now this env flag. Gate-flip criteria live in SESSION_LOG (§ gate-flip): CI green + six-brief live battery clean + P0/P1 extraction defects closed.
- **MSA + Addendum (core feature):** base MSA inherited per invoice; overrides auto-detected as Addendums; client sees blurred invoice until Accept / Propose Changes. Self-accept is blocked by three layers (UI removal, agency-preview redirect, DB trigger `block_owner_msa_self_accept`); anon acceptance works via share-token RLS policy + column-scoped GRANT (see `supabase/migrations/`, v2.8.1).
- **Settlement is manual and offline by design.** No payment processing, no Razorpay, no payments table — clients pay via UPI/bank/SWIFT outside Lance; the agency self-attests settlement. Do not suggest otherwise.
- **Tiers:** ₹199/mo Pro planned, not built; all users get full access today.

## 4. Tech stack & architecture
Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres/Auth/Edge Functions) · Vercel (auto-deploy on push to main) · Resend · Upstash.

**Extraction engine (live since June/July 2026):** Supabase edge function `parse-brief` (v17) with provider chain **Gemini Flash → Groq Llama → Grok** (Grok tier dead until `GROK_API_KEY` secret is set). Client path: `lib/brief-parser-gateway.ts` → `lib/invoice-parsed-extraction-hydration.ts` (confidence-gated, overwrite-safe). The legacy OpenAI pipeline (~7,300 lines) is **archived** at `_archived/legacy-extraction/` with types-only husks at the original `lib/` paths; `/api/brief-extract` no longer exists. Edge functions deploy via dashboard paste (outside git) — **run a drift check (`get_edge_function` vs repo) at the start of any extraction session.**

**CI (since July 7, 2026):** `.github/workflows/ci.yml` runs on every push/PR — typecheck + GST compliance suite + hydration suite + gateway contract suite + live-battery fixtures (6 real prod parser responses). Red CI = the push failed. Do not merge around it.

Known shape issues (tolerated, refactor incrementally): `InvoiceEditorPage.tsx` ~3,370 lines; two profile tables (`profiles` + `user_profiles`); ~105 Playwright tests stale from UI drift; 32 hardcoded `#111118` inks remaining from the E design migration.

## 5. Critical areas (risk ranking)
🔴 **GST math** — CGST/SGST vs IGST vs zero-rated/LUT; SAC defaults live in `lib/invoice-line-item-catalog.ts` (UI/UX = **998314**, restored July 7 after a catalog regression). CI runs `tests/compliance/run-gst-compliance-tests.ts` on every push; still walk one manual scenario after touching tax logic.
🔴 **Invoice number generation** — sequential, no gaps/duplicates.
🔴 **MSA defaults & Addendum overrides** — wrong MSA = legally-binding mistake.
🟡 **Extraction → hydration mapping** — protected by the hydration + battery suites; open defects tracked in SESSION_LOG (P1-C date junk, P1-D currency assumption, P1-E totalAmount semantics, P2-F no milestones[] structure, P2-G normalizer-dependency crash, P2-H invisible withheld suggestions).

## 6. Known reality gaps (July 2026)
1. `GROK_API_KEY` unset in prod — provider chain is effectively 2-tier.
2. Backups: **Supabase Free has no verified restore path** (the April "7-day PITR" assumption was wrong — PITR is paid). Mitigation ritual: periodic logical export of all non-empty tables via Supabase MCP `json_agg` (first export taken 2026-07-07, 212 KB / 104 rows, stored by founder). Repeat before any schema migration and monthly.
3. Cost alerts unconfigured.
4. Parser schema cannot represent milestone schedules (P2-F) — fix ships with v1.5 schema work, same breath.
5. Playwright E2E suite stale (~105 failures from selector drift) — revive during Phase 3 QA.

## 7. Working style & AI collaboration
**Founder:** terse bursts ("go", "ok", bare SHAs); expects momentum and conservative independent decisions; blunt feedback = pull more source data, don't theorize. Wants simple explanations on request; step-by-step for unfamiliar terrain.

**Antigravity (sole code executor, auto-push):** structurally hallucination-prone — never trust its summary. Prompts must contain: precise file paths · byte-exact FIND/REPLACE (each anchor verified unique) · explicit do-not-touch list · verification demands with pasted raw output · structured reply (SUMMARY · diff --stat · TEST/BUILD output · PUSHED SHA · UNRESOLVED). AG sometimes makes unrequested "helpful" edits (e.g., adding `as any` casts, extra shims) — every commit gets byte-exact review; sanctioned deviations only.

**Claude (architect + verifier, writes no code):** verification workflow = `git ls-remote` for true HEAD → shallow clone → re-apply intended edits programmatically → assert equality with HEAD → run affected suites locally on the pushed commit. Codex is retired.

**Earned lessons:** schema is the source of truth, a test is only a witness (July 7: a stale string-schema test nearly shipped a wrong-direction fix). Verify the call site, not just the import. Log every session — an unlogged session poisons the next cold start. Archived > deleted (`_archived/`, tsconfig-excluded, types-only husks at original paths).

## 8. Anti-patterns
No payments table · no Razorpay · no paid SaaS suggestions (₹500 ceiling) · no ProductHunt prep · don't trust feature names or old docs at face value · no big-bang refactors of working monoliths · never bypass red CI · never edit battery fixtures to make tests pass (they are captured production truth).

## 9. Maintenance
Update this manual when reality contradicts it, a gate/service/critical area changes, or at minimum at the end of any session that touches §3–§6. SESSION_LOG.md carries the day-to-day truth between manual revisions.
