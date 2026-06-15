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
  coral:   "bg-coral text-white shadow-[var(--brutal-shadow-sm)]",
  sky:     "bg-sky text-white shadow-[var(--brutal-shadow-sm)]",
  lav:     "bg-lav text-white shadow-[var(--brutal-shadow-sm)]",
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
        "font-sans text-xs font-bold tracking-[0.1em] uppercase",
        "cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
