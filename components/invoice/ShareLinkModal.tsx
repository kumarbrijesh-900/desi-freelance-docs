"use client";

import { useState, useEffect } from "react";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { CheckCircleIcon, DocumentSparkIcon } from "@/components/ui/app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";
import {
  attachMsaToInvoice,
  detachMsaFromInvoice,
} from "@/lib/supabase/invoices";
import type { MsaResponse } from "@/lib/supabase/invoices";
import { listAllUserMsas, type ClientMsa } from "@/lib/supabase/msas";
import { playInteractionCue } from "@/lib/interaction-feedback";
import { DEFAULT_MSA_TITLE, DEFAULT_MSA_CONTENT } from "@/lib/default-msa";

/* ─── Icons ─────────────────────────────────────────── */

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7L13.03 12.7C12.71 12.9 12.36 13 12 13C11.64 13 11.29 12.9 10.97 12.7L2 7" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ─── MSA Status Badge ──────────────────────────────── */

function MsaStatusBadge({ response }: { response: MsaResponse }) {
  const map: Record<MsaResponse, { label: string; classes: string }> = {
    accepted: {
      label: "Client Accepted",
      classes: "border-green-200 bg-green-50 text-green-700",
    },
    rejected: {
      label: "Client Rejected",
      classes: "border-red-200 bg-red-50 text-red-600",
    },
    negotiating: {
      label: "Negotiating",
      classes: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
    pending: {
      label: "Pending",
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    },
  };
  const { label, classes } = map[response] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${classes}`}
    >
      {response === "accepted" && <CheckCircleIcon className="h-3 w-3" />}
      {label}
    </span>
  );
}

/* ─── Props ─────────────────────────────────────────── */

import type { InvoiceFormData } from "@/types/invoice";

interface ShareLinkModalProps {
  invoiceId: string;
  existingToken: string | null;
  /** Client email from the invoice form data — read-only, pre-filled */
  clientEmail: string;
  currentMsaId: string | null;
  msaResponse: MsaResponse;
  invoiceData?: InvoiceFormData;
  onClose: () => void;
  onShared: (token: string) => void;
}

/* ─── Main Component ────────────────────────────────── */

export default function ShareLinkModal({
  invoiceId,
  existingToken,
  clientEmail,
  currentMsaId,
  msaResponse,
  invoiceData,
  onClose,
  onShared,
}: ShareLinkModalProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(!!existingToken);
  const [error, setError] = useState<string | null>(null);

  // MSA state
  const [availableMsas, setAvailableMsas] = useState<ClientMsa[]>([]);
  const [selectedMsaId, setSelectedMsaId] = useState<string | null>(
    currentMsaId,
  );
  const [previewMsa, setPreviewMsa] = useState<ClientMsa | null>(null);
  const [msaAttaching, setMsaAttaching] = useState(false);
  const [loadingMsas, setLoadingMsas] = useState(false);
  const [creatingDefault, setCreatingDefault] = useState(false);

  // Load available MSAs on mount
  useEffect(() => {
    async function loadMsas() {
      setLoadingMsas(true);
      const { data } = await listAllUserMsas();
      setAvailableMsas(data);
      
      if (currentMsaId) {
        // 1. Prioritize MSA already linked to this invoice
        const match = data.find((m) => m.id === currentMsaId);
        if (match) {
          setSelectedMsaId(currentMsaId);
          setPreviewMsa(match);
        }
      } else if (!selectedMsaId && data.length > 0) {
        // 2. Fallback: Auto-select the first 'active' MSA found in user's library
        const defaultActive = data.find(m => m.status === 'active');
        if (defaultActive) {
          console.log("Auto-selecting default active MSA:", defaultActive.title);
          // We don't call handleMsaToggle here to avoid side effects on mount, 
          // but we set the local state so it's pre-selected in the UI.
          setSelectedMsaId(defaultActive.id);
          setPreviewMsa(defaultActive);
        }
      }
      setLoadingMsas(false);
    }
    loadMsas();
  }, [currentMsaId]);

  /* ── Send invoice email via secure API route ── */
  const handleSend = async () => {
    if (!clientEmail?.trim()) {
      setError("Client email is required. Add it in the invoice editor.");
      return;
    }
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/share-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          clientEmail: clientEmail.trim(),
          msaId: selectedMsaId,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error || "Failed to send. Please try again.");
        return;
      }

      onShared(json.token);
      setSent(true);
      playInteractionCue("saveSuccess");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  /* ── MSA attachment ── */
  const handleMsaToggle = async (msaId: string | null) => {
    setMsaAttaching(true);
    setError(null);
    if (msaId) {
      const { error } = await attachMsaToInvoice(invoiceId, msaId);
      if (error) {
        setError(error);
      } else {
        setSelectedMsaId(msaId);
        const match = availableMsas.find((m) => m.id === msaId);
        setPreviewMsa(match ?? null);
        playInteractionCue("saveSuccess");
      }
    } else {
      const { error } = await detachMsaFromInvoice(invoiceId);
      if (error) {
        setError(error);
      } else {
        setSelectedMsaId(null);
        setPreviewMsa(null);
        playInteractionCue("saveSuccess");
      }
    }
    setMsaAttaching(false);
  };

  /* ── Create and attach default MSA ── */
  const handleCreateDefault = async () => {
    setCreatingDefault(true);
    setError(null);
    const { createMsa } = await import("@/lib/supabase/msas");
    const { data, error } = await createMsa({
      clientId: null,
      title: DEFAULT_MSA_TITLE,
      content: DEFAULT_MSA_CONTENT,
      status: "active",
    });
    if (error || !data) {
      setError(
        "Could not create default MSA. Please create one from the Clients page.",
      );
    } else {
      setAvailableMsas((prev) => [data, ...prev]);
      await handleMsaToggle(data.id);
    }
    setCreatingDefault(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <MotionReveal preset="scale-in">
        <div className="mx-4 w-full max-w-lg rounded-xl border border-[color:var(--border-default)] bg-white shadow-2xl overflow-hidden">
          {/* ── Header ── */}
          <div className="border-b border-[color:var(--border-subtle)] px-6 py-4">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
              Send Invoice to Client
            </h2>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              A secure, one-time link is sent directly to your client&apos;s
              inbox.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* ── Error ── */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ── Recipient (read-only) ── */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Sending to
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-surface-soft)] px-3 py-2.5">
                <MailIcon className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                <span
                  className={`text-sm ${clientEmail?.trim() ? "text-[color:var(--text-primary)] font-medium" : "text-[color:var(--text-muted)] italic"}`}
                >
                  {clientEmail?.trim() ||
                    "No client email — add it in the editor first"}
                </span>
              </div>
              {!clientEmail?.trim() && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  ← Go back to Step 2 and add the client email to continue.
                </p>
              )}
            </div>

            {/* ── MSA Section ── */}
            <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentSparkIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    MSA Gating
                  </span>
                  {selectedMsaId && <MsaStatusBadge response={msaResponse} />}
                </div>
              </div>

              <p className="text-xs text-[color:var(--text-secondary)]">
                Require your client to accept a Master Service Agreement before
                they can view the invoice.
              </p>

              {/* MSA Protection Summary */}
              <div className="rounded border border-[color:var(--border-default)] bg-[color:var(--bg-surface-soft)] p-3">
                <p className="text-[13px] leading-relaxed text-[color:var(--text-primary)] font-medium">
                  This invoice is protected by a Master Services Agreement (Net{" "}
                  {invoiceData?.client?.msaPaymentTermsDays || 15},{" "}
                  {invoiceData?.client?.msaLateFeeRate || "1.5"}% late fee).
                </p>
                <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
                  The client must digitally accept these terms before viewing.
                </p>
              </div>

              {loadingMsas ? (
                <p className="text-xs text-[color:var(--text-muted)]">
                  Loading MSAs…
                </p>
              ) : availableMsas.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-[color:var(--text-secondary)]">
                    No MSAs found. Create a default one to protect your work:
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateDefault}
                    disabled={creatingDefault}
                    className={getAppButtonClass({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    {creatingDefault ? "Creating…" : "Create Default MSA"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* No MSA radio */}
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
                      No MSA — send invoice directly
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
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                            msa.status === "active"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {msa.status}
                        </span>
                      </div>
                      {/* Preview button — shows MSA text inline */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPreviewMsa(previewMsa?.id === msa.id ? null : msa);
                        }}
                        className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                        {previewMsa?.id === msa.id ? "Hide" : "Preview"}
                      </button>
                    </label>
                  ))}
                </div>
              )}

              {/* ── Inline MSA Preview ── */}
              {previewMsa && (
                <div className="rounded-md border border-[color:var(--border-default)] bg-white overflow-hidden">
                  <div className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-4 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                      MSA Preview — {previewMsa.title}
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto px-4 py-3">
                    <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[color:var(--text-secondary)]">
                      {previewMsa.content}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Sent Success State ── */}
            {sent && (
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Invoice sent to {clientEmail}
                  </p>
                  <p className="mt-0.5 text-xs text-green-700">
                    {selectedMsaId
                      ? "The client will need to accept your MSA before viewing the invoice."
                      : "The client can view the invoice directly via the secure link in their email."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-[color:var(--border-subtle)] px-6 py-4 flex items-center justify-between gap-3">
            <p className="text-[11px] text-[color:var(--text-muted)] leading-relaxed">
              🔒 The secure link is delivered only to{" "}
              {clientEmail?.trim() || "the client's email"}.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className={getAppButtonClass({ variant: "ghost", size: "sm" })}
              >
                {sent ? "Close" : "Cancel"}
              </button>
              {!sent && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !clientEmail?.trim() || msaAttaching}
                  className={getAppButtonClass({
                    variant: "primary",
                    size: "md",
                  })}
                >
                  <span className="inline-flex items-center gap-2">
                    <SendIcon className="h-4 w-4" />
                    {sending ? "Sending…" : "Send Invoice to Client"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}
