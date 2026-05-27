# Complete Design System & Component Inventory Export (Read-Only Audit)

This export contains the raw, unaltered data of the **Lance** design system, custom UI tokens, component interfaces, page structures, and token usage frequency. 

---

## PART 1: Design Tokens

### 1. GLOBALS CSS (`app/globals.css`)
```css
@import "tailwindcss";

:root {
  --color-bg-canvas: #FAFBFC;
  --color-bg-subtle: #F0F0F4;
  --color-surface: #ffffff;
  --color-surface-elevated: #F5F5F8;
  --color-surface-muted: #EBEBF0;
  --color-border-soft: #D0D0DA;
  --color-border-default: #111118;
  --color-border-strong: #111118;

  --color-text-strong: #111118;
  --color-text-default: #27272F;
  --color-text-muted: #6E6E7A;
  --color-text-soft: #76767F;
  --color-text-on-dark: #ffffff;

  --color-lime-50: #F4FFE0;
  --color-lime-100: #E8FFC2;
  --color-lime-200: #D4FF8A;
  --color-lime-300: #BEFF00;
  --color-lime-400: #A8E600;
  --color-lime-500: #8FCC00;
  --color-lime-600: #6B9900;
  --color-lime-700: #476600;
  --color-lime-800: #2B3D00;
  --color-lime-900: #141D00;

  --color-coral-50: #FFF0EC;
  --color-coral-100: #FFD9CF;
  --color-coral-200: #FFB3A0;
  --color-coral-300: #FF8C70;
  --color-coral-400: #FF5C00;
  --color-coral-500: #FF4D2A;
  --color-coral-600: #DB3A1A;
  --color-coral-700: #B72A0E;
  --color-coral-800: #931D06;
  --color-coral-900: #6F1200;

  --color-cyan-50: #E0FFF7;
  --color-cyan-100: #B3FFEB;
  --color-cyan-200: #66FFD6;
  --color-cyan-300: #00F5B8;
  --color-cyan-400: #00D4A0;
  --color-cyan-500: #00B388;
  --color-cyan-600: #008F6D;
  --color-cyan-700: #006B52;
  --color-cyan-800: #004838;
  --color-cyan-900: #002A20;

  --color-violet-50: #F0EAFF;
  --color-violet-100: #DDD0FF;
  --color-violet-200: #C4B5FD;
  --color-violet-300: #9A7DFF;
  --color-violet-400: #7A56FF;
  --color-violet-500: #6B3FFF;
  --color-violet-600: #5530DB;
  --color-violet-700: #4022B7;
  --color-violet-800: #2C1693;
  --color-violet-900: #1A0C6F;

  --color-cream: #FFFBE6;
  --color-cream-muted: #FFF8D6;

  --bg-app: var(--color-bg-canvas);
  --bg-canvas: var(--color-bg-canvas);
  --bg-surface: var(--color-surface);
  --bg-surface-muted: var(--color-surface-muted);
  --bg-surface-soft: var(--color-surface-elevated);
  --border-subtle: var(--color-border-soft);
  --border-default: var(--color-border-default);
  --border-strong: var(--color-border-strong);
  --bg-overlay: rgba(17, 17, 24, 0.6);

  --text-primary: var(--color-text-strong);
  --text-secondary: var(--color-text-default);
  --text-muted: var(--color-text-muted);
  --text-soft: var(--color-text-soft);
  --text-on-accent: #111118;

  --interactive-primary: var(--color-lime-300);
  --interactive-primary-hover: var(--color-lime-400);
  --interactive-primary-pressed: var(--color-lime-500);

  --interactive-secondary: var(--color-coral-400);
  --interactive-secondary-hover: var(--color-coral-500);
  --interactive-secondary-pressed: var(--color-coral-600);

  --state-success-bg: var(--color-cyan-50);
  --state-success-border: var(--color-cyan-600);
  --state-success-text: var(--color-cyan-700);

  --state-warning-bg: var(--color-cream);
  --state-warning-border: var(--color-coral-400);
  --state-warning-text: var(--color-coral-800);

  --state-danger-bg: #FFF5F2;
  --state-danger-border: var(--color-coral-400);
  --state-danger-text: #B72A0E;

  --state-info-bg: var(--color-violet-50);
  --state-info-border: var(--color-violet-200);
  --state-info-text: var(--color-violet-600);

  --focus-ring: var(--color-lime-300);
  --focus-ring-soft: rgba(190, 255, 0, 0.3);

  --app-color-bg: var(--bg-app);
  --app-color-surface: var(--bg-surface);
  --app-color-surface-muted: var(--bg-surface-muted);
  --app-color-surface-elevated: var(--bg-canvas);
  --app-color-surface-success: var(--state-success-bg);
  --app-color-surface-warning: var(--state-warning-bg);
  --app-color-surface-danger: var(--state-danger-bg);
  --app-color-border: var(--border-default);
  --app-color-border-strong: var(--border-strong);
  --app-color-text-primary: var(--text-primary);
  --app-color-text-secondary: var(--text-secondary);
  --app-color-text-muted: var(--text-muted);

  --brutal-shadow-sm: 2px 2px 0 #111118;
  --brutal-shadow-md: 4px 4px 0 #111118;
  --brutal-shadow-lg: 6px 6px 0 #111118;
  --brutal-shadow-pressed: 1px 1px 0 #111118;

  --app-duration-fast: 120ms;
  --app-duration-medium: 220ms;
  --app-duration-slow: 380ms;

  --app-ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
  --app-ease-gentle: cubic-bezier(0.22, 1, 0.36, 1);

  --app-space-1: 4px;
  --app-space-2: 8px;
  --app-space-3: 12px;
  --app-space-4: 16px;
  --app-space-5: 24px;
  --app-space-6: 32px;
  --app-space-7: 48px;
  --app-space-8: 64px;

  --app-control-height-sm: 36px;
  --app-control-height-md: 44px;
  --app-control-height-lg: 52px;

  --app-field-width-compact: 112px;
  --app-field-width-quantity: 96px;
  --app-field-width-postal: 128px;
  --app-field-width-code: 168px;
  --app-field-width-identifier: 288px;
  --app-field-width-money: 184px;
  --app-field-width-medium: 320px;
  --app-field-width-content: 540px;

  --app-radius-button: 0px;
  --app-radius-control: 0px;
  --app-radius-card: 0px;
  --app-radius-shell: 0px;
  --app-radius-pill: 99px;

  --app-elevation-flat: none;
  --app-elevation-soft: var(--brutal-shadow-sm);
  --app-elevation-raised: var(--brutal-shadow-md);
  --app-elevation-active: 0 0 0 2px var(--color-lime-300), var(--brutal-shadow-md);

  --brand-indigo: #8B5CF6;
  --brand-indigo-light: #F0EAFF;
  --brand-indigo-muted: rgba(139, 92, 246, 0.12);
  --brand-indigo-border: rgba(139, 92, 246, 0.35);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-syne), var(--font-dm-sans), system-ui, sans-serif;
  --font-syne: var(--font-syne);
  --font-mono: var(--font-geist-mono);
  --color-indigo-brand: var(--brand-indigo);
  --color-indigo-light: var(--brand-indigo-light);
  --color-indigo-muted: var(--brand-indigo-muted);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-dm-sans), system-ui, -apple-system, sans-serif;
}

html {
  scroll-behavior: smooth;
}

h1, h2, h3 {
  font-family: var(--font-syne), var(--font-dm-sans), system-ui, sans-serif;
}

.font-syne {
  font-family: var(--font-syne), sans-serif !important;
}

/* --- Panels --- */

.app-soft-panel,
.app-soft-panel-muted,
.app-soft-panel-success,
.app-soft-panel-warning,
.app-soft-shell {
  border: 2px solid #111118;
  background: var(--bg-surface);
  box-shadow: var(--brutal-shadow-sm);
  border-radius: 0;
}

.app-soft-panel-muted {
  background: var(--bg-surface-muted);
  border-color: #111118;
  box-shadow: none;
}

.app-soft-panel-success {
  border-color: #111118;
  background: var(--state-success-bg);
  color: var(--state-success-text);
  box-shadow: var(--brutal-shadow-sm);
}

.app-soft-panel-warning {
  border-color: #111118;
  background: var(--state-warning-bg);
  color: var(--state-warning-text);
  box-shadow: var(--brutal-shadow-sm);
}

.app-soft-shell {
  background: #ffffff;
  box-shadow: var(--brutal-shadow-lg);
  backdrop-filter: none;
}

/* --- Fields --- */

.app-soft-field {
  border: 2px solid #111118;
  background: #ffffff;
  box-shadow: none;
  border-radius: 0;
  transition: border-color var(--app-duration-fast) var(--app-ease-standard), box-shadow var(--app-duration-fast) var(--app-ease-standard);
}

.app-soft-field:hover {
  border-color: #111118;
  box-shadow: var(--brutal-shadow-pressed);
}

.app-soft-field:focus-within {
  border-color: #111118;
  box-shadow: 0 0 0 2px var(--color-lime-300);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #111118;
  box-shadow: 0 0 0 2px var(--color-lime-300);
}

.app-soft-field-filled {
  border-color: #111118;
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: none;
}

.app-soft-field-error {
  border-color: var(--color-coral-400);
  background: #ffffff;
  box-shadow: 3px 3px 0 var(--color-coral-400);
  animation: none;
}

/* --- Buttons --- */

.app-soft-button {
  border: 2px solid #111118;
  background: var(--bg-surface);
  box-shadow: var(--brutal-shadow-md);
  border-radius: 0;
}

.app-soft-button:hover {
  box-shadow: var(--brutal-shadow-lg);
  transform: translate(-1px, -1px);
}

.app-soft-button:active {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-pressed);
  transition-duration: 50ms;
}

.app-soft-button-primary {
  border-color: #111118;
  background: var(--color-lime-300);
  color: #111118;
  box-shadow: var(--brutal-shadow-md);
  position: relative;
  overflow: hidden;
}

.app-soft-button-primary:hover {
  background: var(--color-lime-400);
  box-shadow: var(--brutal-shadow-lg);
  transform: translate(-1px, -1px);
}

.app-soft-button-primary:active {
  background: var(--color-lime-500);
  box-shadow: var(--brutal-shadow-pressed);
  transform: translate(2px, 2px);
}

.app-soft-button-secondary {
  background: #ffffff;
  box-shadow: var(--brutal-shadow-md);
}

.app-soft-button-tertiary {
  background: var(--bg-surface-muted);
  border-color: #111118;
  box-shadow: var(--brutal-shadow-sm);
}

.app-soft-button-subtle {
  border-color: #111118;
  background: var(--bg-surface-muted);
  box-shadow: none;
}

.app-soft-button-destructive {
  border-color: #111118;
  background: var(--state-danger-bg);
  box-shadow: 3px 3px 0 var(--color-coral-400);
}

.app-soft-button-ghost {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.app-soft-button-ghost:hover {
  border-color: #111118;
  background: var(--bg-surface-muted);
  box-shadow: var(--brutal-shadow-sm);
}

/* --- Choice controls --- */

.app-soft-choice-track {
  border: 2px solid #111118;
  background: var(--bg-surface-muted);
  box-shadow: none;
  border-radius: 0;
}

.app-soft-choice-option {
  border: 2px solid transparent;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
  transition: all var(--app-duration-fast) var(--app-ease-standard);
}

.app-soft-choice-option:hover {
  background: rgba(255, 255, 255, 0.8);
}

.app-soft-choice-option-active {
  border-color: #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-sm);
}

/* --- Step surfaces --- */

.app-soft-step-surface {
  border: 2px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.5);
  box-shadow: none;
  border-radius: 0;
}

.app-soft-step-surface[data-step-state="active"] {
  border-color: #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-md);
}

.app-soft-step-surface[data-step-state="completed"] {
  background: rgba(255, 255, 255, 0.7);
}

/* --- Transitions --- */

.app-interactive-button,
.app-interactive-surface,
.app-interactive-field,
.app-dropzone-surface {
  transition: background-color var(--app-duration-fast) var(--app-ease-standard), border-color var(--app-duration-fast) var(--app-ease-standard), box-shadow var(--app-duration-fast) var(--app-ease-standard), color var(--app-duration-fast) var(--app-ease-standard), opacity var(--app-duration-fast) var(--app-ease-standard), transform var(--app-duration-fast) var(--app-ease-standard);
}

.app-focus-ring:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-lime-300);
}

/* --- Dropzone --- */

.app-dropzone-surface {
  border: 2px dashed #111118;
  background: #ffffff;
  box-shadow: none;
  border-radius: 0;
}

.app-dropzone-accept {
  border-color: var(--color-lime-300);
  border-style: solid;
  background: var(--color-lime-50);
  box-shadow: var(--brutal-shadow-sm);
}

/* --- Invoice step cards --- */

.invoice-brief-card {
  border: 2px solid #111118;
  background: var(--color-cream);
  box-shadow: var(--brutal-shadow-sm);
  border-radius: 0;
}

.invoice-step-card {
  border: 2px solid #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-sm);
  border-radius: 0;
  transition: all var(--app-duration-medium) var(--app-ease-standard);
}

.invoice-step-card[data-step-kind="support"] {
  background: #ffffff;
}

.invoice-step-card[data-step-kind="final"] {
  border-color: #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-md);
}

.invoice-step-card[data-step-state="active"] {
  border-color: #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-lg);
}

.invoice-step-card[data-step-kind="final"][data-step-state="active"] {
  border-color: #111118;
  box-shadow: var(--brutal-shadow-lg);
}

.invoice-step-card[data-step-state="completed"] {
  border-color: #111118;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--brutal-shadow-sm);
}

.invoice-step-divider {
  border-top: 2px solid var(--border-subtle);
}

/* --- Step rail --- */

.invoice-step-rail {
  border: 2px solid #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-sm);
  backdrop-filter: none;
  border-radius: 0;
}

.invoice-step-rail-track {
  border-left: 2px solid #111118;
}

.invoice-step-rail-item {
  border: 2px solid transparent;
  background: transparent;
  border-radius: 0;
  transition: all var(--app-duration-fast) var(--app-ease-standard);
}

.invoice-step-rail-item[data-rail-state="active"] {
  border: 2px solid #111118;
  border-left: 3px solid var(--color-lime-300);
  background: var(--color-lime-50);
  box-shadow: var(--brutal-shadow-sm);
  border-radius: 0;
}

.invoice-step-rail-item[data-rail-state="completed"] {
  border: 2px solid var(--border-subtle);
  background: transparent;
  opacity: 0.9;
}

.invoice-step-rail-item[data-rail-state="pending"] {
  border: 2px solid transparent;
  background: transparent;
  opacity: 0.5;
}

.invoice-step-rail-item[data-rail-state="pending"]:hover {
  background: var(--bg-surface-muted);
  opacity: 0.8;
  border-color: var(--border-subtle);
}

.invoice-step-rail-index {
  border: 2px solid #111118;
  background: #ffffff;
  color: var(--text-secondary);
  box-shadow: none;
  border-radius: 0;
}

.invoice-step-rail-item[data-rail-state="active"] .invoice-step-rail-index {
  border-color: #111118 !important;
  background: var(--color-lime-300) !important;
  color: #111118 !important;
  font-weight: 800;
  box-shadow: var(--brutal-shadow-pressed) !important;
}

.invoice-step-rail-item[data-rail-state="completed"] .invoice-step-rail-index {
  border-color: var(--border-subtle);
  background: transparent;
  color: var(--text-muted);
  box-shadow: none;
}

.invoice-step-rail-item[data-rail-state="pending"] .invoice-step-rail-index {
  border-color: transparent;
  background: transparent;
  color: var(--text-muted);
}

/* --- Line items --- */

.invoice-line-item-workspace {
  border: 2px solid #111118;
  border-radius: 0;
  background: var(--color-cream);
  box-shadow: inset 0 0 0 1px var(--border-subtle);
  padding: 0.75rem;
  overflow: visible;
}

.invoice-line-item-head {
  border: 2px solid #111118;
  border-radius: 0;
  background: var(--bg-surface-soft);
  box-shadow: none;
  overflow: hidden;
}

.invoice-line-item-row {
  border: 2px solid #111118;
  border-radius: 0;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-sm);
  overflow: visible;
  transition: all var(--app-duration-fast) var(--app-ease-standard);
}

.invoice-line-item-row[data-row-tone="muted"] {
  background: #ffffff;
}

.invoice-line-item-total {
  border: 2px solid #111118;
  border-radius: 0;
  background: var(--color-lime-50);
  box-shadow: none;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
}

.invoice-line-item-row:focus-within {
  border-color: #111118;
  box-shadow: 0 0 0 2px var(--color-lime-300);
}

/* --- Utility widgets --- */

.invoice-utility-widget {
  border: 2px solid #111118;
  background: var(--bg-surface-muted);
  box-shadow: none;
  border-radius: 0;
}

.invoice-optional-zone {
  background: var(--bg-surface-muted);
}

/* --- Action dock --- */

.invoice-action-dock {
  border: 2px solid #111118;
  border-bottom: none;
  background: #ffffff;
  box-shadow: 0 -4px 0 #111118;
  backdrop-filter: none;
  border-radius: 0;
}

/* --- Total summary --- */

.invoice-total-summary-card {
  border: 2px solid #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-sm);
  border-radius: 0;
}

.invoice-total-hero {
  border: 2px solid #111118;
  border-radius: 0;
  background: var(--color-lime-50);
  padding: 1rem;
  box-shadow: var(--brutal-shadow-sm);
}

.invoice-final-review-panel {
  border: 2px solid #111118;
  background: #ffffff;
  box-shadow: var(--brutal-shadow-md);
  border-radius: 0;
}

.invoice-final-review-note {
  background: var(--color-cream);
  border: 2px solid #111118;
  box-shadow: none;
  border-radius: 0;
}

/* --- Animations --- */

@keyframes field-complete-pulse {
  0% { box-shadow: 0 0 0 0 rgba(190, 255, 0, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(190, 255, 0, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(190, 255, 0, 0); }
}

.field-complete-flash {
  animation: field-complete-pulse 0.3s var(--app-ease-standard) 1;
}

/* --- Reduced motion --- */

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .app-interactive-button,
  .app-interactive-surface,
  .app-interactive-field,
  .app-dropzone-surface { transition: none !important; }
  .app-soft-button:hover,
  .app-soft-button:active { transform: none; }
  .app-soft-field-error { animation: none; box-shadow: 3px 3px 0 var(--color-coral-400); }
}

/* --- Scrollbar hide --- */

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* --- Input states --- */

.input-autofilled {
  background-color: var(--brand-indigo-muted) !important;
  border-left: 4px solid var(--brand-indigo) !important;
  padding-left: calc(0.75rem - 4px) !important;
  color: var(--text-primary) !important;
}

.input-manual {
  border-left: 4px solid var(--color-lime-300) !important;
  padding-left: calc(0.75rem - 4px) !important;
}

input::placeholder, select::placeholder, textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
  font-style: normal;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.04em;
}

.autofill-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 700;
  color: var(--brand-indigo);
  letter-spacing: 0.08em;
  margin-left: 6px;
  text-transform: uppercase;
  background: var(--brand-indigo-muted);
  padding: 1px 6px;
  border: 1px solid var(--brand-indigo-border);
}

.link-indigo {
  color: var(--brand-indigo);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.1s;
}

.link-indigo:hover {
  color: #7C3AED;
}

@keyframes pulse-once {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.field-needs-attention {
  box-shadow: 3px 3px 0 var(--color-coral-400);
}

/* --- Tablet (screens 768px and below) --- */

@media (max-width: 768px) {
  :root {
    --brutal-shadow-sm: 2px 2px 0 #111118;
    --brutal-shadow-md: 2px 2px 0 #111118;
    --brutal-shadow-lg: 3px 3px 0 #111118;
    --brutal-shadow-pressed: 1px 1px 0 #111118;
    --app-control-height-sm: 34px;
    --app-control-height-md: 40px;
    --app-control-height-lg: 48px;
    --app-space-5: 20px;
    --app-space-6: 24px;
    --app-space-7: 36px;
  }

  .invoice-line-item-row,
  .invoice-line-item-head,
  .invoice-step-rail-item,
  .app-soft-choice-option,
  .app-soft-choice-track {
    border-width: 1.5px;
  }

  .invoice-step-card,
  .invoice-total-summary-card,
  .invoice-final-review-panel {
    box-shadow: var(--brutal-shadow-sm);
  }
}

/* --- Phone (screens 480px and below) --- */

@media (max-width: 480px) {
  :root {
    --brutal-shadow-sm: 1.5px 1.5px 0 #111118;
    --brutal-shadow-md: 2px 2px 0 #111118;
    --brutal-shadow-lg: 2px 2px 0 #111118;
    --brutal-shadow-pressed: 1px 1px 0 #111118;
    --app-control-height-sm: 32px;
    --app-control-height-md: 38px;
    --app-control-height-lg: 44px;
  }

  .app-soft-button-ghost:hover {
    box-shadow: none;
  }

  .invoice-action-dock {
    box-shadow: 0 -2px 0 #111118;
  }

  .invoice-line-item-workspace {
    padding: 0.5rem;
  }

  .app-soft-field:hover {
    box-shadow: none;
  }
}

/* Locked-mode chrome (v2.8.8 Sprint 1) */
[data-mode="locked"] input:disabled,
[data-mode="locked"] textarea:disabled,
[data-mode="locked"] select:disabled {
  background: #F5F4F0;
  border: 2px solid #D4D2CC;
  color: #6B6660;
  cursor: not-allowed;
  box-shadow: none;
}

[data-mode="locked"] input:disabled::placeholder,
[data-mode="locked"] textarea:disabled::placeholder {
  color: transparent;
}

/* Locked-mode provenance flattening (v2.8.8 Sprint 1.5) */
[data-mode="locked"] input,
[data-mode="locked"] textarea,
[data-mode="locked"] select {
  border-left-color: #D4D2CC !important;
  border-left-width: 2px !important;
}
```

