# Design System Foundation Audit

## 1. Product UI Principles

### Form-heavy workflow principles
- Favor calm density over dramatic hierarchy. The product is primarily a work surface, not a marketing page.
- Let users scan vertically and reason locally. Related fields should cluster in short visual runs with predictable labels, widths, and feedback.
- Reduce cognitive branching. Optional, advanced, or contextual controls should stay collapsed or visually secondary until needed.
- Prefer continuity over interruption. The editor should support long-form editing without modal dependence or wizard-like abandonment of previous context.
- Keep feedback quiet but visible. Validation, saved state, upload status, and progress should inform, not dominate.

### Invoice/document editing principles
- The main surface is a continuous form with stable section boundaries.
- Navigation is supportive, not controlling. Sticky rails and action docks should help orientation without owning the editing flow.
- Semantically sized fields improve comprehension. Identifiers, dates, codes, quantities, and money inputs should not inherit full-width defaults.
- Advanced controls such as licensing, tax handling, upload utilities, and settlement details should read as subordinate tools.

### Calm enterprise-grade interaction principles
- Primary action placement must be predictable and always reachable.
- Repeated helper text should be avoided; each cluster gets one purpose line at most.
- Field state changes should not cause layout shifts.
- Optional controls must feel explicit, lightweight, and reversible.

## 2. Component Taxonomy

### Tokens
- Design tokens and CSS custom properties
- Semantic width rules
- Elevation, border, motion, and z-index scales
- Breakpoints and field heights

### Primitives
- Buttons
- Text inputs
- Textareas
- Selects
- Segmented controls
- Pills / status chips
- Panels / surfaces
- Icons
- Motion wrappers

### Composed form components
- Field shells with label, helper, and error slots
- Compact upload utilities
- Structured address groups
- Line-item row compositions
- Optional-section toggles

### Layout shells
- Page shell
- Section shell
- Sticky rail shell
- Sticky action dock
- Content-width scaffolds

### Workflow/navigation components
- Section progress rail
- Continue-to-next controls
- Brief/autofill widget
- Preview/export actions

## 3. Token Model

### Color tokens
- Surface background
- Muted surface
- Elevated surface
- Primary action / focus accent
- Success / warning / error semantic colors
- Border default / border strong
- Text primary / secondary / tertiary

### Typography tokens
- Display title
- Section title
- Field label
- Body text
- Helper text
- Status microcopy

### Spacing tokens
- Base spacing scale from 4px upward
- Control-to-label spacing
- Field-to-field spacing
- Section internal padding
- Page gutter and max-width spacing

### Shape + elevation tokens
- Control radius
- Button radius
- Card radius
- Shell radius
- Soft, raised, and floating elevation

### Interaction tokens
- Focus ring
- Motion duration fast / medium / slow
- Standard and emphasized easing
- Z-index scale:
  - sticky navigation
  - sticky action dock
  - modal backdrop
  - modal content
  - toast

### Control sizing tokens
- Small, medium, and large control heights
- Semantic max widths:
  - compact
  - code / postal
  - identifier
  - money / rate
  - quantity
  - medium
  - content
  - full

### Breakpoints
- Mobile-first
- Tablet support at comfortable two-column density
- Desktop support for sticky rail + main form
- Wide desktop support for denser row editing without full-screen stretching

## 4. Form Design Rules

### Field width by data type
- Names, email, and short text: medium to content width
- IDs such as GSTIN, PAN, LUT, IFSC, tax IDs: identifier width
- Postal / PIN / ZIP / quantity: compact width
- Money / rate fields: medium width
- Dates: compact to medium width
- Currency / country / unit selects: compact to medium width
- Descriptions / notes / address textareas: content or full width depending on context

### Labels
- Labels live above controls.
- Required status should be implied by validation and badges, not repeated with noisy asterisks everywhere.
- Optional controls should be labeled explicitly when collapsed or secondary.

### Helper text
- One helper line per field or group at most.
- Helper text should explain intent, format, or consequence — not restate the label.
- Helper text must collapse when redundant.

### Error messaging
- Inline error text appears only when useful and should occupy reserved space where row stability matters.
- Error copy should be direct and corrective.
- Grouped controls should prefer one shared error when the underlying stored value is singular.

### Validation density
- Calm by default; errors should not flood pristine screens.
- Status badges can summarize incomplete states while inline errors stay local.

### Grouping
- Related inputs should sit in compact semantic groups:
  - legal/tax identifiers together
  - dates together
  - settlement + bank basics together
  - address components together

### Control selection
- Segmented controls for short, mutually exclusive choices with 2–4 options
- Selects for longer or extensible option lists
- Text fields for open-ended or structured entry
- Textareas only where meaningfully multi-line

