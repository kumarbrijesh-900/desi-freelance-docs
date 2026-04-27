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
import { getAppButtonClass, cn } from "@/lib/ui-foundation";
import { prepareTemplateData } from "@/lib/templates/template-data";
import { DownloadIcon, PrinterIcon } from "@/components/ui/app-icons";

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
  const [msaResponse, setMsaResponse] = useState<MsaResponse>("PENDING");
  const [msaData, setMsaData] = useState<MsaData | null>(null);
  const [msaSubmitting, setMsaSubmitting] = useState(false);

  // Negotiation state
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalText, setProposalText] = useState("");

  // Agency name for rejection message
  const [agencyName, setAgencyName] = useState("The agency");

  const loadInvoice = async () => {
    try {
      const res = await fetch(`/api/invoice/${token}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const fd = mergeInvoiceFormData(data.form_data);
      setFormData(fd);
      setTemplateId(data.template_id || "classic");
      setHasAddendum(data.has_addendum || false);
      setInvoiceNumber(data.invoice_number || "");

      if (fd.agency?.agencyName) {
        setAgencyName(fd.agency.agencyName);
      }

      const status = data.msa_status || data.msa_response || "PENDING";
      setMsaResponse(status as MsaResponse);

      if (status === "PENDING" || status === "REVISION ASKED") {
        setMsaRequired(true);
        if (data.msa_id) {
          const msaContent = await loadMsaForSharedInvoice(data.id, data.msa_id);
          if (msaContent) setMsaData(msaContent);
        }
      } else {
        setMsaRequired(false);
      }

      // Telemetry
      fetch("/api/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          invoiceId: data.id, 
          userAgent: navigator.userAgent 
        }),
      }).catch(err => console.error("Telemetry failed:", err));
    } catch (err) {
      console.error("LOAD_ERROR:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [token]);

  const handleMsaRespond = async (response: "ACCEPTED" | "REVISION ASKED") => {
    setMsaSubmitting(true);
    try {
      const res = await fetch("/api/msa-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken: token, response }),
      });
      
      if (res.ok) {
        setMsaResponse(response);
        if (response === "ACCEPTED") {
          setMsaRequired(false);
          // Smooth reveal by re-fetching data
          await loadInvoice();
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
          response: "REVISION ASKED", 
          note: proposalText 
        }),
      });
      
      if (res.ok) {
        setMsaResponse("REVISION ASKED");
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

  if (msaResponse === "REVISION ASKED") {
    return (
      <main className="min-h-screen bg-[color:var(--bg-canvas)] px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto mb-6 flex max-w-2xl items-center">
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
                MSA Revision Requested
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                <strong>{agencyName}</strong> has been notified of your
                decision. They will contact you soon to discuss the terms.
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

  if (msaRequired && msaResponse === "PENDING") {
    return (
      <main className="min-h-screen bg-[color:var(--bg-canvas)] px-4 py-8 md:px-6 md:py-12">
        {/* Branding header */}
        <div className="mx-auto mb-6 flex max-w-2xl items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </Link>
        </div>

        {/* Hero Total Amount Section (Visible during MSA Gate) */}
        <div className="mx-auto mb-10 max-w-2xl text-left md:mb-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            Invoice Total Amount
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tighter text-[color:var(--text-primary)] md:text-6xl">
            {prepareTemplateData(formData).grandTotalFormatted}
          </h2>
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
                      onClick={() => handleMsaRespond("ACCEPTED")}
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
                        variant: "ghost",
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

      <main className="min-h-screen bg-[color:var(--bg-canvas)] px-4 py-8 md:px-6 md:py-12 print:bg-white print:p-0">
        <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between print:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            {msaResponse === "ACCEPTED" && (
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

        {/* Hero Total Amount Section */}
        <div className="mx-auto mb-10 max-w-[210mm] text-left md:mb-16 print:hidden">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            Total Amount Due
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tighter text-[color:var(--text-primary)] md:text-6xl lg:text-7xl">
            {prepareTemplateData(formData).grandTotalFormatted}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-[color:var(--border-subtle)] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[color:var(--color-lime-500)] animate-pulse" />
              <span className="text-xs font-bold text-[color:var(--text-secondary)]">Awaiting Settlement</span>
            </div>
            <p className="text-xs text-[color:var(--text-muted)]">
              Invoice #{invoiceNumber} • Due {formData.meta.dueDate || "on receipt"}
            </p>
            {formData.lineItems.some(i => i.is_milestone_header) && (
              <p className="text-[11px] font-bold text-[color:var(--color-lime-700)] bg-[color:var(--color-lime-50)] px-3 py-1 rounded-full border border-[color:var(--color-lime-200)]">
                ★ PLEASE PAY RELEVANT MILESTONE SUBTOTAL
              </p>
            )}
          </div>
        </div>

        {/* Invoice Sheet */}
        <MotionReveal
          className="invoice-sheet mx-auto w-full max-w-[210mm] rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5 shadow-[var(--app-floating-shadow)] sm:px-7 sm:py-6 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none mb-24"
          preset="scale-in"
        >
          <TemplateRenderer formData={formData} templateId={templateId} />
        </MotionReveal>

        {/* Sticky Mobile Action Bar */}
        <div className="fixed bottom-6 left-1/2 z-[100] w-[calc(100%-2rem)] -translate-x-1/2 px-4 md:static md:bottom-auto md:left-auto md:mt-8 md:w-auto md:translate-x-0 md:px-0 print:hidden">
          <div className="flex items-center gap-3 rounded-full border border-[color:var(--border-default)] bg-white/90 p-2 shadow-2xl backdrop-blur-xl md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <button
              type="button"
              onClick={() => window.print()}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full bg-[#bfff00] py-3.5 text-sm font-black text-black shadow-lg transition-all duration-100 hover:bg-[#bfff00]/90 active:scale-[0.97] active:bg-[#9acc00] md:hidden"
              )}
            >
              <DownloadIcon className="h-4 w-4" />
              Download PDF Invoice
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={cn(
                getAppButtonClass({ variant: "secondary", size: "md" }),
                "hidden md:flex items-center gap-2 rounded-full px-8"
              )}
            >
              <PrinterIcon className="h-4 w-4" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mx-auto mt-6 max-w-[210mm] px-4 text-center text-xs text-[color:var(--text-muted)] print:hidden">
          Generated with Lance — Smart Invoice Generator for Indian Freelancers
        </p>
      </main>
    </>
  );
}
