export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const appMotionClasses = {
  fadeUp: "app-motion-base app-motion-fade-up",
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
      ? "border-slate-950 bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] hover:bg-slate-800"
      : variant === "ghost"
      ? "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      : variant === "subtle"
      ? "border-slate-200 bg-slate-100 text-slate-800 hover:border-slate-300 hover:bg-slate-200/80"
      : variant === "destructive-lite"
      ? "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-500 hover:bg-slate-100 hover:text-slate-950"
      : "border-slate-300 bg-white text-slate-950 hover:border-slate-950 hover:bg-slate-50"
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
    "placeholder:text-slate-400/95",
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65",
    hasError
      ? "border-red-400 bg-red-50/60 focus:border-red-500"
      : hasValue
      ? "border-slate-400 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
      : "border-slate-300 bg-slate-50/75"
  );
}

export function getAppPanelClass(
  tone: "default" | "success" | "warning" | "muted" = "default"
) {
  return cn(
    "app-interactive-surface rounded-[26px] border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,background-color,border-color,box-shadow] duration-[var(--app-duration-medium)]",
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "muted"
      ? "border-slate-200 bg-slate-50"
      : "border-slate-200 bg-white"
  );
}

export function getAppStatusPillClass(
  tone: "default" | "success" | "muted" = "default"
) {
  return cn(
    "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "muted"
      ? "bg-slate-200 text-slate-600"
      : "bg-slate-100 text-slate-600"
  );
}
