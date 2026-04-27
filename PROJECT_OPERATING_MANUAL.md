# LanceInvoice — Project Operating Manual

> **Purpose:** This document captures the rules, gates, decisions, and context that aren't visible in the code. Read this BEFORE giving advice on this project. It is updated by the human builder, not by AI.
>
> **Last updated:** April 27, 2026
> **Project:** LanceInvoice (lanceinvoice.xyz)
> **Repo:** desi-freelance-docs

---

## 1. Product Context

**Pitch (one sentence):**
LanceInvoice is a milestone-driven billing and contract enforcement engine built exclusively for the realities of the Indian creative freelance market. *"Stop sending receipts; start sending living contracts."*

**Why this is different from "another invoicing tool":**
The contract IS the invoice IS the payment tracker — one living document that evolves through states (Draft → Sent → Settled). The MSA approval flow is a core feature, not a bolt-on.

**Hero archetypes (priority order):**
1. **Creative Generalist** — illustrator, video editor, copywriter, ₹2-8L/year, mix of small and large projects, hates paperwork
2. **Agency-of-One** — solo founder running like a small agency, ₹10L+/year, 5-10 active clients, milestone-heavy
3. **Compliance-Heavy Pro** — senior freelancer with GSTIN, deals with TDS, corporate clients
4. **Side-Hustler** *(later)* — salary employee doing weekend gigs, no GSTIN, simple receipts

**Stage:** Pre-launch. Only the founder has ever used it.

**30-day goal:** Make brief extraction smart enough to map messy text/image/audio/Hinglish input to ~34 invoice fields at 80% accuracy. Then ship/market to freelancers.

**Definition of "shipping":** Advertising the app to real users to gain traction (not "deployed to production").

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

**🚨 Cost-sensitive endpoints (every recommendation must factor these):**
| Endpoint | External Service | Notes |
|---|---|---|
| `/api/brief-extract` | OpenAI (per call ~₹2-5) | **CURRENTLY BROKEN — see Section 6** |
| `/api/share-invoice` | Resend | Free up to 3K/month |
| `/api/invoice/request-milestone` | Resend | Same pool |
| `/api/cron/check-invoices` | Resend | Scheduled job, same pool |

**Cost monitoring status:** No active dashboards bookmarked. No spending alerts configured. **This is a known gap.**

---

## 3. Access & Gating Rules

### Authentication

- **Provider:** Supabase Auth (via Google OAuth)
- **Middleware:** Lives in `proxy.ts` (renamed from `middleware.ts`) — verified working in production
- **Protected routes:** `/invoices`, `/invoice/new`, `/invoice/preview`, `/profile`, `/clients`, `/onboarding`, `/support`
- **Public routes:** `/`, `/login`, `/view/[token]`, `/privacy`, `/terms`

### Brief Extraction Whitelist (CRITICAL — easy to miss)

