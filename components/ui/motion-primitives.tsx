"use client";

import { Children, Fragment, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/ui-foundation";

export { AnimatePresence, motion };

type MotionPreset = "fade-up" | "scale-in" | "modal" | "soft";

const standardEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const revealVariants: Record<MotionPreset, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 12, scale: 0.995 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 8, scale: 0.995 },
  },
  "scale-in": {
    hidden: { opacity: 0, scale: 0.985 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.985 },
  },
  modal: {
    hidden: { opacity: 0, y: 18, scale: 0.982 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 12, scale: 0.988 },
  },
  soft: {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 4 },
  },
};

const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.025,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
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
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={revealVariants[preset]}
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      exit={reducedMotion ? undefined : "exit"}
      transition={
        reducedMotion
          ? undefined
          : {
              duration: (durationMs ?? 240) / 1000,
              delay: delay / 1000,
              ease: standardEase,
            }
      }
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      variants={staggerVariants}
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      exit={reducedMotion ? undefined : "exit"}
    >
      {Children.map(children, (child, index) => {
        if (child === null || child === undefined || child === false) {
          return null;
        }

        return (
          <motion.div
            key={index}
            variants={revealVariants["fade-up"]}
            transition={{
              duration: 0.22,
              ease: standardEase,
            }}
          >
            {child}
          </motion.div>
        );
      }) ?? <Fragment />}
    </motion.div>
  );
}

export function MotionButton({
  children,
  className,
  hoverScale = 1.015,
  tapScale = 0.985,
  ...props
}: HTMLMotionProps<"button"> & {
  children: ReactNode;
  hoverScale?: number;
  tapScale?: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      className={className}
      whileHover={
        reducedMotion ? undefined : { scale: hoverScale, y: -1 }
      }
      whileTap={reducedMotion ? undefined : { scale: tapScale, y: 0 }}
      transition={
        reducedMotion
          ? undefined
          : {
              type: "spring",
              stiffness: 420,
              damping: 30,
              mass: 0.72,
            }
      }
      {...props}
    >
      {children}
    </motion.button>
  );
}
