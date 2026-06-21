import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export const AppProgressBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }
>(({ className, value = 0, max = 100, ...props }, ref) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-2xl border border-soft bg-white shadow-[var(--brutal-shadow-pressed)]", className)}
      {...props}
    >
      <div
        className="h-full bg-[color:var(--color-acid)] border-r-2 border-soft transition-all duration-300 ease-[var(--app-ease-standard)]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
AppProgressBar.displayName = "AppProgressBar";
