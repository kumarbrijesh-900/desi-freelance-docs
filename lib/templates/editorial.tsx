/**
 * ─── EDITORIAL TEMPLATE ────────────────────────────
 *
 * Design: "The magazine receipt."
 * Inspired by Kinfolk, Cereal, Apartamento magazines.
 * Oversized invoice number, generous negative space,
 * fine hairline dividers, asymmetric two-panel layout.
 *
 * Key elements:
 * • Huge 48px invoice number — the hero element
 * • Warm off-white (#F8F7F4) surface tone
 * • Hairline (0.5px) dividers — delicate, refined
 * • Body items as editorial cards, not table rows
 * • System serif (Georgia) for headings — timeless
 * • Print: falls back to pure white background
 */

import type { InvoiceTemplateProps } from "./template-types";

export default function EditorialTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#27272F]">
      {/* ── Top accent line ───────────────────── */}
      <div className="h-[1px] w-full bg-[#27272F] print:bg-black" />

      {/* ── Masthead ──────────────────────────── */}
      <header className="pb-6 pt-6">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            {data.agencyLogoUrl ? (
              <img src={data.agencyLogoUrl} alt="Logo" className="mb-4 max-h-10 w-auto object-contain" />
            ) : (
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#999]">Invoice</p>
            )}
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#999]">Issued by</p>
            <h1 className="mt-1 font-['Georgia',_serif] text-[22px] font-normal italic leading-tight text-[#27272F]">
              {data.agencyName}
            </h1>
          </div>

          {/* Oversized invoice number — the hero */}
          <div className="text-right">
            <p className="font-['Georgia',_serif] text-[48px] font-normal leading-none tracking-tight text-[#27272F] md:text-[56px]">
              {data.invoiceNumber}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#999]">
              {data.invoiceDate}
            </p>
          </div>
        </div>
      </header>

      {/* ── Hairline ─────────────────────────── */}
      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Meta Strip ───────────────────────── */}
      <div className="grid grid-cols-3 gap-4 py-4 text-[11px]">
        <div>
          <p className="uppercase tracking-[0.2em] text-[#999]">Due Date</p>
          <p className="mt-1 font-medium text-[#27272F]">{data.dueDate}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-[#999]">Terms</p>
          <p className="mt-1 font-medium text-[#27272F]">{data.paymentTerms}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-[#999]">Currency</p>
          <p className="mt-1 font-medium text-[#27272F]">{data.displayCurrency}</p>
        </div>
      </div>

      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Parties — Editorial two-panel ────── */}
      <section className="grid gap-6 py-5 md:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">From</p>
          <p className="mt-2 font-['Georgia',_serif] text-[15px] italic text-[#27272F]">{data.agencyName}</p>
          <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-[#777]">{data.agencyAddress}</p>
          {data.showAgencyGstin && <p className="mt-1 text-[11px] text-[#999]">GSTIN {data.agencyGstin}</p>}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">To</p>
          <p className="mt-2 font-['Georgia',_serif] text-[15px] italic text-[#27272F]">{data.clientName}</p>
          <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-[#777]">{data.clientAddress}</p>
          {data.clientTaxId && (
            <p className="mt-1 text-[11px] text-[#999]">{data.clientTaxLabel} {data.clientTaxId}</p>
          )}
        </div>
      </section>

      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Line Items — Editorial card style ── */}
      <section className="py-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">Services</p>

        <div className="mt-4 space-y-0">
          {data.lineItems.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-6 py-3 ${
                i > 0 ? "border-t border-[#EEEBE5] print:border-[#ddd]" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-['Georgia',_serif] text-[14px] italic leading-tight text-[#27272F]">
                  {item.description}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[#999]">
                  {item.type} · {item.qty} × {item.rateFormatted} · {item.unit}
                </p>
              </div>
              <p className="shrink-0 text-[15px] font-medium tabular-nums text-[#27272F]">
                {item.amountFormatted}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Bottom: Totals + Payment ─────────── */}
      <section className="grid gap-6 py-5 md:grid-cols-[minmax(0,1fr)_220px]">
        {/* Left: Notes, License, Bank */}
        <div className="space-y-4 text-[12px] leading-5 text-[#777]">
          {data.hasNotes && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">Notes</p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}

          {data.hasLicense && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">License</p>
              <p className="mt-1.5">
                {data.licenseType}{data.licenseDuration ? ` · ${data.licenseDuration}` : ""}
              </p>
            </div>
          )}

          {data.hasBankDetails && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">Payment</p>
              <div className="mt-1.5 space-y-0.5">
                {!data.isInternational ? (
                  <>
                    {data.bankName && <p>{data.bankName}</p>}
                    {data.accountName && <p>A/C: {data.accountName}</p>}
                    {data.accountNumber && <p>No: {data.accountNumber}</p>}
                    {data.ifscCode && <p>IFSC: {data.ifscCode}</p>}
                  </>
                ) : (
                  <>
                    {data.accountName && <p>Beneficiary: {data.accountName}</p>}
                    {data.bankName && <p>Bank: {data.bankName}</p>}
                    {data.accountNumber && <p>Account: {data.accountNumber}</p>}
                    {data.swiftBicCode && <p>SWIFT: {data.swiftBicCode}</p>}
                    {data.ibanRoutingCode && <p>IBAN: {data.ibanRoutingCode}</p>}
                  </>
                )}
              </div>
            </div>
          )}

          {data.hasQrCode && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">Scan to Pay</p>
              <img src={data.qrCodeUrl} alt="QR" className="mt-2 max-h-24 w-auto" />
            </div>
          )}
        </div>

        {/* Right: Totals */}
        <div className="self-end">
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between text-[#777]">
              <span>Subtotal</span>
              <span className="tabular-nums">{data.subtotalFormatted}</span>
            </div>
            <div className="flex justify-between text-[#777]">
              <span>{data.taxLabel}</span>
              <span className="tabular-nums">{data.taxFormatted}</span>
            </div>
          </div>

          <div className="mt-3 border-t border-[#27272F] pt-3 print:border-black">
            <div className="flex items-baseline justify-between">
              <span className="font-['Georgia',_serif] text-[12px] italic text-[#777]">Total Due</span>
              <span className="font-['Georgia',_serif] text-[28px] font-normal text-[#27272F]">
                {data.grandTotalFormatted}
              </span>
            </div>
          </div>

          {data.approximateUsd && (
            <p className="mt-2 text-right text-[11px] text-[#999]">≈ {data.approximateUsd}</p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-2 text-[10px] leading-4 text-[#999]">{data.taxComplianceNote}</p>
          )}
        </div>
      </section>
    </div>
  );
}
