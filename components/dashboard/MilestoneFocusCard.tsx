"use client";

import { useState } from "react";

export type MilestoneFocusData = {
  label: string;          // e.g. "M3"
  name: string;           // e.g. "prototyping"
  amount: string;         // preformatted, e.g. "₹728"
  invoiceId: string | null;
  isOverdue: boolean;
  daysLate: number | null;
  dueLabel: string | null;    // e.g. "Due 22 Jul"
  unlocksLabel: string | null; // e.g. "settling unlocks M4 (₹4,292)"
};

export function MilestoneFocusCard({
  data,
  onSettle,
  isReadOnly = false,
}: {
  data: MilestoneFocusData;
  onSettle?: () => void;
  isReadOnly?: boolean;
}) {
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);

  const handleNudge = async () => {
    if (!data.invoiceId || nudging || nudged) return;
    setNudging(true);
    try {
      const res = await fetch("/api/invoice/nudge-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: data.invoiceId }),
      });
      if (res.ok) setNudged(true);
    } finally {
      setNudging(false);
    }
  };

  return (
    <div className="rounded-[14px] border border-soft bg-[color:var(--color-paper-2)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {data.isOverdue && data.daysLate !== null ? (
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--color-coral)]">
              {data.daysLate} days late
            </div>
          ) : data.dueLabel ? (
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--color-ink-2)]">
              {data.dueLabel}
            </div>
          ) : null}
          <div className="mt-1 text-[17px] font-bold tracking-[-0.02em] text-[color:var(--color-ink)]">
            {data.label} · {data.name}
          </div>
        </div>
        <div className="shrink-0 text-[20px] font-bold tabular-nums text-[color:var(--color-ink)]">
          {data.amount}
        </div>
      </div>

      {data.unlocksLabel && (
        <div className="mt-2 text-[11px] text-[color:var(--color-ink-2)]">
          {data.unlocksLabel}
        </div>
      )}

      {!isReadOnly && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSettle}
            className="rounded-full bg-[color:var(--color-acid)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-acc-ink)] active:scale-[0.97] transition-transform"
          >
            Settle
          </button>
          <button
            type="button"
            onClick={handleNudge}
            disabled={!data.invoiceId || nudging || nudged}
            className="rounded-full border border-[color:var(--color-strong)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)] disabled:opacity-50 active:scale-[0.97] transition-[color,transform]"
          >
            {nudged ? "Nudge sent" : nudging ? "Sending…" : "Nudge"}
          </button>
        </div>
      )}
    </div>
  );
}
