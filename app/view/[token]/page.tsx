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
  acceptMsaOnInvoice,
} from "@/lib/supabase/invoices";
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

  // MSA gating state
  const [msaRequired, setMsaRequired] = useState(false);
  const [msaAccepted, setMsaAccepted] = useState(false);
  const [msaData, setMsaData] = useState<MsaData | null>(null);
  const [msaAccepting, setMsaAccepting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await loadInvoiceByToken(token);
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setFormData(mergeInvoiceFormData(data.form_data));
      setTemplateId(data.template_id || "classic");

      // Check MSA gating
      if (data.msa_id && !data.msa_accepted_at) {
        setMsaRequired(true);
        // Load MSA content for display
        const msa = await loadMsaForSharedInvoice(data.id, data.msa_id);
        if (msa) {
          setMsaData(msa);
        }
      } else if (data.msa_id && data.msa_accepted_at) {
        setMsaAccepted(true);
      }

      // Record the view (fire-and-forget)
      recordView(data.id, navigator.userAgent);
      setLoading(false);
    }

    load();
  }, [token]);

  const handleAcceptMsa = async () => {
    setMsaAccepting(true);
    const { error } = await acceptMsaOnInvoice(token);
    if (!error) {
      setMsaRequired(false);
      setMsaAccepted(true);
    }
    setMsaAccepting(false);
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

  /* ─── MSA Gate ─────────────────────────────────────── */

  if (msaRequired && !msaAccepted) {
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
              {/* Header */}
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
                      Please review and accept before viewing the invoice.
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
                  <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-4">
                    <p className="text-sm text-[color:var(--text-muted)]">
                      The service provider has attached an MSA to this invoice.
                      Please accept to continue.
                    </p>
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-[color:var(--text-muted)]">
                    By clicking &quot;Accept&quot;, you agree to the terms outlined above.
                  </p>
                  <button
                    type="button"
                    onClick={handleAcceptMsa}
                    disabled={msaAccepting}
                    className={getAppButtonClass({ variant: "primary", size: "md" })}
                  >
                    {msaAccepting ? "Accepting…" : "Accept & View Invoice"}
                  </button>
                </div>
              </div>
            </div>

            {/* Blurred invoice preview (tease) */}
            <div className="relative mt-6 overflow-hidden rounded-lg">
              <div className="pointer-events-none select-none blur-[12px] scale-[1.02] opacity-60">
                <div className="rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5">
                  <TemplateRenderer formData={formData} templateId={templateId} />
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
            {msaAccepted && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--state-success-text)]">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                MSA Accepted
              </span>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className={getAppButtonClass({ variant: "secondary", size: "sm" })}
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
