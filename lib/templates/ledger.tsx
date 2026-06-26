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
    <div className="font-['Lora',_'Georgia',_serif] text-[color:var(--color-ink)] bg-[color:var(--color-paper-2)] min-h-[295mm] tabular-nums pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Header ────────────────────────────── */}
      <header className="text-center mb-12 pb-8 border-b border-double border-[color:var(--color-strong)]" style={{ borderBottomWidth: '3px' }}>
        {data.agencyLogoUrl && (
          <img src={data.agencyLogoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-[26px] font-bold tracking-[0.08em] uppercase">{data.agencyName}</h1>
        {data.agencyAddress && data.agencyAddress !== "—" && (
          <p className="text-[11px] text-[color:var(--color-ink-2)] mt-2 max-w-[400px] mx-auto leading-relaxed">{data.agencyAddress}</p>
        )}
        <div className="mt-2 text-[10px] text-[color:var(--color-ink-2)] flex justify-center gap-4">
          {data.agencyState && <span>{data.agencyState}</span>}
          {data.showAgencyGstin && <span className="font-bold text-[color:var(--color-ink-2)]">GSTIN: {data.agencyGstin}</span>}
          {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
        </div>
      </header>

      {/* ── Invoice Title + Meta ──────────────── */}
      <div className="text-center mb-10">
        <p className="text-[14px] font-bold uppercase tracking-[0.3em] text-[color:var(--color-ink-2)]">Tax Invoice</p>
        <p className="text-[18px] font-bold mt-2">{data.invoiceNumber}</p>
        {data.poNumber && <><p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mt-4">PO Number</p><p className="text-[16px] font-bold mt-1">{data.poNumber}</p></>}
      </div>

      <div className="grid grid-cols-3 gap-0 mb-10 border border-[color:var(--color-soft)] text-[11px]">
        <div className="p-3 border-r border-[color:var(--color-soft)] text-center">
          <p className="text-[9px] uppercase tracking-widest text-[color:var(--color-ink-2)]">Invoice date</p>
          <p className="font-bold mt-1">{data.invoiceDate}</p>
        </div>
        <div className="p-3 border-r border-[color:var(--color-soft)] text-center">
          <p className="text-[9px] uppercase tracking-widest text-[color:var(--color-ink-2)]">Due date</p>
          <p className="font-bold mt-1 text-[color:var(--color-ochre-deep)]">{data.dueDate}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[9px] uppercase tracking-widest text-[color:var(--color-ink-2)]">Payment terms</p>
          <p className="font-bold mt-1">{data.paymentTerms}</p>
        </div>
      </div>

      {/* ── Billed To ─────────────────────────── */}
      <section className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-2 font-bold">Billed to</p>
        <div className="border-l-2 border-[color:var(--color-strong)] pl-4">
          <p className="text-[15px] font-bold">{data.clientName}</p>
          {data.clientAddress && data.clientAddress !== "—" && (
            <p className="text-[11px] text-[color:var(--color-ink-2)] leading-relaxed whitespace-pre-line mt-1">{data.clientAddress}</p>
          )}
          <div className="mt-1 text-[10px] text-[color:var(--color-ink-2)] flex gap-4">
            {data.clientState && <span className="font-semibold">Place of Supply: {data.clientState}</span>}
            {data.clientTaxId && <span>{data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')}: {data.clientTaxId}</span>}
          </div>
          {data.isInternational && <p className="mt-1 text-[10px] font-bold">Currency: {data.displayCurrency}</p>}
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-10">
        <table className="w-full border-collapse border border-[color:var(--color-soft)]">
          <thead>
            <tr className="bg-[color:var(--color-paper)]">
              <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] text-left border-b border-[color:var(--color-soft)]">Particulars</th>
              <th className="py-3 px-2 text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] text-center w-[50px] border-b border-[color:var(--color-soft)]">Qty</th>
              <th className="py-3 px-2 text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] text-right w-[100px] border-b border-[color:var(--color-soft)]">Rate (₹)</th>
              <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] text-right w-[120px] border-b border-[color:var(--color-soft)]">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item, idx) => {
              if (item.isMilestoneHeader) {
                const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                if (milestoneHeaderCount <= 1) return null;

                return (
                  <tr key={item.id} className="bg-[color:var(--color-paper-2)] border-b border-[color:var(--color-soft)]">
                    <td colSpan={3} className="py-3 px-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider capitalize">§ {item.description}</p>
                    </td>
                    <td className="py-3 px-4 text-right text-[12px] font-bold">{item.groupSubtotalFormatted}</td>
                  </tr>
                );
              }
              return (
                <tr key={item.id} className={`border-b border-[color:var(--color-soft)] ${idx % 2 === 0 ? 'bg-[color:var(--color-paper-2)]' : 'bg-[color:var(--color-paper)]'}`}>
                  <td className="py-4 px-4">
                    <p className="font-bold text-[12px]">{item.description}</p>
                    <div className="mt-0.5 font-['DM_Sans',sans-serif] text-[9px] text-[color:var(--color-ink-2)] flex gap-3">
                      {item.type && <span>{item.type}</span>}
                      {item.sacCode && <span>HSN/SAC: {item.sacCode}</span>}
                      {item.unit && <span>{item.unit}</span>}
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center text-[12px] font-normal">{item.qty}</td>
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
        <div className="w-[300px] border border-[color:var(--color-soft)]">
          <div className="p-3"><MilestoneSummaryBlock data={data} /></div>
          <div className="flex justify-between px-4 py-2 text-[11px] border-t border-[color:var(--color-soft)]">
            <span className="text-[color:var(--color-ink-2)]">Subtotal</span><span className="font-bold">{data.subtotalFormatted}</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-[11px] border-t border-[color:var(--color-soft)]">
            <span className="text-[color:var(--color-ink-2)]">{data.taxLabel}</span><span className="font-bold">{data.taxFormatted}</span>
          </div>
          <div className="flex justify-between px-4 py-3 bg-[color:var(--color-paper)] border-t-2 border-[color:var(--color-strong)] items-baseline">
            <span className="text-[10px] font-bold uppercase tracking-widest">Grand total</span>
            <span className="text-[24px] font-bold text-[color:var(--color-ink)]">{data.grandTotalFormatted}</span>
          </div>
          {data.amountInWords && (
            <div className="px-4 py-2 text-[10px] italic text-[color:var(--color-ink-2)] text-right border-t border-[color:var(--color-soft)]">{data.amountInWords}</div>
          )}
          {data.taxComplianceNote && (
            <div className="px-4 py-2 text-[10px] text-[color:var(--color-ink-2)] text-right leading-4 border-t border-[color:var(--color-soft)]">{data.taxComplianceNote}</div>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <section className="grid grid-cols-2 gap-10 items-start border-t border-double border-[color:var(--color-strong)] pt-8" style={{ borderTopWidth: '3px' }}>
        <div className="space-y-5">
          {data.hasBankDetails && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] mb-1">Bank details</p>
              <div className="text-[11px] text-[color:var(--color-ink-2)] space-y-0.5">
                <p className="font-bold text-[color:var(--color-ink)]">{data.bankName}</p>
                {!data.isInternational ? (<><p>A/C No: {data.accountNumber}</p><p>IFSC: {data.ifscCode}</p></>) : (<><p>SWIFT: {data.swiftBicCode}</p><p>A/C No: {data.accountNumber}</p></>)}
              </div>
            </div>
          )}
          {data.hasNotes && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] mb-1">Remarks</p>
              <p className="text-[10px] text-[color:var(--color-ink-2)] leading-relaxed whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasQrCode && <img src={data.qrCodeUrl} alt="QR" className="h-16 w-16 object-contain" />}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] mb-5">For {data.agencyName}</p>
          {data.signatureUrl ? (
            <img src={data.signatureUrl} alt="Sig" className="h-10 w-auto object-contain ml-auto mb-2" />
          ) : (
            <p className="text-[18px] font-bold mb-2">{data.authorizedSignatory || data.agencyName}</p>
          )}
          <div className="h-px w-44 bg-[color:var(--color-ink-2)] ml-auto mb-1" />
          <p className="text-[8px] text-[color:var(--color-ink-2)] uppercase tracking-widest">Authorized signatory</p>
        </div>
      </section>

      {data.reverseCharge && (
        <div className="mt-8 border-2 border-[color:var(--color-strong)] px-5 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest">★ Tax is payable on reverse charge basis ★</p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
