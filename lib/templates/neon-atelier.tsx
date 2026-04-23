/**
 * ─── NEON ATELIER TEMPLATE ────────────────────────
 *
 * Design: "Creative studio at midnight."
 * The signature Lance look. Dark header band with
 * fluorescent lime accents. Monospace amounts.
 * Feels like receiving an invoice from a Pentagram or
 * Studio Feixen — contemporary, bold, unapologetic.
 *
 * Key elements:
 * • Dark (#111118) header band — contained, not full-page
 * • Lime (#BEFF00) accent lines and highlights
 * • Monospace font for all numbers/amounts
 * • Items with lime left-border accents
 * • Grand total in a dark pill with lime text
 * • Print: header inverts to light, lime → gray accent
 */

import type { InvoiceTemplateProps } from "./template-types";

export default function NeonAtelierTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#111118]">
      {/* ── Lime accent line at very top ────── */}
      <div className="h-[4px] w-full bg-[#BEFF00] print:bg-[#aaa]" />

      {/* ── Dark Header Band ──────────────────── */}
      <header className="bg-[#111118] px-5 py-5 text-white print:bg-[#f0f0f0] print:text-[#111]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            {data.agencyLogoUrl ? (
              <img
                src={data.agencyLogoUrl}
                alt="Logo"
                className="mb-3 max-h-10 w-auto object-contain brightness-0 invert print:brightness-100 print:invert-0"
              />
            ) : (
              <div className="mb-2 inline-block rounded bg-[#BEFF00] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#111118] print:bg-[#ddd] print:text-[#333]">
                Invoice
              </div>
            )}
            <h1 className="text-[24px] font-bold leading-none tracking-tight">
              {data.agencyName}
            </h1>
            <p className="mt-2 max-w-md whitespace-pre-line text-[12px] leading-5 text-white/60 print:text-[#777]">
              {data.agencyAddress}
            </p>
            {(data.agencyState || data.showAgencyGstin) && (
              <div className="mt-2 flex gap-4 text-[10px] text-white/40 print:text-[#999]">
                {data.agencyState && <span>State: {data.agencyState}{data.agencyStateCode ? ` (${data.agencyStateCode})` : ""}</span>}
                {data.showAgencyGstin && <span>GSTIN: {data.agencyGstin}</span>}
                {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="font-mono text-[32px] font-bold leading-none tracking-tight text-[#BEFF00] print:text-[#333]">
              {data.invoiceNumber}
            </p>
            <div className="mt-3 space-y-1 text-[11px] text-white/50 print:text-[#888]">
              <p>Date: <span className="text-white/80 print:text-[#444]">{data.invoiceDate}</span></p>
              <p>Due: <span className="text-white/80 print:text-[#444]">{data.dueDate}</span></p>
              <p>Terms: <span className="text-white/80 print:text-[#444]">{data.paymentTerms}</span></p>
              {data.isInternational && (
                <p>Currency: <span className="text-white/80 print:text-[#444]">{data.displayCurrency}</span></p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Parties ───────────────────────────── */}
      <section className="grid gap-4 border-b border-[#E2E2EA] px-5 py-4 md:grid-cols-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">From</p>
          <p className="mt-1.5 text-[14px] font-semibold">{data.agencyName}</p>
          <p className="mt-1 whitespace-pre-line text-[12px] text-[#666]">{data.agencyAddress}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">Bill To</p>
          <p className="mt-1.5 text-[14px] font-semibold">{data.clientName}</p>
          <p className="mt-1 whitespace-pre-line text-[12px] text-[#666]">{data.clientAddress}</p>
          {data.clientTaxId && (
            <p className="mt-1 text-[10px] text-[#999]">{data.clientTaxLabel}: {data.clientTaxId}</p>
          )}
        </div>
      </section>

      {/* ── Line Items — Lime accent borders ── */}
      <section className="px-5 py-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">
          Deliverables
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.16em] text-[#999]">
                <th className="border-b-2 border-[#111118] px-3 py-2 font-semibold print:border-black">Description</th>
                <th className="border-b-2 border-[#111118] px-3 py-2 font-semibold print:border-black">Qty</th>
                <th className="border-b-2 border-[#111118] px-3 py-2 font-semibold print:border-black">Rate</th>
                <th className="border-b-2 border-[#111118] px-3 py-2 font-semibold print:border-black">Unit</th>
                <th className="border-b-2 border-[#111118] px-3 py-2 text-right font-semibold print:border-black">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item) => (
                <tr key={item.id} className="group border-b border-[#F0F0F2] text-[13px]">
                  <td className="border-l-[3px] border-l-[#BEFF00] px-3 py-2.5 align-top print:border-l-[#ccc]">
                    <span className="font-semibold">{item.description}</span>
                    <span className="mt-0.5 flex gap-2 text-[9px] uppercase tracking-[0.12em] text-[#999]">
                      <span>{item.type}</span><span>·</span><span>SAC {item.sacCode}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top font-mono text-[12px] font-medium">{item.qty}</td>
                  <td className="px-3 py-2.5 align-top font-mono text-[12px] font-medium">{item.rateFormatted}</td>
                  <td className="px-3 py-2.5 align-top text-[12px] text-[#666]">{item.unit}</td>
                  <td className="px-3 py-2.5 text-right align-top font-mono text-[12px] font-bold">{item.amountFormatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom ────────────────────────────── */}
      <section className="grid gap-4 border-t border-[#E2E2EA] px-5 pt-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Left */}
        <div className="space-y-3 text-[12px] text-[#666]">
          {data.hasNotes && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">Notes</p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasLicense && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">License</p>
              <p className="mt-1.5">{data.licenseType}{data.licenseDuration ? ` · ${data.licenseDuration}` : ""}</p>
            </div>
          )}
          {data.hasBankDetails && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">Payment</p>
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
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">Scan to Pay</p>
              <img src={data.qrCodeUrl} alt="QR" className="mt-2 max-h-24 w-auto" />
            </div>
          )}
        </div>

        {/* Right: Grand Total — Dark pill */}
        <div>
          <div className="space-y-2 text-[12px] text-[#666]">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono font-medium text-[#111118]">{data.subtotalFormatted}</span></div>
            <div className="flex justify-between"><span>{data.taxLabel}</span><span className="font-mono font-medium text-[#111118]">{data.taxFormatted}</span></div>
          </div>
          <div className="mt-3 rounded-md bg-[#111118] px-4 py-3 text-right print:bg-[#f0f0f0]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 print:text-[#999]">Total Due</p>
            <p className="mt-1 font-mono text-[24px] font-bold text-[#BEFF00] print:text-[#111]">
              {data.grandTotalFormatted}
            </p>
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
      <section className="grid gap-4 border-t border-[#E2E2EA] px-5 py-4 lg:grid-cols-2">
        {data.grandTotalRaw > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">Amount in Words</p>
            <p className="mt-1.5 text-[12px] font-semibold text-[#111118]">{data.amountInWords}</p>
            <p className="mt-1.5 text-[10px] text-[#999]">Reverse Charge (RCM): <strong className="text-[#111118]">{data.reverseCharge ? "Yes" : "No"}</strong></p>
          </div>
        )}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#BEFF00] print:text-[#888]">Authorized Signatory</p>
          <div className="mt-6 border-b border-[#111118] pb-1">
            <p className="text-[12px] font-medium text-[#666]">{data.authorizedSignatory || data.agencyName}</p>
          </div>
          <p className="mt-1 text-[10px] text-[#999]">Signature</p>
        </div>
      </section>
    </div>
  );
}
