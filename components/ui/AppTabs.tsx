import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export const AppTabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-4", className)} {...props} />
  )
);
AppTabs.displayName = "AppTabs";

export const AppTabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-12 items-center justify-center border-b-2 border-[#111118] bg-white text-[color:var(--text-muted)]",
        className
      )}
      {...props}
    />
  )
);
AppTabsList.displayName = "AppTabsList";

export const AppTabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ className, active, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex h-full items-center justify-center whitespace-nowrap px-6 py-1.5 text-sm font-bold uppercase tracking-wider transition-all disabled:pointer-events-none disabled:opacity-50",
      "hover:bg-[color:var(--bg-surface-muted)] hover:text-[#111118]",
      active && "border-b-4 border-[color:var(--brand-indigo-deep)] bg-[color:var(--bg-surface-soft)] text-[#111118]",
      className
    )}
    {...props}
  />
));
AppTabsTrigger.displayName = "AppTabsTrigger";