---

## PART 2: Shared UI Components

### 6. Component Inventory (`components/ui/`)
- `AppFieldShell.tsx`
- `AppSelectField.tsx`
- `AppSegmentedControl.tsx`
- `AppTextField.tsx`
- `AppTextareaField.tsx`
- `ChoiceCards.tsx`
- `DesignSystemReference.tsx`
- `InstallPwaButton.tsx`
- `UploadToast.tsx`
- `app-icons.tsx`
- `motion-primitives.tsx`

---

### 7. Key Component Interfaces (First 60 Lines)

#### A. `components/ui/DesignSystemReference.tsx`
```typescript
"use client";

import { useState } from "react";
import AppFieldShell from "@/components/ui/AppFieldShell";
import AppSelectField from "@/components/ui/AppSelectField";
import AppSegmentedControl from "@/components/ui/AppSegmentedControl";
import AppTextField from "@/components/ui/AppTextField";
import AppTextareaField from "@/components/ui/AppTextareaField";
import {
  appSectionBodyClass,
  appSectionHeaderClass,
  appSectionShellClass,
  appStickyActionDockClass,
  appStickyRailClass,
  appUtilityWidgetClass,
  getAppFieldGroupClass,
  getAppFieldRowClass,
} from "@/lib/form-foundation";
import {
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppStatusPillClass,
  getAppSubtlePanelClass,
} from "@/lib/ui-foundation";
import {
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  SaveIcon,
  UploadIcon,
} from "@/components/ui/app-icons";
```

