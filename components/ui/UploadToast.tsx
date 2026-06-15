"use client";

import { CheckIcon } from "@/components/ui/app-icons";
import { AnimatePresence, motion } from "@/components/ui/motion-primitives";
import { cn } from "@/lib/ui-foundation";

interface UploadToastProps {
  message: string;
  visible: boolean;
}

export default function UploadToast({ message, visible }: UploadToastProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="upload-toast"
          initial={{ opacity: 0, y: -10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.992 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="pointer-events-none fixed left-1/2 top-6 z-[500] -translate-x-1/2"
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-full border border-[color:var(--color-lime-300)] bg-ink px-5 py-3",
              "shadow-xl",
            )}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-lime-400)] text-[color:var(--color-ink)] shadow-[0_1px_0_rgba(255,255,255,0.2)]">
              <CheckIcon className="h-4 w-4 stroke-[3]" />
            </span>
            <span className="text-sm font-bold text-white">{message}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
