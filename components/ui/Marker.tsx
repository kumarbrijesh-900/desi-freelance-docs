import { ReactNode } from "react";
import { cn } from "@/lib/ui-foundation";

export type MarkerTone = "acid" | "coral" | "rose" | "sky" | "lav" | "butter" | "grass";

interface MarkerProps {
  tone?: MarkerTone;
  children: ReactNode;
  className?: string;
}

export function Marker({ tone = "acid", children, className }: MarkerProps) {
  const bg = `var(--color-${tone})`;
  return (
    <span 
      className={cn("inline-block", className)}
      style={{
        background: `linear-gradient(180deg, transparent 55%, ${bg} 55% 92%, transparent 92%)`,
        padding: "0 4px",
      }}
    >
      {children}
    </span>
  );
}
