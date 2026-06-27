"use client";

import { useState } from "react";
import { AppModal } from "@/components/ui/AppModal";

const CLOSURE_REASONS = [
  "Client non-payment",
  "Scope discrepancy",
  "Client unresponsive",
  "Mutual cancellation",
];

interface CloseProjectModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function CloseProjectModal({
  isOpen,
  projectName,
  onClose,
  onConfirm,
}: CloseProjectModalProps) {
  const [selected, setSelected] = useState("");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOther = selected === "Other";
  const reason = isOther ? otherText.trim() : selected;
  const canSubmit = reason.length > 0 && !submitting;

  const reset = () => {
    setSelected("");
    setOtherText("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(reason);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  const options = [...CLOSURE_REASONS, "Other"];

  return (
    <AppModal isOpen={isOpen} onClose={handleClose}>
      <h2 className="text-2xl font-display font-black tracking-tight text-ink">
        Close project
      </h2>
      <p className="mt-1.5 text-[13px] font-semibold text-ink-2 leading-snug">
        Closing <span className="font-black text-ink">{projectName}</span> stops
        reminders and cancels any scheduled milestones. Use this to end a project
        early — it is not the same as completing it.
      </p>

      <div className="mt-5 mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-ink/60">
        Reason for closing
      </div>
      <div className="space-y-2">
        {options.map((r) => (
          <label
            key={r}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
              selected === r
                ? "border-coral bg-paper-2"
                : "border-soft hover:border-ink/40"
            }`}
          >
            <input
              type="radio"
              name="closure-reason"
              value={r}
              checked={selected === r}
              onChange={() => setSelected(r)}
              className="accent-coral"
            />
            <span className="text-sm font-bold text-ink">{r}</span>
          </label>
        ))}
      </div>

      {isOther && (
        <textarea
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          rows={3}
          maxLength={500}
          autoFocus
          placeholder="Briefly describe the reason…"
          className="mt-3 w-full rounded-xl border-2 border-soft focus:border-coral focus:outline-none px-4 py-3 text-sm text-ink resize-none"
        />
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2.5 rounded-[10px] font-extrabold uppercase text-[11px] tracking-widest text-ink hover:bg-paper-2 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className="px-5 py-2.5 rounded-[10px] font-extrabold uppercase text-[11px] tracking-widest text-white bg-coral transition-all hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Closing…" : "Close project"}
        </button>
      </div>
    </AppModal>
  );
}
