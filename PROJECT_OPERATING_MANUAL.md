# LanceInvoice — Project Operating Manual

> **Purpose:** Single source of truth for AI assistants (Claude, Antigravity, future LLMs) working on LanceInvoice. Captures rules, gates, and critical context that aren't visible in the code. Read this BEFORE giving advice.
>
> **Last updated:** April 27, 2026
> **Project:** LanceInvoice (lanceinvoice.xyz)
> **Repo:** desi-freelance-docs
> **Companion document:** `USER_FLOWS.md` (detailed end-to-end flows)

---

## 1. Product Context

**Pitch (one sentence):**
LanceInvoice is a milestone-driven billing and contract enforcement engine built exclusively for the realities of the Indian creative freelance market. *"Stop sending receipts; start sending living contracts."*

**Why this is different from "another invoicing tool":**
The contract IS the invoice IS the payment tracker — one living document that evolves through states (Draft → Sent → Settled). MSA enforcement and per-invoice Addendum overrides make every invoice carry its own legally-distinct contract.

**Hero archetypes (priority order):**
1. **Creative Generalist** — illustrator, video editor, copywriter, ₹2-8L/year, mix of small and large projects, hates paperwork
2. **Agency-of-One** — solo founder running like a small agency, ₹10L+/year, 5-10 active clients, milestone-heavy
3. **Compliance-Heavy Pro** — senior freelancer with GSTIN, deals with TDS, corporate clients
4. **Side-Hustler** *(later)* — salary employee doing weekend gigs, no GSTIN, simple receipts

**Stage:** Pre-launch. Only the founder has ever used it.

**30-day goal:** Make brief extraction smart enough to map messy text/image/audio/Hinglish input to ~34 invoice fields at 80% accuracy. Then ship/market to freelancers.

**Definition of "shipping":** Advertising the app to real users to gain traction (NOT "deployed to production"). Launch playbook: Reddit (Indian freelancer subs) + personal DMs to actual freelancers. NOT ProductHunt at this stage.

---

## 2. Budget & Cost Reality

**Hard monthly budget:** ₹500 maximum.

**Current paid services:**
- Domain: $13/year (~₹90/month)
- xAI/Grok prepaid credit: $10 one-time

**Free tiers in use:**
- Vercel (Hobby) — Next.js hosting
- Supabase (Free) — Auth + Postgres database
- Resend (Free) — 3,000 emails/month
- Upstash Redis (Free, ap-south-1 Mumbai) — rate limiting

**🚨 Cost-sensitive endpoints:**
| Endpoint | Service | Notes |
|---|---|---|
| `/api/brief-extract` | OpenAI | **CURRENTLY BROKEN — see Section 6** |
| `/api/share-invoice` | Resend | Free up to 3K/month |
| `/api/invoice/request-milestone` | Resend | Same pool |
| `/api/cron/check-invoices` | Resend | Scheduled job, same pool |

**Cost monitoring status:** No active dashboards bookmarked. No spending alerts configured. **Known gap.**

**Backup status:** Daily heartbeat cron pings Supabase to prevent free-tier auto-pause. NO real data backups verified. Supabase Free tier has 7-day point-in-time recovery — assumed but unconfirmed.

---

## 3. Access & Gating Rules

### Authentication

- **Provider:** Supabase Auth (Google OAuth)
- **Middleware:** `proxy.ts` (renamed from `middleware.ts`) — verified working in production despite Next.js convention
- **Protected routes:** `/invoices`, `/invoice/new`, `/invoice/preview`, `/profile`, `/clients`, `/onboarding`, `/support`
- **Public routes:** `/`, `/login`, `/view/[token]`, `/privacy`, `/terms`

### Brief Extraction Whitelist (CRITICAL — easy to miss)

