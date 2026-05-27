export const appColorTokens = {
  background: "var(--app-color-bg)",
  surface: "var(--app-color-surface)",
  surfaceMuted: "var(--app-color-surface-muted)",
  surfaceElevated: "var(--app-color-surface-elevated)",
  border: "var(--app-color-border)",
  borderStrong: "var(--app-color-border-strong)",
  textPrimary: "var(--app-color-text-primary)",
  textSecondary: "var(--app-color-text-secondary)",
  textMuted: "var(--app-color-text-muted)",
  primary: "var(--app-color-primary)",
  primaryStrong: "var(--app-color-primary-strong)",
  success: "var(--app-color-success)",
  warning: "var(--app-color-warning)",
  danger: "var(--app-color-danger)",
} as const;

export const appTypographyTokens = {
  display: "text-[28px] font-black tracking-tight",
  sectionTitle: "text-xl font-bold tracking-tight",
  label: "text-sm font-bold tracking-tight",
  body: "text-sm leading-6 font-normal",
  helper: "text-[11px] leading-5 font-normal",
  micro: "text-[10px] font-bold uppercase tracking-[0.16em]",
} as const;

export const appSpacingTokens = {
  1: "var(--app-space-1)",
  2: "var(--app-space-2)",
  3: "var(--app-space-3)",
  4: "var(--app-space-4)",
  5: "var(--app-space-5)",
  6: "var(--app-space-6)",
  7: "var(--app-space-7)",
  8: "var(--app-space-8)",
} as const;

export const appRadiusTokens = {
  button: "var(--app-radius-button)",
  control: "var(--app-radius-control)",
  card: "var(--app-radius-card)",
  shell: "var(--app-radius-shell)",
} as const;

export const appShadowTokens = {
  soft: "var(--app-elevation-soft)",
  raised: "var(--app-elevation-raised)",
  floating: "var(--app-floating-shadow)",
  floatingStrong: "var(--app-floating-shadow-strong)",
} as const;

export const appMotionTokens = {
  durationFast: "var(--app-duration-fast)",
  durationMedium: "var(--app-duration-medium)",
  durationSlow: "var(--app-duration-slow)",
  easeStandard: "var(--app-ease-standard)",
  easeEmphasized: "var(--app-ease-emphasized)",
} as const;

export const appZIndexTokens = {
  stickyRail: 20,
  stickyActions: 30,
  modalBackdrop: 200,
  modalContent: 300,
  toast: 500,
} as const;

export const appFieldHeightTokens = {
  sm: "var(--app-control-height-sm)",
  md: "var(--app-control-height-md)",
  lg: "var(--app-control-height-lg)",
} as const;

export const appFieldWidthTokens = {
  compact: "var(--app-field-width-compact)",
  quantity: "var(--app-field-width-quantity)",
  postal: "var(--app-field-width-postal)",
  code: "var(--app-field-width-code)",
  identifier: "var(--app-field-width-identifier)",
  money: "var(--app-field-width-money)",
  medium: "var(--app-field-width-medium)",
  content: "var(--app-field-width-content)",
  full: "100%",
} as const;

export const appBreakpointTokens = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
  xwide: 1440,
} as const;

export type AppBreakpointToken = keyof typeof appBreakpointTokens;
export type AppFieldHeightToken = keyof typeof appFieldHeightTokens;
export type AppFieldWidthToken = keyof typeof appFieldWidthTokens;
