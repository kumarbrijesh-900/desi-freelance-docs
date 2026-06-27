/**
 * ─── SAKURA TEMPLATE ───────────────────────────────
 * Elegant Japanese-inspired minimalism. Soft rose palette,
 * generous whitespace, refined serif headings.
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function SakuraTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[color:var(--color-ink)] bg-[color:var(--color-paper-2)] min-h-[295mm] tabular-nums pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">

      {/* ── Soft rose accent line ─────────────── */}
      <div className="h-[3px] w-24 bg-[#E11D48] mb-12 rounded-full" />

      {/* ── Header ────────────────────────────── */}
      <header className="flex justify-between items-start mb-16">
        <div>
          {data.agencyLogoUrl && (
            <img src={data.agencyLogoUrl} alt="Logo" className="h-12 mb-5 object-contain object-left" />
          )}
          <p className="text-[16px] font-bold tracking-[-0.02em]">{data.agencyName}</p>
          {data.agencyAddress && data.agencyAddress !== "—" && (
            <p className="text-[11px] text-[color:var(--color-ink-2)] leading-relaxed whitespace-pre-line mt-2 max-w-[260px]">{data.agencyAddress}</p>
          )}
          {(data.agencyState || data.showAgencyGstin || data.agencyPan) && (
            <div className="mt-2 text-[10px] text-[color:var(--color-ink-2)] space-y-0.5">
              {data.agencyState && <p>{data.agencyState}</p>}
              {data.showAgencyGstin && <p className="text-[#E11D48]">GSTIN {data.agencyGstin}</p>}
              {data.agencyPan && <p>PAN {data.agencyPan}</p>}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E11D48] mb-3">Invoice</p>
          <p className="text-[20px] font-bold tracking-tight">{data.invoiceNumber}</p>
          {data.poNumber && <><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E11D48] mb-1 mt-3">PO Number</p><p className="text-[16px] font-bold tracking-tight">{data.poNumber}</p></>}
          <div className="mt-4 space-y-2">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">Date</p>
              <p className="text-[12px] font-normal">{data.invoiceDate}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">Due</p>
              <p className="text-[12px] font-normal text-[#E11D48]">{data.dueDate}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Client ────────────────────────────── */}
      <section className="mb-14 pb-8 border-b border-[#F5E6EA]">
        <div className="grid grid-cols-[1fr_180px] gap-10">
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)] mb-3">Billed to</p>
            <p className="text-[16px] font-bold">{data.clientName}</p>
            {data.clientAddress && data.clientAddress !== "—" && (
              <p className="text-[11px] text-[color:var(--color-ink-2)] leading-relaxed whitespace-pre-line mt-1 max-w-[300px]">{data.clientAddress}</p>
            )}
            <div className="mt-2 text-[10px] text-[color:var(--color-ink-2)] flex gap-4">
              {data.clientState && <span className="font-semibold">Place of Supply: {data.clientState}</span>}
              {data.clientTaxId && <span>{data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')}: {data.clientTaxId}</span>}
            </div>
          </div>
          <div className="text-right self-end">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)] mb-1">Terms</p>
            <p className="text-[12px] font-normal">{data.paymentTerms}</p>
            {data.isInternational && <p className="mt-1 text-[10px] font-bold">Currency: {data.displayCurrency}</p>}
          </div>
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-14">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E11D48]/20">
              <th className="py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] text-left">Description</th>
              <th className="py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] text-center w-[50px]">Qty</th>
              <th className="py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] text-right w-[100px]">Rate</th>
              <th className="py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] text-right w-[120px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => {
              if (item.isMilestoneHeader) {
                const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                if (milestoneHeaderCount <= 1) return null;

                return (
                  <tr key={item.id} className="bg-[#FDF2F4]">
                    <td colSpan={3} className="py-4 px-4">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#E11D48] mb-0.5">Milestone</p>
                      <p className="text-[14px] font-bold capitalize">{item.description}</p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[color:var(--color-ink-2)] mb-0.5">Subtotal</p>
                      <p className="text-[13px] font-bold">{item.groupSubtotalFormatted}</p>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={item.id} className="border-b border-[#F5E6EA]">
                  <td className="py-5 pr-6">
                    <p className="font-bold text-[13px]">{item.description}</p>
                    <div className="mt-1 text-[10px] text-[color:var(--color-ink-2)] flex gap-3">
                      {item.type && <span>{item.type}</span>}
                      {item.sacCode && <span>SAC: {item.sacCode}</span>}
                      {item.unit && <span>{item.unit}</span>}
                    </div>
                  </td>
                  <td className="py-5 text-center text-[12px]">{item.qty}</td>
                  <td className="py-5 text-right text-[12px]">{item.rateFormatted}</td>
                  <td className="py-5 text-right text-[13px] font-bold">{item.amountFormatted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Totals ────────────────────────────── */}
      <section className="flex justify-end mb-16">
        <div className="w-[280px] space-y-2">
          <MilestoneSummaryBlock data={data} />
          <div className="flex justify-between text-[11px] text-[color:var(--color-ink-2)]">
            <span>Subtotal</span><span className="font-bold text-[color:var(--color-ink)]">{data.subtotalFormatted}</span>
          </div>
          {data.taxRows.map((row) => (
            <div key={row.label} className="flex justify-between text-[11px] text-[color:var(--color-ink-2)]">
              <span>{row.label}</span><span className="font-bold text-[color:var(--color-ink)]">{row.amountFormatted}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-[#E11D48]/30 flex justify-between items-baseline">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Total due</span>
            <span className="text-[26px] font-bold text-[#E11D48]">{data.grandTotalFormatted}</span>
          </div>
          {data.amountInWords && <p className="text-right text-[10px] text-[color:var(--color-ink-2)] italic">{data.amountInWords}</p>}
          {data.approximateUsd && <p className="text-right text-[10px] text-[color:var(--color-ink-2)]">≈ {data.approximateUsd}</p>}
          {data.taxComplianceNote && <p className="text-right text-[10px] text-[color:var(--color-ink-2)] leading-4 mt-1">{data.taxComplianceNote}</p>}
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <section className="grid grid-cols-2 gap-14 items-start">
        <div className="space-y-6">
          {data.hasBankDetails && (
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)] mb-2">Bank details</p>
              <div className="text-[11px] text-[color:var(--color-ink-2)] space-y-0.5">
                <p className="font-bold text-[color:var(--color-ink)]">{data.bankName}</p>
                {!data.isInternational ? (<><p>Account: {data.accountNumber}</p><p>IFSC: {data.ifscCode}</p></>) : (<><p>SWIFT: {data.swiftBicCode}</p><p>Account: {data.accountNumber}</p></>)}
              </div>
            </div>
          )}
          {data.hasNotes && (
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)] mb-1">Notes</p>
              <p className="text-[10px] text-[color:var(--color-ink-2)] leading-relaxed whitespace-pre-line max-w-[300px]">{data.notes}</p>
            </div>
          )}
          {data.hasQrCode && (
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)] mb-2">Payment QR</p>
              <img src={data.qrCodeUrl} alt="QR" className="h-16 w-16 object-contain" />
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)] mb-5">Authorized signatory</p>
          {data.signatureUrl ? (
            <img src={data.signatureUrl} alt="Sig" className="h-10 w-auto object-contain ml-auto mb-2 brightness-0" />
          ) : (
            <p className="text-[18px] font-bold mb-2">{data.authorizedSignatory || data.agencyName}</p>
          )}
          <div className="h-px w-40 bg-[#E11D48]/30 ml-auto mb-1" />
          <p className="text-[8px] text-[color:var(--color-ink-2)] uppercase tracking-widest">Digital signature</p>
        </div>
      </section>

      {data.reverseCharge && (
        <div className="mt-10 border border-[#E11D48] px-5 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">★ Tax is payable on reverse charge basis ★</p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
