import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  weight?: "regular" | "heavy";
}

export function AppIcon({ size = 24, weight = "heavy", className, children, ...props }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight === "heavy" ? 2 : 1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn("shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}
