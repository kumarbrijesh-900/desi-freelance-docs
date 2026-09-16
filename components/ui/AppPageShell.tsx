import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/ui-foundation";

/**
 * The one content column. Every in-app route renders at this width, so the
 * left edge of the content does not move between routes. Do not override it
 * per page — if a page needs to be wider, it needs `bare` and its own layout,
 * not a second width.
 */
export const appPageShellContainerClass =
  "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";

/**
 * The document bar. 46px on sm+ so the content below it starts at the same
 * y-coordinate on every route; wraps below sm, where the viewport decides the
 * layout anyway.
 */
const barClass = cn(
  "flex min-h-[46px] flex-wrap items-center gap-x-4 gap-y-1.5 py-1.5",
  "rounded-[var(--radius-box)] border border-soft bg-paper-2 px-[18px]",
  "sm:h-[46px] sm:flex-nowrap sm:py-0",
);

export interface AppPageShellProps {
  /** The page's identity. Renders as the route's only h1. */
  title: ReactNode;
  /**
   * Demote the title to h2. Only for a pane inside a master-detail route,
   * where the page already owns an h1 that names the route itself.
   */
  titleAs?: "h1" | "h2";
  /** Quiet context beside the title — counts, scope, a date range. Never an action. */
  meta?: ReactNode;
  /** Bar-scale controls: sort, export, save. Primary creation belongs in AppHeader. */
  actions?: ReactNode;
  /** Href of the parent route. Renders as a chevron inside the bar, not above it. */
  back?: string;
  /** Label for the back link. Defaults to "Back". */
  backLabel?: string;
  /**
   * Render only the bar, with no container or padding — for panes that already
   * own their own scroll and width (the dashboard detail pane).
   */
  bare?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function AppPageShell({
  title,
  titleAs: TitleTag = "h1",
  meta,
  actions,
  back,
  backLabel = "Back",
  bare = false,
  className,
  children,
}: AppPageShellProps) {
  const bar = (
    <div className={barClass}>
      {back && (
        <Link
          href={back}
          className="is-interactive -ml-2 inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] px-2 py-1 font-mono type-label uppercase tracking-[0.08em] text-ink-2 transition-colors hover:text-ink"
        >
          <span aria-hidden="true">&lsaquo;</span>
          {backLabel}
        </Link>
      )}

      <TitleTag className="min-w-0 truncate font-display type-body-lg font-bold leading-none text-ink">
        {title}
      </TitleTag>

      {meta && (
        <span className="hidden min-w-0 truncate font-mono type-label uppercase tracking-[0.1em] text-ink-3 sm:block">
          {meta}
        </span>
      )}

      <div className="hidden flex-1 sm:block" />

      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  );

  if (bare) {
    return (
      <>
        {bar}
        {children}
      </>
    );
  }

  return (
    <div className={cn(appPageShellContainerClass, "pt-8 pb-24", className)}>
      {bar}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/**
 * A bar-scale control. Actions in the bar are text, not buttons — the bar is
 * 46px and a padded button does not fit in it without changing its height.
 */
export function AppPageShellAction({
  onClick,
  href,
  tone = "quiet",
  disabled,
  children,
}: {
  onClick?: () => void;
  href?: string;
  tone?: "quiet" | "act" | "danger";
  disabled?: boolean;
  children: ReactNode;
}) {
  const base = cn(
    "is-interactive inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1.5",
    "font-mono type-label uppercase tracking-[0.08em] transition-colors",
    tone === "act" && "text-acid",
    tone === "danger" && "text-coral",
    tone === "quiet" && "text-ink-2 hover:text-ink",
    disabled && "pointer-events-none opacity-[var(--state-disabled)]",
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}

/** A vertical hairline between groups of bar actions. */
export function AppPageShellDivider() {
  return <div aria-hidden="true" className="h-[18px] w-px shrink-0 bg-soft" />;
}
