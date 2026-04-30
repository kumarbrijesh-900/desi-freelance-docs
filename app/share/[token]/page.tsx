"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
import TemplateRenderer from "@/lib/templates/renderer";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon } from "@/components/ui/app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";
import { PrinterIcon } from "@/components/ui/app-icons";

export default function PublicInvoiceSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [formData, setFormData] = useState<InvoiceFormData | null>(null);
  const [templateId, setTemplateId] = useState("classic");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadInvoice() {
      try {
        // Fetch invoice using the public/anon client as requested
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("share_token", token)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setFormData(mergeInvoiceFormData(data.form_data));
        setTemplateId(data.template_id || "classic");
        setInvoiceNumber(data.invoice_number || "");
      } catch (err) {
        console.error("LOAD_ERROR:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [token]);

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

  if (notFound || !formData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)]">
        <MotionReveal preset="fade-up">
          <div className="mx-4 max-w-md rounded-xl border border-[color:var(--border-default)] bg-white p-8 text-center shadow-lg">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">
              Invoice Not Found
            </h1>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Invoice not found or link expired.
            </p>
          </div>
        </MotionReveal>
      </main>
    );
  }

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
        <div className="mx-auto mb-10 flex max-w-[210mm] items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            <PrinterIcon className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        {/* Read-only Invoice Sheet */}
        <MotionReveal
          className="invoice-sheet mx-auto w-full max-w-[210mm] rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5 shadow-[var(--app-floating-shadow)] sm:px-7 sm:py-6 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none mb-12"
          preset="scale-in"
        >
          <TemplateRenderer formData={formData} templateId={templateId} />
        </MotionReveal>

        <p className="mx-auto text-center text-xs text-[color:var(--text-muted)] print:hidden">
          Invoice #{invoiceNumber} • Read-only client view
        </p>
      </main>
    </>
  );
}
