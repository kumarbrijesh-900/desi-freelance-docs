"use client";

import { useState, useEffect } from "react";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { CheckCircleIcon, DocumentSparkIcon, SparklesIcon } from "@/components/ui/app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";
import type { MsaResponse } from "@/lib/supabase/invoices";
import { playInteractionCue } from "@/lib/interaction-feedback";
import { DEFAULT_MSA_TITLE, DEFAULT_MSA_CONTENT } from "@/lib/default-msa";
import { useToast } from "@/components/ui/AppToast";

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

/* ─── MSA Status Badge ──────────────────────────────── */

function MsaStatusBadge({ response }: { response: MsaResponse }) {
  const map: Record<MsaResponse, { label: string; classes: string }> = {
    accepted: {
      label: "Client Accepted",
      classes: "border-green-200 bg-green-50 text-green-700",
    },
    rejected: {
      label: "Revision Requested",
      classes: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
    pending: {
      label: "Pending",
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    },
    proposed: {
      label: "Proposed",
      classes: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
  };
  const { label, classes } = map[response] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${classes}`}
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
  sharedAt: string | null;
  onClose: () => void;
  onShared: (token: string) => void;
}

function formatPaymentTerms(
  value?: string | number | null,
  fallbackDays?: string | number | null,
) {
  const rawValue = value ?? fallbackDays;
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "Due on receipt";
  }

  const text = String(rawValue).trim();
  if (!text) return "Due on receipt";
  if (/^\d+$/.test(text)) return `Net ${text} days`;
  return text;
}

function formatLateFeeUnit(unit?: string | null) {
  const normalized = unit?.toLowerCase().trim();
  const map: Record<string, string> = {
    daily: "per day",
    day: "per day",
    monthly: "per month",
    month: "per month",
    annually: "per annum",
    annual: "per annum",
    yearly: "per annum",
    year: "per annum",
  };

  if (!normalized) return "per month";
  if (normalized.startsWith("per ")) return normalized;
  return map[normalized] || normalized;
}

function getMilestoneFraming(invoiceData?: InvoiceFormData) {
  const milestones = invoiceData?.milestones;
  if (!milestones || milestones.length <= 1) return null;

  const totalCount = milestones.length;
  const currency = invoiceData?.client?.clientCurrency || "INR";
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";

  const milestoneAmounts = milestones.map((m) =>
    m.lineItems.reduce((sum, li) => sum + Number(li.qty || 0) * Number(li.rate || 0), 0)
  );

  const totalProject = milestoneAmounts.reduce((s, a) => s + a, 0);
  const currentAmount = milestoneAmounts[0] ?? 0;
  const remainingAmount = totalProject - currentAmount;

  return {
    totalCount,
    symbol,
    currentAmount,
    totalProject,
    remainingAmount,
  };
}

/* ─── Main Component ────────────────────────────────── */

export default function ShareLinkModal({
  invoiceId,
  existingToken,
  clientEmail,
  currentMsaId,
  msaResponse,
  invoiceData,
  sharedAt,
  onClose,
  onShared,
}: ShareLinkModalProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const effectivePaymentTerms = formatPaymentTerms(
    invoiceData?.meta?.paymentTerms,
    invoiceData?.client?.msaPaymentTermsDays,
  );
  const lateFeeUnit = formatLateFeeUnit(invoiceData?.client?.msaLateFeeUnit);
  const { push } = useToast();



  /* ── Send invoice email via secure API route ── */
  const handleSend = async () => {
    if (!clientEmail?.trim()) {
      push({ kind: "error", ttl: "Client email is required. Add it in the invoice editor." });
      return;
    }
    setSending(true);

    try {
      const res = await fetch("/api/share-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          clientEmail: clientEmail.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        push({ kind: "error", ttl: json.error || "Failed to send. Please try again." });
        return;
      }

      onShared(json.token);
      setSent(true);
      playInteractionCue("saveSuccess");
    } catch {
      push({ kind: "error", ttl: "Network error. Please check your connection and try again." });
    } finally {
      setSending(false);
    }
  };



  const overlayRef = useModalA11y(true, onClose);

  return sent ? (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" role="dialog" aria-modal="true" aria-labelledby="share-link-modal-title">
    <div className="w-full max-w-md border border-soft bg-white p-8 shadow-[var(--brutal-shadow-lg)] text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center border border-soft bg-[#00DCB4] mb-4">
        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="text-xl font-bold uppercase text-[color:var(--color-ink)] mb-2">Invoice Sent!</h2>
      <p className="text-[13px] text-[color:var(--color-ink-2)] mb-6">
        A secure link has been delivered to <strong>{clientEmail}</strong>. You will be notified when they view or accept it.
      </p>
      <div className="flex gap-3 justify-center">
        <a
          href="/dashboard"
          className="border border-soft bg-[color:var(--color-lime-warm)] px-5 py-2.5 text-[12px] font-bold uppercase text-[color:var(--color-ink)] shadow-[var(--brutal-shadow-sm)]"
        >
          Go to Dashboard
        </a>
        <a
          href="/invoices"
          className="border border-soft bg-white px-5 py-2.5 text-[12px] font-bold uppercase text-[color:var(--color-ink)]"
        >
          View Invoices
        </a>
      </div>
    </div>
  </div>
) : (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-link-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <MotionReveal preset="scale-in">
        <div className="mx-4 w-full max-w-lg border border-soft bg-white p-6 shadow-[var(--brutal-shadow-lg)] overflow-hidden">
          {/* ── Header ── */}
          <div className="border-b border-[color:var(--color-soft)] px-6 py-4">
            <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
              Send Invoice to Client
            </h2>
            <p className="mt-0.5 text-sm text-[color:var(--color-ink)]">
              A secure, one-time link is sent directly to your client&apos;s
              inbox.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Error is now handled via toast */}

            {/* ── Recipient (read-only) ── */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">
                Sending to
              </label>
              <div className="mt-1.5 flex items-center gap-2 border border-soft bg-[color:var(--color-paper)] px-3 py-2.5">
                <MailIcon className="h-4 w-4 shrink-0 text-[color:var(--color-ink-2)]" />
                <span
                  className={`text-sm ${clientEmail?.trim() ? "text-[color:var(--color-ink)] font-normal" : "text-[color:var(--color-ink-2)] italic"}`}
                >
                  {clientEmail?.trim() ||
                    "No client email — add it in the editor first"}
                </span>
              </div>
              {!clientEmail?.trim() && (
                <p className="mt-1.5 text-[#FF5C00] text-[10px] font-bold uppercase tracking-[0.16em]">
                  ← Go back to Step 2 and add the client email to continue.
                </p>
              )}
            </div>

            {/* ── Milestone Framing ── */}
            {(() => {
              const framing = getMilestoneFraming(invoiceData);
              if (!framing) return null;
              return (
                <div className="border border-soft bg-[color:var(--color-paper)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">
                      Milestone Billing
                    </span>
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                      Milestone 1 of {framing.totalCount}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--color-ink)]">Due now (Milestone 1)</span>
                      <span className="font-bold text-[color:var(--color-ink)]">
                        {framing.symbol}{framing.currentAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[color:var(--color-ink)]">Remaining milestones</span>
                      <span className="font-bold text-[color:var(--color-ink-2)]">
                        {framing.symbol}{framing.remainingAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-[color:var(--color-soft)] pt-2 mt-1">
                      <span className="font-bold text-[color:var(--color-ink)]">Total project</span>
                      <span className="font-bold text-[color:var(--color-ink)]">
                        {framing.symbol}{framing.totalProject.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-[color:var(--color-ink-2)] leading-relaxed">
                    The client will only see Milestone 1 details in this invoice. Future milestones will be sent separately.
                  </p>
                </div>
              );
            })()}

            {/* ── MSA Section ── */}
            <div className="border border-soft bg-[color:var(--color-paper)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentSparkIcon className="h-4 w-4 text-[color:var(--color-ink-2)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">
                    MSA Gating
                  </span>
                  {currentMsaId && <MsaStatusBadge response={msaResponse} />}
                </div>
              </div>

              <p className="text-xs text-[color:var(--color-ink)]">
                Require your client to accept a Master Service Agreement before
                they can view the invoice.
              </p>

              {/* Addendum Alert */}
              {invoiceData?.meta?.hasAddendum && (
                <div className="border-2 border-[#FF5C00] bg-[#FFF0EC] p-3 flex items-start gap-2.5 shadow-[var(--brutal-shadow-sm)]">
                  <SparklesIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-bold text-amber-900">Project-Specific Addendum Active</p>
                    <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                      This invoice includes custom terms that deviate from your Master MSA.
                    </p>
                  </div>
                </div>
              )}

              {/* MSA Protection Summary */}
              <div className="border border-soft bg-[color:var(--color-paper)] p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-ink-2)] mb-3">
                  Effective Terms:
                </h4>
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--color-lime-600)]" />
                    <span className="font-bold">Payment terms:</span> {effectivePaymentTerms}
                  </li>
                  <li className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--color-lime-600)]" />
                    <span className="font-bold">Late fee:</span> {invoiceData?.client?.msaLateFeeRate || "1.5"}% {lateFeeUnit}
                  </li>
                  <li className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--color-lime-600)]" />
                    <span className="font-bold">IP Rights:</span> {invoiceData?.client?.msaIpTriggerType?.replace(/_/g, " ") || "Full Transfer"}
                  </li>
                  <li className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--color-lime-600)]" />
                    <span className="font-bold">Jurisdiction:</span> {invoiceData?.client?.msaJurisdictionCity || "Agency City"}
                  </li>
                  <li className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--color-lime-600)]" />
                    <span className="font-bold">Revision rounds:</span> {invoiceData?.client?.freeRevisionRounds ?? 2} free per deliverable
                  </li>
                  <li className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--color-lime-600)]" />
                    <span className="font-bold">Extra revision fee:</span> {invoiceData?.client?.extraRevisionFeePercent ?? 15}% of line item per round
                  </li>
                </ul>
                <p className="mt-4 border-t border-[color:var(--color-soft)] pt-3 text-[11px] text-[color:var(--color-ink-2)] leading-relaxed italic">
                  The client must digitally accept these terms before they can access the full invoice.
                </p>
              </div>


            </div>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-[color:var(--color-soft)] px-6 py-4 flex items-center justify-between gap-3">
            <p className="text-[11px] text-[color:var(--color-ink-2)] leading-relaxed">
              🔒 The secure link is delivered only to{" "}
              {clientEmail?.trim() || "the client's email"}.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-bold text-[color:var(--color-ink-2)] border-2 border-transparent hover:border-soft transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !clientEmail?.trim()}
                className="inline-flex items-center gap-2 border border-soft bg-[color:var(--color-lime-warm)] px-6 py-2.5 text-sm font-bold text-[color:var(--color-ink)] uppercase shadow-[var(--brutal-shadow-md)] hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-flex items-center gap-2">
                  <SendIcon className="h-4 w-4" />
                  {sending ? "Sending…" : sharedAt ? "Resend Invoice" : "Send Invoice"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}
