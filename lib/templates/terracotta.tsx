/**
 * ─── TERRACOTTA TEMPLATE ──────────────────────────
 *
 * Design: "The artisan's receipt."
 * Warm earth tones, rounded corners, hand-crafted feel.
 * Like receiving an invoice from a ceramic studio
 * in Pondicherry or a leather workshop in Jodhpur.
 *
 * Key elements:
 * • 5px terracotta (#C75B39) bar at top — warm, grounded
 * • Warm cream (#FFF8F3) section backgrounds
 * • Rounded corners (8px) on all containers
 * • Terracotta left-border cards for line items
 * • Handwritten-style "Thank you" footer note
 * • Soft, warm typography — approachable not corporate
 * • Print: cream → white, terracotta borders preserved
 */

import type { InvoiceTemplateProps } from "./template-types";

export default function TerracottaTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#3D2517]">
      {/* ── Terracotta bar ────────────────────── */}
      <div className="h-[5px] w-full rounded-t-sm bg-[#C75B39] print:bg-[#999]" />

      {/* ── Header ────────────────────────────── */}
      <header className="rounded-b-lg bg-[#FFF8F3] px-5 py-5 print:bg-[#fafafa]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            {data.agencyLogoUrl && (
              <img src={data.agencyLogoUrl} alt="Logo" className="mb-3 max-h-10 w-auto object-contain" />
            )}
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Studio</p>
            <h1 className="mt-1 text-[24px] font-bold leading-none tracking-tight text-[#3D2517]">
              {data.agencyName}
            </h1>
            <p className="mt-2 max-w-md whitespace-pre-line text-[12px] leading-5 text-[#8B6F5E]">
              {data.agencyAddress}
            </p>
            {(data.agencyState || data.showAgencyGstin) && (
              <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-[#B09080]">
                {data.agencyState && <span>State: {data.agencyState}</span>}
                {data.showAgencyGstin && <span>GSTIN: {data.agencyGstin}</span>}
                {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-lg border border-[#E8D5C4] bg-white px-4 py-3 text-right print:border-[#ddd]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Invoice</p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-[#3D2517]">{data.invoiceNumber}</p>
            <div className="mt-2 space-y-1 text-[11px] text-[#8B6F5E]">
              <p>{data.invoiceDate}</p>
              <p>Due {data.dueDate}</p>
              <p>{data.paymentTerms}</p>
              {data.isInternational && <p>{data.displayCurrency}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* ── Parties — Warm cards ──────────────── */}
      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#E8D5C4] bg-[#FFF8F3] px-4 py-3 print:bg-[#fafafa] print:border-[#ddd]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">From</p>
          <p className="mt-1.5 text-[14px] font-semibold text-[#3D2517]">{data.agencyName}</p>
          <p className="mt-1 whitespace-pre-line text-[12px] text-[#8B6F5E]">{data.agencyAddress}</p>
        </div>
        <div className="rounded-lg border border-[#E8D5C4] bg-[#FFF8F3] px-4 py-3 print:bg-[#fafafa] print:border-[#ddd]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Bill To</p>
          <p className="mt-1.5 text-[14px] font-semibold text-[#3D2517]">{data.clientName}</p>
          <p className="mt-1 whitespace-pre-line text-[12px] text-[#8B6F5E]">{data.clientAddress}</p>
          {data.clientTaxId && (
            <p className="mt-1 text-[10px] text-[#B09080]">{data.clientTaxLabel}: {data.clientTaxId}</p>
          )}
        </div>
      </section>

      {/* ── Line Items — Left-border accent ──── */}
      <section className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Work Delivered</p>

        <div className="mt-3 space-y-2">
          {data.lineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-[#E8D5C4] border-l-[4px] border-l-[#C75B39] bg-white px-4 py-3 print:border-l-[#999]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#3D2517]">{item.description}</p>
                <p className="mt-0.5 text-[10px] text-[#B09080]">
                  {item.type} · {item.qty} × {item.rateFormatted} · {item.unit}
                </p>
                <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-[#C9B5A5]">SAC {item.sacCode}</p>
              </div>
              <p className="shrink-0 text-[15px] font-bold tabular-nums text-[#3D2517]">{item.amountFormatted}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom ────────────────────────────── */}
      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Left */}
        <div className="space-y-3 text-[12px] text-[#8B6F5E]">
          {data.hasNotes && (
            <div className="rounded-lg border border-[#E8D5C4] bg-[#FFF8F3] px-4 py-3 print:bg-[#fafafa]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Notes</p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasLicense && (
            <div className="rounded-lg border border-[#E8D5C4] bg-[#FFF8F3] px-4 py-3 print:bg-[#fafafa]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">License</p>
              <p className="mt-1.5">{data.licenseType}{data.licenseDuration ? ` · ${data.licenseDuration}` : ""}</p>
            </div>
          )}
          {data.hasBankDetails && (
            <div className="rounded-lg border border-[#E8D5C4] bg-[#FFF8F3] px-4 py-3 print:bg-[#fafafa]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Payment</p>
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
            <div className="rounded-lg border border-[#E8D5C4] bg-[#FFF8F3] px-4 py-3 print:bg-[#fafafa]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Scan to Pay</p>
              <img src={data.qrCodeUrl} alt="QR" className="mt-2 max-h-24 w-auto" />
            </div>
          )}
        </div>

        {/* Right: Totals */}
        <div>
          <div className="rounded-lg border border-[#E8D5C4] bg-[#FFF8F3] px-4 py-3 print:bg-[#fafafa]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C75B39]">Amount Due</p>
            <div className="mt-3 space-y-2 text-[12px] text-[#8B6F5E]">
              <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums font-medium text-[#3D2517]">{data.subtotalFormatted}</span></div>
              <div className="flex justify-between"><span>{data.taxLabel}</span><span className="tabular-nums font-medium text-[#3D2517]">{data.taxFormatted}</span></div>
            </div>
            <div className="mt-3 rounded-md bg-[#C75B39] px-3 py-2.5 text-right text-white print:bg-[#eee] print:text-[#111]">
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/60 print:text-[#888]">Grand Total</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums">{data.grandTotalFormatted}</p>
            </div>
          </div>
          {data.approximateUsd && (
            <p className="mt-2 text-right text-[10px] text-[#B09080]">≈ {data.approximateUsd}</p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-2 text-[10px] text-[#B09080]">{data.taxComplianceNote}</p>
          )}
        </div>
      </section>

      {/* ── Warm footer ──────────────────────── */}
      <div className="mt-5 text-center text-[11px] italic text-[#C9B5A5]">
        Thank you for your patronage ✦
      </div>
    </div>
  );
}
