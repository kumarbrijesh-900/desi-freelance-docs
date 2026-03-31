"use client";

import type { CSSProperties, ReactNode } from "react";
import { appMotionClasses, cn } from "@/lib/ui-foundation";

type MotionPreset = "fade-up" | "scale-in" | "modal" | "soft";

const presetClasses: Record<MotionPreset, string> = {
  "fade-up": appMotionClasses.fadeUp,
  "scale-in": appMotionClasses.scaleIn,
  modal: appMotionClasses.modal,
  soft: appMotionClasses.soft,
};

export function MotionReveal({
  children,
  className,
  preset = "fade-up",
  delay = 0,
  durationMs,
}: {
  children: ReactNode;
  className?: string;
  preset?: MotionPreset;
  delay?: number;
  durationMs?: number;
}) {
  const style = {
    ["--app-motion-delay" as string]: `${delay}ms`,
    ...(durationMs
      ? {
          ["--app-motion-duration" as string]: `${durationMs}ms`,
        }
      : {}),
  } as CSSProperties;

  return (
    <div className={cn(presetClasses[preset], className)} style={style}>
      {children}
    </div>
  );
}

export function MotionStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(appMotionClasses.stagger, className)}>{children}</div>;
}
