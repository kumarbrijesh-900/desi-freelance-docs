"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PreviewInvoiceData = {
  agency?: {
    agencyName?: string;
    address?: string;
    gstin?: string;
    pan?: string;
    logoUrl?: string;
  };
  client?: {
    clientName?: string;
    clientAddress?: string;
    clientGstin?: string;
  };
  meta?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    paymentTerms?: string;
  };
  lineItems?: Array<{
    id: string;
    type: string;
    description: string;
    qty: number;
    rate: number;
    rateUnit?: string;
  }>;
  tax?: {
    taxMode?: string;
    taxRate?: number;
  };
  payment?: {
    notes?: string;
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    qrCodeUrl?: string;
    license?: {
      isLicenseIncluded?: boolean;
      licenseType?: string;
      licenseDuration?: string;
    };
  };
};

const STORAGE_KEY = "invoice-preview-data";

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

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
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

export default function InvoicePreviewPage() {
  const [data, setData] = useState<PreviewInvoiceData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw));
      }
    } catch (error) {
      console.error("Failed to read preview data:", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  const computed = useMemo(() => {
    const lineItems = data?.lineItems ?? [];
    const subtotal = lineItems.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
      0
    );
    const taxRate = data?.tax?.taxRate ?? 0;
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    return {
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      grandTotal,
    };
  }, [data]);

  const hasAgencyTax = Boolean(data?.agency?.gstin || data?.agency?.pan);
  const hasClientGstin = Boolean(data?.client?.clientGstin);
  const hasNotes = Boolean(data?.payment?.notes?.trim());
  const hasBankDetails = Boolean(
    data?.payment?.accountName ||
      data?.payment?.accountNumber ||
      data?.payment?.ifscCode
  );
  const hasLicense = Boolean(data?.payment?.license?.isLicenseIncluded);
  const hasQr = Boolean(data?.payment?.qrCodeUrl);
  const detailCardClass = "rounded-2xl border border-gray-200 bg-gray-50/70 p-5";
  const sectionLabelClass =
    "text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500";

  const handlePrint = () => {
    window.print();
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

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }
          html, body {
            background: white !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-[linear-gradient(180deg,#f5f5f5_0%,#ececec_100%)] px-4 py-6 sm:px-6 sm:py-10 print:bg-white print:p-0">
        <div className="mx-auto mb-6 flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            href="/invoice/new"
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
              onClick={handlePrint}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Download / Save PDF
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-5xl rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="border-b border-gray-200 pb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Client Review Copy
                </div>

                <div className="mt-5">
                  <p className={sectionLabelClass}>Issued By</p>
                </div>

                <div className="mt-3">
                  {data.agency?.logoUrl ? (
                    <div className="mb-5 inline-flex rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <img
                        src={data.agency.logoUrl}
                        alt="Agency logo"
                        className="max-h-16 w-auto object-contain"
                      />
                    </div>
                  ) : null}

                  <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
                    {data.agency?.agencyName || "Your Agency Name"}
                  </h1>
                </div>

                <div className="mt-4 max-w-xl space-y-2 text-sm leading-6 text-gray-600">
                  <p>{data.agency?.address || "—"}</p>
                  {hasAgencyTax && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      {data.agency?.gstin ? <p>GSTIN: {data.agency.gstin}</p> : null}
                      {data.agency?.pan ? <p>PAN: {data.agency.pan}</p> : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={sectionLabelClass}>Invoice</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-black">
                      {data.meta?.invoiceNumber || "—"}
                    </p>
                  </div>

                  <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                    Preview
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Invoice Date
                    </p>
                    <p className="mt-2 text-base font-semibold text-black">
                      {formatDate(data.meta?.invoiceDate)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Due Date
                    </p>
                    <p className="mt-2 text-base font-semibold text-black">
                      {formatDate(data.meta?.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Payment Terms
                  </p>
                  <p className="mt-2 text-base font-semibold text-black">
                    {data.meta?.paymentTerms || "—"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 border-b border-gray-200 py-6 md:grid-cols-2">
            <div className={detailCardClass}>
              <p className={sectionLabelClass}>From</p>
              <p className="mt-3 text-lg font-semibold text-black">
                {data.agency?.agencyName || "—"}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                {data.agency?.address || "—"}
              </p>
            </div>

            <div className={detailCardClass}>
              <p className={sectionLabelClass}>Bill To</p>
              <p className="mt-3 text-lg font-semibold text-black">
                {data.client?.clientName || "—"}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                {data.client?.clientAddress || "—"}
              </p>
              {hasClientGstin ? (
                <p className="mt-3 text-sm text-gray-600">
                  GSTIN: {data.client?.clientGstin}
                </p>
              ) : null}
            </div>
          </section>

          <section className="border-b border-gray-200 py-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={sectionLabelClass}>Line Items</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-black">
                  Services & Deliverables
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Review the billed services, units, and total line amounts.
                </p>
              </div>

              <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600">
                {computed.lineItems.length} item{computed.lineItems.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-gray-50/90">
                  <tr className="text-xs uppercase tracking-[0.16em] text-gray-500">
                    <th className="px-4 py-4 font-semibold">Description</th>
                    <th className="px-4 py-4 font-semibold">Qty</th>
                    <th className="px-4 py-4 font-semibold">Rate</th>
                    <th className="px-4 py-4 font-semibold">Unit</th>
                    <th className="px-4 py-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {computed.lineItems.length > 0 ? (
                    computed.lineItems.map((item) => {
                      const amount = item.qty * item.rate;

                      return (
                        <tr
                          key={item.id}
                          className="border-t border-gray-200 text-sm text-gray-700"
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-black">
                              {item.description || item.type}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-gray-500">
                              {item.type}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-medium text-black">{item.qty}</td>
                          <td className="px-4 py-4 font-medium text-black">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="px-4 py-4">
                            {getUnitLabel(item.rateUnit)}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-black">
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-t border-gray-200 text-sm text-gray-500">
                      <td colSpan={5} className="px-4 py-6 text-center">
                        No line items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              {hasNotes ? (
                <div className={detailCardClass}>
                  <p className={sectionLabelClass}>
                    Notes
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {data.payment?.notes}
                  </p>
                </div>
              ) : null}

              {hasLicense ? (
                <div className={detailCardClass}>
                  <p className={sectionLabelClass}>
                    License
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Included
                      </p>
                      <p className="mt-1 text-sm font-medium text-black">Yes</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Type
                      </p>
                      <p className="mt-1 text-sm font-medium text-black">
                        {getLicenseLabel(data.payment?.license?.licenseType)}
                      </p>
                    </div>

                    {data.payment?.license?.licenseDuration ? (
                      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Duration
                        </p>
                        <p className="mt-1 text-sm font-medium text-black">
                          {data.payment.license.licenseDuration}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <p className={sectionLabelClass}>Amount Summary</p>

                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-black">
                      {formatCurrency(computed.subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Tax ({computed.taxRate}%)</span>
                    <span className="font-medium text-black">
                      {formatCurrency(computed.taxAmount)}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-black">Grand Total</span>
                      <span className="text-lg font-bold text-black">
                        {formatCurrency(computed.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {(hasBankDetails || hasQr) && (
                <div className="rounded-3xl border border-gray-200 bg-white p-5">
                  <p className={sectionLabelClass}>Payment Details</p>

                  {hasBankDetails ? (
                    <div className="mt-4 space-y-3">
                      {data.payment?.accountName ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Account Name
                          </p>
                          <p className="mt-1 text-sm font-medium text-black">
                            {data.payment.accountName}
                          </p>
                        </div>
                      ) : null}

                      {data.payment?.accountNumber ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Account Number
                          </p>
                          <p className="mt-1 text-sm font-medium text-black">
                            {data.payment.accountNumber}
                          </p>
                        </div>
                      ) : null}

                      {data.payment?.ifscCode ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                            IFSC Code
                          </p>
                          <p className="mt-1 text-sm font-medium text-black">
                            {data.payment.ifscCode}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {hasQr ? (
                    <div
                      className={`rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 ${
                        hasBankDetails ? "mt-5" : "mt-4"
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                        Scan to Pay
                      </p>
                      <div className="mt-4 flex justify-center rounded-2xl border border-gray-200 bg-white p-4">
                        <img
                          src={data.payment?.qrCodeUrl}
                          alt="Payment QR"
                          className="max-h-44 w-auto object-contain"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
