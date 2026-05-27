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
        "border-2 border-ink rounded-[4px] relative",
        shadow === "ink"      && "shadow-[4px_4px_0_var(--color-ink)]",
        shadow === "coral"    && "shadow-[5px_5px_0_var(--color-coral),5px_5px_0_0.5px_var(--color-ink)]",
        shadow === "sky"      && "shadow-[5px_5px_0_var(--color-sky),5px_5px_0_0.5px_var(--color-ink)]",
        shadow === "lav"      && "shadow-[5px_5px_0_var(--color-lav),5px_5px_0_0.5px_var(--color-ink)]",
        shadow === "chunk-hi" && "shadow-[5px_5px_0_var(--color-acid),5px_5px_0_0.5px_var(--color-ink)]",
        shadow === "chunk-lg" && "shadow-[6px_6px_0_var(--color-ink)]",
        !tone && "bg-paper",
        tone === "acid"   && "bg-acid text-ink",
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
