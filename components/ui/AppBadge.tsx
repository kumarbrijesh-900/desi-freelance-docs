import * as React from "react";
import { getAppStatusPillClass, cn } from "@/lib/ui-foundation";

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "success" | "muted" | "warning";
}

export function AppBadge({ tone = "default", className, children, ...props }: AppBadgeProps) {
  return (
    <span className={cn(getAppStatusPillClass(tone), className)} {...props}>
      {children}
    </span>
  );
}
