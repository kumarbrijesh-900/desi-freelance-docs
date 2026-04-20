export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const appSectionTitleClass =
  "text-[1.12rem] font-semibold tracking-[-0.03em] text-[color:var(--app-color-text-primary)]";

export const appSectionDescriptionClass =
  "text-[11px] leading-5 text-[color:var(--app-color-text-muted)]";

export const appFieldLabelClass =
  "mb-1 block text-[12px] font-semibold tracking-[0.01em] text-[color:var(--app-color-text-secondary)]";

export const appFieldHelperTextClass =
  "mt-1 text-[11px] leading-[1.5] text-[color:var(--app-color-text-muted)]";

export const appFieldErrorTextClass =
  "mt-1 text-[11px] font-semibold leading-[1.45] text-[color:var(--state-danger-text)]";

export function getAppSubtlePanelClass(
  tone: "default" | "muted" | "warning" = "default"
) {
  return cn(
    "rounded-[var(--app-radius-card)] p-4",
    tone === "warning"
      ? "bg-[color:var(--state-warning-bg)] ring-1 ring-inset ring-[color:var(--state-warning-border)]"
      : tone === "muted"
      ? "bg-[color:var(--app-color-surface-muted)] ring-1 ring-inset ring-[color:var(--app-color-border)]"
      : "bg-[color:var(--app-color-surface)] ring-1 ring-inset ring-[color:var(--app-color-border)]"
  );
}

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "subtle"
  | "tertiary"
  | "destructive-lite";

export type AppButtonSize = "sm" | "md" | "lg";

export function getAppButtonClass(params?: {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
}) {
  const {
    variant = "secondary",
    size = "md",
    fullWidth = false,
  } = params ?? {};

  return cn(
    "app-interactive-button app-focus-ring app-soft-button inline-flex items-center justify-center gap-2 rounded-[var(--app-radius-button)] border font-semibold tracking-[-0.01em] text-sm transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-[var(--app-duration-fast)] disabled:pointer-events-none disabled:opacity-55",
    size === "sm"
      ? "h-10 px-3 text-[13px]"
      : size === "lg"
      ? "h-12 px-5 text-sm"
      : "h-11 px-4 text-[13px]",
    fullWidth ? "w-full" : "",
    variant === "primary"
      ? "app-soft-button-primary text-white hover:border-[color:var(--interactive-primary-hover)]"
      : variant === "ghost"
      ? "app-soft-button-ghost text-[color:var(--app-color-text-muted)] hover:text-[color:var(--app-color-text-primary)]"
      : variant === "tertiary"
      ? "app-soft-button-tertiary text-[color:var(--app-color-text-secondary)] hover:text-[color:var(--app-color-text-primary)]"
      : variant === "subtle"
      ? "app-soft-button-subtle text-[color:var(--app-color-text-secondary)]"
      : variant === "destructive-lite"
      ? "app-soft-button-destructive text-[color:var(--state-danger-text)] hover:border-[color:var(--state-danger-border)]"
      : "app-soft-button-secondary text-[color:var(--app-color-text-primary)] hover:border-[color:var(--border-strong)]"
  );
}

export function getAppFieldClass(params?: {
  hasError?: string;
  hasValue?: boolean;
  multiline?: boolean;
  isSelect?: boolean;
}) {
  const { hasError, hasValue, multiline, isSelect } = params ?? {};

  return cn(
    "app-interactive-field app-focus-ring app-soft-field min-w-0 w-full rounded-[var(--app-radius-control)] border text-[14px] font-normal leading-6 text-[color:var(--app-color-text-primary)] outline-none transition-[background-color,border-color,box-shadow,color] duration-[var(--app-duration-fast)] focus-visible:border-[color:var(--focus-ring)]",
    multiline ? "min-h-[112px] px-3 py-3" : "h-11 px-3",
    isSelect
      ? "appearance-none overflow-hidden pr-[2.875rem] text-ellipsis whitespace-nowrap text-left"
      : "",
    "placeholder:text-[color:var(--text-soft)]",
    "disabled:cursor-not-allowed disabled:border-[color:var(--border-subtle)] disabled:bg-[color:var(--bg-surface-soft)] disabled:text-[color:var(--text-soft)] disabled:shadow-none",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65",
    hasError
      ? "app-soft-field-error focus-visible:border-[color:var(--state-danger-border)]"
      : hasValue
      ? "app-soft-field-filled"
      : ""
  );
}

export function getAppPanelClass(
  tone: "default" | "success" | "warning" | "muted" = "default"
) {
  return cn(
    "app-interactive-surface rounded-[var(--app-radius-card)] p-5 transition-[background-color,border-color,box-shadow] duration-[var(--app-duration-medium)]",
    tone === "success"
      ? "app-soft-panel-success"
      : tone === "warning"
      ? "app-soft-panel-warning"
      : tone === "muted"
      ? "app-soft-panel-muted"
      : "app-soft-panel"
  );
}

export function getAppStatusPillClass(
  tone: "default" | "success" | "muted" = "default"
) {
  return cn(
    "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
    tone === "success"
      ? "border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)] shadow-[0_1px_0_rgba(255,255,255,0.82)]"
      : tone === "muted"
      ? "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] text-[color:var(--text-muted)] shadow-[0_1px_0_rgba(255,255,255,0.82)]"
      : "border-[color:var(--state-info-border)] bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)] shadow-[0_1px_0_rgba(255,255,255,0.86)]"
  );
}
