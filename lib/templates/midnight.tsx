/**
 * ─── MIDNIGHT TEMPLATE ────────────────────────────
 *
 * Design: "Premium after-hours."
 * Deep navy header, violet accent system,
 * clean white body. Feels like luxury tech invoicing.
 * Inspired by Stripe receipts meets Linear's UI.
 *
 * Key elements:
 * • Deep navy (#1A1A2E) header — contained, not full-bg
 * • Violet (#6C63FF) accent lines & highlights
 * • Borderless table with violet row separators
 * • Grand total with violet background accent
 * • Condensed, modern sans-serif feel
 * • Print: navy → light gray, violet → dark gray
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";

export default function MidnightTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#1A1A2E]">
      {/* ── Violet accent line ────────────────── */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#6C63FF] to-[#9B93FF] print:bg-[#888]" />

      {/* ── Navy Header ───────────────────────── */}
      <header className="bg-[#1A1A2E] px-5 py-5 print:bg-[#f0f0f5] print:text-[#111]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            {data.agencyLogoUrl && (
              <img src={data.agencyLogoUrl} alt="Logo" className="mb-3 max-h-10 w-auto brightness-0 invert print:brightness-100 print:invert-0" />
            )}
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#6C63FF] print:text-[#666]">From</p>
            <h1 className="mt-1 text-[22px] font-bold leading-none tracking-tight text-[#F0F0F5] print:text-[#111]">
              {data.agencyName}
            </h1>
            <p className="mt-2 max-w-md whitespace-pre-line text-[12px] leading-5 text-[#F0F0F5]/50 print:text-[#777]">
              {data.agencyAddress}
            </p>
            {(data.showAgencyGstin || data.agencyPan) && (
              <div className="mt-1.5 flex gap-4 text-[10px] text-[#F0F0F5]/30 print:text-[#999]">
                {data.showAgencyGstin && <span>GSTIN: {data.agencyGstin}</span>}
                {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-lg bg-[#F0F0F5]/10 px-4 py-3 text-right print:bg-[#e8e8f0]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">Invoice</p>
            <p className="mt-1 text-[26px] font-bold text-[#F0F0F5] print:text-[#111]">{data.invoiceNumber}</p>
            <div className="mt-2 space-y-1 text-[11px] text-[#F0F0F5]/50 print:text-[#888]">
              <p>{data.invoiceDate}</p>
              <p>Due {data.dueDate}</p>
              <p>{data.paymentTerms}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Client panel ─────────────────────── */}
      <section className="border-b border-[#E8E8F0] px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#6C63FF] print:text-[#666]">Bill To</p>
        <p className="mt-1.5 text-[16px] font-semibold">{data.clientName}</p>
        <p className="mt-1 whitespace-pre-line text-[12px] text-[#666]">{data.clientAddress}</p>
        <div className="mt-1.5 flex gap-4 text-[10px] text-[#999]">
          {!data.isInternational && data.clientState && <span>State: {data.clientState}</span>}
          {data.isInternational && data.clientCountry && <span>Country: {data.clientCountry}</span>}
          {data.clientTaxId && <span>{data.clientTaxLabel}: {data.clientTaxId}</span>}
        </div>
      </section>

      {/* ── Line Items — Violet separators ───── */}
      <section className="px-5 py-4">
        <div className="flex items-end justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#6C63FF] print:text-[#666]">Services</p>
          <p className="text-[10px] text-[#999]">{data.itemCount} item{data.itemCount !== 1 ? "s" : ""}</p>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-[#6C63FF]/20 text-[9px] uppercase tracking-[0.16em] text-[#999] print:border-[#ccc]">
                <th className="px-2 py-2 font-semibold">Description</th>
                <th className="px-2 py-2 font-semibold">Qty</th>
                <th className="px-2 py-2 font-semibold">Rate</th>
                <th className="px-2 py-2 font-semibold">Unit</th>
                <th className="px-2 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-[#6C63FF]/8 text-[13px] print:border-[#eee]">
                  <td className="px-2 py-2.5 align-top">
                    <span className="font-semibold">{item.description}</span>
                    <span className="mt-0.5 flex gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[#aaa]">
                      <span>{item.type}</span><span>·</span><span>SAC {item.sacCode}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 align-top tabular-nums font-medium">{item.qty}</td>
                  <td className="px-2 py-2.5 align-top tabular-nums font-medium">{item.rateFormatted}</td>
                  <td className="px-2 py-2.5 align-top text-[#666]">{item.unit}</td>
                  <td className="px-2 py-2.5 text-right align-top tabular-nums font-bold">{item.amountFormatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom ────────────────────────────── */}
      <section className="grid gap-4 border-t border-[#E8E8F0] px-5 pt-4 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="space-y-3 text-[12px] text-[#666]">
          {data.hasNotes && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">Notes</p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasLicense && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">License</p>
              <p className="mt-1.5">{data.licenseType}{data.licenseDuration ? ` · ${data.licenseDuration}` : ""}</p>
            </div>
          )}
          {data.hasBankDetails && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">Payment</p>
              <div className="mt-1.5 space-y-0.5">
                {!data.isInternational ? (
                  <>
                    {data.bankName && <p>{data.bankName}</p>}
                    {data.accountNumber && <p>A/C: {data.accountNumber}</p>}
                    {data.ifscCode && <p>IFSC: {data.ifscCode}</p>}
                  </>
                ) : (
                  <>
                    {data.accountName && <p>Beneficiary: {data.accountName}</p>}
                    {data.bankName && <p>Bank: {data.bankName}</p>}
                    {data.swiftBicCode && <p>SWIFT: {data.swiftBicCode}</p>}
                  </>
                )}
              </div>
            </div>
          )}
          {data.hasQrCode && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">Scan to Pay</p>
              <img src={data.qrCodeUrl} alt="QR" className="mt-2 max-h-24 w-auto" />
            </div>
          )}
        </div>

        {/* Totals — Violet accent */}
        <div>
          <div className="space-y-2 text-[12px] text-[#666]">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums font-medium text-[#1A1A2E]">{data.subtotalFormatted}</span></div>
            <div className="flex justify-between"><span>{data.taxLabel}</span><span className="tabular-nums font-medium text-[#1A1A2E]">{data.taxFormatted}</span></div>
          </div>
          <div className="mt-3 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#5548D9] px-4 py-3 text-right text-white print:bg-[#e8e8f0] print:text-[#111]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/60 print:text-[#888]">Total Due</p>
            <p className="mt-1 text-[22px] font-bold tabular-nums">{data.grandTotalFormatted}</p>
          </div>
          {data.approximateUsd && (
            <p className="mt-2 text-right text-[10px] text-[#999]">≈ {data.approximateUsd}</p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-2 text-[10px] text-[#999]">{data.taxComplianceNote}</p>
          )}
        </div>
      </section>

      {/* ── Compliance Footer ──────────────────── */}
      <section className="mt-4 grid gap-4 border-t border-[#E8E8F0] pt-4 lg:grid-cols-2">
        {data.grandTotalRaw > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#888]">Amount in Words</p>
            <p className="mt-1.5 text-[12px] font-semibold text-[#1A1A2E]">{data.amountInWords}</p>
            <p className="mt-1 text-[10px] text-[#999]">Reverse Charge (RCM): <strong className="text-[#1A1A2E]">{data.reverseCharge ? "Yes" : "No"}</strong></p>
          </div>
        )}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#888]">Authorized Signatory</p>
          <div className="mt-6 border-b border-[#1A1A2E] pb-1">
            <p className="text-[12px] font-medium text-[#666]">{data.authorizedSignatory || data.agencyName}</p>
          </div>
          <p className="mt-1 text-[10px] text-[#999]">Signature</p>
        </div>
      </section>

      <InvoiceWatermark />
    </div>
  );
}
