"use client";

import { use, useEffect, useState } from "react";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
import TemplateRenderer from "@/lib/templates/renderer";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon } from "@/components/ui/app-icons";
import { loadInvoiceByToken, recordView } from "@/lib/supabase/invoices";
import Link from "next/link";
import { getAppButtonClass } from "@/lib/ui-foundation";

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

      // Record the view (fire-and-forget)
      recordView(data.id, navigator.userAgent);
      setLoading(false);
    }

    load();
  }, [token]);

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

  /* ─── Invoice View ─────────────────────────────────── */

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
          <button
            type="button"
            onClick={() => window.print()}
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            Print / Save PDF
          </button>
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
