# Lance Design System — Full Implementation Plan

All 4 categories. All 30+ actions. Sequenced into 13 sprints.

---

## User Review Required

> [!IMPORTANT]
> **InvoiceEditorPage decomposition (Phase 3, Sprint 8)** is the highest-risk change. It touches a 151KB / 4205-line file that is the core of the product. I recommend doing it as an isolated commit with a thorough manual QA pass on every step of the invoice wizard before and after.

> [!WARNING]
> **`#4F46E5` replacement decision**: The audit document says `#4F46E5` (Indigo-600) should become `var(--brand-indigo)` (`#8B5CF6`). These are visually **different** blues — `#4F46E5` is darker and more saturated. Replacing them will shift the accent color across ~20 locations (total amounts, links, hover states). **Please confirm you want all `#4F46E5` → `var(--brand-indigo)` (`#8B5CF6`)**, or would you prefer to add `#4F46E5` as a new token (e.g., `--brand-indigo-deep`)?

> [!WARNING]
> **`#D4FF00` replacement decision**: `#D4FF00` is a warmer/yellower lime vs the system lime `#BEFF00`. It's used in 18 places (switches, dashboard nodes, CTA buttons). **Confirm you want `#D4FF00` → `var(--color-lime-300)` (`#BEFF00`)** everywhere, or should `#D4FF00` become a separate token?

> [!IMPORTANT]
> **`rounded-full` exemptions**: There are 83 uses of `rounded-full` (dots, avatars, pills, switch thumbs). These are intentionally circular elements, NOT card/surface radii. They should be **kept** in a neo-brutal system. Only the 13 non-`full` rounded classes (`rounded-[8px]`, `rounded-xl`, etc.) should be flattened. Please confirm.

## Open Questions

1. **Dark mode**: Do you want a toggle in the UI (e.g., in AppHeader), or just the CSS token layer prepared for later?
2. **Design system page**: Should `/internal/design-system` remain internal-only, or should it be a public-facing styleguide?
3. **New component priority**: If we hit time pressure, which new components matter most — AppModal, AppTable, or AppBadge?
4. **Print CSS**: Should print styles apply only to the invoice preview page, or also to the share page and client detail page?

---

## Phase 1: Fix & Harden (Sprints 1–3)

*Zero-risk mechanical fixes. No architectural changes. Every change is a search-and-replace with visual parity or token alignment.*

---

### Sprint 1 — Kill Non-Neo-Brutal Rounded Corners

**Scope**: 8 flagged files + 5 additional files found during research. Replace `rounded-[Npx]`, `rounded-xl`, `rounded-lg` with `rounded-none` (or `rounded-[var(--app-radius-card)]` / `rounded-[var(--app-radius-control)]` for semantic correctness).

> [!NOTE]
> `rounded-full` is intentionally kept — it's for dots, avatars, pills, and switch thumbs. Not a design violation.

#### [MODIFY] [ChoiceCards.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/ChoiceCards.tsx)
- Line 34: `rounded-[8px]` → `rounded-none` (segmented track)
- Line 46: `rounded-[6px]` → `rounded-none` (segmented option)
- Line 54: `rounded-[4px]` → `rounded-none` (minimal-segmented option)

#### [MODIFY] [DesignSystemReference.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/DesignSystemReference.tsx)
- Line 123: `rounded-[14px]` → `rounded-none` (color swatch)
- Line 239: `rounded-[14px]` → `rounded-none` (nav item)
- Line 332: `rounded-[14px]` → `rounded-none` (placeholder)
- Line 582: `rounded-[14px]` → `rounded-none` (placeholder)

#### [MODIFY] [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx)
- Line 764: `rounded-[18px]` → `rounded-none` (InlineStepSection card)
- Line 3306: `rounded-[14px]` → `rounded-none` (step rail item)

#### [MODIFY] [TermsPaymentSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/TermsPaymentSection.tsx)
- Line 404: `rounded-[12px]` → `rounded-none` (payment mode segmented)
- Line 424: `rounded-[9px]` → `rounded-none` (segmented option)

#### [MODIFY] [BriefSummaryModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/BriefSummaryModal.tsx)
- Line 446: `rounded-[28px]` → `rounded-none` (modal container)

