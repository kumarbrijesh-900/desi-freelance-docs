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
          "inline-flex items-center justify-center rounded-xl app-focus-ring border border-[color:var(--color-soft)] transition-[transform,box-shadow,background-color,border-color] duration-150 cursor-pointer active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10",
          variant === "primary" && "bg-acid text-acc-ink border-transparent hover:shadow-[var(--brutal-shadow-sm)]",
          variant === "secondary" && "bg-white text-ink hover:shadow-[var(--brutal-shadow-sm)]",
          variant === "subtle" && "bg-[color:var(--color-paper-2)] text-ink hover:shadow-[var(--brutal-shadow-pressed)]",
          variant === "ghost" && "border-transparent bg-transparent hover:bg-[color:var(--color-acc-soft)]",
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
