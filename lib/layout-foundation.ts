export const appPageShellClass = "min-h-screen bg-transparent";

export const appPageContainerClass = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 2xl:px-10";

// New utility: centered container for pages/forms
export function appContainerCenteredClass() {
  return "flex justify-center w-full";
}

// Utility for a full‑width container that still respects the page max‑width
export function appContainerFullClass() {
  // Uses the global page container max‑width (1440px) and full‑width on smaller screens
  return "w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8";
}


export const appPageSectionClass = "py-6 sm:py-8 lg:py-10";

export const appGridClass =
  "grid grid-cols-4 gap-4 sm:grid-cols-8 sm:gap-5 lg:grid-cols-12 lg:gap-6";

export const appFormLayoutClass =
  "grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start";

export const appFormMainPaneClass = "xl:col-span-7";

export const appFormSidePaneClass = "xl:col-span-5";

export const appReadableContentClass =
  "col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2";

export const appNarrowContentClass =
  "col-span-4 sm:col-span-8 lg:col-span-8 lg:col-start-3";

export const appPrimaryPaneClass = "col-span-4 sm:col-span-8 lg:col-span-8";

export const appSecondaryPaneClass = "col-span-4 sm:col-span-8 lg:col-span-4";

export const appCardClass =
  "rounded-[var(--app-radius-card)] border-2 border-[color:var(--brutal-border-color)] bg-[color:var(--color-paper)] p-6 shadow-[var(--brutal-shadow-sm)]";

export const appSectionGapClass = "space-y-6";

export const appGroupGapClass = "space-y-6";

export const appFieldGapClass = "space-y-4";

export const appFieldGridClass =
  "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2";

export const appFieldGridWideStartClass =
  "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]";

export const appMetaGridClass =
  "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2";

export const appModalWidthClass = "w-full max-w-[1120px]";

export const appModalPaddingClass = "px-4 py-4 sm:px-6 sm:py-5 lg:px-8";

export const appSummaryGridClass = "grid grid-cols-1 gap-4 lg:grid-cols-2";

export const appHistoryFoundationClass =
  "grid grid-cols-4 gap-4 sm:grid-cols-8 sm:gap-5 lg:grid-cols-12 lg:gap-6";

export const appSectionHeaderStackClass = "space-y-2";

/* ── Invoice Editor 3-Column Grid ── */

/** Sticky helper – pins element to top with 16px offset */
export const appStickyTopClass = "sticky top-24 self-start";

/**
 * Three-column grid for the invoice editor:
 *  - Left:   stepper rail  (fixed ~160px)
 *  - Center: wizard form   (flex 1fr, scrollable)
 *  - Right:  meta + totals (fixed ~280px, hidden below lg)
 *
 * All gaps are multiples of 8px (Tailwind gap-4 = 16px, gap-6 = 24px).
 * On mobile/tablet the layout collapses to a single column.
 */
export const appEditorGridClass = [
  "mx-auto grid w-full max-w-[1440px]",
  // Mobile: single column
  "grid-cols-1 gap-4",
  // lg: left stepper + center wizard (no right sidebar yet)
  "lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-6 lg:items-start",
  // xl: full 3-column with right sidebar
  "xl:grid-cols-[160px_minmax(0,1fr)_280px] xl:gap-6",
].join(" ");
