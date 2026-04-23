"use client";

import { useState, useEffect } from "react";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { CheckCircleIcon, DocumentSparkIcon, InfoCircleIcon } from "@/components/ui/app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";
import {
  shareInvoice,
  attachMsaToInvoice,
  detachMsaFromInvoice,
  setSharedToEmail,
} from "@/lib/supabase/invoices";
import type { MsaResponse } from "@/lib/supabase/invoices";
import { listAllUserMsas, createMsa, type ClientMsa } from "@/lib/supabase/msas";
import { playInteractionCue } from "@/lib/interaction-feedback";
import {
  DEFAULT_MSA_TITLE,
  DEFAULT_MSA_CONTENT,
  MSA_TOOLTIP_CONTENT,
} from "@/lib/default-msa";

/* ─── Icons ─────────────────────────────────────────── */

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7L13.03 12.7C12.71 12.9 12.36 13 12 13C11.64 13 11.29 12.9 10.97 12.7L2 7" />
    </svg>
  );
}

/* ─── Props ──────────────────────────────────────────── */

interface ShareLinkModalProps {
  invoiceId: string;
  existingToken: string | null;
  /** Client email from the invoice form data */
  clientEmail: string;
  /** Currently attached MSA ID */
  currentMsaId: string | null;
  /** MSA response status */
  msaResponse: MsaResponse;
  onClose: () => void;
  onShared: (token: string) => void;
}

/* ─── MSA Tooltip Component ─────────────────────────── */

function MsaTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--color-lime-700)] hover:underline"
      >
        <InfoCircleIcon className="h-3.5 w-3.5" />
        Why you need an MSA
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-[color:var(--border-default)] bg-white p-4 shadow-xl">
          <h4 className="text-sm font-bold text-[color:var(--text-primary)]">
            {MSA_TOOLTIP_CONTENT.title}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-secondary)]">
            {MSA_TOOLTIP_CONTENT.description}
          </p>
          <ul className="mt-3 space-y-2">
            {MSA_TOOLTIP_CONTENT.points.map((point) => (
              <li key={point.label} className="flex gap-2 text-xs">
                <span className="shrink-0 font-semibold text-[color:var(--text-primary)]">
                  {point.label}:
                </span>
                <span className="text-[color:var(--text-secondary)]">
                  {point.text}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── MSA Status Badge ──────────────────────────────── */

function MsaStatusBadge({ response }: { response: MsaResponse }) {
  if (response === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--state-success-text)]">
        <CheckCircleIcon className="h-3 w-3" />
        Client Accepted
      </span>
    );
  }
  if (response === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-600">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
      Pending
    </span>
  );
}

/* ─── Main Component ────────────────────────────────── */

export default function ShareLinkModal({
  invoiceId,
  existingToken,
  clientEmail,
  currentMsaId,
  msaResponse,
  onClose,
  onShared,
}: ShareLinkModalProps) {
  const [token, setToken] = useState(existingToken);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // MSA state
  const [availableMsas, setAvailableMsas] = useState<ClientMsa[]>([]);
  const [selectedMsaId, setSelectedMsaId] = useState<string | null>(currentMsaId);
  const [msaAttaching, setMsaAttaching] = useState(false);
  const [loadingMsas, setLoadingMsas] = useState(false);
  const [creatingDefault, setCreatingDefault] = useState(false);

  const shareUrl = token
    ? `${window.location.origin}/view/${token}`
    : null;

  // Load available MSAs
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
    if (!clientEmail?.trim()) {
      setError("Client email is required to share an invoice. Please add it in the editor.");
      return;
    }
    setGenerating(true);
    setError(null);
    const result = await shareInvoice(invoiceId);
    if (result.error) {
      setError(result.error);
    } else if (result.token) {
      setToken(result.token);
      // Store the target email
      await setSharedToEmail(invoiceId, clientEmail.trim());
      onShared(result.token);
    }
    setGenerating(false);
  };

  const handleSendEmail = () => {
    if (!shareUrl || !clientEmail?.trim()) return;

    const subject = encodeURIComponent("Invoice for your review — Lance");
    const body = encodeURIComponent(
      `Hi,\n\nPlease find your invoice ready for review at the link below:\n\n${shareUrl}\n\n${selectedMsaId ? "Note: You will be asked to review and accept the Master Service Agreement before viewing the invoice.\n\n" : ""}Best regards`
    );

    window.open(`mailto:${clientEmail.trim()}?subject=${subject}&body=${body}`, "_blank");
    setEmailSent(true);
    playInteractionCue("saveSuccess");
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

  const handleCreateDefaultMsa = async () => {
    setCreatingDefault(true);
    setError(null);

    // Create a default MSA (not linked to a specific client, we'll use a placeholder client ID)
    // For now, create using the first available client or as a generic MSA
    const { data, error } = await createMsa({
      clientId: "", // Will be handled by the service
      title: DEFAULT_MSA_TITLE,
      content: DEFAULT_MSA_CONTENT,
      status: "active",
    });

    if (error) {
      setError("Could not create default MSA. Please create one from the Clients page first.");
    } else if (data) {
      setAvailableMsas((prev) => [data, ...prev]);
      // Auto-attach the newly created MSA
      await handleMsaToggle(data.id);
    }
    setCreatingDefault(false);
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
              Send a secure invoice link directly to your client&apos;s email.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ─── Email Recipient ─── */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Send to
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-surface-soft)] px-3 py-2.5">
                <MailIcon className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                <span className={`text-sm ${clientEmail?.trim() ? "text-[color:var(--text-primary)] font-medium" : "text-[color:var(--text-muted)] italic"}`}>
                  {clientEmail?.trim() || "No client email — add in editor"}
                </span>
              </div>
              {!clientEmail?.trim() && (
                <p className="mt-1 text-xs text-[color:var(--color-coral-500)]">
                  Client email is required to share invoices securely.
                </p>
              )}
            </div>

            {/* ─── Share Action ─── */}
            {!token ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !clientEmail?.trim()}
                className={getAppButtonClass({ variant: "primary", size: "md" })}
              >
                {generating ? "Generating…" : "Generate & Send Invoice Link"}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Send via Email */}
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className={`w-full ${getAppButtonClass({ variant: "primary", size: "md" })}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <MailIcon className="h-4 w-4" />
                    {emailSent ? "Open Email Again" : "Send to Client Email"}
                  </span>
                </button>

                {emailSent && (
                  <div className="flex items-center gap-2 rounded-md border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-3 py-2">
                    <CheckCircleIcon className="h-4 w-4 text-[color:var(--state-success-text)]" />
                    <p className="text-xs font-medium text-[color:var(--state-success-text)]">
                      Email client opened with invoice link. Send it to {clientEmail}.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-[color:var(--text-muted)] leading-relaxed">
                  The link will be sent to <strong>{clientEmail}</strong> only. For offline sharing (PDF export), it is assumed the agency and client have an existing accord.
                </p>
              </div>
            )}

            {/* ─── MSA Gating Section ─── */}
            {token && (
              <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DocumentSparkIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                      MSA Gating
                    </span>
                    {selectedMsaId && <MsaStatusBadge response={msaResponse} />}
                  </div>
                  <MsaTooltip />
                </div>

                {loadingMsas ? (
                  <p className="text-xs text-[color:var(--text-muted)]">Loading MSAs…</p>
                ) : availableMsas.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      No MSAs found. Create a default MSA to protect yourself:
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateDefaultMsa}
                      disabled={creatingDefault}
                      className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                    >
                      {creatingDefault ? "Creating…" : "Create Default MSA & Attach"}
                    </button>
                  </div>
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
