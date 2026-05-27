/**
 * ─── COASTAL TEMPLATE ──────────────────────────────
 * Ocean-inspired clarity. Deep blue accents, airy spacing,
 * left accent strip, modern sans-serif.
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function CoastalTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#1E293B] bg-white min-h-[295mm] box-border relative flex overflow-visible print:overflow-visible print:min-h-0 print:h-auto">

      {/* ── Left accent strip ─────────────────── */}
      <div className="w-[6px] bg-[#0369A1] shrink-0 print:bg-[#0369A1]" />

      <div className="flex-1 pt-[15mm] px-[15mm] pb-[10mm] pl-[12mm]">

        {/* ── Header ──────────────────────────── */}
        <header className="flex justify-between items-start mb-14">
          <div>
            {data.agencyLogoUrl && (
              <img src={data.agencyLogoUrl} alt="Logo" className="h-12 mb-4 object-contain object-left" />
            )}
            <p className="text-[15px] font-bold">{data.agencyName}</p>
            {data.agencyAddress && data.agencyAddress !== "—" && (
              <p className="text-[11px] text-[#64748B] leading-relaxed whitespace-pre-line mt-1.5 max-w-[260px]">{data.agencyAddress}</p>
            )}
            {(data.agencyState || data.showAgencyGstin || data.agencyPan) && (
              <div className="mt-2 text-[10px] text-[#94A3B8] space-y-0.5">
                {data.agencyState && <p>{data.agencyState?.replace(/\s*\(\d+\)/, '')}</p>}
                {data.showAgencyGstin && <p className="font-normal text-[#0369A1]">GSTIN {data.agencyGstin}</p>}
                {data.agencyPan && <p>PAN {data.agencyPan}</p>}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="inline-block bg-[#0369A1] text-white print:bg-transparent print:text-[#0369A1] print:border-2 print:border-[#0369A1] px-4 py-1.5 mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em]">Invoice</p>
            </div>
            <p className="text-[18px] font-bold">{data.invoiceNumber}</p>
            {data.poNumber && <><p className="text-[11px] font-bold uppercase tracking-[0.15em] mt-3">PO Number</p><p className="text-[16px] font-bold">{data.poNumber}</p></>}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-end gap-8 text-[11px]">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#94A3B8]">Issued</p>
                  <p className="font-normal">{data.invoiceDate}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#94A3B8]">Due</p>
                  <p className="font-normal text-[#DC2626]">{data.dueDate}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Client ──────────────────────────── */}
        <section className="mb-12 pb-8 border-b border-[#E2E8F0]">
          <div className="grid grid-cols-[1fr_180px] gap-10">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0369A1] mb-3">Billed to</p>
              <p className="text-[16px] font-bold">{data.clientName}</p>
              {data.clientAddress && data.clientAddress !== "—" && (
                <p className="text-[11px] text-[#64748B] leading-relaxed whitespace-pre-line mt-1">{data.clientAddress}</p>
              )}
              <div className="mt-2 text-[10px] text-[#94A3B8] flex gap-4">
                {data.clientState && <span>{data.clientState?.replace(/\s*\(\d+\)/, '')}</span>}
                {data.clientTaxId && <span>{data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')}: {data.clientTaxId}</span>}
              </div>
            </div>
            <div className="text-right self-end">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] mb-1">Terms</p>
              <p className="text-[12px] font-normal">{data.paymentTerms}</p>
              {data.isInternational && <p className="mt-1 text-[10px] font-bold text-[#0369A1]">Currency: {data.displayCurrency}</p>}
            </div>
          </div>
        </section>

        {/* ── Line Items ──────────────────────── */}
        <section className="mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#0369A1]">
                <th className="py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0369A1] text-left">Description</th>
                <th className="py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0369A1] text-center w-[50px]">Qty</th>
                <th className="py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0369A1] text-right w-[100px]">Rate</th>
                <th className="py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0369A1] text-right w-[120px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item) => {
                if (item.isMilestoneHeader) {
                  const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                  if (milestoneHeaderCount <= 1) return null;

                  return (
                    <tr key={item.id} className="bg-[#F0F9FF]">
                      <td colSpan={3} className="py-4 px-3">
                        <p className="text-[9px] uppercase tracking-[0.15em] text-[#0369A1] mb-0.5">Milestone</p>
                        <p className="text-[13px] font-bold capitalize">{item.description}</p>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <p className="text-[9px] text-[#94A3B8] mb-0.5">Subtotal</p>
                        <p className="text-[13px] font-bold">{item.groupSubtotalFormatted}</p>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={item.id} className="border-b border-[#F1F5F9]">
                    <td className="py-5 pr-6">
                      <p className="font-bold text-[13px]">{item.description}</p>
                      <div className="mt-1 text-[10px] text-[#94A3B8] flex gap-3">
                        {item.type && <span>{item.type}</span>}
                        {item.sacCode && <span>SAC: {item.sacCode}</span>}
                        {item.unit && <span>{item.unit}</span>}
                      </div>
                    </td>
                    <td className="py-5 text-center text-[12px] font-normal">{item.qty}</td>
                    <td className="py-5 text-right text-[12px]">{item.rateFormatted}</td>
                    <td className="py-5 text-right text-[13px] font-bold">{item.amountFormatted}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ── Totals ──────────────────────────── */}
        <section className="flex justify-end mb-14">
          <div className="w-[280px] space-y-2">
            <MilestoneSummaryBlock data={data} />
            <div className="flex justify-between text-[11px] text-[#64748B]">
              <span>Subtotal</span><span className="font-bold text-[#1E293B]">{data.subtotalFormatted}</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#64748B]">
              <span>{data.taxLabel}</span><span className="font-bold text-[#1E293B]">{data.taxFormatted}</span>
            </div>
            <div className="pt-3 border-t-2 border-[#0369A1] flex justify-between items-baseline">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Total due</span>
              <span className="text-[26px] font-bold text-[#0369A1]">{data.grandTotalFormatted}</span>
            </div>
            {data.amountInWords && <p className="text-right text-[10px] text-[#94A3B8] italic">{data.amountInWords}</p>}
            {data.approximateUsd && <p className="text-right text-[10px] text-[#94A3B8]">≈ {data.approximateUsd}</p>}
          </div>
        </section>

        {/* ── Footer ──────────────────────────── */}
        <section className="grid grid-cols-2 gap-12 items-start border-t border-[#E2E8F0] pt-8">
          <div className="space-y-5">
            {data.hasBankDetails && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0369A1] mb-2">Bank details</p>
                <div className="text-[11px] text-[#64748B] space-y-0.5">
                  <p className="font-bold text-[#1E293B]">{data.bankName}</p>
                  {!data.isInternational ? (<><p>Account: {data.accountNumber}</p><p>IFSC: {data.ifscCode}</p></>) : (<><p>SWIFT: {data.swiftBicCode}</p><p>Account: {data.accountNumber}</p></>)}
                </div>
              </div>
            )}
            {data.hasNotes && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] mb-1">Notes</p>
                <p className="text-[10px] text-[#64748B] leading-relaxed whitespace-pre-line">{data.notes}</p>
              </div>
            )}
            {data.hasQrCode && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] mb-2">Payment QR</p>
                <img src={data.qrCodeUrl} alt="QR" className="h-16 w-16 object-contain" />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] mb-5">Authorized signatory</p>
            {data.signatureUrl ? (
              <img src={data.signatureUrl} alt="Sig" className="h-10 w-auto object-contain ml-auto mb-2 brightness-0" />
            ) : (
              <p className="text-[18px] font-bold mb-2">{data.authorizedSignatory || data.agencyName}</p>
            )}
            <div className="h-px w-40 bg-[#0369A1] ml-auto mb-1" />
            <p className="text-[8px] text-[#94A3B8] uppercase tracking-widest">Digital signature</p>
          </div>
        </section>

        {data.reverseCharge && (
          <div className="mt-8 border border-[#0369A1] px-5 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0369A1]">★ Tax is payable on reverse charge basis ★</p>
          </div>
        )}

        <LegalDisclaimer />
        <InvoiceWatermark />
      </div>
    </div>
  );
}
