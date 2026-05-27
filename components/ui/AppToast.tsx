import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  tone?: "success" | "warning" | "danger" | "default";
  isOpen: boolean;
}

export function AppToast({ message, tone = "default", isOpen, className, ...props }: AppToastProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[var(--z-index-toast)] flex items-center gap-3 rounded-none border-2 border-[#111118] px-4 py-3 shadow-[var(--brutal-shadow-md)] animate-in slide-in-from-bottom-5",
        tone === "success" && "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]",
        tone === "warning" && "bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]",
        tone === "danger" && "bg-[color:var(--color-coral-100)] text-[color:var(--color-coral-900)]",
        tone === "default" && "bg-white text-[color:var(--text-primary)]",
        className
      )}
      {...props}
    >
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
}
