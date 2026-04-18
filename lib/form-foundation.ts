import { cn } from "@/lib/ui-foundation";

export type AppFieldSemanticWidth =
  | "full"
  | "content"
  | "medium"
  | "identifier"
  | "code"
  | "postal"
  | "money"
  | "quantity"
  | "compact";

export const appFieldWidthClassMap: Record<AppFieldSemanticWidth, string> = {
  full: "w-full",
  content: "w-full max-w-[var(--app-field-width-content)]",
  medium: "w-full max-w-[var(--app-field-width-medium)]",
  identifier: "w-full max-w-[var(--app-field-width-identifier)]",
  code: "w-full max-w-[var(--app-field-width-code)]",
  postal: "w-full max-w-[var(--app-field-width-postal)]",
  money: "w-full max-w-[var(--app-field-width-money)]",
  quantity: "w-full max-w-[var(--app-field-width-quantity)]",
  compact: "w-full max-w-[var(--app-field-width-compact)]",
};

export type AppFieldState =
  | "default"
  | "hover"
  | "focus"
  | "filled"
  | "error"
  | "disabled"
  | "readonly";

export function getAppFieldWidthClass(width: AppFieldSemanticWidth = "full") {
  return appFieldWidthClassMap[width];
}

export function getAppFieldStackClass(params?: {
  density?: "compact" | "comfortable" | "relaxed";
}) {
  const density = params?.density ?? "comfortable";

  return cn(
    "grid grid-cols-1",
    density === "compact"
      ? "gap-2"
      : density === "relaxed"
      ? "gap-6"
      : "gap-4"
  );
}

export function getAppFieldRowClass(params?: {
  columns?: 1 | 2 | 3 | 4;
  density?: "compact" | "comfortable";
}) {
  const columns = params?.columns ?? 2;
  const density = params?.density ?? "comfortable";

  return cn(
    "grid grid-cols-1",
    density === "compact" ? "gap-3 sm:gap-4" : "gap-4 sm:gap-5",
    columns >= 2 ? "md:grid-cols-2" : "",
    columns >= 3 ? "xl:grid-cols-3" : "",
    columns >= 4 ? "2xl:grid-cols-4" : ""
  );
}

export function getAppFieldGroupClass(params?: {
  tone?: "default" | "muted";
}) {
  return cn(
    "rounded-[var(--app-radius-card)] border px-4 py-4 sm:px-5 sm:py-5",
    params?.tone === "muted"
      ? "border-[color:var(--app-color-border)] bg-[color:var(--app-color-surface-muted)]"
      : "border-[color:var(--app-color-border)] bg-[color:var(--app-color-surface)]"
  );
}

export const appSectionShellClass =
  "rounded-[var(--app-radius-shell)] border border-[color:var(--app-color-border)] bg-[color:var(--app-color-surface)] shadow-[var(--app-elevation-soft)]";

export const appSectionHeaderClass =
  "flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--app-color-border)] px-5 py-4";

export const appSectionBodyClass = "space-y-4 px-5 py-4";

export const appFieldFullWidthStackClass = "space-y-4";

export const appFieldPairGridClass =
  "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5";

export const appFieldTripleCompactGridClass =
  "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_132px]";

export const appStickyRailClass =
  "rounded-[var(--app-radius-card)] border border-[color:var(--app-color-border)] bg-[color:var(--app-color-surface-muted)] shadow-[var(--app-elevation-soft)]";

export const appStickyActionDockClass =
  "rounded-[var(--app-radius-card)] border border-[color:var(--app-color-border-strong)] bg-[color:var(--app-color-surface-elevated)] shadow-[var(--app-elevation-raised)] backdrop-blur";

export const appUtilityWidgetClass =
  "rounded-[var(--app-radius-card)] border border-[color:var(--app-color-border)] bg-[color:var(--app-color-surface-muted)] p-2 shadow-[var(--app-elevation-soft)]";
