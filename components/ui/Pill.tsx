import { cn } from "@/lib/ui-foundation";
import { ReactNode } from "react";

export type PillTone = 
  | "draft" | "sent" | "viewed" | "paid" | "revision" | "locked" | "warning" | "ghost"
  | "awaiting" | "live" | "acid" | "sky" | "lav" | "rose" | "butter" | "grass" | "coral" | "complete";

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<PillTone, string> = {
  draft:   "bg-butter text-ink",
  sent:    "bg-sky text-ink",
  viewed:  "bg-lav text-ink",
  paid:    "bg-grass text-ink",
  revision:"bg-coral text-ink",
  locked:  "bg-grass text-ink",
  warning: "bg-butter text-ink",
  ghost:   "bg-transparent text-ink-2 border-dashed",
  awaiting:"bg-lav text-ink",
  live:    "bg-acid text-ink",
  complete:"bg-grass text-ink",
  acid:    "bg-acid text-ink",
  sky:     "bg-sky text-ink",
  lav:     "bg-lav text-ink",
  rose:    "bg-rose text-ink",
  butter:  "bg-butter text-ink",
  grass:   "bg-grass text-ink",
  coral:   "bg-coral text-ink",
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
