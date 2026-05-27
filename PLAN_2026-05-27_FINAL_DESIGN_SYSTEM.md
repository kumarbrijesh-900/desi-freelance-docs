# Lance Design System — Full Implementation Plan (Updated with Feedback)

All 4 categories. All 30+ actions. Sequenced into 11 sprints (updated based on user feedback).

---

## User Alignment & Decisions Made

Based on user feedback, the following decisions have been incorporated into this plan:

1. **InvoiceEditorPage decomposition (Phase 3, Sprint 6)**: Agreed to execute as an isolated commit with thorough manual QA passes.
2. **`#4F46E5` replacement**: A new token will be added. I will select a WCAG-compliant deep indigo (e.g., `#4338CA` which has a 5.74:1 contrast ratio against white) to replace `#4F46E5` for better accessibility while preserving the visual intent.
3. **`#D4FF00` replacement**: A separate token (`--color-lime-warm` mapped to `#D4FF00`) will be added to the design system to formally support this warmer lime variant.
4. **`rounded-full` exemptions**: Intentional circular elements are a UX necessity. We will define explicit tokens for these (e.g., `--app-radius-pill: 9999px`, `--app-radius-circular: 50%`) to formalize them within the neo-brutal system, replacing raw `rounded-full` utility classes with semantic token classes where applicable.
5. **Dark mode**: Dropped from the plan. Neither the UI toggle nor the CSS token layer will be implemented.
6. **Design system page**: The `/internal/design-system` page was an internal demo and will be deleted from the production codebase. The "Living Styleguide" sprint has been removed.
7. **New component priority**: All proposed new components will be built as they all matter.

## UX/UI Design System Gap Assessment

A thorough UX/UI review of the design system (`globals.css`, `ui-foundation.ts`, `layout-foundation.ts`) revealed several missing foundational elements critical for a robust neo-brutal system:
1. **Typography Scale**: Current typography relies on raw utility classes (`text-[11px]`). A robust system requires semantic text scaling defined via CSS variables (e.g., `--text-step-1`) for maintainability.
2. **Missing Token Scales (Z-Index & Opacity)**: No explicit Z-index scale (e.g., `--z-modal`, `--z-toast`) or standardized opacity tokens (e.g., `--opacity-disabled`, `--opacity-hover`) exist. 
3. **Shadow Coupling**: Brutal shadows are hardcoded to `#111118`. They should use a semantic `--color-shadow` token so they can scale or theme correctly.
4. **Interaction Standardization**: The neo-brutal pressed state (`translate(2px, 2px)`) is manually written in several CSS classes instead of being a standard utility token.
5. **Missing Components**: Crucial feedback components like Tooltips (`AppTooltip`) and Toasts/Notifications (`AppToast`) are missing from the foundation.
6. **Grid System Tokens**: While a 12-column layout exists, formal CSS variables for layout margins and gutters (e.g., `--grid-gutter`) are missing, leading to inconsistent spacing.
7. **Icon Standardization**: Icons are used loosely. A dedicated `AppIcon` component is needed to enforce strict sizes (`sm`, `md`, `lg`) and stroke widths.
8. **Form Component Composition**: `form-foundation.ts` provides utility classes, but a true design system needs composed React components (e.g., `AppInput`, `AppFieldGroup`) that automatically handle labels, helper text, error states, and ARIA attributes out of the box.
9. **Focus Ring Offset**: The current focus ring bleeds directly out from the element. A true neo-brutal focus ring typically includes a 2px offset to maintain the integrity of the 2px ink borders.
10. **Border Weight Hierarchy**: The UI mixes 1px and 2px borders inconsistently (e.g., table layouts vs icon buttons). We need explicit border-weight tokens (e.g., `--app-border-thin`, `--app-border-thick`).
11. **Banner/Alert Standardization**: There are multiple banner styles (thin yellow, thin red, thick black). These must be unified into a strict `AppBanner` component with standard neo-brutal 2px borders.
12. **Button Typography & Icon Buttons**: Button casing is inconsistent ("SAVE PROFILE" vs "Save Draft"). Icon buttons in tables look fragile with 1px borders and need a robust `AppIconButton` component.
13. **Motion Philosophy Conflict**: `motion-primitives.tsx` (Framer Motion) uses scale compressions (`scale: 0.985`) for taps, directly conflicting with the CSS-based neo-brutal click state (`translate: 2px 2px`).
14. **Icon Visual Weight**: `app-icons.tsx` hardcodes a `1.8` stroke width. For a heavy neo-brutal UI with 2px borders, icons look visually weak unless they match the border thickness (min `2.0`).

