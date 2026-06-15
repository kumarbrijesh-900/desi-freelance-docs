import { cn } from "@/lib/ui-foundation";
import { HTMLAttributes } from "react";

export type BoxShadow = "ink" | "coral" | "sky" | "lav" | "chunk-hi" | "chunk-lg";
export type BoxTone = "acid" | "rose" | "sky" | "lav" | "butter" | "mint" | "paper" | "grass";

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  shadow?: BoxShadow;
  tone?: BoxTone;
}

export function Box({ shadow = "ink", tone, className, children, ...props }: BoxProps) {
  return (
    <div
      className={cn(
        "border border-soft rounded-[4px] relative",
        shadow === "ink"      && "shadow-[var(--brutal-shadow-md)]",
        shadow === "coral"    && "shadow-[var(--brutal-shadow-lg)]",
        shadow === "sky"      && "shadow-[var(--brutal-shadow-lg)]",
        shadow === "lav"      && "shadow-[var(--brutal-shadow-lg)]",
        shadow === "chunk-hi" && "shadow-[var(--brutal-shadow-lg)]",
        shadow === "chunk-lg" && "shadow-[var(--brutal-shadow-lg)]",
        !tone && "bg-paper",
        tone === "acid"   && "bg-acid text-acc-ink",
        tone === "rose"   && "bg-rose text-ink",
        tone === "sky"    && "bg-sky text-white",
        tone === "lav"    && "bg-lav text-white",
        tone === "butter" && "bg-butter text-ink",
        tone === "mint"   && "bg-paper-mint text-ink",
        tone === "paper"  && "bg-paper text-ink",
        tone === "grass"  && "bg-grass text-white",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
