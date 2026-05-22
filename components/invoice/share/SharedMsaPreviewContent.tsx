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
import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileCheck2,
  Landmark,
  QrCode,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

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
  const normalizedMsaStatus = (msaStatus || "").toLowerCase();
  const isTermsAccepted = normalizedMsaStatus === "accepted";
  const isTermsProposed = normalizedMsaStatus === "proposed";
  const showMsaOverlay = !isTermsAccepted && !previewDismissed;
  const trustState = isChildInvoice
    ? {
        label: "Agreement inherited",
        detail: parentMsaAcceptedOn
          ? `Covered by the parent agreement accepted on ${parentMsaAcceptedOn}.`
          : "Covered by the previously accepted parent agreement.",
        tone: "success" as const,
      }
    : isTermsAccepted
      ? {
          label: "Terms accepted",
          detail: "This invoice is active and ready for payment.",
          tone: "success" as const,
        }
      : isTermsProposed
        ? {
            label: "Changes requested",
            detail: "The freelancer needs to review your requested terms before payment.",
            tone: "warning" as const,
          }
        : {
            label: "Terms review required",
            detail: "Review and accept the agreement to unlock the invoice for payment.",
            tone: "warning" as const,
          };
  const paymentStateLabel = isTermsAccepted || isChildInvoice ? "Payment ready" : "Payment locked";
  const paymentStateDetail =
    isTermsAccepted || isChildInvoice
      ? "Use the bank or QR details inside the invoice."
      : "Payment details unlock after terms are accepted.";
  const dueDateLabel = templateData?.dueDate && templateData.dueDate !== "—" ? templateData.dueDate : "Not specified";
  const paymentTermsLabel = addendum?.paymentTerms || templateData?.paymentTerms || "Standard terms";
  const paymentRows = [
    { label: "Account name", value: templateData?.accountName },
    { label: "Bank", value: templateData?.bankName },
    { label: "Account number", value: templateData?.accountNumber },
    { label: "IFSC", value: templateData?.ifscCode },
    { label: "SWIFT / BIC", value: templateData?.swiftBicCode },
    { label: "IBAN / Routing", value: templateData?.ibanRoutingCode },
  ].filter((row) => Boolean(row.value));
  const hasPaymentCheckpoint = isTermsAccepted || isChildInvoice;

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

        {/* ── Client Trust Summary ── */}
        <div className={cn(
          "mx-auto mb-6 max-w-[210mm] print:hidden",
          showMsaOverlay && "opacity-20 pointer-events-none"
        )}>
          <div className="overflow-hidden border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)]">
            <div className="flex flex-col gap-4 border-b-2 border-[#111118] bg-[#FFFBE6] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Client invoice summary
                </p>
                <p className="mt-1 text-[15px] font-black text-[#111118]">
                  Invoice {invoiceNumber || templateData?.invoiceNumber || "—"} from {formData.agency?.agencyName || "the freelancer"}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Amount Due
                </p>
                <p className="text-2xl font-black text-[#111118]">
                  {currencySymbol}{formattedTotal}
                </p>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-3">
              <div className="border-b-2 border-[#111118] p-4 md:border-b-0 md:border-r-2">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#111118]",
                      trustState.tone === "success" ? "bg-[#EBFDF9] text-[#007A63]" : "bg-[#FFFBE6] text-[#B45309]",
                    )}
                    aria-hidden="true"
                  >
                    {trustState.tone === "success" ? (
                      <ShieldCheck className="h-5 w-5" strokeWidth={2.3} />
                    ) : (
                      <Clock3 className="h-5 w-5" strokeWidth={2.3} />
                    )}
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      Agreement
                    </p>
                    <p className="mt-1 text-[13px] font-black text-[#111118]">{trustState.label}</p>
                    <p className="mt-1 text-[12px] font-medium leading-5 text-[color:var(--text-secondary)]">
                      {trustState.detail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-b-2 border-[#111118] p-4 md:border-b-0 md:border-r-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#E0F3FF] text-[#164E63]" aria-hidden="true">
                    <CreditCard className="h-5 w-5" strokeWidth={2.3} />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      Payment
                    </p>
                    <p className="mt-1 text-[13px] font-black text-[#111118]">{paymentStateLabel}</p>
                    <p className="mt-1 text-[12px] font-medium leading-5 text-[color:var(--text-secondary)]">
                      {paymentTermsLabel} · Due {dueDateLabel}. {paymentStateDetail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#F5F5F0] text-[#111118]" aria-hidden="true">
                    <FileCheck2 className="h-5 w-5" strokeWidth={2.3} />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      Client action
                    </p>
                    <p className="mt-1 text-[13px] font-black text-[#111118]">
                      {isTermsAccepted || isChildInvoice ? "Download or pay" : isTermsProposed ? "Await reissue" : "Review terms first"}
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-5 text-[color:var(--text-secondary)]">
                      {isTermsAccepted || isChildInvoice
                        ? "Save a PDF copy and settle using the invoice instructions."
                        : isTermsProposed
                          ? "Your note has been sent. The invoice remains locked."
                          : "Accept terms or request changes before payment."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {(isTermsAccepted || isChildInvoice) && (
              <div className="flex flex-col gap-3 border-t-2 border-[#111118] bg-[#F8F8F4] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] font-bold text-[#111118]">
                  Keep this invoice for your records before making payment.
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 border-2 border-[#111118] bg-[#BEFF00] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#111118] shadow-[2px_2px_0_#111118] transition-all hover:-translate-y-0.5"
                >
                  <Download className="h-4 w-4" strokeWidth={2.4} />
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {!showMsaOverlay && (
          <div className="mx-auto mb-4 max-w-[210mm] print:hidden">
            <div className="flex items-center gap-2.5 border-2 border-[#111118] bg-[#EBFDF9] px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#007A63]" strokeWidth={2.5} />
              <p className="text-sm font-semibold text-[#007A63]">
                {isChildInvoice
                  ? "This milestone invoice is covered by an accepted agreement."
                  : "Terms are accepted. The invoice is active and ready for payment."}
              </p>
            </div>
          </div>
        )}

        {hasPaymentCheckpoint && (
          <div className="mx-auto mb-4 max-w-[210mm] print:hidden">
            <div className="overflow-hidden border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)]">
              <div className="flex flex-col gap-3 border-b-2 border-[#111118] bg-[#F8F8F4] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#BEFF00] text-[#111118]" aria-hidden="true">
                    <Banknote className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Payment checkpoint
                    </p>
                    <p className="mt-1 text-[15px] font-black text-[#111118]">
                      Pay {currencySymbol}{formattedTotal} by {dueDateLabel}
                    </p>
                  </div>
                </div>
                <div className="border-2 border-[#111118] bg-[#FFFBE6] px-3 py-2 text-left md:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Payment reference
                  </p>
                  <p className="mt-0.5 text-[13px] font-black text-[#111118]">
                    {invoiceNumber || templateData?.invoiceNumber || "Invoice number"}
                  </p>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr_1fr]">
                <div className="border-b-2 border-[#111118] p-4 lg:border-b-0 lg:border-r-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#E0F3FF] text-[#164E63]" aria-hidden="true">
                      <CreditCard className="h-5 w-5" strokeWidth={2.3} />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        Terms
                      </p>
                      <p className="mt-1 text-[13px] font-black text-[#111118]">{paymentTermsLabel}</p>
                      <p className="mt-1 text-[12px] font-medium leading-5 text-[color:var(--text-secondary)]">
                        Payment is expected by {dueDateLabel}. Mention the invoice number while paying.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b-2 border-[#111118] p-4 lg:border-b-0 lg:border-r-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#EBFDF9] text-[#007A63]" aria-hidden="true">
                      <Landmark className="h-5 w-5" strokeWidth={2.3} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        Bank details
                      </p>
                      {paymentRows.length > 0 ? (
                        <dl className="mt-2 grid gap-2">
                          {paymentRows.slice(0, 4).map((row) => (
                            <div key={row.label} className="border-l-2 border-[#111118] pl-2 text-[12px] leading-5">
                              <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{row.label}</dt>
                              <dd className="min-w-0 break-all font-bold text-[#111118]">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-1 text-[12px] font-medium leading-5 text-[color:var(--text-secondary)]">
                          Use the payment details printed inside the invoice.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#F5F5F0] text-[#111118]" aria-hidden="true">
                      {templateData?.hasQrCode ? (
                        <QrCode className="h-5 w-5" strokeWidth={2.3} />
                      ) : (
                        <ReceiptText className="h-5 w-5" strokeWidth={2.3} />
                      )}
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        Confirmation
                      </p>
                      <p className="mt-1 text-[13px] font-black text-[#111118]">
                        {templateData?.hasQrCode ? "QR available" : "Send payment proof"}
                      </p>
                      <p className="mt-1 text-[12px] font-medium leading-5 text-[color:var(--text-secondary)]">
                        {templateData?.hasQrCode
                          ? "Scan the QR in the invoice below and keep a payment receipt."
                          : "After payment, share the bank reference or receipt with the freelancer."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {templateData?.hasNotes && (
                <div className="border-t-2 border-[#111118] bg-[#FFF0EC] px-5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9A3412]">
                    Payment note
                  </p>
                  <p className="mt-1 text-[12px] font-bold leading-5 text-[#9A3412]">
                    {templateData.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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
