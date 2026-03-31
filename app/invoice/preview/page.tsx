"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import {
  getClientFacingTaxComplianceNote,
  getClientTaxIdLabel,
  getEffectiveExportTaxHandling,
  hasExplicitExportTaxChoice,
  isAgencyGstRegistered,
  isInternationalClient,
  requiresExplicitExportTaxChoice,
  shouldShowAgencyGstin,
} from "@/lib/invoice-compliance";
import {
  convertInrToApproximateUsd,
  getInvoiceDisplayCurrency,
} from "@/lib/international-billing-options";
import {
  mergeInvoiceFormData,
  type InvoiceFormData,
} from "@/types/invoice";

const STORAGE_KEY = "invoice-preview-data";
const DRAFT_STORAGE_KEY = "invoice-editor-draft";

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}

function getUnitLabel(unit?: string) {
  if (!unit) return "—";

  const map: Record<string, string> = {
    "per-deliverable": "Per deliverable",
    "per-item": "Per item",
    "per-screen": "Per screen",
    "per-hour": "Per hour",
    "per-day": "Per day",
    "per-revision": "Per revision",
    "per-concept": "Per concept",
    "per-post": "Per post",
    "per-video": "Per video",
    "per-image": "Per image",
  };

  return map[unit] ?? unit;
}

function getLicenseLabel(type?: string) {
  const map: Record<string, string> = {
    "full-assignment": "Full assignment",
    "exclusive-license": "Exclusive license",
    "non-exclusive-license": "Non-exclusive license",
  };

  return type ? map[type] ?? type : "—";
}

function getInvoiceTitle(invoiceNumber?: string) {
  return invoiceNumber?.trim()
    ? `${invoiceNumber.trim()} - Invoice Preview`
    : "Invoice Preview";
}

function getPdfTitle(invoiceNumber?: string) {
  return invoiceNumber?.trim() ? `${invoiceNumber.trim()}.pdf` : "invoice.pdf";
}

function getTaxLineLabel(taxType: "CGST_SGST" | "IGST" | "NONE") {
  switch (taxType) {
    case "CGST_SGST":
      return "CGST + SGST (18%)";
    case "IGST":
      return "IGST (18%)";
    default:
      return "Tax (0%)";
  }
}

