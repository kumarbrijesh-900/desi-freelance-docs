import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export interface AppModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
}

export function AppModal({ isOpen, onClose, className, children, ...props }: AppModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-[color:var(--bg-overlay)] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-2xl border border-soft bg-white p-6 shadow-[var(--brutal-shadow-lg)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
