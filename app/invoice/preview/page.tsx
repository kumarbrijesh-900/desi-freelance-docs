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

      <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 sm:py-10 print:bg-white print:p-0">
        <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
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

        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-col gap-6 border-b border-gray-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {data.agency?.logoUrl ? (
                <img
                  src={data.agency.logoUrl}
                  alt="Agency logo"
                  className="mb-4 max-h-16 w-auto object-contain"
                />
              ) : null}

              <h1 className="text-2xl font-bold text-black">
                {data.agency?.agencyName || "Your Agency Name"}
              </h1>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>{data.agency?.address || "—"}</p>
                {hasAgencyTax && (
                  <div className="pt-1">
                    {data.agency?.gstin ? <p>GSTIN: {data.agency.gstin}</p> : null}
                    {data.agency?.pan ? <p>PAN: {data.agency.pan}</p> : null}
                  </div>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Invoice
              </p>
              <p className="mt-2 text-2xl font-bold text-black">
                {data.meta?.invoiceNumber || "—"}
              </p>

              <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p>Invoice Date: {formatDate(data.meta?.invoiceDate)}</p>
                <p>Due Date: {formatDate(data.meta?.dueDate)}</p>
                <p>Payment Terms: {data.meta?.paymentTerms || "—"}</p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-6 border-b border-gray-200 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                From
              </p>
              <p className="mt-2 text-base font-semibold text-black">
                {data.agency?.agencyName || "—"}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                {data.agency?.address || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Bill To
              </p>
              <p className="mt-2 text-base font-semibold text-black">
                {data.client?.clientName || "—"}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                {data.client?.clientAddress || "—"}
              </p>
              {hasClientGstin ? (
                <p className="mt-2 text-sm text-gray-600">
                  GSTIN: {data.client?.clientGstin}
                </p>
              ) : null}
            </div>
          </section>

          <section className="py-6">
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full border-collapse text-left">
                <thead className="bg-gray-50">
                  <tr className="text-sm text-gray-700">
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Rate</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {computed.lineItems.length > 0 ? (
                    computed.lineItems.map((item) => {
                      const amount = item.qty * item.rate;

                      return (
                        <tr
                          key={item.id}
                          className="border-t border-gray-200 text-sm text-gray-700"
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-black">
                              {item.description || item.type}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {item.type}
                            </div>
                          </td>
                          <td className="px-4 py-4">{item.qty}</td>
                          <td className="px-4 py-4">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="px-4 py-4">
                            {getUnitLabel(item.rateUnit)}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-black">
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

          <section className="grid grid-cols-1 gap-8 border-t border-gray-200 pt-6 sm:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {hasNotes ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Notes
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {data.payment?.notes}
                  </p>
                </div>
              ) : null}

              {hasLicense ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    License
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>Included: Yes</p>
                    <p>
                      Type: {getLicenseLabel(data.payment?.license?.licenseType)}
                    </p>
                    {data.payment?.license?.licenseDuration ? (
                      <p>Duration: {data.payment.license.licenseDuration}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {hasBankDetails ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Bank Details
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {data.payment?.accountName ? (
                      <p>Account Name: {data.payment.accountName}</p>
                    ) : null}
                    {data.payment?.accountNumber ? (
                      <p>Account Number: {data.payment.accountNumber}</p>
                    ) : null}
                    {data.payment?.ifscCode ? (
                      <p>IFSC Code: {data.payment.ifscCode}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="space-y-3 text-sm text-gray-700">
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

                {hasQr ? (
                  <div className="mt-6 border-t border-gray-200 pt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Scan to Pay
                    </p>
                    <img
                      src={data.payment?.qrCodeUrl}
                      alt="Payment QR"
                      className="max-h-40 w-auto object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}