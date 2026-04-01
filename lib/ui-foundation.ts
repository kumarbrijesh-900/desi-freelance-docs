export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const appMotionClasses = {
  fadeUp: "app-motion-base app-motion-fade-up",
  fadeIn: "app-motion-base app-motion-fade-in",
  scaleIn: "app-motion-base app-motion-scale-in",
  modal: "app-motion-base app-motion-modal",
  soft: "app-motion-base app-motion-soft",
  stagger: "app-motion-stagger",
  success: "app-success-pulse",
} as const;

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
    "app-interactive-button app-focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border font-semibold tracking-tight transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-[var(--app-duration-fast)] disabled:pointer-events-none disabled:opacity-55",
    size === "sm"
      ? "h-10 px-4 text-sm"
      : size === "lg"
      ? "h-12 px-5 text-sm"
      : "h-11 px-4 text-sm",
    fullWidth ? "w-full" : "",
    variant === "primary"
      ? "border-slate-950 bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] hover:border-slate-900 hover:bg-slate-900"
      : variant === "ghost"
      ? "border-transparent bg-transparent text-slate-600 hover:bg-white/75 hover:text-slate-950"
      : variant === "tertiary"
      ? "border-slate-200/80 bg-slate-50/85 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:bg-white hover:text-slate-950"
      : variant === "subtle"
      ? "border-slate-200 bg-slate-100/90 text-slate-800 hover:border-slate-300 hover:bg-slate-200/85"
      : variant === "destructive-lite"
      ? "border-rose-200/80 bg-rose-50/70 text-rose-900 hover:border-rose-300 hover:bg-rose-50"
      : "border-slate-300 bg-white/92 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-500 hover:bg-white"
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
    "app-interactive-field app-focus-ring w-full rounded-2xl border text-[15px] font-medium leading-6 text-slate-950 outline-none transition-[transform,background-color,border-color,box-shadow,color] duration-[var(--app-duration-fast)]",
    multiline ? "min-h-[120px] px-4 py-3.5" : "h-12 px-4",
    isSelect ? "appearance-none pr-11" : "",
    "placeholder:text-slate-400",
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65",
    hasError
      ? "border-red-400 bg-red-50/70 shadow-[0_1px_2px_rgba(239,68,68,0.08)] focus:border-red-500"
      : hasValue
      ? "border-slate-400 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.05)]"
      : "border-slate-300 bg-white/80"
  );
}

export function getAppPanelClass(
  tone: "default" | "success" | "warning" | "muted" = "default"
) {
  return cn(
    "app-interactive-surface rounded-[26px] border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,background-color,border-color,box-shadow] duration-[var(--app-duration-medium)]",
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/92 shadow-[0_10px_24px_rgba(16,185,129,0.06)]"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50/92 shadow-[0_10px_24px_rgba(245,158,11,0.07)]"
      : tone === "muted"
      ? "border-slate-200 bg-slate-50/92"
      : "border-slate-200 bg-white/94 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
  );
}

export function getAppStatusPillClass(
  tone: "default" | "success" | "muted" = "default"
) {
  return cn(
    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
    tone === "success"
      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
      : tone === "muted"
      ? "border-slate-200 bg-slate-100 text-slate-600"
      : "border-slate-200 bg-white text-slate-600"
  );
}