*These gaps have been formally integrated into the sprints below.*

---

## Phase 1: Fix & Harden (Sprints 1–3)

*Zero-risk mechanical fixes. No architectural changes. Every change is a search-and-replace with visual parity or token alignment.*

---

### Sprint 1 — Kill Non-Neo-Brutal Rounded Corners & Formalize Circular Tokens

**Scope**: 8 flagged files + 5 additional files found during research. Replace `rounded-[Npx]`, `rounded-xl`, `rounded-lg` with `rounded-none`.
Additionally, introduce `--app-radius-pill` and `--app-radius-circular` to `globals.css` to formally support intentional circular elements (like dots, avatars, switch thumbs) instead of relying on ad-hoc `rounded-full` utilities.

#### [MODIFY] [globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
- Add `--app-radius-pill: 9999px;` and `--app-radius-circular: 50%;` to formally support circular UX elements.

#### [MODIFY] [ChoiceCards.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/ChoiceCards.tsx)
- Line 34: `rounded-[8px]` → `rounded-none`
- Line 46: `rounded-[6px]` → `rounded-none`
- Line 54: `rounded-[4px]` → `rounded-none`

#### [MODIFY] [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx)
- Line 764: `rounded-[18px]` → `rounded-none`
- Line 3306: `rounded-[14px]` → `rounded-none`

#### [MODIFY] [TermsPaymentSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/TermsPaymentSection.tsx)
- Line 404: `rounded-[12px]` → `rounded-none`
- Line 424: `rounded-[9px]` → `rounded-none`

#### [MODIFY] [BriefSummaryModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/BriefSummaryModal.tsx)
- Line 446: `rounded-[28px]` → `rounded-none`

#### [MODIFY] [TemplatePicker.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/TemplatePicker.tsx)
- Line 108: `rounded-[1px]` → `rounded-none`

**Estimated effort**: ~45 min  
**Risk**: 🟢 Zero — purely visual alignment  

---

### Sprint 2 — Purge Hardcoded Off-Palette Colors & Add New Tokens

**Scope**: Replace all `#D4FF00` (18 locations) and `#4F46E5` (20+ locations) with new design system tokens. Add missing Z-index, Opacity, and Semantic Shadow tokens.

#### [MODIFY] [globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
- Add `--color-lime-warm: #D4FF00;`
- Add `--brand-indigo-deep: #4338CA;` (WCAG AA compliant replacement for `#4F46E5`)
- Add **Z-Index Scale**: `--z-above: 10`, `--z-dropdown: 50`, `--z-sticky: 100`, `--z-modal: 500`, `--z-toast: 9999`
- Add **Opacity Scale**: `--opacity-hover: 0.8`, `--opacity-disabled: 0.5`
- Add **Shadow Color Token**: `--color-shadow: #111118` and update all `--brutal-shadow-*` definitions to use `var(--color-shadow)` instead of hardcoded hexes.
- Add **Grid Tokens**: `--grid-gutter-mobile`, `--grid-gutter-desktop`, `--grid-margin-mobile`, `--grid-margin-desktop`.
- Add **Border Tokens**: `--app-border-thin: 1px`, `--app-border-thick: 2px`.
- Update **Focus Ring**: Add a 2px offset (e.g., `0 0 0 2px bg, 0 0 0 4px ring`) to maintain the brutalist border integrity.