#### [MODIFY] [TemplatePicker.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/TemplatePicker.tsx)
- Line 108: `rounded-[1px]` → `rounded-none` (indicator dot)

**Estimated effort**: ~45 min  
**Risk**: 🟢 Zero — purely visual alignment  
**Verification**: Visual diff on `/internal/design-system`, invoice editor, and brief summary modal

---

### Sprint 2 — Purge Hardcoded Off-Palette Colors

**Scope**: Replace all `#D4FF00` (18 locations) and `#4F46E5` (20+ locations) with design system token references. Also fix `#000` → `#111118` where dashboard/invoice components use pure black instead of the design system ink color.

#### Sub-task 2a: `#D4FF00` → `var(--color-lime-300)` / `bg-[color:var(--color-lime-300)]`

| File | Lines | Context |
|---|---|---|
| [AppSwitch.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppSwitch.tsx) | 28 | Switch track |
| [FaqSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/faq/FaqSection.tsx) | 53 | Border accent |
| [LifecycleStepper.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/LifecycleStepper.tsx) | 46, 48, 55, 80, 95 | Node fills, badges |
| [ProjectRail.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ProjectRail.tsx) | 132, 181 | CTA button, selected indicator |
| [ActiveDrilldown.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ActiveDrilldown.tsx) | 71, 86 | Active button fills |
| [ProjectTimeline.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/project/ProjectTimeline.tsx) | 82 | Timeline node |
| [InvoiceEventRow.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoices/InvoiceEventRow.tsx) | 19 | Status badge |
| [ProjectInvoicesLedger.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ProjectInvoicesLedger.tsx) | 19 | Status badge |
| [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx) | 3933 | Dark CTA text color |
| [app/invoices/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/invoices/page.tsx) | 79, 107 | CTA button, focus ring |
| [app/dashboard/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/dashboard/page.tsx) | 450, 550 | Status dot, CTA |
| [app/invoice/preview/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/invoice/preview/page.tsx) | 1023 | Download CTA text |

#### Sub-task 2b: `#4F46E5` → `var(--brand-indigo)` / `text-[color:var(--brand-indigo)]`

| File | Lines | Context |
|---|---|---|
| [FaqAccordionItem.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/faq/FaqAccordionItem.tsx) | 24 | Hover text |
| [NotificationBell.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/NotificationBell.tsx) | 146, 203 | Link text |
| [SubmitFeedback.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/feedback/SubmitFeedback.tsx) | 84 | Link text |
| [AgencyDetailsSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/AgencyDetailsSection.tsx) | 585, 594, 606 | Upload hover |
| [InvoiceMetaSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceMetaSection.tsx) | 157, 161 | Edit link hover |
| [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx) | 995, 3823, 3846 | Total amount text |
| [TermsPaymentSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/TermsPaymentSection.tsx) | 287, 296, 313, 319, 505 | Addendum toggle, link |
| [ClientDetailsSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/ClientDetailsSection.tsx) | 862, 863 | Profile/client links |
| [DeliverablesSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/DeliverablesSection.tsx) | 362, 365 | Add row hover |
| [TotalsTaxesSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/TotalsTaxesSection.tsx) | 250 | Grand total text |
| [app/clients/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/clients/page.tsx) | 869 | Icon color |
| [app/invoice/preview/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/invoice/preview/page.tsx) | 952, 957, 1146, 1171 | Title hover, template selected |

#### Sub-task 2c: `#000` → `#111118` (dashboard/share components)

| File | Lines | Context |
|---|---|---|
| [ProjectInvoicesLedger.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ProjectInvoicesLedger.tsx) | 46 | `shadow-[4px_4px_0_#000]` |
| [LifecycleStepper.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/LifecycleStepper.tsx) | 109 | `shadow-[2px_2px_0_#000]` |
| [ProjectRail.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ProjectRail.tsx) | 132 | `shadow-[3px_3px_0_#000]` |
| [ActiveDrilldown.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ActiveDrilldown.tsx) | 65 | `shadow-[3px_3px_0_#000]` |
| [MSAAcceptanceModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/share/MSAAcceptanceModal.tsx) | 151, 162, 182, 327, 339 | Multiple shadows |
| [SharedMsaPreviewContent.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/share/SharedMsaPreviewContent.tsx) | 138, 256 | CTA shadows |

