# Klapped Invoice Module - Knowledge Transfer (KT)

## 1. Architectural Overview & Context
The Klapped Invoice Editor has recently transitioned into an **AI-First Extraction Worklfow**. The core philosophy is "AI Engine with a Form Fallback." Rather than asking creative users to fill out complex tax matrices immediately, the user pastes their raw brief (text, image, audio), and the engine hydrates the state automatically. The visible form acts strictly as a verification shell.

### UX Paradigm Shift
We've migrated from a vertical-scrolling brutalist block layout to an elegant **"One Modal at a Time" stepper architecture**. 
- **Stepper Logic:** Centralized in `InvoiceEditorPage.tsx`. The topographical sidebar shows live progress, but the primary view focuses the user entirely on a single logical group per step (`Agency`, `Client`, `Deliverables`, `Payment`, `Meta`, `Totals`).
- **Extraction Takeover:** Using the `isProcessingAutofill` state, we throw a full-screen loader animation, intercepting user actions until the AI concludes the mapping logic.

## 2. Design System & CSS Rules
The platform uses a creative-focused deep indigo / parchment theme mapped through `app/globals.css`.
- **Color Overrides:** The primary button layer (`.app-soft-button-primary`) heavily employs deep blue space indigos (`var(--interactive-primary)`). 
- **Contrast Integrity enforced:** Because of deep variable nesting causing black-on-blue button illegibility (via missing `--text-on-accent` specificity), button texts are now forcibly bound to Tailwind's `text-white` utility down at the component mapping level (`ui-foundation.ts:getAppButtonClass`).
- **Geometry:** Brutalist 0px borders were phased out in favor of soft, approachable 12px-16px borders reflecting a more Neo-glassmorphic tone.
- **Error States:** Missing field highlights (`.app-soft-field-error`) no longer use jarring solid yellow paint inside inputs. They maintain `var(--color-surface)` as a clean background while rendering an aggressive, pulsing amber `box-shadow` animation out from the borders (`missing-field-glow`).
- **Animation Primitives:** Most section wrappers animate via `framer-motion` via `@/components/ui/motion-primitives`. However, for highly nested conditional form states (like toggling GST Registration in `AgencyDetailsSection.tsx`), `AnimatePresence` height scaling proved too choppy and shaky and has been stripped out in favor of raw boolean UI checks (`&&`) for instant DOM painting.

## 3. Storage & State Flow
- **Data Hydration:** Managed centrally in `InvoiceEditorPage.tsx` using `InvoiceFormData`. 
- **Draft Persistence:** Unfinished drafts save securely to `localStorage` under `DRAFT_STORAGE_KEY`.
- **Safe Exit & Draft Clearing:** When a user aborts an invoice attempt, the platform intercepts exiting via `shouldConfirmExit` toggling the `ExitConfirmModal`. 
  - **Crucial Flow:** Hitting `Skip` inside the exit module explicitly flushes and clears the active session drafts (`window.localStorage.removeItem(DRAFT_STORAGE_KEY)`) before redirecting home (`router.push("/")`). This prevents stale ghost drafts from auto-loading on their next session.

## 4. Pending Blockers & Known Incomplete Systems
- **Supabase Edge Environment Variables:** The `GROQ_API_KEY` mapping inside the hosted `.env` layer was reported missing or failed earlier on edge function deployment. Validation logic might need verification against host infrastructure (Vercel/Appwrite cloud configs vs local environments).
- **Backend Sync:** Final migration of the invoice payload against actual backend buckets should be heavily tested. The platform has been refactored strongly away from purely mock data logic, but robust e2e tests post-extraction sync are recommended.
