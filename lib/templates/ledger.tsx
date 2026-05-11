/**
 * ─── LEDGER TEMPLATE ───────────────────────────────
 * Traditional accounting ledger. Serif font, ruled lines,
 * alternating row stripes, formal structure.
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function LedgerTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['Lora',_'Georgia',_serif] text-[#1a1a1a] bg-[#FDFBF7] min-h-[295mm] pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Header ────────────────────────────── */}
      <header className="text-center mb-12 pb-8 border-b border-double border-[#8B7355]" style={{ borderBottomWidth: '3px' }}>
        {data.agencyLogoUrl && (
          <img src={data.agencyLogoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-[26px] font-bold tracking-[0.08em] uppercase">{data.agencyName}</h1>
        {data.agencyAddress && data.agencyAddress !== "—" && (
          <p className="text-[11px] text-[#8B7355] mt-2 max-w-[400px] mx-auto leading-relaxed">{data.agencyAddress}</p>
        )}
        <div className="mt-2 text-[10px] text-[#A89070] flex justify-center gap-4">
          {data.agencyState && <span>{data.agencyState?.replace(/\s*\(\d+\)/, '')}</span>}
          {data.showAgencyGstin && <span className="font-semibold text-[#6B5B3E]">GSTIN: {data.agencyGstin}</span>}
          {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
        </div>
      </header>

      {/* ── Invoice Title + Meta ──────────────── */}
      <div className="text-center mb-10">
        <p className="text-[14px] font-bold uppercase tracking-[0.3em] text-[#8B7355]">Tax Invoice</p>
        <p className="text-[18px] font-bold mt-2">{data.invoiceNumber}</p>
      </div>

      <div className="grid grid-cols-3 gap-0 mb-10 border border-[#D4C5A9] text-[11px]">
        <div className="p-3 border-r border-[#D4C5A9] text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#A89070]">Invoice date</p>
          <p className="font-semibold mt-1">{data.invoiceDate}</p>
        </div>
        <div className="p-3 border-r border-[#D4C5A9] text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#A89070]">Due date</p>
          <p className="font-semibold mt-1 text-[#8B3A3A]">{data.dueDate}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#A89070]">Payment terms</p>
          <p className="font-semibold mt-1">{data.paymentTerms}</p>
        </div>
      </div>

      {/* ── Billed To ─────────────────────────── */}
      <section className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#A89070] mb-2 font-semibold">Billed to</p>
        <div className="border-l-2 border-[#8B7355] pl-4">
          <p className="text-[15px] font-bold">{data.clientName}</p>
          {data.clientAddress && data.clientAddress !== "—" && (
            <p className="text-[11px] text-[#6B5B3E] leading-relaxed whitespace-pre-line mt-1">{data.clientAddress}</p>
          )}
          <div className="mt-1 text-[10px] text-[#A89070] flex gap-4">
            {data.clientState && <span>{data.clientState?.replace(/\s*\(\d+\)/, '')}</span>}
            {data.clientTaxId && <span>{data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')}: {data.clientTaxId}</span>}
          </div>
          {data.isInternational && <p className="mt-1 text-[10px] font-semibold">Currency: {data.displayCurrency}</p>}
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-10">
        <table className="w-full border-collapse border border-[#D4C5A9]">
          <thead>
            <tr className="bg-[#F0EADB]">
              <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[#6B5B3E] text-left border-b border-[#D4C5A9]">Particulars</th>
              <th className="py-3 px-2 text-[9px] font-bold uppercase tracking-widest text-[#6B5B3E] text-center w-[50px] border-b border-[#D4C5A9]">Qty</th>
              <th className="py-3 px-2 text-[9px] font-bold uppercase tracking-widest text-[#6B5B3E] text-right w-[100px] border-b border-[#D4C5A9]">Rate (₹)</th>
              <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[#6B5B3E] text-right w-[120px] border-b border-[#D4C5A9]">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item, idx) => {
              if (item.isMilestoneHeader) {
                const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                if (milestoneHeaderCount <= 1) return null;

                return (
                  <tr key={item.id} className="bg-[#F0EADB]/60 border-b border-[#D4C5A9]">
                    <td colSpan={3} className="py-3 px-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider capitalize">§ {item.description}</p>
                    </td>
                    <td className="py-3 px-4 text-right text-[12px] font-bold">{item.groupSubtotalFormatted}</td>
                  </tr>
                );
              }
              return (
                <tr key={item.id} className={`border-b border-[#E8DFC9] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFBF7]'}`}>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-[12px]">{item.description}</p>
                    <div className="mt-0.5 font-['DM_Sans',sans-serif] text-[9px] text-[#A89070] flex gap-3">
                      {item.type && <span>{item.type}</span>}
                      {item.sacCode && <span>HSN/SAC: {item.sacCode}</span>}
                      {item.unit && <span>{item.unit}</span>}
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center text-[12px] font-medium">{item.qty}</td>
                  <td className="py-4 px-2 text-right text-[12px]">{item.rateFormatted}</td>
                  <td className="py-4 px-4 text-right text-[12px] font-bold">{item.amountFormatted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Totals ────────────────────────────── */}
      <section className="flex justify-end mb-14">
        <div className="w-[300px] border border-[#D4C5A9]">
          <div className="p-3"><MilestoneSummaryBlock data={data} /></div>
          <div className="flex justify-between px-4 py-2 text-[11px] border-t border-[#E8DFC9]">
            <span className="text-[#A89070]">Subtotal</span><span className="font-semibold">{data.subtotalFormatted}</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-[11px] border-t border-[#E8DFC9]">
            <span className="text-[#A89070]">{data.taxLabel}</span><span className="font-semibold">{data.taxFormatted}</span>
          </div>
          <div className="flex justify-between px-4 py-3 bg-[#F0EADB] border-t-2 border-[#8B7355] items-baseline">
            <span className="text-[10px] font-bold uppercase tracking-widest">Grand total</span>
            <span className="text-[24px] font-bold text-[#6B3A1F]">{data.grandTotalFormatted}</span>
          </div>
          {data.amountInWords && (
            <div className="px-4 py-2 text-[10px] italic text-[#8B7355] text-right border-t border-[#E8DFC9]">{data.amountInWords}</div>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <section className="grid grid-cols-2 gap-10 items-start border-t border-double border-[#8B7355] pt-8" style={{ borderTopWidth: '3px' }}>
        <div className="space-y-5">
          {data.hasBankDetails && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#A89070] mb-1">Bank details</p>
              <div className="text-[11px] text-[#6B5B3E] space-y-0.5">
                <p className="font-bold text-[#1a1a1a]">{data.bankName}</p>
                {!data.isInternational ? (<><p>A/C No: {data.accountNumber}</p><p>IFSC: {data.ifscCode}</p></>) : (<><p>SWIFT: {data.swiftBicCode}</p><p>A/C No: {data.accountNumber}</p></>)}
              </div>
            </div>
          )}
          {data.hasNotes && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#A89070] mb-1">Remarks</p>
              <p className="text-[10px] text-[#8B7355] leading-relaxed whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasQrCode && <img src={data.qrCodeUrl} alt="QR" className="h-16 w-16 object-contain" />}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#A89070] mb-5">For {data.agencyName}</p>
          {data.signatureUrl ? (
            <img src={data.signatureUrl} alt="Sig" className="h-10 w-auto object-contain ml-auto mb-2" />
          ) : (
            <p className="text-[18px] font-bold mb-2">{data.authorizedSignatory || data.agencyName}</p>
          )}
          <div className="h-px w-44 bg-[#8B7355] ml-auto mb-1" />
          <p className="text-[8px] text-[#A89070] uppercase tracking-widest">Authorized signatory</p>
        </div>
      </section>

      {data.reverseCharge && (
        <div className="mt-8 border-2 border-[#8B7355] px-5 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest">★ Tax is payable on reverse charge basis ★</p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
