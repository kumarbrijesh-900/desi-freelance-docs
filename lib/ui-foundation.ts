export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const appSectionTitleClass =
  "text-xl font-semibold tracking-tight text-slate-950";

export const appSectionDescriptionClass = "text-sm leading-6 text-slate-500";

export const appFieldLabelClass =
  "mb-2 block text-sm font-medium tracking-tight text-slate-800";

export const appFieldHelperTextClass =
  "mt-1.5 text-[11px] leading-5 text-slate-500";

export const appFieldErrorTextClass =
  "mt-1.5 text-[11px] font-medium leading-5 text-rose-500";

export function getAppSubtlePanelClass(
  tone: "default" | "muted" | "warning" = "default"
) {
  return cn(
    "rounded-[var(--app-radius-card)] p-5",
    tone === "warning"
      ? "bg-amber-50/74 ring-1 ring-inset ring-amber-200/65"
      : tone === "muted"
      ? "bg-slate-50/52 ring-1 ring-inset ring-slate-200/52"
      : "bg-white/72 ring-1 ring-inset ring-slate-200/54"
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
    "app-interactive-button app-focus-ring app-soft-button inline-flex items-center justify-center gap-2 rounded-[var(--app-radius-button)] border font-semibold tracking-tight text-sm transition-[background-color,border-color,box-shadow,color,opacity] duration-[var(--app-duration-fast)] disabled:pointer-events-none disabled:opacity-55",
    size === "sm"
      ? "h-10 px-4 text-sm"
      : size === "lg"
      ? "h-12 px-5 text-sm"
      : "h-11 px-4 text-sm",
    fullWidth ? "w-full" : "",
    variant === "primary"
      ? "app-soft-button-primary text-white hover:border-indigo-900"
      : variant === "ghost"
      ? "app-soft-button-ghost text-slate-600 hover:text-slate-950"
      : variant === "tertiary"
      ? "app-soft-button-tertiary text-slate-700 hover:text-slate-950"
      : variant === "subtle"
      ? "app-soft-button-subtle text-slate-800"
      : variant === "destructive-lite"
      ? "app-soft-button-destructive text-rose-900 hover:border-rose-300"
      : "app-soft-button-secondary text-slate-950 hover:border-slate-400"
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
    "app-interactive-field app-focus-ring app-soft-field w-full rounded-[var(--app-radius-control)] border text-[15px] font-normal leading-6 text-slate-950 outline-none transition-[background-color,border-color,box-shadow,color] duration-[var(--app-duration-fast)] focus-visible:border-indigo-500",
    multiline ? "min-h-[120px] px-4 py-3.5" : "h-12 px-4",
    isSelect ? "appearance-none pr-12 text-left" : "",
    "placeholder:text-slate-400",
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100/85 disabled:text-slate-400 disabled:shadow-none",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65",
    hasError
      ? "app-soft-field-error border-rose-300/80 text-slate-950 focus-visible:border-rose-400"
      : hasValue
      ? "app-soft-field-filled border-slate-300/90"
      : "border-slate-200"
  );
}

export function getAppPanelClass(
  tone: "default" | "success" | "warning" | "muted" = "default"
) {
  return cn(
    "app-interactive-surface rounded-[var(--app-radius-card)] p-6 transition-[background-color,border-color,box-shadow] duration-[var(--app-duration-medium)]",
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
    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_1px_0_rgba(255,255,255,0.76)]"
      : tone === "muted"
      ? "border-slate-200 bg-white/72 text-slate-600 shadow-[0_1px_0_rgba(255,255,255,0.76)]"
      : "border-slate-200 bg-white/82 text-slate-600 shadow-[0_1px_0_rgba(255,255,255,0.76)]"
  );
}
