import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "subtle";
  size?: "sm" | "md" | "lg";
}

export const AppIconButton = React.forwardRef<HTMLButtonElement, AppIconButtonProps>(
  ({ variant = "secondary", size = "md", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-none border-2 border-[#111118] transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10",
          variant === "primary" && "bg-[color:var(--color-lime-warm)] text-[#111118] hover:shadow-[var(--brutal-shadow-sm)] hover:translate-x-[-2px] hover:translate-y-[-2px]",
          variant === "secondary" && "bg-white text-[#111118] hover:shadow-[var(--brutal-shadow-sm)] hover:translate-x-[-2px] hover:translate-y-[-2px]",
          variant === "subtle" && "bg-[color:var(--color-paper-2)] text-[#111118] hover:shadow-[var(--brutal-shadow-pressed)]",
          variant === "ghost" && "border-transparent bg-transparent hover:border-[#111118]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
AppIconButton.displayName = "AppIconButton";