- **Status:** AI brief extraction is locked to ONE specific account ID (the founder's)
- **Implementation:** ❓ Unverified — needs Antigravity inspection
- **User-facing UX for non-whitelisted users:**
  - Sees a collapsed feature card with humorous message: *"Engine is out of fuel, waiting for Strait to straighten up"*
  - Cannot click into the AI extraction flow
- **Type:** Temporary launch gate. Will eventually become a paid Pro feature.

### MSA Approval Flow (this is a FEATURE, not a gate)

When an agency shares an invoice:
1. Client receives an email with a public link (`/view/[share_token]`)
2. Client opens the link → sees the invoice **fully blurred** with an MSA approval popup overlaid
3. Client must approve, request revision, or reject before the invoice unblurs
4. The agency receives a notification on response
5. State stored in `msa_status: 'PENDING' | 'ACCEPTED' | 'REVISION ASKED'`

**This is the "contract" half of the "billing + contract enforcement engine" pitch.**

### User Tiers (₹199/month Pro)

- **Status:** Planned, NOT built. Code does not enforce tier-based access.
- **Today, every signed-up user gets full access** (except brief extraction, which is whitelisted).

---

## 4. Tech Stack & Architecture (key facts)

- **Framework:** Next.js 16.2.1, React 19.2.4
- **Database/Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Styling:** Tailwind CSS v4
- **State management:** Native React `useState` (no Zustand/Redux/RHF yet)
- **Deployment:** Vercel
- **AI provider in code:** OpenAI Responses API at `/v1/responses` (hardcoded URL)
- **Rate limiting:** Upstash Redis (configured Apr 27, 2026)
- **Email:** Resend
- **Testing:** Playwright E2E + custom benchmark scripts

**Notable quirks:**
- `middleware.ts` was renamed to `proxy.ts` — this works on Vercel despite Next.js conventions suggesting it shouldn't
- Several "monolithic" components: `InvoiceEditorPage.tsx` (3000+ lines), `ClientDetailsSection`, `DeliverablesSection`
- 105 Playwright tests are currently failing on main due to UI drift from recent prototyping (test selectors out of sync with markup) — this is pre-existing and not a blocker for new work

---

## 5. Working Style & Preferences

**How the human works with Antigravity:**
- Tells it what to do, lets it run autonomously, reviews at the end (Path A workflow)
- Sometimes has to undo Antigravity's work — not rare

**How the human works with Claude (this assistant):**
- Wants step-by-step guidance, especially for terminal/git commands
- Prefers explanations as if to a beginner ("I am 7 years old only")
- Wants Claude to **wait for confirmation** between steps, not dump entire solution stacks at once
- Appreciates being pushed back on (e.g., "everyone" as target user)
- Will share full screenshots and terminal output when asked

**Git workflow:**
- New to git branching as of April 27, 2026
- Comfortable with: status, add, commit, push, checkout, branch, stash
- Always works on a feature branch when changes are uncertain
- Pushes to main are direct (no PR review since solo)

**Communication preferences:**
- Direct, concrete, slightly playful tone is OK
- No filler, no excessive caveats
- Honesty about uncertainty preferred over confident guesses
- Calls out when Claude makes assumptions without verification

---

## 6. Known Reality Gaps & Open Questions

> This section captures what we KNOW we don't know, and what was once thought true but turned out wrong.

### 🚨 Brief extraction has never worked in production

**Discovered:** April 27, 2026
**Status:** OpenAI API account exists but has $0 credits and no payment method. Every brief extraction call has been silently failing. The whitelist hid this fact.

**Implication:** The 30-day goal of *"80% accuracy"* assumes a baseline of 0%, not an existing implementation to optimize. Need to either:
- (Path A) Add credits to OpenAI and test
- (Path B) Migrate to Gemini's free tier
- (Path C) Migrate to Grok via xAI (already has $10 credit, OpenAI-compatible API, smallest code change)

### Brief-extract whitelist implementation unverified

**Status:** The founder told Antigravity to "lock it for one account ID" but doesn't know how it was implemented. Could be a hardcoded check, database flag, frontend-only hide, or middleware. Should be verified before relying on it.

### Code feared by founder ("don't break this")

The following areas should be touched with extreme care:
- Brief extraction + field mapping logic
- GST math (location-aware: CGST/SGST vs IGST vs ZERO)
- MSA defaults and override management (especially for "rush invoice" path)
- Invoice correctness and template designs
- Master data sync for new users
- General principle: **new implementations should not compromise existing logic**

### No backup/disaster recovery plan

**Status:** Founder doesn't know if Supabase backups are enabled. Currently runs a daily cron to ping Supabase (heartbeat, not backup).
**Note for assistants:** Supabase Free tier includes 7-day point-in-time recovery — worth confirming this is enabled.

### Cost visibility is zero

No dashboards bookmarked, no spending alerts. Must be addressed before launching to public.

---

## 7. Active Priority Stack (April 27, 2026)

In order of priority. Lower items move up after higher items are done or when context changes.

1. ✅ ~~Verify proxy.ts protects routes~~ (Done — confirmed working)
2. ✅ ~~Test API endpoints for auth/validation~~ (Done — discovered brief-extract returned empty 500)
3. ✅ ~~API auth audit & refactor~~ (Done — shipped to production, brief-extract & request-milestone now return 401)
4. ✅ ~~Add Upstash env vars to Vercel~~ (Done — rate limiter configured)
5. ✅ ~~Discover OpenAI billing situation~~ (Done — revealed brief extraction was never functional)
6. **Decide AI provider strategy** (Grok vs Gemini vs OpenAI) — this is the next session
7. localStorage autosave on InvoiceEditorPage (mobile data drops kill drafts)
8. Add `payments` table for milestone payment tracking
9. Bento grid landing page polish (was the original question that started this thread)
10. Migrate InvoiceEditorPage to react-hook-form + Zod for performance

---

## 8. Things This Document Should Eventually Cover (TODO)

- Naming conventions used in the codebase
- Folder/file taboos (anything off-limits to AI editing)
- Specific patterns Antigravity tends to follow vs. break
- Master data schema details
- Invoice number generation logic
- Cron job schedules and what they do
- Sentry / PostHog when added

---

*End of manual. When in doubt, ask the human.*
