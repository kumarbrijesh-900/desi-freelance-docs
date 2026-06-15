import { cn } from "@/lib/ui-foundation";
import { ReactNode } from "react";

export type StickerTone = "acid" | "coral" | "rose" | "sky" | "lav" | "butter";

interface StickerProps {
  rotate?: number;
  tone?: StickerTone;
  children: ReactNode;
  className?: string;
}

export function Sticker({ rotate = -4, tone = "acid", children, className }: StickerProps) {
  return (
    <span 
      style={{ transform: `rotate(${rotate}deg)` }}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5",
        "border-2 border-ink rounded-full",
        "font-display font-semibold text-[13px]",
        "shadow-[3px_3px_0_var(--color-ink)]",
        tone === "acid"   && "bg-acid text-acc-ink",
        tone === "coral"  && "bg-coral text-white",
        tone === "rose"   && "bg-rose",
        tone === "sky"    && "bg-sky text-white",
        tone === "lav"    && "bg-lav text-white",
        tone === "butter" && "bg-butter",
        className
      )}
    >
      {children}
    </span>
  );
}