- **Status:** AI brief extraction is locked to ONE specific account ID (the founder's)
- **Implementation:** ❓ Unverified — needs Antigravity inspection
- **User-facing UX for non-whitelisted users:**
  - Sees a collapsed feature card with humorous message: *"Engine is out of fuel, waiting for Strait to straighten up"*
  - Cannot click into the AI extraction flow
- **Type:** Temporary launch gate. Will eventually become a paid Pro feature.

### MSA + Addendum System (CORE FEATURE — not a gate)

This is THE differentiating product feature. Document carefully:

- Each agency has a **base MSA** stored in master data (default MSA loaded for new agencies)
- Every invoice **inherits** MSA defaults (payment terms, late fees, IP rights, jurisdiction)
- In the Terms & Payment section, the user can **override** any MSA term for this specific invoice
- The system auto-detects overrides and treats them as **Addendums** to the base MSA
- When the client opens the invoice link, they see: **MSA summary + highlighted Addendums** in a popup
- The invoice is **fully blurred** until the client takes one of three actions:
  - **Accept** → invoice unblurs, agency notified
  - **Propose Changes** (with note) → invoice stays locked, agency notified to renegotiate
  - **Reject** → handled similarly
- Schema state: `msa_status: 'PENDING' | 'ACCEPTED' | 'REVISION ASKED'`

**There is no separate "rush mode" or "rush invoice" path.** The phrase was founder shorthand for the MSA override / Addendum mechanism described above.

### Settlement Model: Manual & Offline-Friendly

**Lance does NOT process payments.** Critical to understand:

- Clients pay agencies directly via UPI / bank transfer / SWIFT — **outside Lance**
- Agencies upload their own UPI QR code to master data; it gets embedded in invoices
- After receiving payment, the agency **manually marks** milestones as settled in Lance
- Settlement is self-attested by the agency, not validated against payment events
- **Razorpay is NOT integrated** (was on roadmap, never built — code does not call Razorpay)

This is intentional design — Indian freelancers prefer direct UPI payments over payment processors with 2-3% fees. Lance is the **system of record**, not the **system of payment**.

**Implication for AI assistants:** Do NOT suggest adding a `payments` table or webhook handlers. State transitions on the invoice itself are sufficient (`SENT → PARTIAL → SETTLED`).

### User Tiers (₹199/month Pro)

- **Status:** Planned, NOT built. Code does not enforce tier-based access.
- Today, every signed-up user gets full access (except brief extraction whitelist).

---

## 4. Tech Stack & Architecture

- **Framework:** Next.js 16.2.1, React 19.2.4
- **Database/Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Styling:** Tailwind CSS v4
- **State management:** Native React `useState` (no Zustand/Redux/RHF yet)
- **Deployment:** Vercel (auto-deploy on push to `main`)
- **AI provider in code:** OpenAI Responses API at `/v1/responses` (hardcoded URL, line 105 of `lib/ai-brief-extractor.ts`)
- **Rate limiting:** Upstash Redis (configured Apr 27, 2026)
- **Email:** Resend
- **Payment processing:** None (manual UPI/bank, no gateway)
- **Testing:** Playwright E2E + custom benchmark scripts

**Notable quirks:**
- `middleware.ts` was renamed to `proxy.ts` — works on Vercel despite Next.js convention suggesting it shouldn't
- Several monolithic components: `InvoiceEditorPage.tsx` (3000+ lines), `ClientDetailsSection`, `DeliverablesSection`
- 105 Playwright tests are currently failing on `main` due to UI drift from recent prototyping (test selectors out of sync with markup) — pre-existing, not a blocker

---

## 5. Critical Areas (Risk Ranking)

The founder ranked these. Treat with extreme care.

🔴 **CRITICAL** — silent data corruption risk, wrong invoices going out:
1. **GST math** — CGST/SGST vs IGST vs ZERO calculation; agency state vs client state vs SEZ vs LUT logic. Lives in `lib/invoice-tax.ts` + `lib/invoice-calculations.ts`.
2. **Invoice number generation** — must be sequential with no gaps, no duplicates.
3. **MSA defaults & Addendum overrides** — wrong MSA → legally-binding mistake.

🟡 **BAD** — visible breakage, user complaints:
4. **Brief extraction → field mapping** — currently broken anyway (see Section 6).
5. **Master data sync for new users** — affects onboarding-to-first-invoice path.

**Pre-flight checklist before any code change near 🔴 Critical areas:**
- GST: Run `tests/compliance/run-gst-compliance-tests.ts` before AND after change
- Invoice numbers: Manually create 2-3 test invoices, verify sequence
- MSA: Walk through one MSA flow end-to-end (create invoice → share → client view → accept)

---

## 6. Known Reality Gaps & Open Questions

### 🚨 Brief extraction has never worked in production

**Discovered:** April 27, 2026
**Status:** OpenAI API account exists but has $0 credits and no payment method. Every brief extraction call has been silently failing (probably 401 from OpenAI). The whitelist hid this fact.

**Implication:** The 30-day goal of *"80% accuracy"* assumes a baseline of 0%, not an existing implementation to optimize.

**Three paths forward (decision pending):**
- **Path A** — Add credits to OpenAI ($5-10), test, see what happens. Cost: ₹400-800.
- **Path B** — Migrate to Gemini's free tier (15 RPM free for Gemini 2.0 Flash). Truly free, more code change.
- **Path C** — Migrate to Grok via xAI ($10 credit already prepaid). OpenAI-compatible API, smallest code change (swap URL on line 105 + model name).

**Recommended:** Path C. Aligns with what founder originally thought was being used, leverages existing prepaid credit, minimal code change.

### Brief-extract whitelist implementation unverified

The founder told Antigravity to "lock it for one account ID" but doesn't know how it was implemented. Could be hardcoded ID check, database flag, frontend-only hide, or middleware. Should be verified before relying on it.

### Cost visibility is zero

No dashboards bookmarked, no spending alerts. Must be addressed before public launch.

### Backup verification needed

Supabase Free tier *should* include 7-day point-in-time recovery. Unverified. Daily cron is a heartbeat, not a backup.

---

## 7. Working Style & AI Collaboration Rules

### How the founder works with Antigravity

- Tells it what to do, lets it run autonomously, reviews at the end
- Antigravity's known failure modes (must be guarded against in prompts):
  - **Introduces bugs in working code while fixing other things** — verify untouched files still work
  - **Writes overly-clever code that's hard to maintain** — demand plain-English explanations
  - **Claims completion without actually testing** — demand proof (test output, curl results)
- Naming conventions: founder doesn't know what conventions exist. Discover patterns as needed; document when they matter.
- Commit strategy: **Small, frequent commits.** Antigravity prompts should end with *"commit this change with a descriptive message before stopping."*
- File taboos: AI may touch anything except `.env*` files. Verify `.gitignore` includes them.

### Required prompt patterns for Antigravity

When asking Antigravity to make changes, ALWAYS include:
1. **Scope boundaries** — explicit list of files NOT to touch
2. **Verification demands** — *"After changes, run X test and paste the actual output, don't summarize"*
3. **Plain-English explanations** — *"Explain in 1-2 sentences what each modified file now does"*
4. **Pre-flight checklist for 🔴 Critical areas** — see Section 5
5. **Commit instruction** — small, focused, descriptive message

### How the founder works with Claude (this assistant)

- Wants step-by-step guidance, especially for terminal/git commands
- Prefers explanations as if to a beginner (*"I am 7 years old only"*)
- Wants Claude to **wait for confirmation** between steps, not dump entire solution stacks
- Appreciates being pushed back on (e.g., *"everyone" as target user is a bad answer*)
- Will share full screenshots and terminal output when asked
- Pauses when Claude makes assumptions without verification → this is good, Claude should reward this

### Git workflow

- New to git branching as of April 27, 2026
- Comfortable with: `status`, `add`, `commit`, `push`, `checkout`, `branch`, `stash`
- Always works on a feature branch when changes are uncertain
- Pushes to `main` are direct (no PR review since solo)

---

## 8. Active Priority Stack

Updated April 27, 2026, end of session.

**Completed today:**
1. ✅ Verified `proxy.ts` protects routes in production
2. ✅ API auth audit & refactor — `brief-extract` and `request-milestone` now properly return 401
3. ✅ Upstash rate limiting configured and deployed
4. ✅ Discovered OpenAI billing reality (zero credits, never worked)
5. ✅ Created Project Operating Manual + USER_FLOWS.md

**Next session priorities:**
1. **Decide AI provider strategy** (Grok vs Gemini vs OpenAI add-credits) — start here
2. Implement chosen AI provider, get brief extraction actually working end-to-end
3. localStorage autosave on `InvoiceEditorPage` (mobile data drops kill drafts)
4. Bento grid landing page polish (the original question that started everything)
5. Migrate `InvoiceEditorPage` to react-hook-form + Zod (performance + maintainability)

**Deferred / Not yet prioritized:**
- Verify brief-extract whitelist implementation
- Confirm Supabase backup configuration
- Set up cost monitoring dashboards
- Add cost spending alerts (especially OpenAI/Gemini/Grok)
- Verify and update Playwright tests after UI prototyping work stabilizes

---

## 9. Anti-Patterns to Avoid

Things AI assistants should NOT do on this project:

- **Don't suggest adding a `payments` table** — settlement is manual, by design
- **Don't suggest Razorpay integration** — explicitly chosen against; UPI QR is the model
- **Don't suggest ProductHunt launch prep** — wrong audience for current stage
- **Don't suggest paid SaaS tools** — ₹500/month budget is a hard ceiling
- **Don't trust feature names at face value** — "rush mode" turned out to be MSA Addendums; verify before assuming
- **Don't suggest ripping out monolithic components without a phased plan** — `InvoiceEditorPage` is 3000 lines but works; refactor incrementally with full test coverage at each step
- **Don't blindly run `npx playwright test`** without first starting `npm run dev` in another terminal — config doesn't auto-spawn server

---

## 10. Document Maintenance

This manual is a **living document.** It must be updated when:

- A discovery contradicts something written here (especially Section 6 — Reality Gaps)
- A new feature gate or access rule is added (Section 3)
- A new third-party service is added or removed (Section 2)
- The hero archetype shifts based on real user feedback (Section 1)
- A 🔴 Critical area changes shape (Section 5)

**How to update:** At the end of any Claude session, ask: *"Update the operating manual based on what we learned today and give me the new version."* Save the updated version back to repo.

If this manual is more than 30 days out of date, treat its claims with suspicion until verified.

---

*End of manual. When in doubt, ask the human. For end-to-end flow details, see `USER_FLOWS.md`.*
