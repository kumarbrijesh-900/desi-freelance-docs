import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "warning" | "success" | "danger";
}

export function AppBanner({ tone = "default", className, children, ...props }: AppBannerProps) {
  return (
    <div
      className={cn(
        "w-full border-b-2 border-[#111118] px-4 py-3 text-sm font-bold uppercase tracking-wider text-center",
        tone === "default" && "bg-[color:var(--color-lime-warm)] text-[#111118]",
        tone === "warning" && "bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]",
        tone === "success" && "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
        tone === "danger" && "bg-[color:var(--color-coral-400)] text-[#111118]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