### Sticky elements
- Sticky rail: orientation + navigation only
- Sticky action dock: save/cancel/preview actions only
- Both should stay visually quiet and not compete with the form body

## 5. Responsive Behavior Rules

### Desktop
- Sticky rail + main content layout
- Row-based editing for line items
- Dense but readable field grids
- Sticky action dock available without covering content

### Tablet
- Collapse to single main column with compact progress summary
- Maintain semantic field widths within local groups
- Action dock may stack or compress but should remain reachable

### Mobile
- One-column flow with local grouping
- Sticky summary/action elements must be smaller and more conservative
- Complex row editors may stack but must preserve field order and hierarchy

## 6. Component State Model

### Buttons
- default
- hover
- focus-visible
- active/pressed
- disabled
- loading

### Inputs / selects / textareas
- default
- hover
- focus
- filled
- error
- disabled
- readonly

### Segmented controls / chips
- default
- hover
- selected
- focus-visible
- disabled

### Panels / surfaces
- default
- muted
- success
- warning
- elevated

### Optional controls
- optional-collapsed
- optional-expanded
- optional-complete

### Navigation components
- default
- active
- completed
- pending
- disabled

## 7. Mapping To The Current Repo

### Existing primitives that can survive
- `/Users/bkb/Desktop/desi-freelance-docs/lib/ui-foundation.ts`
- `/Users/bkb/Desktop/desi-freelance-docs/lib/layout-foundation.ts`
- `/Users/bkb/Desktop/desi-freelance-docs/components/ui/AppSelectField.tsx`
- `/Users/bkb/Desktop/desi-freelance-docs/components/ui/ChoiceCards.tsx`
- `/Users/bkb/Desktop/desi-freelance-docs/components/ui/UploadToast.tsx`
- `/Users/bkb/Desktop/desi-freelance-docs/components/ui/app-icons.tsx`
- `/Users/bkb/Desktop/desi-freelance-docs/components/ui/motion-primitives.tsx`

### Current duplication / inconsistency
- Raw `<input>` and `<textarea>` usage is repeated across invoice sections without a shared field shell.
- Labels, helper text, and error text are manually composed in each section.
- Section shells are partially centralized in the invoice editor and partially duplicated inside section components.
- `ChoiceCards` currently spans cards, segmented controls, and inline chips, which is useful but too broad for a canonical primitive API.
- Semantic field widths are implemented ad hoc in page-level grids instead of through shared rules.

### Canonical direction
- Keep `ui-foundation` and `layout-foundation` as the low-level style helper layer.
- Add a canonical design-token layer plus a form-foundation helper layer.
- Add explicit primitive wrappers for text input, textarea, field shell, and segmented control.
- Migrate page-level sections later to composed field/group primitives instead of raw utility repetition.

### Deprecate later
- Direct repeated label/helper/error markup in invoice sections
- Ad hoc field-width decisions embedded only in page-level grids
- Using `ChoiceCards` directly for every segmented choice without a narrower semantic wrapper

## 8. Design System Implementation Plan

### Token files that should exist
- `app/globals.css` for CSS custom properties
- `/Users/bkb/Desktop/desi-freelance-docs/lib/design-system-tokens.ts`
- `/Users/bkb/Desktop/desi-freelance-docs/lib/ui-foundation.ts`
- `/Users/bkb/Desktop/desi-freelance-docs/lib/layout-foundation.ts`
- `/Users/bkb/Desktop/desi-freelance-docs/lib/form-foundation.ts`

### Primitive components that should exist first
- `AppFieldShell`
- `AppTextField`
- `AppTextareaField`
- `AppSegmentedControl`
- existing `AppSelectField`
- existing button, panel, pill, icon, and motion helpers

### Composed form components that should exist next
- Address field group
- Optional subsection toggle
- Compact upload utility
- Line-item row shell
- Sticky rail item
- Sticky action dock

### Page-level consumers later
- Invoice editor sections
- Invoice preview controls
- Future scope/admin/internal surfaces

### What should NOT be migrated yet
- Extraction/autofill pipeline
- Invoice schema/types
- API routes
- Legacy `/create` flow
- Hydration/bootstrap behavior
- Business-logic-heavy preview/export calculations

## 9. Recommended Phased Order

### Phase 1
- Define tokens and form-foundation helpers
- Introduce canonical field primitives
- Add an isolated reference surface / prototype

### Phase 2
- Migrate section shells and core invoice fields to shared primitives

### Phase 3
- Migrate grouped controls such as segmented settlement, licensing toggles, and structured addresses

### Phase 4
- Normalize sticky rail and sticky action dock into shared workflow components

### Phase 5
- Migrate secondary product surfaces and internal/admin surfaces

### Phase 6
- Deprecate duplicated markup patterns and legacy primitive usage
