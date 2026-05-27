import * as React from "react";
import { cn } from "@/lib/ui-foundation";
import { AppIcon } from "./AppIcon";

export interface AppEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function AppEmptyState({ title, description, icon, action, className, ...props }: AppEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-none border-2 border-[#111118] border-dashed bg-[color:var(--color-paper)] p-8 text-center shadow-none",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-none border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)]">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-black uppercase tracking-tight text-[#111118]">{title}</h3>
      {description && <p className="mb-6 max-w-sm text-sm font-normal text-[color:var(--color-ink-2)]">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
