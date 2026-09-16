import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
}

export function AppAvatar({ src, initials, size = "md", className, ...props }: AppAvatarProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-soft bg-[color:var(--color-gold)] text-[color:var(--color-ink)] font-black uppercase shadow-[var(--brutal-shadow-sm)]",
        size === "sm" ? "h-8 w-8 text-[length:var(--text-body)]" : size === "lg" ? "h-16 w-16 text-[length:var(--text-title)]" : "h-12 w-12 text-[length:var(--text-body)]",
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={initials || "Avatar"} className="h-full w-full object-cover" />
      ) : (
        <span>{initials?.slice(0, 2)}</span>
      )}
    </div>
  );
}