#### Sub-task 2a: `#D4FF00` → `var(--color-lime-warm)`
Update 18 instances across `AppSwitch`, `LifecycleStepper`, `ProjectRail`, `ActiveDrilldown`, `InvoiceEventRow`, `app/invoices/page.tsx`, etc., to use the new `--color-lime-warm` token.

#### Sub-task 2b: `#4F46E5` → `var(--brand-indigo-deep)`
Update 20+ instances across `NotificationBell`, `InvoiceMetaSection`, `InvoiceEditorPage` (totals), `TermsPaymentSection`, `app/invoice/preview/page.tsx`, etc., to use the new `--brand-indigo-deep` token.

#### Sub-task 2c: `#000` → `#111118` (dashboard/share components)
Fix pure black `#000` shadows to use the system ink color `#111118`.

**Estimated effort**: ~2 hours  
**Risk**: 🟡 Low — color shifts will be visible; need visual review  

---

### Sprint 3 — Inline Shadow → Token Variable Replacement

**Scope**: Replace all inline `shadow-[Npx_Npx_0_#111118]` / `shadow-[Npx_Npx_0_#000]` patterns with the CSS variable equivalents.

**Mapping table**:
| Inline Pattern | Token Reference |
|---|---|
| `shadow-[1px_1px_0_#111118]` | `shadow-[var(--brutal-shadow-pressed)]` |
| `shadow-[2px_2px_0_#111118]` | `shadow-[var(--brutal-shadow-sm)]` |
| `shadow-[3px_3px_0_#111118]` | `shadow-[var(--brutal-shadow-sm)]` |
| `shadow-[4px_4px_0_#111118]` | `shadow-[var(--brutal-shadow-md)]` |
| `shadow-[6px_6px_0_#111118]` | `shadow-[var(--brutal-shadow-lg)]` |
| `shadow-[8px_8px_0_#111118]` | Add `--brutal-shadow-xl: 8px 8px 0 #111118` |

#### [MODIFY] [globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
- Add new token `--brutal-shadow-xl: 8px 8px 0 #111118` to `:root`
- Add responsive overrides for tablet/phone

**Estimated effort**: ~1.5 hours  
**Risk**: 🟢 Low — token values are identical to the inline values  

---

## Phase 2: Extend & Build (Sprints 4–5)

*New shared UI components.*

---

### Sprint 4 — New Shared UI Components (Batch 1: Core)

Create reusable components following the established pattern in `components/ui/`.

#### [NEW] [AppModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppModal.tsx)
- Portal-based modal with `--bg-overlay` backdrop
- Uses `app-soft-shell` surface class + `--brutal-shadow-lg`

#### [NEW] [AppBadge.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppBadge.tsx)
- Wraps the existing `getAppStatusPillClass()` from ui-foundation into a component

#### [NEW] [AppCard.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppCard.tsx)
- Uses the existing `appCardClass` from layout-foundation

#### [NEW] [AppAlert.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppAlert.tsx)
- Uses state color tokens.

#### [NEW] [AppSkeleton.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppSkeleton.tsx)
- Loading placeholder using `--bg-surface-muted` with subtle shimmer animation

#### [NEW] [AppToast.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppToast.tsx)
- Crucial notification feedback component utilizing the new `--z-toast` token and neo-brutal alert styling.

#### [NEW] [AppIcon.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppIcon.tsx)
- Unified icon wrapper enforcing size (`sm`, `md`, `lg`) and stroke width consistency.

#### [MODIFY] [app-icons.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/app-icons.tsx)
- Update default `strokeWidth` from `1.8` to `2.0` (or `2.5` where needed) so icons share the exact visual weight as the 2px borders.

