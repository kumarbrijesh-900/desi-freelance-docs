"use client";

import { useState } from "react";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { LinkCopyIcon, CheckCircleIcon } from "@/components/ui/app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";
import { shareInvoice } from "@/lib/supabase/invoices";
import { playInteractionCue } from "@/lib/interaction-feedback";

interface ShareLinkModalProps {
  invoiceId: string;
  existingToken: string | null;
  onClose: () => void;
  onShared: (token: string) => void;
}

export default function ShareLinkModal({
  invoiceId,
  existingToken,
  onClose,
  onShared,
}: ShareLinkModalProps) {
  const [token, setToken] = useState(existingToken);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = token
    ? `${window.location.origin}/view/${token}`
    : null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const result = await shareInvoice(invoiceId);
    if (result.error) {
      setError(result.error);
    } else if (result.token) {
      setToken(result.token);
      onShared(result.token);
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    playInteractionCue("saveSuccess");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <MotionReveal preset="scale-in">
        <div className="mx-4 w-full max-w-md rounded-xl border border-[color:var(--border-default)] bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
            Share Invoice
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Generate a secure link to share this invoice with your client.
          </p>

          {error && (
            <p className="mt-3 text-sm text-[color:var(--color-coral-500)]">
              {error}
            </p>
          )}

          {!token ? (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className={getAppButtonClass({ variant: "primary", size: "md" })}
              >
                {generating ? "Generating…" : "Generate Share Link"}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Share URL
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl || ""}
                  className="flex-1 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-surface-soft)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                >
                  {copied ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircleIcon className="h-4 w-4 text-[color:var(--color-cyan-500)]" />
                      Copied
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <LinkCopyIcon className="h-4 w-4" />
                      Copy
                    </span>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                Anyone with this link can view the invoice.
              </p>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={getAppButtonClass({ variant: "ghost", size: "sm" })}
            >
              Close
            </button>
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}
