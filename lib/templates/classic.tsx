/**
 * ─── CLASSIC TEMPLATE ──────────────────────────────
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";

export default function ClassicTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#111118] bg-white min-h-[297mm] p-[15mm] box-border relative">
      {/* ── Top Accent ──────────────────────────── */}
      <div className="h-1 w-full bg-[#111118] mb-12" />

      {/* ── Header ────────────────────────────── */}
      <header className="flex justify-between items-start mb-16">
        <div className="max-w-[400px]">
          {data.agencyLogoUrl ? (
            <img
              src={data.agencyLogoUrl}
              alt="Logo"
              className="mb-6 max-h-12 w-auto object-contain"
            />
          ) : (
            <div className="text-[24px] font-black tracking-tighter mb-4 leading-none">
              {data.agencyName.toUpperCase()}
            </div>
          )}
          <div className="text-[12px] leading-relaxed text-[#555] space-y-1">
            <p className="font-bold text-[#111118] text-[14px] mb-1">{data.agencyName}</p>
            <p className="whitespace-pre-line max-w-[280px]">{data.agencyAddress}</p>
            {(data.agencyState || data.showAgencyGstin || data.agencyPan) && (
              <div className="pt-2 flex flex-col gap-0.5 text-[11px] text-[#888]">
                {data.agencyState && <span>{data.agencyState}{data.agencyStateCode ? ` (${data.agencyStateCode})` : ""}</span>}
                {data.showAgencyGstin && <span className="font-medium text-[#555]">GSTIN {data.agencyGstin}</span>}
                {data.agencyPan && <span>PAN {data.agencyPan}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-[42px] font-black tracking-tighter leading-none mb-6">INVOICE</h1>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">Number</p>
              <p className="text-[16px] font-bold">{data.invoiceNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">Date</p>
                <p className="text-[13px] font-medium">{data.invoiceDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">Due</p>
                <p className="text-[13px] font-medium text-[#E63946]">{data.dueDate}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Client Section ─────────────────────── */}
      <section className="mb-16 pb-8 border-b border-[#F0F0F2]">
        <div className="grid grid-cols-[1fr_200px] gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-4">Billed To</p>
            <div className="text-[18px] font-bold mb-2">{data.clientName}</div>
            <p className="text-[13px] text-[#555] leading-relaxed whitespace-pre-line max-w-[320px]">
              {data.clientAddress}
            </p>
            <div className="mt-3 flex gap-4 text-[11px] text-[#888]">
              {data.clientState && <span>{data.clientState}{data.clientStateCode ? ` (${data.clientStateCode})` : ""}</span>}
              {data.clientTaxId && <span>{data.clientTaxLabel}: {data.clientTaxId}</span>}
            </div>
          </div>
          <div className="text-right self-end">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">Payment Terms</p>
            <p className="text-[13px] font-medium">{data.paymentTerms}</p>
            {data.isInternational && (
              <p className="mt-2 text-[11px] font-bold text-[#111118]">CURRENCY: {data.displayCurrency}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-16">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#111118]">
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-left">Description</th>
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-center w-[60px]">Qty</th>
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-right w-[120px]">Rate</th>
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-right w-[140px]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F2]">
            {data.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="py-6 pr-8">
                  <div className="font-bold text-[15px] mb-1">{item.description}</div>
                  <div className="flex gap-2 text-[10px] uppercase tracking-widest text-[#999] font-bold">
                    <span>{item.type}</span>
                    <span>·</span>
                    <span>SAC {item.sacCode}</span>
                    {item.unit && <span>·</span>}
                    <span>{item.unit}</span>
                  </div>
                </td>
                <td className="py-6 text-center text-[14px] font-medium">{item.qty}</td>
                <td className="py-6 text-right text-[14px] font-medium">{item.rateFormatted}</td>
                <td className="py-6 text-right text-[15px] font-bold">{item.amountFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Totals ────────────────────────────── */}
      <section className="flex justify-end mb-20">
        <div className="w-[320px] space-y-3">
          <div className="flex justify-between text-[13px] text-[#555]">
            <span>Subtotal</span>
            <span className="font-medium text-[#111118]">{data.subtotalFormatted}</span>
          </div>
          <div className="flex justify-between text-[13px] text-[#555]">
            <span>{data.taxLabel}</span>
            <span className="font-medium text-[#111118]">{data.taxFormatted}</span>
          </div>
          <div className="pt-4 border-t border-[#111118] flex justify-between items-baseline">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Total Due</span>
            <span className="text-[28px] font-black">{data.grandTotalFormatted}</span>
          </div>
          {data.approximateUsd && (
            <p className="text-right text-[10px] text-[#888] italic pt-1">
              ≈ {data.approximateUsd}
            </p>
          )}
        </div>
      </section>

      {/* ── Footer / Legal ───────────────────── */}
      <section className="mt-auto grid grid-cols-2 gap-16 items-start">
        <div className="space-y-8">
          {data.hasBankDetails && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-3">Bank Details</p>
              <div className="text-[12px] text-[#555] leading-relaxed space-y-0.5">
                {!data.isInternational ? (
                  <>
                    <p className="font-bold text-[#111118]">{data.bankName}</p>
                    <p>Account: {data.accountNumber}</p>
                    <p>IFSC: {data.ifscCode}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[#111118]">{data.bankName}</p>
                    <p>SWIFT: {data.swiftBicCode}</p>
                    <p>Account: {data.accountNumber}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {data.hasNotes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-2">Notes</p>
              <p className="text-[11px] text-[#777] leading-relaxed whitespace-pre-line max-w-[340px]">
                {data.notes}
              </p>
            </div>
          )}
        </div>

        <div className="text-right space-y-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-6">Authorized Signatory</p>
            <div className="flex flex-col items-end">
              {data.signatureUrl ? (
                <img src={data.signatureUrl} alt="Signature" className="h-12 w-auto object-contain mb-2 brightness-0" />
              ) : (
                <div className="text-[20px] font-bold mb-2">{data.authorizedSignatory || data.agencyName}</div>
              )}
              <div className="h-px w-48 bg-[#111118] mb-2" />
              <p className="text-[9px] text-[#A8A08E] uppercase tracking-widest font-medium">Digital Signature</p>
            </div>
          </div>

          {data.amountInWords && (
            <div className="pt-4 border-t border-[#F0F0F2]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">Amount in Words</p>
              <p className="text-[11px] font-medium text-[#555] italic">{data.amountInWords}</p>
            </div>
          )}
        </div>
      </section>

      <InvoiceWatermark />
    </div>
  );
}
