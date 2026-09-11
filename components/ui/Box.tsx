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
        tone === "sky"    && "bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)]",
        tone === "lav"    && "bg-[color:var(--state-neutral-bg)] text-[color:var(--state-neutral-text)]",
        tone === "butter" && "bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]",
        tone === "mint"   && "bg-paper-mint text-ink",
        tone === "paper"  && "bg-paper text-ink",
        tone === "grass"  && "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
