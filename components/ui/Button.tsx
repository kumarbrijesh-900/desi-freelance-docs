"use client";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/ui-foundation";
import { ReactNode } from "react";

type ButtonVariant = "primary" | "coral" | "sky" | "lav" | "ghost" | "paper";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-acid text-acc-ink shadow-[var(--brutal-shadow-sm)]",
  coral:   "bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger-text)] shadow-[var(--brutal-shadow-sm)]",
  sky:     "bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)] shadow-[var(--brutal-shadow-sm)]",
  lav:     "bg-[color:var(--state-neutral-bg)] text-[color:var(--state-neutral-text)] shadow-[var(--brutal-shadow-sm)]",
  ghost:   "bg-transparent text-ink hover:bg-[color:var(--color-acc-soft)]",
  paper:   "bg-paper text-ink border border-[color:var(--color-soft)] shadow-[var(--brutal-shadow-sm)]",
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96, transition: { duration: 0.08 } }}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5",
        "rounded-xl",
        "app-focus-ring",
        "font-sans text-xs font-bold tracking-[0.1em] uppercase",
        "cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