**Estimated effort**: ~2 hours  
**Risk**: 🟡 Low — color shifts will be visible; need visual review  
**Verification**: Side-by-side screenshots of dashboard, invoice editor total section, FAQ, notifications

---

### Sprint 3 — Inline Shadow → Token Variable Replacement

**Scope**: Replace all inline `shadow-[Npx_Npx_0_#111118]` / `shadow-[Npx_Npx_0_#000]` patterns with the CSS variable equivalents.

**Mapping table**:
| Inline Pattern | Token Reference |
|---|---|
| `shadow-[1px_1px_0_#111118]` or `shadow-[1.5px...]` | `shadow-[var(--brutal-shadow-pressed)]` |
| `shadow-[2px_2px_0_#111118]` | `shadow-[var(--brutal-shadow-sm)]` |
| `shadow-[3px_3px_0_#111118]` | midpoint; use `shadow-[var(--brutal-shadow-sm)]` |
| `shadow-[4px_4px_0_#111118]` | `shadow-[var(--brutal-shadow-md)]` |
| `shadow-[6px_6px_0_#111118]` | `shadow-[var(--brutal-shadow-lg)]` |
| `shadow-[8px_8px_0_#111118]` | extend token: add `--brutal-shadow-xl: 8px 8px 0 #111118` |

#### [MODIFY] [globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
- Add new token `--brutal-shadow-xl: 8px 8px 0 #111118` to `:root`
- Add responsive overrides for tablet/phone

#### Files to sweep (34 inline shadow instances found):
- [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx) — 6 instances
- [ClientDetailsSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/ClientDetailsSection.tsx) — 4 instances
- [DeliverablesSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/DeliverablesSection.tsx) — 1 instance
- [TotalsTaxesSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/TotalsTaxesSection.tsx) — 1 instance
- [SettlementModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/SettlementModal.tsx) — 1 instance
- [MSAAcceptanceModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/share/MSAAcceptanceModal.tsx) — 5 instances
- [SharedMsaPreviewContent.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/share/SharedMsaPreviewContent.tsx) — 2 instances
- [AppHeader.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/AppHeader.tsx) — 2 instances
- [ProjectInvoicesLedger.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ProjectInvoicesLedger.tsx) — 1 instance
- [LifecycleStepper.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/LifecycleStepper.tsx) — 1 instance
- [ProjectRail.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ProjectRail.tsx) — 1 instance
- [ActiveDrilldown.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/dashboard/ActiveDrilldown.tsx) — 1 instance
- [app/invoices/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/invoices/page.tsx) — 2 instances
- [app/dashboard/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/dashboard/page.tsx) — 2 instances
- [ProjectTimeline.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/project/ProjectTimeline.tsx) — 1 instance

**Estimated effort**: ~1.5 hours  
**Risk**: 🟢 Low — token values are identical to the inline values  
**Verification**: `npm run build` (no runtime breakage); visual spot-check shadows on dashboard and editor

---

## Phase 2: Extend & Build (Sprints 4–7)

*New shared UI components, dark mode token layer, and living styleguide.*

---

### Sprint 4 — New Shared UI Components (Batch 1: Core)

Create reusable components following the established pattern in `components/ui/`.

#### [NEW] [AppModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppModal.tsx)
- Portal-based modal with `--bg-overlay` backdrop
- Uses `app-soft-shell` surface class + `--brutal-shadow-lg`
- `ModalTransition` from motion-primitives for enter/exit
- Props: `isOpen`, `onClose`, `title`, `children`, `size?: 'sm' | 'md' | 'lg'`
- Keyboard: Escape closes, focus trap
- Z-index: `appZIndexTokens.modalBackdrop` / `.modalContent`

#### [NEW] [AppBadge.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppBadge.tsx)
- Wraps the existing `getAppStatusPillClass()` from ui-foundation into a component
- Props: `tone: 'default' | 'success' | 'muted' | 'warning'`, `children`, `size?: 'sm' | 'md'`
- Ink border, uppercase, tracking-wide

