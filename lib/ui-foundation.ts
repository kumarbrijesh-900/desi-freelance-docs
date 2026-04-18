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
  "mt-1 text-[11px] font-semibold leading-[1.45] text-rose-600";

export function getAppSubtlePanelClass(
  tone: "default" | "muted" | "warning" = "default"
) {
  return cn(
    "rounded-[var(--app-radius-card)] p-4",
    tone === "warning"
      ? "bg-[color:var(--app-color-surface-warning)] ring-1 ring-inset ring-[color:rgba(245,158,11,0.3)]"
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
      ? "app-soft-button-primary text-white hover:border-indigo-900"
      : variant === "ghost"
      ? "app-soft-button-ghost text-[color:var(--app-color-text-muted)] hover:text-[color:var(--app-color-text-primary)]"
      : variant === "tertiary"
      ? "app-soft-button-tertiary text-[color:var(--app-color-text-secondary)] hover:text-[color:var(--app-color-text-primary)]"
      : variant === "subtle"
      ? "app-soft-button-subtle text-[color:var(--app-color-text-secondary)]"
      : variant === "destructive-lite"
      ? "app-soft-button-destructive text-rose-900 hover:border-rose-300"
      : "app-soft-button-secondary text-[color:var(--app-color-text-primary)] hover:border-slate-400"
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
    "app-interactive-field app-focus-ring app-soft-field min-w-0 w-full rounded-[var(--app-radius-control)] border text-[14px] font-normal leading-6 text-[color:var(--app-color-text-primary)] outline-none transition-[background-color,border-color,box-shadow,color] duration-[var(--app-duration-fast)] focus-visible:border-[color:var(--app-color-primary)]",
    multiline ? "min-h-[112px] px-3 py-3" : "h-11 px-3",
    isSelect
      ? "appearance-none overflow-hidden pr-[2.875rem] text-ellipsis whitespace-nowrap text-left"
      : "",
    "placeholder:text-slate-400/80",
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100/85 disabled:text-slate-400 disabled:shadow-none",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65",
    hasError
      ? "app-soft-field-error focus-visible:border-rose-400"
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
      ? "border-emerald-200/95 bg-emerald-50/95 text-emerald-900 shadow-[0_1px_0_rgba(255,255,255,0.82)]"
      : tone === "muted"
      ? "border-slate-200/95 bg-slate-100/88 text-slate-600 shadow-[0_1px_0_rgba(255,255,255,0.82)]"
      : "border-slate-300/95 bg-white/96 text-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.86)]"
  );
}
