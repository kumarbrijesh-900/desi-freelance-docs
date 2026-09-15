import type { ReactNode } from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppStat {
  /** What the number is. Rendered small and quiet. */
  label: string;
  /** The number itself. */
  value: ReactNode;
  /** Optional qualifier after the value — "3 invoices", "turnaround", "FY 25-26". */
  sub?: string;
  /**
   * Acid. Reserve it for money that is live — owed, at risk, or awaiting action.
   * A count of things is never hero: if every stat on a page could be hero,
   * none of them is.
   */
  hero?: boolean;
}

/**
 * The one way numbers are shown above a list. Ambient context for the table
 * below it, not the task itself — which is why it is a line and not cards.
 * Cards are for when the metric IS the task, and no route currently qualifies.
 */
export default function AppStatLine({
  stats,
  className,
}: {
  stats: AppStat[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-7 gap-y-2",
        "rounded-[var(--radius-box)] border border-soft bg-paper-2 px-4 py-2.5",
        className,
      )}
    >
      {stats.map((s, i) => (
        <div key={i} className="flex min-w-0 items-baseline gap-2">
          <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-ink-2">
            {s.label}
          </span>
          <span
            className={cn(
              "whitespace-nowrap font-display font-bold leading-none tabular-nums",
              s.hero ? "text-[22px] text-acid" : "text-[16px] text-ink",
            )}
          >
            {s.value}
          </span>
          {s.sub && (
            <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
              {s.sub}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
