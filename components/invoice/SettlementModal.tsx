"use client";

import { useState } from "react";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { getAppButtonClass } from "@/lib/ui-foundation";

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tdsAmount: number) => void;
  onContinue?: () => void;
  milestoneName: string;
  subtotal: number;
  currencySymbol: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  state?: "idle" | "submitting" | "success" | "error";
  successTitle?: string;
  successMessage?: string;
  continueLabel?: string;
}

export default function SettlementModal({
  isOpen,
  onClose,
  onConfirm,
  onContinue,
  milestoneName,
  subtotal,
  currencySymbol,
  isSubmitting,
  errorMessage,
  state = "idle",
  successTitle = "Milestone Settled",
  successMessage = "Payment has been recorded for this milestone.",
  continueLabel = "Continue",
}: SettlementModalProps) {
  const [tdsPercent, setTdsPercent] = useState<number>(0);

  if (!isOpen) return null;

  const tdsAmount = (subtotal * tdsPercent) / 100;
  const netReceived = subtotal - tdsAmount;
  const isSuccess = state === "success";
  const isError = state === "error";
  const isBusy = state === "submitting" || isSubmitting;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="settlement-modal-title">
      <MotionReveal preset="fade-up" className="w-full max-w-md">
        <div className="border-2 border-[#111118] bg-white p-6 shadow-[var(--brutal-shadow-lg)]">
          {isSuccess ? (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#111118] bg-[color:var(--color-lime-warm)] text-2xl font-black text-[#111118] shadow-[var(--brutal-shadow-md)]">
                  ✓
                </div>
                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                  {successTitle}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                  {successMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={onContinue}
                className={`w-full ${getAppButtonClass({ variant: "primary", size: "md" })}`}
              >
                {continueLabel}
              </button>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                  Confirm Settlement
                </h2>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  Process payment for "{milestoneName}"
                </p>
              </div>

              <div className="space-y-4">
                {/* Amount Summary */}
                <div className="border-2 border-[#111118] bg-[color:var(--bg-surface-soft)] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--text-muted)] font-bold">Milestone Subtotal</span>
                    <span className="font-bold text-[color:var(--text-primary)] tabular-nums">
                      {currencySymbol}{subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* TDS Input */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-muted)] mb-1.5">
                    TDS Deduction (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tdsPercent === 0 ? "" : tdsPercent}
                      onChange={(e) => setTdsPercent(Number(e.target.value))}
                      placeholder="0"
                      disabled={isBusy}
                      className="w-full h-11 border-2 border-[#111118] bg-white px-4 text-sm outline-none transition-colors )] disabled:cursor-not-allowed disabled:opacity-60 app-focus-ring"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[color:var(--text-muted)]">
                      %
                    </span>
                  </div>
                </div>

                {/* Math Breakdown */}
                <div className="space-y-2 pt-2 border-t border-[color:var(--border-subtle)]">
                  <div className="flex justify-between text-xs text-[color:var(--text-muted)]">
                    <span>TDS Amount (-{tdsPercent}%)</span>
                    <span className="tabular-nums">-{currencySymbol}{tdsAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-sm font-bold text-[color:var(--text-primary)]">Net Received</span>
                    <span className="text-xl font-black text-[color:var(--text-primary)] tabular-nums">
                      {currencySymbol}{netReceived.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="border-2 border-[#111118] bg-[#FFEBA4] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] leading-5 text-[#111118]">
                    {errorMessage}
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBusy}
                  className="flex-1 border-2 border-[#111118] bg-white px-6 py-2.5 text-sm font-bold text-[#111118] transition-all hover:bg-[color:var(--bg-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm(tdsAmount)}
                  disabled={isBusy}
                  className="flex-[2] border-2 border-[#111118] bg-[color:var(--color-lime-warm)] px-6 py-2.5 text-sm font-bold text-[#111118] uppercase transition-all hover:brightness-105 disabled:opacity-50"
                >
                  {isBusy ? "Settling..." : isError ? "Try Again" : "Confirm Settlement"}
                </button>
              </div>
            </>
          )}
        </div>
      </MotionReveal>
    </div>
  );
}
