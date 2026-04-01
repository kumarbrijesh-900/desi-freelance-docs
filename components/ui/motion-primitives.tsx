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

type MotionPreset = "fade-in" | "fade-up" | "scale-in" | "modal" | "soft";

export const appEaseStandard: [number, number, number, number] = [
  0.4,
  0,
  0.2,
  1,
];
export const appEaseGentle: [number, number, number, number] = [
  0.4,
  0,
  0.2,
  1,
];

export const appSpringTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
  mass: 0.78,
};

export const appStepTransition = {
  type: "spring" as const,
  stiffness: 360,
  damping: 30,
  mass: 0.8,
};

const revealVariants: Record<MotionPreset, Variants> = {
  "fade-in": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
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

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  preset?: MotionPreset;
  delay?: number;
  durationMs?: number;
};

export function MotionReveal({
  children,
  className,
  preset = "fade-up",
  delay = 0,
  durationMs,
}: MotionRevealProps) {
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
              ease: appEaseStandard,
            }
      }
    >
      {children}
    </motion.div>
  );
}

export function FadeIn(props: Omit<MotionRevealProps, "preset">) {
  return <MotionReveal {...props} preset="fade-in" />;
}

export function SlideUp(props: Omit<MotionRevealProps, "preset">) {
  return <MotionReveal {...props} preset="fade-up" />;
}

export function ScaleIn(props: Omit<MotionRevealProps, "preset">) {
  return <MotionReveal {...props} preset="scale-in" />;
}

export function SectionReveal(props: Omit<MotionRevealProps, "preset">) {
  return <MotionReveal {...props} preset="fade-up" />;
}

export function ModalTransition(props: Omit<MotionRevealProps, "preset">) {
  return <MotionReveal {...props} preset="modal" />;
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
              ease: appEaseStandard,
            }}
          >
            {child}
          </motion.div>
        );
      }) ?? <Fragment />}
    </motion.div>
  );
}

export function StaggerChildren(props: {
  children: ReactNode;
  className?: string;
}) {
  return <MotionStagger {...props} />;
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
              ...appSpringTransition,
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

export function HoverLift({
  children,
  className,
  hoverY = -2,
  hoverScale = 1.01,
  ...props
}: HTMLMotionProps<"div"> & {
  children: ReactNode;
  hoverY?: number;
  hoverScale?: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={
        reducedMotion ? undefined : { y: hoverY, scale: hoverScale }
      }
      transition={reducedMotion ? undefined : appSpringTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function PressDown({
  children,
  className,
  tapScale = 0.985,
  ...props
}: HTMLMotionProps<"div"> & {
  children: ReactNode;
  tapScale?: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileTap={reducedMotion ? undefined : { scale: tapScale }}
      transition={reducedMotion ? undefined : appSpringTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StepTransition({
  children,
  className,
  ...props
}: HTMLMotionProps<"div"> & { children: ReactNode }) {
  return (
    <motion.div
      layout
      className={className}
      transition={appStepTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SuccessPulse({
  children,
  className,
  active = true,
  ...props
}: HTMLMotionProps<"div"> & {
  children: ReactNode;
  active?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      animate={
        reducedMotion || !active
          ? undefined
          : { scale: [1, 1.018, 1], opacity: [1, 0.98, 1] }
      }
      transition={
        reducedMotion || !active
          ? undefined
          : {
              duration: 0.9,
              ease: appEaseGentle,
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