#### B. `components/ui/InstallPwaButton.tsx`
```typescript
"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphoneIcon } from "./app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
```

#### C. `components/ui/UploadToast.tsx`
```typescript
"use client";

import { CheckIcon } from "@/components/ui/app-icons";
import { AnimatePresence, motion } from "@/components/ui/motion-primitives";
import { cn } from "@/lib/ui-foundation";

interface UploadToastProps {
  message: string;
  visible: boolean;
}

export default function UploadToast({ message, visible }: UploadToastProps) {
```

#### D. `components/ui/app-icons.tsx`
```typescript
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function iconProps(props: IconProps) {
  return {
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1L12 3Z" />
      <path d="M19 3V6" />
      <path d="M20.5 4.5H17.5" />
    </svg>
  );
}
```

#### E. `components/ui/motion-primitives.tsx`
```typescript
"use client";

import { Children, Fragment, useEffect, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/ui-foundation";

export { AnimatePresence, motion };

type MotionPreset =
  | "fade-in"
  | "fade-up"
  | "scale-in"
  | "modal"
  | "soft"
  | "blur-in"
  | "slide-spring";

export const appEaseStandard: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];
export const appEaseGentle: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];
```

---

## PART 3: Page-Level Component Structure

### 8. Page Structure Map

#### A. Landing Page (`app/page.tsx`)
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