#### [NEW] [AppCard.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppCard.tsx)
- Uses the existing `appCardClass` from layout-foundation
- Props: `tone?: 'default' | 'success' | 'warning' | 'muted'`, `elevation?: 'flat' | 'soft' | 'raised'`, `children`, `className?`
- Slot-based: `AppCard.Header`, `AppCard.Body`, `AppCard.Footer`

#### [NEW] [AppAlert.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppAlert.tsx)
- Uses `--state-success-*`, `--state-warning-*`, `--state-danger-*`, `--state-info-*` token sets
- Props: `tone: 'success' | 'warning' | 'danger' | 'info'`, `title?`, `children`, `dismissible?`
- Ink border, 2px, appropriate bg/text tokens

#### [NEW] [AppSkeleton.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppSkeleton.tsx)
- Loading placeholder using `--bg-surface-muted` with subtle shimmer animation
- Props: `width?`, `height?`, `variant?: 'text' | 'card' | 'field'`
- Respects `prefers-reduced-motion`

**Estimated effort**: ~3 hours  
**Risk**: 🟢 Additive only — no existing code modified

---

### Sprint 5 — New Shared UI Components (Batch 2: Data Display)

#### [NEW] [AppTable.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppTable.tsx)
- Neo-brutal data table: 2px ink borders on header, 1px row separators
- Header: `--bg-surface-muted`, `font-bold`, uppercase tracking
- Row hover: `--brutal-shadow-pressed` shift
- Props: `columns: Column[]`, `data: T[]`, `onRowClick?`, `emptyState?`

#### [NEW] [AppTabs.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppTabs.tsx)
- Extends the `app-soft-choice-track` / `app-soft-choice-option` pattern
- Controlled component with `activeTab` + `onChange`
- Motion indicator dot from ChoiceCards pattern
- Props: `tabs: { value, label, icon? }[]`, `activeTab`, `onChange`

#### [NEW] [AppProgressBar.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppProgressBar.tsx)
- Extracts the progress bar pattern from `WorkbenchReadinessPanel` (InvoiceEditorPage ~946–954)
- 2px ink border track, `--color-lime-300` fill
- Props: `value: number` (0–100), `tone?: 'lime' | 'cyan' | 'coral'`, `size?: 'sm' | 'md'`

#### [NEW] [AppEmptyState.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppEmptyState.tsx)
- Extracts the empty state pattern from invoices/dashboard pages
- Props: `icon?`, `title`, `description`, `action?: { label, onClick }`
- Uses `app-soft-panel-muted` surface

#### [NEW] [AppAvatar.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/AppAvatar.tsx)
- Square avatar (neo-brutal), ink border, fallback initials
- Props: `src?`, `alt`, `name`, `size?: 'sm' | 'md' | 'lg'`

**Estimated effort**: ~3 hours  
**Risk**: 🟢 Additive only

---

### Sprint 6 — Dark Mode Token Layer

#### [MODIFY] [globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
Add `[data-theme="dark"]` override block with inverted palette:
```css
[data-theme="dark"] {
  --color-bg-canvas: #0c0c12;
  --color-bg-subtle: #16161e;
  --color-surface: #1a1a24;
  --color-surface-elevated: #22222e;
  --color-surface-muted: #14141c;
  --color-border-soft: #2a2a38;
  --color-border-default: #e0e0e8;
  --color-border-strong: #e0e0e8;
  --color-text-strong: #f0f0f4;
  --color-text-default: #d4d4dc;
  --color-text-muted: #8888a0;
  --color-text-soft: #6e6e84;
  --color-text-on-dark: #111118;
  /* ... all semantic aliases stay the same */
  --brutal-shadow-sm: 2px 2px 0 #e0e0e8;
  --brutal-shadow-md: 4px 4px 0 #e0e0e8;
  --brutal-shadow-lg: 6px 6px 0 #e0e0e8;
}
```

#### [MODIFY] [design-system-tokens.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/design-system-tokens.ts)
- No changes needed — all tokens reference CSS variables, which will auto-resolve to dark values

#### [NEW] [hooks/useTheme.ts](file:///Users/bkb/Desktop/desi-freelance-docs/hooks/useTheme.ts)
- `useTheme()` hook: reads/writes `data-theme` attribute on `<html>`
- Persists preference in `localStorage`
- Respects `prefers-color-scheme` as default

