import { cn } from "@/lib/ui-foundation";
import { ReactNode } from "react";

export type PillTone = "draft" | "sent" | "viewed" | "paid" | "revision" | "locked" | "warning" | "ghost";

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<PillTone, string> = {
  draft:   "bg-paper-2 text-ink-2",
  sent:    "bg-sky text-white",
  viewed:  "bg-lav text-white",
  paid:    "bg-grass text-white",
  revision:"bg-coral text-white",
  locked:  "bg-grass text-white",
  warning: "bg-butter text-ink",
  ghost:   "bg-transparent text-ink-2 border-dashed",
};

export function Pill({ tone = "ghost", children, className }: PillProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5",
      "px-3 py-1 border-2 border-ink rounded-full",
      "font-mono text-[10px] font-bold tracking-[.14em] uppercase",
      tones[tone],
      className
    )}>
      {children}
    </span>
  );
}
