"use client";

import { InvoiceFormData } from "@/types/invoice";
import TemplateRenderer from "@/lib/templates/renderer";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { PrinterIcon } from "@/components/ui/app-icons";
import { cn } from "@/lib/ui-foundation";
import MSAAcceptanceModal from "@/components/invoice/share/MSAAcceptanceModal";
import { prepareTemplateData } from "@/lib/templates/template-data";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SharedMsaPreviewContentProps {
  invoice: {
    id: string;
    formData: InvoiceFormData;
    templateId: string;
    invoiceNumber: string;
    isChildInvoice: boolean;
    parentMsaAcceptedOn: string | null;
    msaStatus: string;
    msaResponse: string | null;
  };
  msaTerms: { title: string; content: string } | null;
  addendum: { paymentTerms?: string; notes?: string } | null;
  mode: "client" | "agency-preview";
  onAcceptClick?: () => void;
  isSubmittingMsa?: boolean;
  onProposeChanges?: (note: string) => Promise<void>;
}

export default function SharedMsaPreviewContent({
  invoice,
  msaTerms,
  addendum,
  mode,
  onAcceptClick,
  isSubmittingMsa = false,
  onProposeChanges,
}: SharedMsaPreviewContentProps) {
  const {
    id,
    formData,
    templateId,
    invoiceNumber,
    isChildInvoice,
    parentMsaAcceptedOn,
    msaStatus,
    msaResponse,
  } = invoice;

  const router = useRouter();

  const templateData = formData ? prepareTemplateData(formData) : null;
  const currencySymbol = templateData?.displayCurrency === "USD" ? "$" : "₹";
  const formattedTotal = templateData?.grandTotalFormatted?.replace(/[₹$]/, "") || "0";

  const [previewDismissed, setPreviewDismissed] = useState(false);
  const showMsaOverlay = msaStatus !== "accepted" && msaStatus !== "ACCEPTED" && !previewDismissed;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { background: white !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-sheet { break-inside: avoid; page-break-inside: avoid; transform: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-[#F5F5F8] px-4 py-8 md:px-6 md:py-12 print:bg-white print:p-0">
        <div className={cn(
          "mx-auto mb-10 flex max-w-[210mm] items-center justify-between print:hidden",
          showMsaOverlay && "opacity-20 pointer-events-none"
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
          <div className="flex items-center gap-3">
            {mode === "agency-preview" && (
              <button
                type="button"
                onClick={() => router.push(`/dashboard?invoiceId=${id}`)}
                className="border-2 border-[#111118] bg-[#FFD700] px-5 py-2.5 text-[13px] font-bold uppercase text-[#111118] shadow-[4px_4px_0_#111118] hover:bg-[#FFED4A] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Close Preview
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="border-2 border-[#111118] bg-white px-5 py-2.5 text-[13px] font-bold uppercase text-[#111118] shadow-[var(--brutal-shadow-sm)]"
            >
              <PrinterIcon className="h-4 w-4 inline mr-2" />
              Download PDF
            </button>
          </div>
        </div>

        {/* ── Payment Summary Banner ── */}
        <div className={cn(
          "mx-auto mb-6 max-w-[210mm] print:hidden",
          showMsaOverlay && "opacity-20 pointer-events-none"
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
          showMsaOverlay && "blur-2xl pointer-events-none select-none opacity-40 scale-[0.98]"
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
          showMsaOverlay && "opacity-0"
        )}>
          Invoice #{invoiceNumber} • Shared via Lance
        </div>

        {showMsaOverlay && msaTerms && (
          <MSAAcceptanceModal
            invoiceNumber={invoiceNumber}
            agencyName={formData.agency?.agencyName || "The Freelancer"}
            msaTitle={msaTerms.title}
            msaContent={msaTerms.content}
            paymentTerms={addendum?.paymentTerms}
            addendumNotes={addendum?.notes}
            isSubmitting={isSubmittingMsa}
            msaStatus={msaStatus}
            msaResponseText={msaResponse}
            onAccept={onAcceptClick || (() => {})}
            onPropose={mode === "client" ? onProposeChanges : undefined}
            previewMode={mode === "agency-preview"}
            onClosePreview={() => setPreviewDismissed(true)}
          />
        )}
      </main>
    </>
  );
}
