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
      className={cn("relative h-4 w-full overflow-hidden rounded-none border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-pressed)]", className)}
      {...props}
    >
      <div
        className="h-full bg-[color:var(--color-lime-warm)] border-r-2 border-[#111118] transition-all duration-300 ease-[var(--app-ease-standard)]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
AppProgressBar.displayName = "AppProgressBar";