#### [MODIFY] [motion-primitives.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/motion-primitives.tsx)
- Rewrite `MotionButton` and `PressDown` to use neo-brutal translation (`x: 2, y: 2`) instead of generic scale compressions (`scale: 0.985`).

#### [NEW] [AppIconButton.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppIconButton.tsx)
- Robust 2px-bordered icon button for actions (like edit/delete in tables) instead of fragile 1px borders.

#### [NEW] [AppBanner.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppBanner.tsx)
- Unified alert/banner component to standardize the current disparate yellow/red/black banners.

**Estimated effort**: ~3.5 hours  
**Risk**: 🟢 Additive only

---

### Sprint 5 — New Shared UI Components (Batch 2: Data Display)

#### [NEW] [AppTable.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppTable.tsx)
- Neo-brutal data table: 2px ink borders on header, 1px row separators

#### [NEW] [AppTabs.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppTabs.tsx)
- Extends the `app-soft-choice-track` / `app-soft-choice-option` pattern

#### [NEW] [AppProgressBar.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppProgressBar.tsx)
- Extracts the progress bar pattern from `WorkbenchReadinessPanel`

#### [NEW] [AppEmptyState.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppEmptyState.tsx)
- Extracts the empty state pattern from invoices/dashboard pages

#### [NEW] [AppAvatar.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppAvatar.tsx)
- Avatar using the new `--app-radius-circular` token, ink border.

#### [NEW] [AppTooltip.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppTooltip.tsx)
- Inline contextual help utilizing `--z-above` or `--z-dropdown` and a dark neo-brutal inverted theme.

#### [NEW] [AppInput.tsx & AppFieldGroup.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppInput.tsx)
- Fully composed form components that handle labels, inputs, error messages, and ARIA attributes via `form-foundation.ts`.

**Estimated effort**: ~3.5 hours  
**Risk**: 🟢 Additive only

---

## Phase 3: Refactor & Optimize (Sprints 6–9)

*Structural improvements for maintainability and consistency.*

---

### Sprint 6 — Decompose InvoiceEditorPage (151KB)

> [!CAUTION]
> This is the highest-risk sprint. To be done in an **isolated commit** with manual QA checks.

#### Step 1: Extract utility functions
#### [NEW] [lib/invoice-editor-utils.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/invoice-editor-utils.ts)
Extract pure functions (`getStepShortLabel`, `isFormTouched`, etc.).

#### Step 2: Extract sub-components
#### [NEW] [components/invoice/ExitConfirmModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/ExitConfirmModal.tsx)
#### [NEW] [components/invoice/InlineStepSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InlineStepSection.tsx)
#### [NEW] [components/invoice/WorkbenchReadinessPanel.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/WorkbenchReadinessPanel.tsx)

#### Step 3: Extract custom hooks
#### [NEW] [hooks/useInvoiceEditorInit.ts](file:///Users/bkb/Desktop/desi-freelance-docs/hooks/useInvoiceEditorInit.ts)
#### [NEW] [hooks/useInvoiceDraftPersistence.ts](file:///Users/bkb/Desktop/desi-freelance-docs/hooks/useInvoiceDraftPersistence.ts)
#### [NEW] [hooks/useInvoiceAutofill.ts](file:///Users/bkb/Desktop/desi-freelance-docs/hooks/useInvoiceAutofill.ts)

#### Step 4: Verify
#### [MODIFY] [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx)
- Reconstruct the page using the newly extracted modules.

**Estimated effort**: ~6 hours  
**Risk**: 🔴 High — must test every step of the invoice wizard  

---

### Sprint 7 — Delete Internal Design System Demo Page

**Scope**: Remove the `/internal/design-system` route and its associated components, as requested.

#### [DELETE] [app/internal/design-system/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/internal/design-system/page.tsx)
#### [DELETE] [components/ui/DesignSystemReference.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/DesignSystemReference.tsx)

**Estimated effort**: ~10 min  
**Risk**: 🟢 Zero

