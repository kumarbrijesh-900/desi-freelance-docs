"use client";

import { useState, useEffect } from "react";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { LinkCopyIcon, CheckCircleIcon, DocumentSparkIcon } from "@/components/ui/app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";
import {
  shareInvoice,
  attachMsaToInvoice,
  detachMsaFromInvoice,
} from "@/lib/supabase/invoices";
import { listAllUserMsas, type ClientMsa } from "@/lib/supabase/msas";
import { playInteractionCue } from "@/lib/interaction-feedback";

interface ShareLinkModalProps {
  invoiceId: string;
  existingToken: string | null;
  /** Currently attached MSA ID */
  currentMsaId: string | null;
  /** Whether client already accepted the MSA */
  msaAcceptedAt: string | null;
  onClose: () => void;
  onShared: (token: string) => void;
}

export default function ShareLinkModal({
  invoiceId,
  existingToken,
  currentMsaId,
  msaAcceptedAt,
  onClose,
  onShared,
}: ShareLinkModalProps) {
  const [token, setToken] = useState(existingToken);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MSA state
  const [availableMsas, setAvailableMsas] = useState<ClientMsa[]>([]);
  const [selectedMsaId, setSelectedMsaId] = useState<string | null>(currentMsaId);
  const [msaAttaching, setMsaAttaching] = useState(false);
  const [loadingMsas, setLoadingMsas] = useState(false);

  const shareUrl = token
    ? `${window.location.origin}/view/${token}`
    : null;

  // Load available MSAs for the user
  useEffect(() => {
    async function loadMsas() {
      setLoadingMsas(true);
      const { data } = await listAllUserMsas();
      setAvailableMsas(data);
      setLoadingMsas(false);
    }
    loadMsas();
  }, []);

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

  const handleMsaToggle = async (msaId: string | null) => {
    setMsaAttaching(true);
    setError(null);

    if (msaId) {
      const { error } = await attachMsaToInvoice(invoiceId, msaId);
      if (error) {
        setError(error);
      } else {
        setSelectedMsaId(msaId);
        playInteractionCue("saveSuccess");
      }
    } else {
      const { error } = await detachMsaFromInvoice(invoiceId);
      if (error) {
        setError(error);
      } else {
        setSelectedMsaId(null);
        playInteractionCue("saveSuccess");
      }
    }
    setMsaAttaching(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <MotionReveal preset="scale-in">
        <div className="mx-4 w-full max-w-lg rounded-xl border border-[color:var(--border-default)] bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="border-b border-[color:var(--border-subtle)] px-6 py-4">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
              Share Invoice
            </h2>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Generate a secure link to share this invoice with your client.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {error && (
              <p className="text-sm text-[color:var(--color-coral-500)]">
                {error}
              </p>
            )}

            {/* ─── Share Link Section ─── */}
            {!token ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className={getAppButtonClass({ variant: "primary", size: "md" })}
              >
                {generating ? "Generating…" : "Generate Share Link"}
              </button>
            ) : (
              <div>
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
              </div>
            )}

            {/* ─── MSA Gating Section ─── */}
            {token && (
              <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DocumentSparkIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    MSA Gating
                  </span>
                  {selectedMsaId && msaAcceptedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--state-success-text)]">
                      <CheckCircleIcon className="h-3 w-3" />
                      Client Accepted
                    </span>
                  )}
                  {selectedMsaId && !msaAcceptedAt && (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Pending
                    </span>
                  )}
                </div>

                {loadingMsas ? (
                  <p className="text-xs text-[color:var(--text-muted)]">Loading MSAs…</p>
                ) : availableMsas.length === 0 ? (
                  <p className="text-xs text-[color:var(--text-muted)]">
                    No MSAs found for this client. Add one in the client directory to enable gating.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      Require client to accept an MSA before viewing this invoice:
                    </p>

                    {/* No MSA option */}
                    <label
                      className={`flex items-center gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors ${
                        !selectedMsaId
                          ? "border-[color:var(--color-lime-700)] bg-[color:var(--color-lime-50)]"
                          : "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="msa-select"
                        checked={!selectedMsaId}
                        onChange={() => handleMsaToggle(null)}
                        disabled={msaAttaching}
                        className="accent-[color:var(--color-lime-700)]"
                      />
                      <span className="text-sm text-[color:var(--text-primary)]">
                        No MSA required
                      </span>
                    </label>

                    {/* MSA options */}
                    {availableMsas.map((msa) => (
                      <label
                        key={msa.id}
                        className={`flex items-center gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors ${
                          selectedMsaId === msa.id
                            ? "border-[color:var(--color-lime-700)] bg-[color:var(--color-lime-50)]"
                            : "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="msa-select"
                          checked={selectedMsaId === msa.id}
                          onChange={() => handleMsaToggle(msa.id)}
                          disabled={msaAttaching}
                          className="accent-[color:var(--color-lime-700)]"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[color:var(--text-primary)]">
                            {msa.title}
                          </span>
                          <span className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                            msa.status === "active"
                              ? "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]"
                              : msa.status === "expired"
                                ? "bg-red-50 text-red-600"
                                : "bg-gray-100 text-gray-500"
                          }`}>
                            {msa.status}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[color:var(--border-subtle)] px-6 py-3 flex justify-end">
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