import { appPageShellClass } from "@/lib/layout-foundation";
import { supabase } from "@/lib/supabase/client";

import InteractiveHeroGraphic from "@/components/InteractiveHeroGraphic";

export default function Home() {
```
*Key structural markup nodes & sections:*
- `Line 47: <main className={appPageShellClass}>`
- `Line 51: <section className="border-b-2 border-[#111118]">`
- `Line 52: <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">`
- `Line 53: <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">`
- `Line 56: <div className="inline-flex items-center gap-2 border-2 border-[#111118] bg-[#FFFBE6] px-3 py-1.5 mb-8">`
- `Line 61: <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black uppercase leading-[1.05] tracking-[-0.02em] text-[#111118] mb-6">`
- `Line 78: <div className="hidden lg:block">`
- `Line 86: <section className="border-b-2 border-[#111118] bg-white">`
- `Line 101: <section className="bg-[#FAFBFC]">`
- `Line 106: <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#111118] mb-10">`
- `Line 112: <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start">`
- `Line 175: <footer className="border-t-2 border-[#111118] bg-white">`

---

#### B. Dashboard (`app/dashboard/page.tsx`)
```typescript
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { ProjectRail } from "@/components/dashboard/ProjectRail";
import { LifecycleStepper } from "@/components/dashboard/LifecycleStepper";
```
*Key structural markup nodes & sections:*
- `Line 8: import { ProjectRail } from "@/components/dashboard/ProjectRail";`

---

#### C. Invoices List (`app/invoices/page.tsx`)
```typescript
"use client";

import React, { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAllProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { InvoiceEventRow } from "@/components/invoices/InvoiceEventRow";
```
*Key structural markup nodes & sections:*
- `Line 70: return (`
- `Line 71: <div className={appPageShellClass}>`
- `Line 75: <div className="flex items-center justify-between mb-8">`
- `Line 76: <h1 className="text-4xl font-black tracking-tighter">Invoices · {filteredInvoices.length}</h1>`
- `Line 85: <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">`
- `Line 126: <InvoiceEventRow`

---

#### D. Invoice Wizard (`components/invoice/InvoiceEditorPage.tsx`)
```typescript
"use client";
import { AppTooltip } from "@/components/ui/AppTooltip";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
```
*Key structural markup nodes & sections:*
- `Line 37: import AgencyDetailsSection from "@/components/invoice/AgencyDetailsSection";`
- `Line 39: import ClientDetailsSection from "@/components/invoice/ClientDetailsSection";`
- `Line 41: import DeliverablesSection from "@/components/invoice/DeliverablesSection";`
- `Line 43: import TermsPaymentSection from "@/components/invoice/TermsPaymentSection";`
- `Line 124: const VALIDATION_STEPS: InvoiceStepperStep[]`
- `Line 133: const orderedSteps: InvoiceStepperStep[]`

---

#### E. Invoice Preview (`app/invoice/preview/page.tsx`)
```typescript
"use client";

import { useEffect, useRef, useState, useMemo, Suspense, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import TemplatePicker from "@/components/invoice/TemplatePicker";
import AppHeader from "@/components/AppHeader";
```
*Key structural markup nodes & sections:*
- `Line 98: return (`
- `Line 100: className={cn(`

---

#### F. Clients List (`app/clients/page.tsx`)
```typescript
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
```
*Key structural markup nodes & sections:*
- `Line 178: <div className="fixed inset-0 z-50 flex justify-end">`
- `Line 210: <div className="flex-1 overflow-y-auto p-6 pb-32">`

---

#### G. Client Detail (`app/clients/[id]/page.tsx`)
```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
```
*Key structural markup nodes & sections:*
- `Line 160: <div className={getAppPanelClass()}>`
- `Line 414: <section className={`${appPageContainerClass} pt-8 sm:pt-12 pb-24`}>`

---

#### H. Profile Page (`app/profile/page.tsx`)
```typescript
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
```
*Key structural markup nodes & sections:*
- `Line 69: return (`
- `Line 70: <div className="mb-6">`

---

#### I. Share Page (`app/share/[token]/page.tsx`)
```typescript
"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
```
*Key structural markup nodes & sections:*
- `Line 196: return (`
- `Line 199: <div className="flex items-center gap-3 border border-[color:var(--border-default)] bg-white p-6 shadow-lg">`

---

## PART 4: Design System Usage Audit

### 9. Color Usage Frequency
| Color Key | Name/Hex Code | Frequency in Code |
| :--- | :--- | :--- |
| **Lime** | `#BEFF00` | **84** |
| **Ink** | `#111118` | **292** |
| **Coral** | `#FF5C00` | **37** |
| **Violet** | `#8B5CF6` | **14** |
| **Cyan** | `#00DCB4` | **27** |
| **Cream** | `#FFFBE6` | **18** |

---

### 10. Border/Shadow Pattern Audit
| Style Utility Class | Visual Impact | Frequency in Code |
| :--- | :--- | :--- |
| `border-[2px]` | Flat border (often overridden globally) | **2** |
| `border-[3px]` | Custom border sizing | **7** |
| `shadow-[2px...` | Compact brutal shadow | **9** |
| `shadow-[4px...` | Standard brutal shadow | **22** |
| `shadow-[6px...` | Extended card accent shadow | **3** |
| **Rounded Corners** | `rounded-` classes (excluding `-none`, `-0`) | **106** |

---

### 11. Font Weight Distribution
| Tailwind Weight Class | Font-Weight Value | Frequency in Code |
| :--- | :--- | :--- |
| `font-black` | 900 (Bold Syne/Outfit headers) | **97** |
| `font-bold` | 700 (Primary bold layout labels) | **288** |
| `font-semibold` | 600 (Semibold headers/weights) | **94** |
| `font-medium` | 500 (Subtle secondary copy) | **119** |

---

### 12. Spacing Consistency
| Padding Utility | Frequency | Gap Utility | Frequency |
| :--- | :--- | :--- | :--- |
| `p-4` | **94** | `gap-4` | **44** |
| `p-6` | **39** | `gap-6` | **17** |
| `p-8` | **19** | `gap-8` | **3** |

---

### 13. Inconsistency Detector

#### A. Non-Neo-Brutal Rounded Corners (100% flat style rules)
Certain interactive interfaces or modals fall back to legacy `rounded-*` patterns (e.g. `rounded-[8px]`, `rounded-[14px]`, `rounded-xl`, `rounded-lg`). For absolute Neo-Brutalist rendering consistency, these should be mapped to the CSS-variable boundaries defined in `globals.css` (`--app-radius-card`, `--app-radius-control` which default to `0px`).
*Key instances found during search:*
- `components/ui/ChoiceCards.tsx:34` (`rounded-[8px]`)
- `components/ui/ChoiceCards.tsx:46` (`rounded-[6px]`)
- `components/ui/ChoiceCards.tsx:54` (`rounded-[4px]`)
- `components/ui/DesignSystemReference.tsx:88` (`rounded-[14px]`)
- `components/invoice/InvoiceEditorPage.tsx:764` (`rounded-[18px]`)
- `components/invoice/InvoiceEditorPage.tsx:3384` (`rounded-xl`)
- `components/invoice/TermsPaymentSection.tsx:404` (`rounded-[12px]`)
- `components/invoice/BriefSummaryModal.tsx:446` (`rounded-[28px]`)

#### B. Hardcoded Colors Not In Global Palette
Legacy inline colors are present in certain older handlers and widgets (often referring to Indigo `#4F46E5` or custom Limes like `#D4FF00` instead of the system variable `var(--color-lime-300)`).
*Key instances found during search:*
- `components/ui/AppSwitch.tsx:28` (`bg-[#D4FF00]`)
- `components/faq/FaqSection.tsx:53` (`border-[#D4FF00]`)
- `components/faq/FaqAccordionItem.tsx:24` (`text-[#4F46E5]`)
- `components/NotificationBell.tsx:146` (`text-[#4F46E5]`)
- `components/dashboard/LifecycleStepper.tsx:55` (`border-[#D4FF00]`)
- `components/invoice/TermsPaymentSection.tsx:287` (`border-[#4F46E5]`)
