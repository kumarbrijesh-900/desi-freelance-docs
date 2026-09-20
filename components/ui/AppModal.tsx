"use client";

import * as React from "react";
import { cn } from "@/lib/ui-foundation";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { useScrollLock } from "@/lib/use-scroll-lock";

export interface AppModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
}

export function AppModal({ isOpen, onClose, className, children, ...props }: AppModalProps) {
  const panelRef = useModalA11y<HTMLDivElement>(isOpen, onClose);
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-[color:var(--bg-overlay)] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-lg rounded-[var(--radius-soft)] border border-soft bg-paper-2 p-6 shadow-[var(--brutal-shadow-lg)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
