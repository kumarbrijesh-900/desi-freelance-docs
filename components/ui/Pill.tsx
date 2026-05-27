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
  draft:   "bg-[#e8e2d3] text-ink-2",
  sent:    "bg-sky text-white",
  viewed:  "bg-lav text-white",
  paid:    "bg-grass text-white",
  revision:"bg-coral text-white",
  locked:  "bg-grass text-white",
  warning: "bg-butter text-ink",
  ghost:   "bg-transparent text-ink-2 border-dashed",
  awaiting:"bg-butter text-ink",
  live:    "bg-acid text-ink",
  complete:"bg-grass text-white",
  acid:    "bg-acid text-ink",
  sky:     "bg-sky text-white",
  lav:     "bg-lav text-white",
  rose:    "bg-rose text-ink",
  butter:  "bg-butter text-ink",
  grass:   "bg-grass text-white",
  coral:   "bg-coral text-white",
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
      {tone === "live" && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse shadow-none" style={{ animation: "dot-pulse 1.6s ease-out infinite" }} />
      )}
      {children}
    </span>
  );
}
