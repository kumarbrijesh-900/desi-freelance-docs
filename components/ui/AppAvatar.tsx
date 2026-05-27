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
        "relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-[#111118] bg-[color:var(--color-lime-warm)] text-[#111118] font-black uppercase shadow-[var(--brutal-shadow-sm)]",
        size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-12 w-12 text-sm",
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
