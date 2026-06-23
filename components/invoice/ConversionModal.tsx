"use client";

import React from "react";
import { supabase } from "@/lib/supabase/client";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";
import { useModalA11y } from "@/lib/use-modal-a11y";

interface ConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
  title?: string;
  subtitle?: string;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function ConversionModal({
  isOpen,
  onClose,
  onLoginClick,
  title = "Your invoice is ready!",
  subtitle = "Create a free Lance account to download your PDF, save this client, and lock in your agency branding.",
}: ConversionModalProps) {
  const overlayRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} tabIndex={-1} className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="conversion-modal-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(33,28,22,0.6)]"
        onClick={onClose}
      />

      <MotionReveal
        preset="fade-up"
        className="relative w-full max-w-sm overflow-hidden rounded-[var(--radius-soft)] border border-soft bg-white shadow-[var(--brutal-shadow-lg)]"
      >
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e4f1ea] text-2xl text-[#157a54]">
            ✓
          </div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#157a54]">
            Your invoice is safe — sign up to download it
          </p>

          <h2 className="font-syne text-xl font-bold text-[color:var(--color-ink)] mb-2">{title}</h2>
          <p className="text-[13px] text-[color:var(--color-ink-2)] leading-relaxed mb-8">
            Your draft is saved locally and will be restored after sign-in. Create a free account to enable cloud save, PDF export, and sharing.
          </p>

          <button
            type="button"
            onClick={onLoginClick}
            className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-box)] border border-soft bg-white py-3 text-sm font-bold text-[color:var(--color-ink)] shadow-[var(--brutal-shadow-sm)] transition-all hover:bg-[color:var(--color-paper)] active:scale-[0.98]"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 h-11 w-full rounded-[var(--radius-box)] border border-soft bg-white text-[11px] font-bold text-[color:var(--color-ink-3)] transition-all hover:bg-[color:var(--color-paper)]"
          >
            Not now, I'll do it later
          </button>

          <p className="mt-8 text-[10px] leading-relaxed text-[color:var(--color-ink-3)] uppercase tracking-widest">
            Built for Indian Freelancers
          </p>
        </div>
      </MotionReveal>
    </div>
  );
}
