import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: "rect" | "pill" | "circle";
}

export function AppSkeleton({ shape = "rect", className, ...props }: AppSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[color:var(--color-paper-2)]",
        shape === "rect" && "rounded-none",
        shape === "pill" && "rounded-[var(--app-radius-pill)]",
        shape === "circle" && "rounded-[var(--app-radius-circular)]",
        className
      )}
      {...props}
    />
  );
}
