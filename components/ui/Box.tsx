import { cn } from "@/lib/ui-foundation";
import { HTMLAttributes } from "react";

export type BoxShadow = "ink" | "coral" | "sky" | "lav";
export type BoxTone = "acid" | "rose" | "sky";

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  shadow?: BoxShadow;
  tone?: BoxTone;
}

export function Box({ shadow = "ink", tone, className, children, ...props }: BoxProps) {
  return (
    <div
      className={cn(
        "border-2 border-ink rounded-[4px] bg-paper relative",
        shadow === "ink"   && "shadow-[4px_4px_0_var(--color-ink)]",
        shadow === "coral" && "shadow-[5px_5px_0_var(--color-coral)]",
        shadow === "sky"   && "shadow-[5px_5px_0_var(--color-sky)]",
        shadow === "lav"   && "shadow-[5px_5px_0_var(--color-lav)]",
        tone === "acid"    && "bg-acid",
        tone === "rose"    && "bg-rose",
        tone === "sky"     && "bg-sky text-white",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