---

### Sprint 8 — Hardcoded `#111118` → Token References (Bulk Sweep)

**Scope**: ~364 instances of hardcoded `#111118` across `.tsx`/`.ts` files. Convert to CSS variable references (`--color-border-default`, `--color-text-strong`).

#### Priority files (foundation first):
1. [ui-foundation.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/ui-foundation.ts)
2. [layout-foundation.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/layout-foundation.ts)
3. Component files

**Estimated effort**: ~2.5 hours  
**Risk**: 🟡 Medium — high volume  

---

### Sprint 9 — Typography Rationalization

**Scope**: Audit font-weight usages to enforce consistent hierarchy, formally introduce a CSS variable-based typographic scale, and standardize button typography casing (uppercase + tracking) across the app.

#### [MODIFY] [globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
- Add base typography scale tokens: `--text-step-0` (base), `--text-step-1` (sm), `--text-step-2` (md), `--text-step-3` (lg), `--text-step-4` (xl), etc.

#### [NEW] [lib/typography-foundation.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/typography-foundation.ts)
- Define semantic typography classes mapping directly to the new token scale.
- Enforce uppercase tracking styles for all primary and secondary buttons (`app-soft-button`, etc.).

**Estimated effort**: ~3 hours  
**Risk**: 🟢 Low

---

## Phase 4: Audit & Document (Sprints 10–11)

---

### Sprint 10 — Accessibility Audit

#### Sub-task 10a: Focus States
- Verify all interactive elements have `app-focus-ring` class.

#### Sub-task 10b: Color Contrast
- Ensure new `--brand-indigo-deep` (#4338CA) is used for text.
- Check `--color-lime-300` (#BEFF00) is only used as background, not text on white.

#### Sub-task 10c: ARIA & Semantics
- Add `aria-label` to icon-only buttons.
- Add `aria-live="polite"` to toast/status regions.

#### Sub-task 10d: `prefers-reduced-motion`
- Add coverage for `InvoiceEditorPage.tsx` step transition animations.

**Estimated effort**: ~3 hours  
**Risk**: 🟢 Low  

---

### Sprint 11 — Responsive Breakpoint & Print CSS Audit

#### Sub-task 11a: Responsive Breakpoints
Verify across all page routes: Landing page, Dashboard, Invoices list, Invoice editor, Invoice preview, Clients list/detail, Profile page, Share page.

#### Sub-task 11b: Print CSS Hardening
#### [MODIFY] [app/globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
Add comprehensive print stylesheet to hide UI chrome (`.invoice-action-dock`, `.invoice-step-rail`).

#### [MODIFY] [app/invoice/preview/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/invoice/preview/page.tsx)
#### [MODIFY] [components/invoice/share/SharedMsaPreviewContent.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/share/SharedMsaPreviewContent.tsx)

**Estimated effort**: ~3 hours  
**Risk**: 🟡 Medium  

---

## Summary Timeline

| Sprint | Category | Scope | Effort |
|---|---|---|---|
| 1 | 🔧 Fix | Rounded corners + formal circular radii | 45 min |
| 2 | 🔧 Fix | Off-palette colors + new color tokens | 2h |
| 3 | 🔧 Fix | Inline shadows → tokens | 1.5h |
| 4 | 🏗️ Build | New components (Core) | 3h |
| 5 | 🏗️ Build | New components (Data) | 3h |
| 6 | 🔄 Refactor | InvoiceEditorPage decomposition | 6h |
| 7 | 🔄 Refactor | Delete design-system page | 10 min |
| 8 | 🔄 Refactor | `#111118` bulk token sweep | 2.5h |
| 9 | 🔄 Refactor | Typography rationalization | 2h |
| 10 | 📋 Audit | Accessibility | 3h |
| 11 | 📋 Audit | Responsive + Print CSS | 3h |
| | | **Total** | **~27 hours** |
