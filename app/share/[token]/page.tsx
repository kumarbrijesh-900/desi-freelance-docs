"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
import TemplateRenderer from "@/lib/templates/renderer";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon } from "@/components/ui/app-icons";
import { getAppButtonClass, cn } from "@/lib/ui-foundation";
import { PrinterIcon } from "@/components/ui/app-icons";
import MSAAcceptanceModal from "@/components/invoice/share/MSAAcceptanceModal";
import { loadMsaForSharedInvoice } from "@/lib/supabase/invoices";
import { prepareTemplateData } from "@/lib/templates/template-data";

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
  
  // MSA Gate state
  const [msaStatus, setMsaStatus] = useState<string>("ACCEPTED");
  const [msaData, setMsaData] = useState<{ title: string; content: string } | null>(null);
  const [isSubmittingMsa, setIsSubmittingMsa] = useState(false);
  const [isChildInvoice, setIsChildInvoice] = useState(false);
  const [parentMsaAcceptedOn, setParentMsaAcceptedOn] = useState<string | null>(null);
  const [showAcceptedToast, setShowAcceptedToast] = useState(false);

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

        const fd = mergeInvoiceFormData(data.form_data);
        setFormData(fd);
        setTemplateId(data.template_id || "classic");
        setInvoiceNumber(data.invoice_number || "");
        
        // Check if this is a child milestone invoice
        if (data.parent_invoice_id) {
          // Child invoice: skip MSA gate, look up when parent MSA was accepted
          setIsChildInvoice(true);
          setMsaStatus("accepted");

          // Fetch parent invoice's msa_responded_at for the banner
          const { data: parentInvoice } = await supabase
            .from("invoices")
            .select("msa_responded_at, milestone_index")
            .eq("id", data.parent_invoice_id)
            .single();

          if (parentInvoice?.msa_responded_at) {
            const acceptedDate = new Date(parentInvoice.msa_responded_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            setParentMsaAcceptedOn(acceptedDate);
          }
        } else {
          // Standard invoice: normal MSA gate flow
          const currentMsaStatus = data.msa_response || "accepted";
          setMsaStatus(currentMsaStatus);

          // Load MSA content if pending
          if (currentMsaStatus === "pending" && data.msa_id) {
            const msa = await loadMsaForSharedInvoice(data.id, data.msa_id);
            if (msa) setMsaData(msa);
          }
        }
      } catch (err) {
        console.error("LOAD_ERROR:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [token]);

  const handleAcceptMsa = async () => {
    setIsSubmittingMsa(true);
    try {
      // Direct update as requested by the prompt instructions
      const { error } = await supabase
        .from("invoices")
        .update({ 
          msa_response: 'accepted',
          msa_responded_at: new Date().toISOString(),
        })
        .eq("share_token", token);

      if (error) {
        console.error("Supabase Update Error:", error);
        alert("Failed to accept terms. Please try again.");
        return;
      }

      // Success: Reveal the invoice
      setMsaStatus("accepted");
      setShowAcceptedToast(true);
    } catch (err) {
      console.error("ACCEPT_ERROR:", err);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmittingMsa(false);
    }
  };

  useEffect(() => {
    if (!showAcceptedToast) return;
    const timer = setTimeout(() => setShowAcceptedToast(false), 4000);
    return () => clearTimeout(timer);
  }, [showAcceptedToast]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)]">
        <MotionReveal preset="fade-up">
          <div className="flex items-center gap-3 border border-[color:var(--border-default)] bg-white p-6 shadow-lg">
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
          <div className="mx-4 max-w-md border border-[color:var(--border-default)] bg-white p-8 text-center shadow-lg">
            <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
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

  const isMsaPending = msaStatus === "pending";

  const templateData = formData ? prepareTemplateData(formData) : null;
  const grandTotal = templateData?.grandTotalRaw || 0;
  const currencySymbol = templateData?.displayCurrency === "USD" ? "$" : "₹";
  const formattedTotal = templateData?.grandTotalFormatted?.replace(/[₹$]/, "") || "0";

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

      <main className="min-h-screen bg-[#F5F5F8] px-4 py-8 md:px-6 md:py-12 print:bg-white print:p-0">
        <div className={cn(
          "mx-auto mb-10 flex max-w-[210mm] items-center justify-between print:hidden",
          isMsaPending && "opacity-20 pointer-events-none"
        )}>
          <a
            href="https://lanceinvoice.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="flex h-7 w-7 items-center justify-center bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="border-2 border-[#111118] bg-white px-5 py-2.5 text-[13px] font-bold uppercase text-[#111118] shadow-[var(--brutal-shadow-sm)]"
          >
            <PrinterIcon className="h-4 w-4 inline mr-2" />
            Download PDF
          </button>
        </div>

        {/* ── Payment Summary Banner ── */}
        <div className={cn(
          "mx-auto mb-6 max-w-[210mm] print:hidden",
          isMsaPending && "opacity-20 pointer-events-none"
        )}>
          <div className="border-2 border-[#111118] bg-[#FFFBE6] px-6 py-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)] mb-1">
              Amount Due
            </p>
            <p className="text-2xl font-black text-[#111118]">
              {currencySymbol}{formattedTotal}
            </p>
            {invoiceNumber && (
              <p className="text-[12px] text-[color:var(--text-muted)] mt-1">
                Invoice {invoiceNumber}
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Status:
              </span>
              <span className="inline-flex items-center border border-[#111118] bg-[#BEFF00] px-3 py-1 text-[11px] font-bold text-[#111118] uppercase">
                Awaiting Payment
              </span>
            </div>
          </div>
        </div>

        {/* ── MSA Previously Accepted Banner (child invoices) ── */}
        {isChildInvoice && (
          <div className="mx-auto mb-4 max-w-[210mm] print:hidden">
            <div className="flex items-center gap-2.5 border-2 border-[#111118] bg-[#FFFBE6] px-4 py-2.5">
              <span className="text-green-600 text-sm">✓</span>
              <p className="text-sm text-green-800">
                <span className="font-semibold">MSA previously accepted</span>
                {parentMsaAcceptedOn && (
                  <span className="text-green-700 font-normal"> — signed on {parentMsaAcceptedOn}</span>
                )}
                . This invoice is covered under the same agreement.
              </p>
            </div>
          </div>
        )}

        {/* Read-only Invoice Sheet */}
        <div className={cn(
          "relative transition-all duration-500",
          isMsaPending && "blur-2xl pointer-events-none select-none opacity-40 scale-[0.98]"
        )}>
          <MotionReveal
            className="invoice-sheet mx-auto w-full max-w-[210mm] border-2 border-[#111118] bg-white px-5 py-5 shadow-[var(--brutal-shadow-lg)] sm:px-7 sm:py-6 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none mb-12"
            preset="scale-in"
          >
            <TemplateRenderer formData={formData} templateId={templateId} />
          </MotionReveal>
        </div>

        <div className={cn(
          "mx-auto border-t-2 border-[#111118] py-4 text-center text-[12px] text-[color:var(--text-muted)] print:hidden max-w-[210mm] mt-8",
          isMsaPending && "opacity-0"
        )}>
          Invoice #{invoiceNumber} • Shared via Lance
        </div>

        {isMsaPending && msaData && (
          <MSAAcceptanceModal
            invoiceNumber={invoiceNumber}
            agencyName={formData.agency?.agencyName || "The Freelancer"}
            msaTitle={msaData.title}
            msaContent={msaData.content}
            paymentTerms={formData.meta?.paymentTerms ? `Net ${formData.meta.paymentTerms}` : undefined}
            addendumNotes={formData.payment?.notes}
            isSubmitting={isSubmittingMsa}
            onAccept={handleAcceptMsa}
          />
        )}

        {showAcceptedToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2.5 border border-green-200 bg-green-50 px-5 py-3 shadow-lg">
              <span className="text-green-600 text-base">✓</span>
              <p className="text-sm font-semibold text-green-800">
                Terms accepted — invoice is now active
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
