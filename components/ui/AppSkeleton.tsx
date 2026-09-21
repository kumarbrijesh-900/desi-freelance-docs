import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: "rect" | "pill" | "circle";
}

export function AppSkeleton({ shape = "rect", className, ...props }: AppSkeletonProps) {
  return (
    <div
      className={cn(
        // Not paper-2: that is the fill of the cards a skeleton sits on, in
        // every theme, so the default was invisible wherever it would be used.
        "animate-pulse bg-[color:var(--color-soft)]",
        shape === "rect" && "rounded-[var(--radius-soft)]",
        shape === "pill" && "rounded-[var(--app-radius-pill)]",
        shape === "circle" && "rounded-[var(--app-radius-circular)]",
        className
      )}
      {...props}
    />
  );
}
