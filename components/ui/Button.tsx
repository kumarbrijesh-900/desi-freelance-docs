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
  primary: "bg-acid text-acc-ink",
  coral:   "bg-coral text-white",
  sky:     "bg-sky text-white",
  lav:     "bg-lav text-white",
  ghost:   "bg-transparent shadow-none border-transparent hover:border-ink",
  paper:   "bg-paper text-ink",
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ x: -1, y: -1 }}
      whileTap={{ x: 2, y: 2, transition: { duration: 0.06 } }}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5",
        "border-2 border-ink rounded-lg",
        "font-mono text-xs font-bold tracking-[.12em] uppercase",
        "shadow-[3px_3px_0_var(--color-ink)] cursor-pointer",
        "transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
