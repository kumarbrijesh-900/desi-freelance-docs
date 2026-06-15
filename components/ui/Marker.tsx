import { ReactNode } from "react";
import { cn } from "@/lib/ui-foundation";

export type MarkerTone = "acid" | "coral" | "rose" | "sky" | "lav" | "butter" | "grass";

interface MarkerProps {
  tone?: MarkerTone;
  children: ReactNode;
  className?: string;
}

export function Marker({ tone = "acid", children, className }: MarkerProps) {
  const bg = `color-mix(in srgb, var(--color-${tone}) 45%, var(--color-paper))`;
  return (
    <span 
      className={cn("inline-block", className)}
      style={{
        background: `linear-gradient(180deg, transparent 50%, ${bg} 50% 88%, transparent 88%)`,
        padding: "0 4px",
      }}
    >
      {children}
    </span>
  );
}
