"use client";

import { CheckIcon } from "@/components/ui/app-icons";
import {
  AnimatePresence,
  motion,
} from "@/components/ui/motion-primitives";
import { cn } from "@/lib/ui-foundation";

interface UploadToastProps {
  message: string;
  visible: boolean;
}

export default function UploadToast({
  message,
  visible,
}: UploadToastProps) {
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
              "app-soft-panel-success flex items-center gap-2 rounded-full border px-4 py-2",
              "shadow-[var(--app-elevation-raised)]"
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.4)]">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-medium text-slate-900">{message}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
