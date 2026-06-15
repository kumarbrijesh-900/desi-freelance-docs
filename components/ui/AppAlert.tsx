import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "info" | "success" | "warning" | "danger";
}

export function AppAlert({ tone = "info", className, children, ...props }: AppAlertProps) {
  return (
    <div 
      className={cn(
        "flex gap-3 rounded-2xl border border-soft p-4 font-normal shadow-[var(--brutal-shadow-sm)]",
        tone === "success" && "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
        tone === "warning" && "bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]",
        tone === "danger" && "bg-[color:var(--color-coral-100)] text-[color:var(--color-coral-900)]",
        tone === "info" && "bg-white text-[color:var(--color-ink)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
