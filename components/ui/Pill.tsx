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
  sent:    "bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)]",
  viewed:  "bg-[color:var(--state-neutral-bg)] text-[color:var(--state-neutral-text)]",
  paid:    "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
  revision:"bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger-text)]",
  locked:  "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
  warning: "bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]",
  ghost:   "bg-transparent text-ink-2 border-dashed",
  awaiting:"bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]",
  live:    "bg-acid text-acc-ink",
  complete:"bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
  acid:    "bg-acid text-acc-ink",
  sky:     "bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)]",
  lav:     "bg-[color:var(--state-neutral-bg)] text-[color:var(--state-neutral-text)]",
  rose:    "bg-rose text-ink",
  butter:  "bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]",
  grass:   "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
  coral:   "bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger-text)]",
};

export function Pill({ tone = "ghost", children, className }: PillProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5",
      "px-3 py-1 border border-soft rounded-full",
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
