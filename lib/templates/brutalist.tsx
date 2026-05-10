/**
 * ─── BRUTALIST TEMPLATE ────────────────────────────
 * Raw concrete aesthetic. Heavy borders, all-caps headings,
 * asymmetric grid, no decoration. Maximum clarity.
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function BrutalistTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['Space_Grotesk',_'DM_Sans',_sans-serif] text-black bg-white min-h-[297mm] p-[15mm] box-border relative">
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* ── Header: asymmetric split ─────────── */}
      <header className="mb-10">
        <div className="border-b-4 border-black pb-6">
          <div className="flex justify-between items-end">
            <div>
              {data.agencyLogoUrl && (
                <img src={data.agencyLogoUrl} alt="Logo" className="h-12 mb-4 object-contain brightness-0" />
              )}
              <p className="text-[32px] font-bold leading-none tracking-[-0.04em] uppercase">{data.agencyName}</p>
            </div>
            <div className="text-right">
              <p className="text-[72px] font-bold leading-none tracking-[-0.06em] text-black/10">INV</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-0 border-b-2 border-black">
          <div className="border-r-2 border-black py-3 pr-4">
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">Number</p>
            <p className="text-[13px] font-bold mt-1">{data.invoiceNumber}</p>
          </div>
          <div className="border-r-2 border-black py-3 px-4">
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">Date</p>
            <p className="text-[13px] font-bold mt-1">{data.invoiceDate}</p>
          </div>
          <div className="border-r-2 border-black py-3 px-4">
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">Due</p>
            <p className="text-[13px] font-bold mt-1 text-red-600">{data.dueDate}</p>
          </div>
          <div className="py-3 pl-4">
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">Terms</p>
            <p className="text-[13px] font-bold mt-1">{data.paymentTerms}</p>
          </div>
        </div>
      </header>

      {/* ── From / To ─────────────────────────── */}
      <section className="grid grid-cols-2 gap-0 mb-10 border-2 border-black">
        <div className="p-5 border-r-2 border-black">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40 mb-3">From</p>
          <p className="text-[11px] leading-relaxed whitespace-pre-line">{data.agencyAddress}</p>
          {data.agencyState && <p className="text-[10px] text-black/50 mt-1">{data.agencyState?.replace(/\s*\(\d+\)/, '')}</p>}
          {data.showAgencyGstin && <p className="text-[10px] font-bold mt-1">GSTIN {data.agencyGstin}</p>}
          {data.agencyPan && <p className="text-[10px] text-black/50">PAN {data.agencyPan}</p>}
        </div>
        <div className="p-5">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40 mb-3">To</p>
          <p className="text-[14px] font-bold">{data.clientName}</p>
          <p className="text-[11px] text-black/60 leading-relaxed whitespace-pre-line mt-1">{data.clientAddress}</p>
          {data.clientState && <p className="text-[10px] text-black/40 mt-1">{data.clientState?.replace(/\s*\(\d+\)/, '')}</p>}
          {data.clientTaxId && <p className="text-[10px] mt-0.5">{data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')}: {data.clientTaxId}</p>}
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-10">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-black text-white">
              <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-left">Item</th>
              <th className="py-3 px-2 text-[9px] font-bold uppercase tracking-[0.15em] text-center w-[50px]">Qty</th>
              <th className="py-3 px-2 text-[9px] font-bold uppercase tracking-[0.15em] text-right w-[100px]">Rate</th>
              <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-right w-[120px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => {
              if (item.isMilestoneHeader) {
                return (
                  <tr key={item.id} className="bg-black/5 border-b-2 border-black">
                    <td colSpan={3} className="py-3 px-4">
                      <p className="text-[12px] font-bold uppercase tracking-wider capitalize">▮ {item.description}</p>
                    </td>
                    <td className="py-3 px-4 text-right text-[12px] font-bold">{item.groupSubtotalFormatted}</td>
                  </tr>
                );
              }
              return (
                <tr key={item.id} className="border-b border-black/20">
                  <td className="py-4 px-4">
                    <p className="font-medium text-[12px]">{item.description}</p>
                    <div className="mt-0.5 text-[9px] text-black/40 flex gap-3">
                      {item.type && <span>{item.type}</span>}
                      {item.sacCode && <span>SAC:{item.sacCode}</span>}
                      {item.unit && <span>{item.unit}</span>}
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center text-[12px] font-medium">{item.qty}</td>
                  <td className="py-4 px-2 text-right text-[12px]">{item.rateFormatted}</td>
                  <td className="py-4 px-4 text-right text-[13px] font-bold">{item.amountFormatted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Totals ────────────────────────────── */}
      <section className="flex justify-end mb-12">
        <div className="w-[280px] border-2 border-black p-4 space-y-2">
          <MilestoneSummaryBlock data={data} />
          <div className="flex justify-between text-[11px]">
            <span className="text-black/50">Subtotal</span><span className="font-bold">{data.subtotalFormatted}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-black/50">{data.taxLabel}</span><span className="font-bold">{data.taxFormatted}</span>
          </div>
          <div className="pt-3 border-t-4 border-black flex justify-between items-baseline">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Total</span>
            <span className="text-[28px] font-bold tracking-tight">{data.grandTotalFormatted}</span>
          </div>
          {data.amountInWords && <p className="text-[9px] text-black/40 italic text-right">{data.amountInWords}</p>}
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <section className="grid grid-cols-2 gap-0 border-2 border-black">
        <div className="p-5 border-r-2 border-black space-y-4">
          {data.hasBankDetails && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40 mb-1">Bank</p>
              <div className="text-[11px] space-y-0.5">
                <p className="font-bold">{data.bankName}</p>
                {!data.isInternational ? (<><p>Acc: {data.accountNumber}</p><p>IFSC: {data.ifscCode}</p></>) : (<><p>SWIFT: {data.swiftBicCode}</p><p>Acc: {data.accountNumber}</p></>)}
              </div>
            </div>
          )}
          {data.hasNotes && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40 mb-1">Notes</p>
              <p className="text-[10px] text-black/60 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasQrCode && <img src={data.qrCodeUrl} alt="QR" className="h-16 w-16 object-contain" />}
        </div>
        <div className="p-5 flex flex-col items-end justify-end">
          {data.signatureUrl ? (
            <img src={data.signatureUrl} alt="Sig" className="h-10 w-auto object-contain mb-2 brightness-0" />
          ) : (
            <p className="text-[18px] font-bold mb-2 uppercase">{data.authorizedSignatory || data.agencyName}</p>
          )}
          <div className="h-[2px] w-40 bg-black mb-1" />
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">Authorized signatory</p>
        </div>
      </section>

      {data.reverseCharge && (
        <div className="mt-8 bg-black text-white px-5 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">★ Tax is payable on reverse charge basis ★</p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