export default function InvoicePreviewPage() {
  const [data, setData] = useState<InvoiceFormData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const defaultTitleRef = useRef<string>("");
  const exportTitleRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(mergeInvoiceFormData(JSON.parse(raw)));
      }
    } catch (error) {
      console.error("Failed to read preview data:", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  const clientIsInternational = data
    ? isInternationalClient(data.client)
    : false;
  const agencyIsGstRegistered = data
    ? isAgencyGstRegistered(data.agency)
    : false;
  const requiresExportChoice = data
    ? requiresExplicitExportTaxChoice(data.agency, data.client)
    : false;
  const hasResolvedExportChoice = data
    ? hasExplicitExportTaxChoice(data.agency)
    : false;
  const effectiveExportTaxHandling = data
    ? getEffectiveExportTaxHandling(data.agency)
    : "";
  const displayCurrency = data
    ? getInvoiceDisplayCurrency({
        clientLocation: data.client.clientLocation,
        clientCurrency: data.client.clientCurrency,
      })
    : "INR";

  const computed = useMemo(() => {
    if (!data) {
      return {
        lineItems: [],
        subtotal: 0,
        taxAmount: 0,
        grandTotal: 0,
        totalTax: 0,
        taxType: "NONE" as const,
      };
    }

    const totals = calculateInvoiceTotals({
      lineItems: data.lineItems,
      agencyState: data.agency.agencyState,
      clientState: data.client.clientState,
      isInternational: clientIsInternational,
      gstRegistered: agencyIsGstRegistered,
      lutAvailability: data.agency.lutAvailability,
      noLutTaxHandling: effectiveExportTaxHandling,
    });

    return {
      lineItems: data.lineItems,
      ...totals,
    };
  }, [
    data,
    clientIsInternational,
    agencyIsGstRegistered,
    effectiveExportTaxHandling,
  ]);

  const shouldRenderAgencyGstin = data
    ? shouldShowAgencyGstin(data.agency)
    : false;
  const hasAgencyTax = Boolean(
    shouldRenderAgencyGstin || data?.agency?.pan?.trim()
  );
  const hasClientTaxId = Boolean(data?.client?.clientGstin);
  const hasNotes = Boolean(data?.payment?.notes?.trim());
  const hasDomesticPaymentDetails = Boolean(
    data?.payment?.bankName ||
      data?.payment?.accountName ||
      data?.payment?.accountNumber ||
      data?.payment?.ifscCode
  );
  const hasInternationalPaymentDetails = Boolean(
    data?.payment?.accountName ||
      data?.payment?.bankName ||
      data?.payment?.bankAddress ||
      data?.payment?.accountNumber ||
      data?.payment?.swiftBicCode ||
      data?.payment?.ibanRoutingCode
  );
  const hasLicense = Boolean(data?.payment?.license?.isLicenseIncluded);
  const hasQr = !clientIsInternational && Boolean(data?.payment?.qrCodeUrl);
  const hasBankDetails = clientIsInternational
    ? hasInternationalPaymentDetails
    : hasDomesticPaymentDetails;
  const sectionLabelClass =
    "text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500";
  const metaLabelClass = "text-[10px] uppercase tracking-[0.16em] text-gray-500";
  const documentBlockClass = "avoid-break border border-gray-200 px-4 py-3";
  const compactTextClass = "text-[13px] leading-5 text-gray-700";
  const invoiceNumber = data?.meta?.invoiceNumber;
  const previewTitle = getInvoiceTitle(invoiceNumber);
  const pdfTitle = getPdfTitle(invoiceNumber);
  const hasSupportingDetails = hasNotes || hasLicense;
  const hasPaymentDetails = hasBankDetails || hasQr;
  const taxLineLabel = getTaxLineLabel(computed.taxType);
  const approximateUsdGrandTotal =
    clientIsInternational && !data?.client?.clientCurrency
      ? convertInrToApproximateUsd(computed.grandTotal)
      : null;
  const clientTaxLabel = data ? getClientTaxIdLabel(data.client) : "GSTIN";
  const taxComplianceNote = data
    ? getClientFacingTaxComplianceNote({
        agency: data.agency,
        client: data.client,
        taxType: computed.taxType,
      })
    : "";

  useEffect(() => {
    defaultTitleRef.current = previewTitle;
    document.title = previewTitle;

    return () => {
      if (exportTitleRef.current === null) {
        document.title = previewTitle;
      }
    };
  }, [previewTitle]);

  useEffect(() => {
    const resetTitleAfterPrint = () => {
      exportTitleRef.current = null;
      document.title = defaultTitleRef.current || previewTitle;
    };

    window.addEventListener("afterprint", resetTitleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", resetTitleAfterPrint);
    };
  }, [previewTitle]);

  const handlePrint = () => {
    window.print();
  };

  const handleBackToEdit = () => {
    if (!data) return;

    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData: data,
          currentStep: "totals",
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Failed to store editor draft from preview:", error);
    }
  };

  const handleDownloadPdf = () => {
    exportTitleRef.current = pdfTitle;
    document.title = pdfTitle;
    window.print();

    // Fallback for environments where `afterprint` is unreliable.
    window.setTimeout(() => {
      if (exportTitleRef.current !== null) {
        exportTitleRef.current = null;
        document.title = defaultTitleRef.current || previewTitle;
      }
    }, 0);
  };

  if (!isReady) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-500">Loading preview…</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-black">Invoice Preview</h1>
          <p className="mt-3 text-sm text-gray-600">
            No invoice data found. Go back to the editor and click Preview
            Invoice again.
          </p>

          <div className="mt-6">
            <Link
              href="/invoice/new"
              className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
            >
              ← Back to Editor
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (requiresExportChoice && !hasResolvedExportChoice) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-black">Invoice Preview</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            This international invoice still needs an explicit export tax
            choice in Totals &amp; Taxes before preview or PDF export.
          </p>

          <div className="mt-6">
            <Link
              href="/invoice/new"
              onClick={handleBackToEdit}
              className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
            >
              ← Back to Editor
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          html, body {
            background: white !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        .invoice-sheet {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .invoice-table thead {
          display: table-header-group;
        }

        .invoice-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      `}</style>

      <main className="min-h-screen bg-stone-100 px-4 py-5 sm:px-6 sm:py-8 print:bg-white print:p-0">
        <div className="mx-auto mb-6 flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            href="/invoice/new"
            onClick={handleBackToEdit}
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
          >
            ← Back to Edit
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
            >
              Print
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="invoice-sheet mx-auto w-full max-w-[210mm] border border-stone-300 bg-white px-5 py-5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:px-7 sm:py-6 print:max-w-none print:border-0 print:px-0 print:py-0 print:shadow-none">
          <header className="grid gap-5 border-b border-gray-300 pb-4 lg:grid-cols-[minmax(0,1fr)_270px] print:gap-4">
            <div className="min-w-0">
              {data.agency?.logoUrl ? (
                <img
                  src={data.agency.logoUrl}
                  alt="Agency logo"
                  className="mb-3 max-h-12 w-auto object-contain"
                />
              ) : null}

              <p className={sectionLabelClass}>Issued By</p>
              <h1 className="mt-2 text-[28px] font-bold leading-none tracking-tight text-black sm:text-[32px]">
                {data.agency?.agencyName || "Your Agency Name"}
              </h1>

              <p className={`mt-3 max-w-xl whitespace-pre-line ${compactTextClass}`}>
                {data.agency?.address || "—"}
              </p>

              {hasAgencyTax ? (
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] leading-5 text-gray-600">
                  {data.agency?.agencyState ? (
                    <p>State: {data.agency.agencyState}</p>
                  ) : null}
                  {shouldRenderAgencyGstin ? (
                    <p>GSTIN: {data.agency.gstin}</p>
                  ) : null}
                  {data.agency?.pan ? <p>PAN: {data.agency.pan}</p> : null}
                </div>
              ) : data.agency?.agencyState ? (
                <div className="mt-2 text-[12px] leading-5 text-gray-600">
                  <p>State: {data.agency.agencyState}</p>
                </div>
              ) : null}
            </div>

            <div className={`${documentBlockClass} self-start`}>
              <p className={sectionLabelClass}>Invoice</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-black">
                {data.meta?.invoiceNumber || "—"}
              </p>

              <div className="mt-3 space-y-2 text-[13px] leading-5 text-gray-700">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2">
                  <span className={metaLabelClass}>Invoice Date</span>
                  <span className="text-right font-medium text-black">
                    {formatDate(data.meta?.invoiceDate)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2">
                  <span className={metaLabelClass}>Due Date</span>
                  <span className="text-right font-medium text-black">
                    {formatDate(data.meta?.dueDate)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className={metaLabelClass}>Payment Terms</span>
                  <span className="text-right font-medium text-black">
                    {data.meta?.paymentTerms || "—"}
                  </span>
                </div>

                {clientIsInternational ? (
                  <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-2">
                    <span className={metaLabelClass}>Invoice Currency</span>
                    <span className="text-right font-medium text-black">
                      {displayCurrency}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <section className="grid gap-4 border-b border-gray-300 py-4 md:grid-cols-2">
            <div className={documentBlockClass}>
              <p className={sectionLabelClass}>From</p>
              <p className="mt-2 text-[15px] font-semibold text-black">
                {data.agency?.agencyName || "—"}
              </p>
              <p className={`mt-2 whitespace-pre-line ${compactTextClass}`}>
                {data.agency?.address || "—"}
              </p>
              {data.agency?.agencyState ? (
                <p className="mt-2 text-[12px] leading-5 text-gray-600">
                  State: {data.agency.agencyState}
                </p>
              ) : null}
            </div>

            <div className={documentBlockClass}>
              <p className={sectionLabelClass}>Bill To</p>
              <p className="mt-2 text-[15px] font-semibold text-black">
                {data.client?.clientName || "—"}
              </p>
              <p className={`mt-2 whitespace-pre-line ${compactTextClass}`}>
                {data.client?.clientAddress || "—"}
              </p>
              {!clientIsInternational && data.client?.clientState ? (
                <p className="mt-2 text-[12px] leading-5 text-gray-600">
                  State: {data.client.clientState}
                </p>
              ) : null}
              {clientIsInternational && data.client?.clientCountry ? (
                <p className="mt-2 text-[12px] leading-5 text-gray-600">
                  Country: {data.client.clientCountry}
                </p>
              ) : null}
              {hasClientTaxId ? (
                <p className="mt-2 text-[12px] leading-5 text-gray-600">
                  {clientTaxLabel}: {data.client?.clientGstin}
                </p>
              ) : null}
            </div>
          </section>

          <section className="border-b border-gray-300 py-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={sectionLabelClass}>Line Items</p>
                <h2 className="mt-1 text-[20px] font-bold tracking-tight text-black">
                  Services & Deliverables
                </h2>
              </div>

              <p className="text-[12px] text-gray-500">
                {computed.lineItems.length} item{computed.lineItems.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="overflow-hidden border border-gray-200">
              <table className="invoice-table min-w-full border-collapse text-left">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    <th className="px-3 py-2.5 font-semibold sm:px-4">Description</th>
                    <th className="px-3 py-2.5 font-semibold sm:px-4">Qty</th>
                    <th className="px-3 py-2.5 font-semibold sm:px-4">Rate</th>
                    <th className="px-3 py-2.5 font-semibold sm:px-4">Unit</th>
                    <th className="px-3 py-2.5 text-right font-semibold sm:px-4">Amount</th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {computed.lineItems.length > 0 ? (
                    computed.lineItems.map((item) => {
                      const amount = item.qty * item.rate;

                      return (
                        <tr
                          key={item.id}
                          className="border-t border-gray-200 text-[13px] leading-5 text-gray-700"
                        >
                          <td className="px-3 py-2.5 align-top sm:px-4">
                            <div className="font-semibold text-black">
                              {item.description || item.type}
                            </div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                              {item.type}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top font-medium text-black sm:px-4">
                            {item.qty}
                          </td>
                          <td className="px-3 py-2.5 align-top font-medium text-black sm:px-4">
                            {formatCurrency(item.rate, displayCurrency)}
                          </td>
                          <td className="px-3 py-2.5 align-top sm:px-4">
                            {getUnitLabel(item.rateUnit)}
                          </td>
                          <td className="px-3 py-2.5 text-right align-top font-semibold text-black sm:px-4">
                            {formatCurrency(amount, displayCurrency)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-t border-gray-200 text-[13px] text-gray-500">
                      <td colSpan={5} className="px-4 py-5 text-center">
                        No line items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className={`pt-4 ${
              hasSupportingDetails && hasPaymentDetails
                ? "grid gap-3 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start"
                : ""
            }`}
          >
            {hasSupportingDetails ? (
              <div className="space-y-3">
                <div className={documentBlockClass}>
                  {hasNotes ? (
                    <div className={hasLicense ? "border-b border-gray-100 pb-3" : ""}>
                      <p className={sectionLabelClass}>Notes</p>
                      <p className={`mt-2 whitespace-pre-line ${compactTextClass}`}>
                        {data.payment?.notes}
                      </p>
                    </div>
                  ) : null}

                  {hasLicense ? (
                    <div className={hasNotes ? "pt-3" : ""}>
                      <p className={sectionLabelClass}>License</p>
                      <dl className="mt-2 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-[13px] leading-5 text-gray-700">
                        <dt className="text-gray-500">Included</dt>
                        <dd className="font-medium text-black">Yes</dd>

                        <dt className="text-gray-500">Type</dt>
                        <dd className="font-medium text-black">
                          {getLicenseLabel(data.payment?.license?.licenseType)}
                        </dd>

                        {data.payment?.license?.licenseDuration ? (
                          <>
                            <dt className="text-gray-500">Duration</dt>
                            <dd className="font-medium text-black">
                              {data.payment.license.licenseDuration}
                            </dd>
                          </>
                        ) : null}
                      </dl>
                    </div>
                  ) : null}
                </div>

                <div className={`${documentBlockClass} bg-gray-50/50`}>
                  <p className={sectionLabelClass}>Amount Due</p>

                  <div className="mt-3 space-y-2 text-[13px] leading-5 text-gray-700">
                    <div className="flex items-center justify-between gap-4">
                      <span>Subtotal</span>
                      <span className="font-medium text-black">
                        {formatCurrency(computed.subtotal, displayCurrency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span>{taxLineLabel}</span>
                      <span className="font-medium text-black">
                        {formatCurrency(computed.taxAmount, displayCurrency)}
                      </span>
                    </div>

                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-black">Grand Total</span>
                        <span className="text-[16px] font-bold text-black">
                          {formatCurrency(computed.grandTotal, displayCurrency)}
                        </span>
                      </div>
                    </div>

                    {approximateUsdGrandTotal !== null ? (
                      <div className="border-t border-gray-100 pt-2 text-[12px] leading-5 text-gray-600">
                        Approx. USD total (reference only):{" "}
                        <span className="font-medium text-black">
                          {formatCurrency(approximateUsdGrandTotal, "USD")}
                        </span>
                      </div>
                    ) : null}

                    {taxComplianceNote ? (
                      <div className="border-t border-gray-100 pt-2 text-[12px] leading-5 text-gray-600">
                        {taxComplianceNote}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <aside
              className={`space-y-4 ${
                hasSupportingDetails ? "" : "mx-auto w-full max-w-[270px] lg:ml-auto"
              }`}
            >
              {!hasSupportingDetails ? (
                <div className={`${documentBlockClass} bg-gray-50/50`}>
                  <p className={sectionLabelClass}>Amount Due</p>

                  <div className="mt-3 space-y-2 text-[13px] leading-5 text-gray-700">
                    <div className="flex items-center justify-between gap-4">
                      <span>Subtotal</span>
                      <span className="font-medium text-black">
                        {formatCurrency(computed.subtotal, displayCurrency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span>{taxLineLabel}</span>
                      <span className="font-medium text-black">
                        {formatCurrency(computed.taxAmount, displayCurrency)}
                      </span>
                    </div>

                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-black">Grand Total</span>
                        <span className="text-[16px] font-bold text-black">
                          {formatCurrency(computed.grandTotal, displayCurrency)}
                        </span>
                      </div>
                    </div>

                    {approximateUsdGrandTotal !== null ? (
                      <div className="border-t border-gray-100 pt-2 text-[12px] leading-5 text-gray-600">
                        Approx. USD total (reference only):{" "}
                        <span className="font-medium text-black">
                          {formatCurrency(approximateUsdGrandTotal, "USD")}
                        </span>
                      </div>
                    ) : null}

                    {taxComplianceNote ? (
                      <div className="border-t border-gray-100 pt-2 text-[12px] leading-5 text-gray-600">
                        {taxComplianceNote}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {hasPaymentDetails ? (
                <div className={documentBlockClass}>
                  <p className={sectionLabelClass}>Payment Details</p>

                  {hasBankDetails ? (
                    <dl className="mt-2 grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-[13px] leading-5 text-gray-700">
                      {!clientIsInternational ? (
                        <>
                          {data.payment?.bankName ? (
                            <>
                              <dt className="text-gray-500">Bank</dt>
                              <dd className="font-medium text-black">
                                {data.payment.bankName}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.accountName ? (
                            <>
                              <dt className="text-gray-500">Account</dt>
                              <dd className="font-medium text-black">
                                {data.payment.accountName}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.accountNumber ? (
                            <>
                              <dt className="text-gray-500">Number</dt>
                              <dd className="font-medium text-black">
                                {data.payment.accountNumber}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.ifscCode ? (
                            <>
                              <dt className="text-gray-500">IFSC</dt>
                              <dd className="font-medium text-black">
                                {data.payment.ifscCode}
                              </dd>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {data.payment?.accountName ? (
                            <>
                              <dt className="text-gray-500">Beneficiary</dt>
                              <dd className="font-medium text-black">
                                {data.payment.accountName}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.bankName ? (
                            <>
                              <dt className="text-gray-500">Bank</dt>
                              <dd className="font-medium text-black">
                                {data.payment.bankName}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.bankAddress ? (
                            <>
                              <dt className="text-gray-500">Bank Address</dt>
                              <dd className="font-medium whitespace-pre-line text-black">
                                {data.payment.bankAddress}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.accountNumber ? (
                            <>
                              <dt className="text-gray-500">Account</dt>
                              <dd className="font-medium text-black">
                                {data.payment.accountNumber}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.swiftBicCode ? (
                            <>
                              <dt className="text-gray-500">SWIFT / BIC</dt>
                              <dd className="font-medium text-black">
                                {data.payment.swiftBicCode}
                              </dd>
                            </>
                          ) : null}

                          {data.payment?.ibanRoutingCode ? (
                            <>
                              <dt className="text-gray-500">IBAN / Routing</dt>
                              <dd className="font-medium text-black">
                                {data.payment.ibanRoutingCode}
                              </dd>
                            </>
                          ) : null}
                        </>
                      )}
                    </dl>
                  ) : null}

                  {hasQr ? (
                    <div className={hasBankDetails ? "mt-3 border-t border-gray-100 pt-3" : "mt-2"}>
                      <p className={sectionLabelClass}>Scan to Pay</p>
                      <div className="mt-2 flex justify-start">
                        <img
                          src={data.payment?.qrCodeUrl}
                          alt="Payment QR"
                          className="max-h-32 w-auto object-contain"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
