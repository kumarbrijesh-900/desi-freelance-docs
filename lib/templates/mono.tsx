/**
 * ─── MONO TEMPLATE ─────────────────────────────────
 * Developer/terminal aesthetic. Monospace typography,
 * dark header strip, code-block structure, green accents.
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function MonoTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[#1a1a1a] bg-white min-h-[295mm] pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* ── Dark Header Strip ─────────────────── */}
      <header className="bg-[#111] text-white p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            {data.agencyLogoUrl && (
              <img src={data.agencyLogoUrl} alt="Logo" className="h-10 mb-4 brightness-0 invert object-contain" />
            )}
            <p className="text-[14px] font-bold">{data.agencyName}</p>
            {data.agencyAddress && data.agencyAddress !== "—" && (
              <p className="text-[11px] text-[color:var(--text-muted)] whitespace-pre-line mt-1 max-w-[260px]">{data.agencyAddress}</p>
            )}
            {data.agencyState && <p className="text-[10px] text-[color:var(--text-muted)] mt-1">{data.agencyState?.replace(/\s*\(\d+\)/, '')}</p>}
            {data.showAgencyGstin && <p className="text-[10px] text-green-400 mt-0.5">GSTIN {data.agencyGstin}</p>}
            {data.agencyPan && <p className="text-[10px] text-[color:var(--text-muted)]">PAN {data.agencyPan}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest">Invoice</p>
            <p className="text-[20px] font-bold text-green-400 mt-1">{data.invoiceNumber}</p>
            {data.poNumber && <><p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mt-3">PO Number</p><p className="text-[16px] font-bold text-green-400 mt-1">{data.poNumber}</p></>}
            <div className="mt-3 text-[11px] text-[color:var(--text-muted)] space-y-0.5">
              <p>issued: {data.invoiceDate}</p>
              <p>due: <span className="text-red-400">{data.dueDate}</span></p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Client + Terms ────────────────────── */}
      <section className="grid grid-cols-[1fr_180px] gap-8 mb-10 pb-6 border-b border-dashed border-[#111118]">
        <div>
          <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mb-2">// billed_to</p>
          <p className="text-[15px] font-bold">{data.clientName}</p>
          {data.clientAddress && data.clientAddress !== "—" && (
            <p className="text-[11px] text-[color:var(--text-muted)] whitespace-pre-line mt-1 max-w-[300px]">{data.clientAddress}</p>
          )}
          <div className="mt-2 text-[10px] text-[color:var(--text-muted)] space-y-0.5">
            {data.clientState && <p>{data.clientState?.replace(/\s*\(\d+\)/, '')}</p>}
            {data.clientTaxId && <p>{data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')}: {data.clientTaxId}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mb-1">// terms</p>
          <p className="text-[12px] font-medium">{data.paymentTerms}</p>
          {data.isInternational && <p className="mt-1 text-[10px] font-bold">currency: {data.displayCurrency}</p>}
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-10">
        <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mb-4">// line_items[]</p>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-[#111]">
              <th className="py-2 text-left font-medium text-[color:var(--text-muted)] text-[10px] uppercase tracking-wider">description</th>
              <th className="py-2 text-center w-[50px] font-medium text-[color:var(--text-muted)] text-[10px]">qty</th>
              <th className="py-2 text-right w-[100px] font-medium text-[color:var(--text-muted)] text-[10px]">rate</th>
              <th className="py-2 text-right w-[120px] font-medium text-[color:var(--text-muted)] text-[10px]">amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => {
              if (item.isMilestoneHeader) {
                const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                if (milestoneHeaderCount <= 1) return null;

                return (
                  <tr key={item.id} className="bg-[#f5f5f0]">
                    <td colSpan={3} className="py-3 px-3">
                      <span className="text-[10px] text-green-600 font-bold">▸ </span>
                      <span className="text-[12px] font-bold capitalize">{item.description}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-[12px] font-bold">{item.groupSubtotalFormatted}</td>
                  </tr>
                );
              }
              return (
                <tr key={item.id} className="border-b border-[color:var(--border-subtle)]">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-[12px]">{item.description}</p>
                    <div className="mt-0.5 text-[10px] text-[color:var(--text-muted)] flex gap-3">
                      {item.sacCode && <span>SAC:{item.sacCode}</span>}
                      {item.unit && <span>unit:{item.unit}</span>}
                    </div>
                  </td>
                  <td className="py-3 text-center text-[12px]">{item.qty}</td>
                  <td className="py-3 text-right text-[12px]">{item.rateFormatted}</td>
                  <td className="py-3 text-right text-[12px] font-medium">{item.amountFormatted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Totals ────────────────────────────── */}
      <section className="flex justify-end mb-12">
        <div className="w-[280px] space-y-2">
          <MilestoneSummaryBlock data={data} />
          <div className="flex justify-between text-[11px] text-[color:var(--text-muted)]">
            <span>subtotal</span><span className="font-medium text-[#111]">{data.subtotalFormatted}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[color:var(--text-muted)]">
            <span>{data.taxLabel}</span><span className="font-medium text-[#111]">{data.taxFormatted}</span>
          </div>
          <div className="pt-3 mt-2 border-t-2 border-[#111] flex justify-between items-baseline">
            <span className="text-[10px] font-bold uppercase tracking-widest">total_due</span>
            <span className="text-[24px] font-bold text-green-600">{data.grandTotalFormatted}</span>
          </div>
          {data.amountInWords && (
            <p className="text-right text-[10px] text-[color:var(--text-muted)] italic">{data.amountInWords}</p>
          )}
          {data.approximateUsd && (
            <p className="text-right text-[10px] text-[color:var(--text-muted)]">≈ {data.approximateUsd}</p>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <section className="grid grid-cols-2 gap-12 items-start">
        <div className="space-y-6">
          {data.hasBankDetails && (
            <div>
              <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mb-2">// bank_details</p>
              <div className="text-[11px] text-[color:var(--text-secondary)] space-y-0.5 bg-[#f5f5f0] p-3">
                <p className="font-bold text-[#111]">{data.bankName}</p>
                {!data.isInternational ? (
                  <><p>acc: {data.accountNumber}</p><p>ifsc: {data.ifscCode}</p></>
                ) : (
                  <><p>swift: {data.swiftBicCode}</p><p>acc: {data.accountNumber}</p></>
                )}
              </div>
            </div>
          )}
          {data.hasNotes && (
            <div>
              <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mb-1">// notes</p>
              <p className="text-[10px] text-[color:var(--text-muted)] leading-relaxed whitespace-pre-line max-w-[300px]">{data.notes}</p>
            </div>
          )}
          {data.hasQrCode && (
            <div>
              <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mb-2">// payment_qr</p>
              <img src={data.qrCodeUrl} alt="QR" className="h-16 w-16 object-contain" />
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mb-4">// authorized</p>
          {data.signatureUrl ? (
            <img src={data.signatureUrl} alt="Sig" className="h-10 w-auto object-contain ml-auto mb-2 brightness-0" />
          ) : (
            <p className="text-[16px] font-bold mb-2">{data.authorizedSignatory || data.agencyName}</p>
          )}
          <div className="h-px w-40 bg-[#111] ml-auto mb-1" />
          <p className="text-[9px] text-[color:var(--text-muted)] uppercase tracking-widest">digital_signature</p>
        </div>
      </section>

      {data.reverseCharge && (
        <div className="mt-8 border border-[#111] px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest">★ Tax is payable on reverse charge basis ★</p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