#### [MODIFY] [AppHeader.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/AppHeader.tsx)
- Add theme toggle button (sun/moon icon) using the new hook

**Estimated effort**: ~3–4 hours  
**Risk**: 🟡 Medium — requires visual review of every surface in dark mode  
**Verification**: Manual walkthrough of all pages in dark mode

---

### Sprint 7 — Living Styleguide Buildout

#### [MODIFY] [DesignSystemReference.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/ui/DesignSystemReference.tsx)
Extend the existing component to include interactive demos of all new and existing components:

- **Section: Color Tokens** — All 6 scales with swatches (exists; enhance with dark mode preview)
- **Section: Typography** — All `appTypographyTokens` rendered at each weight
- **Section: Spacing** — Visual spacing scale with ruler
- **Section: Shadows** — All 5 shadow tiers side-by-side
- **Section: Buttons** — All 6 variants × 3 sizes, all states
- **Section: Fields** — Text, Select, Textarea, SegmentedControl in all states
- **Section: Panels** — All 4 panel tones
- **Section: Cards** — New AppCard component in all tones/elevations
- **Section: Badges** — All 4 tones
- **Section: Alerts** — All 4 tones
- **Section: Modals** — Trigger button to open AppModal
- **Section: Tables** — Sample data table
- **Section: Motion** — All 7 animation presets triggered by button
- **Section: Icons** — Full icon grid from app-icons.tsx

**Estimated effort**: ~4 hours  
**Risk**: 🟢 Additive, internal-only page

---

## Phase 3: Refactor & Optimize (Sprints 8–10)

*Structural improvements for maintainability and consistency.*

---

### Sprint 8 — Decompose InvoiceEditorPage (151KB)

> [!CAUTION]
> This is the highest-risk sprint. Every extraction must preserve the exact same runtime behavior and state flow. Work incrementally, verifying after each extraction.

**Current structure** (4205 lines in [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx)):
- Lines 1–122: Imports (~122 lines)
- Lines 124–166: Constants & configs (~42 lines)
- Lines 168–403: Pure utility functions (~235 lines)
- Lines 405–460: `ExitConfirmModal` sub-component (~55 lines)
- Lines 462–695: More utility functions (~233 lines)
- Lines 697–846: `InlineStepSection` sub-component (~149 lines)
- Lines 849–1009: `WorkbenchReadinessPanel` sub-component (~160 lines)
- Lines 1012–1018: `InvoiceEditorPage` wrapper (~6 lines)
- Lines 1020–4205: `EditorContent` main component (~3185 lines)

#### Step 1: Extract utility functions

#### [NEW] [lib/invoice-editor-utils.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/invoice-editor-utils.ts)
Extract pure functions (no React, no hooks):
- `clampNewInvoiceStartStep` (L140–145)
- `clearPersistedInvoiceDrafts` (L168–178)
- `getTodayDateString` (L190–196)
- `getSuggestedDueDate` (L198–200)
- `getDraftPlaceholderNumber` (L207–210)
- `getDemoData` (L212–302)
- `formatCurrency` (L304–315)
- `getFreshInvoiceData` (L317–330)
- `isFormTouched` (L332–403)
- `getStepShortLabel` (L462–479)
- `getLockStateLabel` (L481–498)
- `getFirstInvalidStep` (L500–504)
- `getMissingFieldLabels` (L506–585)
- `withProjectRequirement` (L592–625)
- `isStepValidWithProject` (L627–633)
- `getFirstInvalidStepWithProject` (L635–648)
- `isInvoiceReadyForPreview` (L650–654)
- `getStepDescription` (L656–673)
- `getStepKind` (L675–685)
- `getNextStep` (L687–695)

#### Step 2: Extract sub-components

#### [NEW] [components/invoice/ExitConfirmModal.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/ExitConfirmModal.tsx)
- Move `ExitConfirmModal` (L405–460)
- Import `getAppPanelClass`, `getAppButtonClass` from ui-foundation

#### [NEW] [components/invoice/InlineStepSection.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InlineStepSection.tsx)
- Move `InlineStepSection` (L697–846)
- Import step constants and utilities from `invoice-editor-utils`

