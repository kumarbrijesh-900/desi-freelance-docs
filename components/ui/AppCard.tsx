import * as React from "react";
import { getAppPanelClass, cn } from "@/lib/ui-foundation";

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "success" | "warning" | "muted";
  interactive?: boolean;
}

export function AppCard({ tone = "default", interactive = false, className, children, ...props }: AppCardProps) {
  return (
    <div 
      className={cn(
        getAppPanelClass(tone), 
        interactive && "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[var(--brutal-shadow-pressed)] shadow-[var(--brutal-shadow-sm)] transition-all cursor-pointer",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}
