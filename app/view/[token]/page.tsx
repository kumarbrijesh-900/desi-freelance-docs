"use client";

import { use, useEffect, useState } from "react";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
import TemplateRenderer from "@/lib/templates/renderer";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon, CheckCircleIcon } from "@/components/ui/app-icons";
import {
  loadInvoiceByToken,
  recordView,
  loadMsaForSharedInvoice,
  respondToMsa,
  proposeMsaChanges,
} from "@/lib/supabase/invoices";
import type { MsaResponse } from "@/lib/supabase/invoices";
import Link from "next/link";
import { getAppButtonClass } from "@/lib/ui-foundation";

interface MsaData {
  title: string;
  content: string;
}

export default function PublicInvoiceViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [formData, setFormData] = useState<InvoiceFormData | null>(null);
  const [templateId, setTemplateId] = useState("classic");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasAddendum, setHasAddendum] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // MSA gating state
  const [msaRequired, setMsaRequired] = useState(false);
  const [msaResponse, setMsaResponse] = useState<MsaResponse>("pending");
  const [msaData, setMsaData] = useState<MsaData | null>(null);
  const [msaSubmitting, setMsaSubmitting] = useState(false);

  // Negotiation state
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalText, setProposalText] = useState("");

  // Agency name for rejection message
  const [agencyName, setAgencyName] = useState("The agency");

  useEffect(() => {
    async function load() {
      const { data, error } = await loadInvoiceByToken(token);
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const fd = mergeInvoiceFormData(data.form_data);
      setFormData(fd);
      setTemplateId(data.template_id || "classic");
      setHasAddendum(data.has_addendum || false);
      setInvoiceNumber(data.invoice_number || "");

      // Extract agency name for messaging
      if (fd.agency?.agencyName) {
        setAgencyName(fd.agency.agencyName);
      }

      // ─── 1. MSA Status Check (Zero-Trust) ───
      // We use msa_status as the primary source of truth.
      const status = data.msa_status || data.msa_response || "pending";
      setMsaResponse(status);

      // If status is pending, we MUST show the gate.
      if (status === "pending" || status === "negotiating") {
        setMsaRequired(true);
        
        // Load custom MSA if it exists, otherwise we'll show defaults
        if (data.msa_id) {
          const msaContent = await loadMsaForSharedInvoice(data.id, data.msa_id);
          if (msaContent) setMsaData(msaContent);
        }
      } else {
        setMsaRequired(false);
      }

      // ─── 2. Telemetry (Track View) ───
      fetch("/api/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          invoiceId: data.id, 
          userAgent: navigator.userAgent 
        }),
      }).catch(err => console.error("Telemetry failed:", err));

      setLoading(false);
    }

    load();
  }, [token]);

  const handleMsaRespond = async (response: "accepted" | "rejected") => {
    setMsaSubmitting(true);
    try {
      const res = await fetch("/api/msa-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken: token, response }),
      });
      
      if (res.ok) {
        setMsaResponse(response);
        if (response === "accepted") {
          setMsaRequired(false);
        }
      } else {
        const err = await res.json();
        console.error("MSA_RESPONSE_ERROR:", err.error);
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error("MSA_RESPONSE_FETCH_ERROR:", err);
      alert("Failed to send response. Please check your connection.");
    } finally {
      setMsaSubmitting(false);
    }
  };

  const handleProposeChanges = async () => {
    if (!proposalText.trim() || !formData) return;
    setMsaSubmitting(true);

    try {
      const res = await fetch("/api/msa-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          shareToken: token, 
          response: "negotiating", 
          note: proposalText 
        }),
      });
      
      if (res.ok) {
        setMsaResponse("negotiating");
        setShowProposalForm(false);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error("MSA_PROPOSAL_ERROR:", err);
      alert("Failed to send proposal.");
    } finally {
      setMsaSubmitting(false);
    }
  };

  /* ─── Loading ──────────────────────────────────────── */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)]">
        <MotionReveal preset="fade-up">
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-default)] bg-white p-6 shadow-lg">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
              <DocumentSparkIcon className="h-5 w-5 text-[color:var(--text-secondary)]" />
            </span>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Loading invoice…
            </p>
          </div>
        </MotionReveal>
      </main>
    );
  }

  /* ─── Not Found ────────────────────────────────────── */

  if (notFound || !formData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)]">
        <MotionReveal preset="fade-up">
          <div className="mx-4 max-w-md rounded-xl border border-[color:var(--border-default)] bg-white p-8 text-center shadow-lg">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">
              Invoice Not Found
            </h1>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              This invoice link may have expired or is invalid.
            </p>
            <Link
              href="/"
              className={`mt-5 inline-block ${getAppButtonClass({ variant: "primary", size: "sm" })}`}
            >
              Go to Lance
            </Link>
          </div>
        </MotionReveal>
      </main>
    );
  }

  /* ─── MSA Rejected ─────────────────────────────────── */

  if (msaResponse === "rejected") {
    return (
      <main className="min-h-screen bg-[color:var(--bg-canvas)] py-8">
        <div className="mx-auto mb-6 flex max-w-2xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </Link>
        </div>

        <MotionReveal preset="fade-up">
          <div className="mx-auto max-w-md px-4">
            <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-8 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
                <svg
                  className="h-7 w-7 text-amber-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h1 className="text-lg font-bold text-[color:var(--text-primary)]">
                MSA Declined
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                <strong>{agencyName}</strong> has been notified of your
                decision. They will contact you soon to discuss the terms.
              </p>
              <p className="mt-4 text-xs text-[color:var(--text-muted)]">
                If you declined by mistake, please contact the agency directly.
              </p>
            </div>
          </div>
        </MotionReveal>
      </main>
    );
  }

  /* ─── MSA Negotiating (New Loop) ───────────────────── */

  if (msaResponse === "negotiating") {
    return (
      <main className="min-h-screen bg-[color:var(--bg-canvas)] py-8">
        <div className="mx-auto mb-6 flex max-w-2xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </Link>
        </div>

        <MotionReveal preset="fade-up">
          <div className="mx-auto max-w-md px-4">
            <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-8 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 border border-cyan-200">
                <svg
                  className="h-7 w-7 text-cyan-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>

              <h1 className="text-lg font-bold text-[color:var(--text-primary)]">
                Proposal Sent
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                Your proposed changes have been sent to{" "}
                <strong>{agencyName}</strong> for review.
              </p>
              <p className="mt-4 text-xs text-[color:var(--text-muted)]">
                The agency will contact you shortly to confirm the updated
                terms.
              </p>
            </div>
          </div>
        </MotionReveal>
      </main>
    );
  }

  /* ─── MSA Gate (pending) ───────────────────────────── */

  if (msaRequired && msaResponse === "pending") {
    return (
      <main className="min-h-screen bg-[color:var(--bg-canvas)] py-8">
        {/* Branding header */}
        <div className="mx-auto mb-6 flex max-w-2xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </Link>
        </div>

        <MotionReveal preset="fade-up">
          <div className="mx-auto max-w-2xl px-4">
            <div className="rounded-xl border border-[color:var(--border-default)] bg-white shadow-lg overflow-hidden">
              {/* MSA Header */}
              <div className="border-b border-[color:var(--border-subtle)] bg-gradient-to-r from-[color:var(--color-lime-50)] to-white px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-lime-100)]">
                    <DocumentSparkIcon className="h-5 w-5 text-[color:var(--color-lime-700)]" />
                  </span>
                  <div>
                    <h1 className="text-lg font-bold text-[color:var(--text-primary)]">
                      Master Service Agreement
                    </h1>
                    <p className="text-sm text-[color:var(--text-secondary)]">
                      Review the terms below before viewing the invoice from{" "}
                      <strong>{agencyName}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* MSA Content */}
              <div className="px-6 py-5">
                {msaData ? (
                  <>
                    <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
                      {msaData.title}
                    </h2>
                    <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--text-secondary)]">
                        {msaData.content}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-5">
                    <h2 className="text-sm font-bold text-[color:var(--text-primary)] uppercase tracking-wider mb-3">Standard Terms & Conditions</h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded bg-white border border-[color:var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold">1</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Payment Terms (Net {formData.client.msaPaymentTermsDays || 15})</p>
                          <p className="text-[13px] text-[color:var(--text-secondary)] mt-0.5">
                            Full payment is due within {formData.client.msaPaymentTermsDays || 15} days from the invoice date. 
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded bg-white border border-[color:var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold">2</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Late Fee Protection ({formData.client.msaLateFeeRate || 1.5}% {formData.client.msaLateFeeUnit || 'monthly'})</p>
                          <p className="text-[13px] text-[color:var(--text-secondary)] mt-0.5">
                            Late payments will accrue a simple interest fee of {formData.client.msaLateFeeRate || 1.5}% per {formData.client.msaLateFeeUnit || 'month'} until the balance is settled.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded bg-white border border-[color:var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold">3</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Intellectual Property</p>
                          <p className="text-[13px] text-[color:var(--text-secondary)] mt-0.5">
                            Copyright and ownership transfer {formData.client.msaIpTriggerType?.replace(/_/g, ' ') || 'upon full payment'} of the invoice.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-[color:var(--border-subtle)]">
                      <p className="text-[12px] italic text-[color:var(--text-muted)]">
                        These terms are electronically generated for Invoice {invoiceNumber} and are legally binding upon acceptance.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Project Addendum Section */}
              {hasAddendum && (
                <div className="border-t border-amber-100 bg-amber-50/30 px-6 py-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                      !
                    </span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-amber-900">
                        Project Addendum for Invoice #{invoiceNumber}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-amber-800">
                        The following terms deviate from your Master Service
                        Agreement for this specific project only:
                      </p>

                      <ul className="mt-3 space-y-2">
                        {formData.meta.paymentTerms && (
                          <li className="flex items-center gap-2 text-[12px] font-medium text-amber-900">
                            <span className="h-1 w-1 rounded-full bg-amber-400" />
                            Payment Terms:{" "}
                            <span className="font-bold underline decoration-amber-300 underline-offset-2">
                              {formData.meta.paymentTerms}
                            </span>
                          </li>
                        )}
                        {formData.payment.license?.licenseType && (
                          <li className="flex items-center gap-2 text-[12px] font-medium text-amber-900">
                            <span className="h-1 w-1 rounded-full bg-amber-400" />
                            Licensing:{" "}
                            <span className="font-bold underline decoration-amber-300 underline-offset-2">
                              {formData.payment.license.licenseType.replace(
                                /-/g,
                                " ",
                              )}
                            </span>
                          </li>
                        )}
                        {formData.payment.notes && (
                          <li className="flex items-start gap-2 text-[12px] font-medium text-amber-900">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                            <span>
                              Additional Notes:{" "}
                              <span className="font-bold">
                                {formData.payment.notes}
                              </span>
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action footer — Accept or Propose Changes */}
              <div className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-6 py-4">
                <p className="mb-3 text-xs text-[color:var(--text-muted)]">
                  By clicking &quot;Accept&quot;, you agree to the terms
                  outlined above. If you have specific change requests, click
                  &quot;Propose Changes&quot; to notify the agency.
                </p>

                {!showProposalForm ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleMsaRespond("accepted")}
                      disabled={msaSubmitting}
                      className={getAppButtonClass({
                        variant: "primary",
                        size: "md",
                      })}
                    >
                      {msaSubmitting
                        ? "Processing…"
                        : hasAddendum
                          ? "Accept MSA & Addendum"
                          : "Accept MSA"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProposalForm(true)}
                      disabled={msaSubmitting}
                      className={getAppButtonClass({
                        variant: "secondary",
                        size: "md",
                      })}
                    >
                      Propose Changes
                    </button>
                    {msaData && (
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob(
                            [`${msaData.title}\n\n${msaData.content}`],
                            { type: "text/plain" },
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `MSA_${agencyName.replace(/\s+/g, "_")}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className={getAppButtonClass({
                          variant: "ghost",
                          size: "md",
                        })}
                      >
                        ↓ Download MSA
                      </button>
                    )}
                  </div>
                ) : (
                  <MotionReveal preset="fade-up" delay={0}>
                    <div className="space-y-3">
                      <textarea
                        value={proposalText}
                        onChange={(e) => setProposalText(e.target.value)}
                        placeholder="Describe the terms you would like to change (e.g. 'Requesting Net 30 instead of Net 15')..."
                        className="w-full rounded-lg border border-[color:var(--border-subtle)] bg-white p-3 text-sm text-[color:var(--text-primary)] focus:border-[color:var(--color-lime-400)] focus:ring-1 focus:ring-[color:var(--color-lime-400)] min-h-[100px]"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleProposeChanges}
                          disabled={msaSubmitting || !proposalText.trim()}
                          className={getAppButtonClass({
                            variant: "primary",
                            size: "sm",
                          })}
                        >
                          {msaSubmitting ? "Sending…" : "Send Proposal"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowProposalForm(false)}
                          disabled={msaSubmitting}
                          className={getAppButtonClass({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </MotionReveal>
                )}
              </div>
            </div>

            {/* Blurred invoice preview (tease) */}
            <div className="relative mt-6 overflow-hidden rounded-lg">
              <div className="pointer-events-none select-none blur-[12px] scale-[1.02] opacity-60">
                <div className="rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5">
                  <TemplateRenderer
                    formData={formData}
                    templateId={templateId}
                  />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[2px]">
                <div className="rounded-full border border-[color:var(--border-default)] bg-white px-5 py-2.5 shadow-md">
                  <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
                    Accept the MSA above to view this invoice
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MotionReveal>
      </main>
    );
  }

  /* ─── Invoice View (MSA accepted or no MSA required) ── */

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { background: white !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .invoice-sheet { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      <main className="min-h-screen bg-[color:var(--bg-canvas)] py-8 print:bg-white print:py-0">
        {/* Minimal branding header */}
        <div className="mx-auto mb-5 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {msaResponse === "accepted" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--state-success-text)]">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {hasAddendum ? "MSA & Addendum Accepted" : "MSA Accepted"}
              </span>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className={getAppButtonClass({
                variant: "secondary",
                size: "sm",
              })}
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Invoice Sheet */}
        <MotionReveal
          className="invoice-sheet mx-auto w-full max-w-[210mm] rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5 shadow-[var(--app-floating-shadow)] sm:px-7 sm:py-6 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none"
          preset="scale-in"
        >
          <TemplateRenderer formData={formData} templateId={templateId} />
        </MotionReveal>

        {/* Footer */}
        <p className="mx-auto mt-6 max-w-[210mm] px-4 text-center text-xs text-[color:var(--text-muted)] print:hidden">
          Generated with Lance — Smart Invoice Generator for Indian Freelancers
        </p>
      </main>
    </>
  );
}