#### [NEW] [components/invoice/WorkbenchReadinessPanel.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/WorkbenchReadinessPanel.tsx)
- Move `WorkbenchReadinessPanel` (L849–1009)
- Import `formatCurrency` from `invoice-editor-utils`

#### Step 3: Extract custom hooks from EditorContent

#### [NEW] [hooks/useInvoiceEditorInit.ts](file:///Users/bkb/Desktop/desi-freelance-docs/hooks/useInvoiceEditorInit.ts)
- Extract the initialization logic (bootstrap from URL, localStorage, Supabase)
- Contains the massive `useEffect` at ~L1185–1500

#### [NEW] [hooks/useInvoiceDraftPersistence.ts](file:///Users/bkb/Desktop/desi-freelance-docs/hooks/useInvoiceDraftPersistence.ts)
- Extract draft auto-save to localStorage (L1159–1169)
- Extract beforeunload handler (L1171–1183)

#### [NEW] [hooks/useInvoiceAutofill.ts](file:///Users/bkb/Desktop/desi-freelance-docs/hooks/useInvoiceAutofill.ts)
- Extract autofill field tracking (L1085–1103)
- Extract brief intake processing logic

#### Step 4: Verify

#### [MODIFY] [InvoiceEditorPage.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/InvoiceEditorPage.tsx)
- After extraction, should reduce from ~4205 lines to ~2000–2500 lines
- All imports updated to reference new modules
- Behavior unchanged — same props, same state, same UI

**Estimated effort**: ~6 hours  
**Risk**: 🔴 High — must test every step of the invoice wizard  
**Verification**:
1. `npm run build` — no TypeScript errors
2. Manual test: Create new invoice → fill all 4 steps → preview → save
3. Manual test: Load existing invoice → edit → save
4. Manual test: Brief intake → autofill → review modal → accept
5. Manual test: Locked/read-only invoice view
6. E2E: `npm run test:e2e` (existing Playwright tests)

---

### Sprint 9 — Hardcoded `#111118` → Token References (Bulk Sweep)

**Scope**: 364 instances of hardcoded `#111118` across `.tsx`/`.ts` files. Convert to CSS variable references.

**Strategy**: Two-pass approach:
1. **Border contexts** → `border-[color:var(--color-border-default)]` or `border-[color:var(--border-default)]`
2. **Text contexts** → `text-[color:var(--color-text-strong)]` or `text-[color:var(--text-primary)]`
3. **Shadow contexts** → Already handled in Sprint 3
4. **Background contexts** → `bg-[color:var(--color-text-strong)]`

> [!NOTE]
> Many of these are in `getAppButtonClass()`, `getAppFieldClass()`, etc. in the foundation libraries. Since those already use `border-[#111118]`, converting the foundation functions first will cascade to all consumers.

#### Priority files (foundation first):
1. [ui-foundation.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/ui-foundation.ts) — 7 instances
2. [form-foundation.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/form-foundation.ts) — 0 instances (already uses tokens ✅)
3. [layout-foundation.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/layout-foundation.ts) — 1 instance (L40)
4. Then all component files

**Estimated effort**: ~2.5 hours  
**Risk**: 🟡 Medium — high volume, but mechanical; dark mode will break without this  
**Verification**: `npm run build`; visual spot-check all major pages

---

### Sprint 10 — Typography Rationalization

**Scope**: Audit all 598 font-weight usages to enforce consistent hierarchy.

**Proposed hierarchy rule**:
| Weight | Token | Usage Rule |
|---|---|---|
| `font-black` (900) | Display/Hero | Page titles, hero text, CTAs, counter numbers |
| `font-bold` (700) | Labels | Field labels, section headers, button text, table headers |
| `font-semibold` (600) | Subheads | Sub-section titles, card headers, nav items |
| `font-medium` (500) | Body emphasis | Inline emphasis, descriptions, helper labels |

#### [NEW] [lib/typography-foundation.ts](file:///Users/bkb/Desktop/desi-freelance-docs/lib/typography-foundation.ts)
- Define semantic typography classes as constants:
  ```ts
  export const appTypoPageTitle = "text-4xl font-black tracking-tighter uppercase";
  export const appTypoSectionTitle = "text-xl font-bold tracking-[-0.01em] uppercase";
  export const appTypoCardTitle = "text-base font-semibold tracking-tight";
  export const appTypoLabel = "text-[11px] font-bold tracking-[0.06em] uppercase";
  export const appTypoMicro = "text-[9px] font-black uppercase tracking-[0.12em]";
  export const appTypoBody = "text-sm font-medium leading-6";
  export const appTypoHelper = "text-[11px] leading-5 font-normal";
  ```

