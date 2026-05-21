"use client";

import { useState } from "react";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { getAppButtonClass } from "@/lib/ui-foundation";

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tdsAmount: number) => void;
  milestoneName: string;
  subtotal: number;
  currencySymbol: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

export default function SettlementModal({
  isOpen,
  onClose,
  onConfirm,
  milestoneName,
  subtotal,
  currencySymbol,
  isSubmitting,
  errorMessage,
}: SettlementModalProps) {
  const [tdsPercent, setTdsPercent] = useState<number>(0);

  if (!isOpen) return null;

  const tdsAmount = (subtotal * tdsPercent) / 100;
  const netReceived = subtotal - tdsAmount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <MotionReveal preset="fade-up" className="w-full max-w-md">
        <div className="border-2 border-[#111118] bg-white p-6 shadow-[var(--brutal-shadow-lg)]">
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
                <span className="text-[color:var(--text-muted)] font-medium">Milestone Subtotal</span>
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
                  className="w-full h-11 border-2 border-[#111118] bg-white px-4 text-sm outline-none transition-colors focus:bg-[color:var(--bg-surface-soft)]"
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
              <div className="border-2 border-[#111118] bg-[#FFEBA4] px-4 py-3 text-xs font-semibold leading-5 text-[#111118]">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border-2 border-[#111118] bg-white px-6 py-2.5 text-sm font-bold text-[#111118] transition-all hover:bg-[color:var(--bg-surface-soft)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(tdsAmount)}
              disabled={isSubmitting}
              className="flex-[2] border-2 border-[#111118] bg-[#BEFF00] px-6 py-2.5 text-sm font-bold text-[#111118] uppercase transition-all hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting ? "Updating…" : "Confirm Settlement"}
            </button>
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}
