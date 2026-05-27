export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const appSectionTitleClass =
  "text-[1.1rem] font-bold tracking-[-0.01em] uppercase text-[color:var(--app-color-text-primary)]";

export const appSectionDescriptionClass =
  "text-[12px] leading-5 text-[color:var(--app-color-text-muted)]";

export const appFieldLabelClass =
  "mb-1.5 block text-[11px] font-bold tracking-[0.06em] uppercase text-[color:var(--app-color-text-secondary)]";

export const appFieldHelperTextClass =
  "mt-1 text-[11px] leading-[1.5] text-[color:var(--app-color-text-muted)]";

export const appFieldErrorTextClass =
  "mt-1 text-[11px] font-bold leading-[1.45] text-[color:var(--state-danger-text)]";

export function getAppSubtlePanelClass(
  tone: "default" | "muted" | "warning" = "default",
) {
  return cn(
    "rounded-[var(--app-radius-card)] border-2 border-[color:var(--brutal-border-color)] p-4",
    tone === "warning"
      ? "bg-[color:var(--state-warning-bg)]"
      : tone === "muted"
        ? "bg-[color:var(--app-color-surface-muted)]"
        : "bg-[color:var(--app-color-surface)]",
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
    "app-interactive-button app-focus-ring app-soft-button inline-flex items-center justify-center gap-2 rounded-[var(--app-radius-button)] border-2 border-[color:var(--brutal-border-color)] font-bold tracking-widest uppercase text-sm transition-all duration-100 ease-[var(--app-ease-standard)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
    size === "sm"
      ? "h-9 px-3 text-[13px]"
      : size === "lg"
        ? "h-12 px-5 text-sm"
        : "h-10 px-4 text-[13px]",
    fullWidth ? "w-full" : "",
    variant === "primary"
      ? "app-soft-button-primary text-[color:var(--text-primary)] font-black"
      : variant === "ghost"
        ? "app-soft-button-ghost text-[color:var(--app-color-text-muted)] hover:text-[color:var(--app-color-text-primary)]"
        : variant === "tertiary"
          ? "app-soft-button-tertiary text-[color:var(--app-color-text-secondary)] hover:text-[color:var(--app-color-text-primary)]"
          : variant === "subtle"
            ? "app-soft-button-subtle text-[color:var(--app-color-text-secondary)]"
            : variant === "destructive-lite"
              ? "app-soft-button-destructive text-[color:var(--state-danger-text)]"
              : "app-soft-button-secondary text-[color:var(--app-color-text-primary)]",
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
    "app-interactive-field app-focus-ring app-soft-field min-w-0 w-full rounded-[var(--app-radius-control)] border-2 border-[color:var(--brutal-border-color)] text-[14px] font-normal leading-6 text-[color:var(--text-primary)] outline-none transition-all duration-100 ease-[var(--app-ease-standard)]",
    multiline ? "min-h-[112px] px-3 py-3" : "h-11 px-3",
    isSelect
      ? "appearance-none overflow-hidden pr-[2.875rem] text-ellipsis whitespace-nowrap text-left"
      : "",
    "disabled:cursor-not-allowed disabled:border-[color:var(--border-subtle)] disabled:bg-[color:var(--bg-surface-muted)] disabled:text-[color:var(--text-soft)] disabled:shadow-none",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65",
    hasError
      ? "app-soft-field-error"
      : hasValue
        ? "app-soft-field-filled"
        : "",
  );
}

export function getAppPanelClass(
  tone: "default" | "success" | "warning" | "muted" = "default",
) {
  return cn(
    "app-interactive-surface rounded-[var(--app-radius-card)] border-2 border-[color:var(--brutal-border-color)] p-5 transition-[background-color,border-color,box-shadow] duration-[var(--app-duration-medium)]",
    tone === "success"
      ? "app-soft-panel-success"
      : tone === "warning"
        ? "app-soft-panel-warning"
        : tone === "muted"
          ? "app-soft-panel-muted"
          : "app-soft-panel",
  );
}

export function appContainerCenteredClass() {
  return "flex justify-center w-full";
}

export function appBottomBarClass() {
  return "bg-white border-t-2 border-[color:var(--brutal-border-color)] p-4";
}

export function appMobileStepPillClass() {
  return "hidden lg:flex items-center gap-2";
}

export function getAppStatusPillClass(
  tone: "default" | "success" | "muted" | "warning" = "default",
) {
  return cn(
    "shrink-0 border-2 border-[color:var(--brutal-border-color)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]",
    tone === "success"
      ? "bg-[#E0FFF7] text-[#006B52]"
      : tone === "muted"
        ? "bg-[color:var(--bg-surface-muted)] text-[color:var(--text-muted)]"
        : tone === "warning"
          ? "bg-[#FF5C00] text-white"
          : "bg-[color:var(--bg-surface-soft)] text-[color:var(--text-primary)]",
  );
}