#### Sweep files for violations:
- Focus on cases where `font-semibold` is used on page-level headers (should be `font-black` or `font-bold`)
- Focus on cases where `font-bold` is used on micro-labels (should be `font-black` with tracking)
- Document exceptions (e.g., motion-primitives don't need typography rules)

**Estimated effort**: ~2 hours  
**Risk**: 🟢 Low — typography classes are non-breaking  
**Verification**: Visual review of each page for typography consistency

---

## Phase 4: Audit & Document (Sprints 11–13)

*Quality gates, compliance checks, and documentation.*

---

### Sprint 11 — Accessibility Audit

#### Sub-task 11a: Focus States
- Verify all interactive elements have `app-focus-ring` class
- Check that `focus-visible` ring (3px lime-300) renders correctly on all buttons, fields, links, choice cards
- Ensure no `outline: none` without a replacement focus indicator

#### Sub-task 11b: Color Contrast
- Test lime-on-white combinations against WCAG AA (4.5:1 for text, 3:1 for large text)
  - `--color-lime-300` (#BEFF00) on white: **fails** at 1.65:1 — only use as bg, never as text
  - `--color-text-muted` (#6E6E7A) on white: **passes** at 4.8:1 ✅
  - `--color-text-soft` (#76767F) on white: **passes** at 4.2:1 — borderline, check
- Add contrast-safe text alternatives where needed

#### Sub-task 11c: ARIA & Semantics
- Currently only 10 ARIA attributes in `components/ui/` — need more
- Add `aria-label` to all icon-only buttons
- Add `aria-live="polite"` to toast and status regions
- Ensure all form fields have associated `<label>` elements
- Check `AppSwitch` has proper `role="switch"` ✅ (already present)
- Ensure modals trap focus and restore focus on close

#### Sub-task 11d: `prefers-reduced-motion`
- Currently covers: buttons, fields, surfaces, dropzone (via `globals.css` L685–694)
- Missing coverage for: `motion-primitives.tsx` (already handles it per-component ✅), `ChoiceCards.tsx` motion ✅
- Add coverage for: `InvoiceEditorPage.tsx` step transition animation (L147–162)

**Estimated effort**: ~3 hours  
**Risk**: 🟢 Low — additive fixes  
**Verification**: Browser accessibility audit (Lighthouse, axe-core); keyboard-only navigation test

---

### Sprint 12 — Responsive Breakpoint & Print CSS Audit

#### Sub-task 12a: Responsive Breakpoints
Three breakpoints defined in globals.css:
- **Desktop**: Default (> 768px)
- **Tablet**: ≤ 768px — reduced shadows, smaller controls
- **Phone**: ≤ 480px — minimal shadows, compact controls

Verify across all page routes:
- [ ] Landing page (`app/page.tsx`) — hero grid collapse, CTA sizing
- [ ] Dashboard (`app/dashboard/page.tsx`) — project rail collapse, card stacking
- [ ] Invoices list (`app/invoices/page.tsx`) — filter layout, row density
- [ ] Invoice editor — 3-column → 1-column collapse, step rail hiding
- [ ] Invoice preview — template scaling
- [ ] Clients list/detail — drawer behavior on mobile
- [ ] Profile page — form field stacking
- [ ] Share page — full-width on mobile

#### Sub-task 12b: Print CSS Hardening

#### [MODIFY] [app/globals.css](file:///Users/bkb/Desktop/desi-freelance-docs/app/globals.css)
Add comprehensive print stylesheet:
```css
@media print {
  :root {
    --brutal-shadow-sm: none;
    --brutal-shadow-md: none;
    --brutal-shadow-lg: none;
  }
  body { background: white !important; }
  .invoice-action-dock,
  .invoice-step-rail,
  [data-print-hide] { display: none !important; }
  .app-soft-panel { box-shadow: none; border-width: 1px; }
}
```

#### [MODIFY] [app/invoice/preview/page.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/app/invoice/preview/page.tsx)
- Ensure existing `@media print` block (L879) covers all UI chrome
- Add `data-print-hide` attribute to template picker, download buttons, header

#### [MODIFY] [components/invoice/share/SharedMsaPreviewContent.tsx](file:///Users/bkb/Desktop/desi-freelance-docs/components/invoice/share/SharedMsaPreviewContent.tsx)
- Extend existing print styles (L120) to hide acceptance buttons and CTA bar

**Estimated effort**: ~3 hours  
**Risk**: 🟡 Medium — print rendering varies by browser  
**Verification**: Print preview in Chrome and Safari for invoice preview page

---

### Sprint 13 — Token Coverage Report & Documentation

#### [NEW] [scripts/audit-token-coverage.ts](file:///Users/bkb/Desktop/desi-freelance-docs/scripts/audit-token-coverage.ts)
A CLI script that:
1. Parses `globals.css` to extract all defined CSS custom properties
2. Scans all `.tsx`/`.ts` files for usage of each property
3. Reports:
   - **Defined but never used** tokens
   - **Used with hardcoded overrides** (e.g., `#111118` alongside `var(--border-default)`)
   - **Token alias depth** (chains > 2 levels deep)
4. Outputs as markdown table

#### [NEW] [docs/design-system-changelog.md](file:///Users/bkb/Desktop/desi-freelance-docs/docs/design-system-changelog.md)
Document all changes made in this implementation:
- Token additions/removals
- Component additions
- Breaking changes (rounded corner removal, color shifts)
- Migration notes for any future contributors

#### Update existing documentation:

#### [MODIFY] [ARCHITECTURE.md](file:///Users/bkb/Desktop/desi-freelance-docs/ARCHITECTURE.md)
- Add design system section referencing token files, component inventory, and foundation libraries

#### [MODIFY] [KT.md](file:///Users/bkb/Desktop/desi-freelance-docs/KT.md)
- Add section on design system conventions and the token → class → component hierarchy

**Estimated effort**: ~2 hours  
**Risk**: 🟢 Zero — documentation only

---

## Verification Plan

### Automated Tests
```bash
# TypeScript compilation — catches all import/type errors from refactoring
npm run build

# Existing E2E tests — validates invoice creation/editing flows
npm run test:e2e

# Existing compliance tests
npm run test:compliance

# New: Token coverage audit (after Sprint 13)
npx tsx scripts/audit-token-coverage.ts
```

### Manual Verification
After each phase:
1. **Phase 1 gate**: Visual side-by-side comparison of every page (before/after screenshots)
2. **Phase 2 gate**: All new components render correctly on `/internal/design-system`; dark mode toggle works
3. **Phase 3 gate**: Full invoice creation flow (new + edit + locked) works identically; build passes
4. **Phase 4 gate**: Lighthouse accessibility score ≥ 90; print preview renders clean invoice

---

## Summary Timeline

| Sprint | Category | Scope | Effort | Deps |
|---|---|---|---|---|
| 1 | 🔧 Fix | Rounded corners | 45 min | None |
| 2 | 🔧 Fix | Off-palette colors | 2h | None |
| 3 | 🔧 Fix | Inline shadows → tokens | 1.5h | None |
| 4 | 🏗️ Build | New components (Core) | 3h | Sprint 1 |
| 5 | 🏗️ Build | New components (Data) | 3h | Sprint 4 |
| 6 | 🏗️ Build | Dark mode | 3–4h | Sprint 9 |
| 7 | 🏗️ Build | Living styleguide | 4h | Sprints 4, 5 |
| 8 | 🔄 Refactor | InvoiceEditorPage decomposition | 6h | Sprint 3 |
| 9 | 🔄 Refactor | `#111118` bulk token sweep | 2.5h | Sprint 3 |
| 10 | 🔄 Refactor | Typography rationalization | 2h | None |
| 11 | 📋 Audit | Accessibility | 3h | Sprints 1–5 |
| 12 | 📋 Audit | Responsive + Print CSS | 3h | Sprint 9 |
| 13 | 📋 Audit | Token coverage + docs | 2h | All |
| | | **Total** | **~35 hours** | |
