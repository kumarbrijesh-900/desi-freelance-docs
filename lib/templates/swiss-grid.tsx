/**
 * ─── SWISS GRID TEMPLATE ──────────────────────────
 *
 * Design: "International Typographic Style."
 * Inspired by Josef Müller-Brockmann, Massimo Vignelli,
 * and the Swiss poster tradition.
 *
 * Key elements:
 * • Bold 6px red (#E63946) bar — poster authority
 * • ALL CAPS labels with extreme tracking
 * • Navy (#1D3557) for all headings — serious, trustworthy
 * • Strict horizontal grid lines — mathematical precision
 * • Red header row on the items table
 * • Monospaced numbers — tabular alignment is sacred
 * • Maximum information density, zero decoration
 * • Print: red → dark gray, navy preserved
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function SwissGridTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#1D3557] bg-white min-h-[295mm] pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">
      {/* ── Background Elements ────────────────── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] print:hidden"
        style={{
          backgroundImage:
            "linear-gradient(#1D3557 1px, transparent 1px), linear-gradient(90deg, #1D3557 1px, transparent 1px)",
          backgroundSize: "10mm 10mm",
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.02] print:hidden"
        style={{
          backgroundImage: "radial-gradient(#1D3557 1px, transparent 1px)",
          backgroundSize: "25mm 25mm",
        }}
      />

      {/* Technical Cross-hatch in corners */}
      <div
        className="absolute top-0 left-0 w-40 h-40 opacity-[0.04] pointer-events-none z-0 print:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, #E63946 0, #E63946 1px, transparent 0, transparent 4px)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-60 h-60 opacity-[0.04] pointer-events-none z-0 print:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #1D3557 0, #1D3557 1px, transparent 0, transparent 4px)",
        }}
      />

      <div className="absolute top-[15%] right-4 select-none pointer-events-none text-[180px] font-black text-[#1D3557]/[0.01] z-0 print:hidden">
        01
      </div>
      <div className="absolute top-[45%] right-4 select-none pointer-events-none text-[180px] font-black text-[#1D3557]/[0.01] z-0 print:hidden">
        02
      </div>
      <div className="absolute top-[75%] right-4 select-none pointer-events-none text-[180px] font-black text-[#1D3557]/[0.01] z-0 print:hidden">
        03
      </div>

      {/* ── Red bar — Swiss poster authority ──── */}
      <div className="relative z-10 h-[6px] w-full bg-[#E63946] print:bg-[#666]" />

      {/* ── Header — Strict grid ─────────────── */}
      <header className="mt-4 grid gap-4 pb-4 md:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0">
          {data.agencyLogoUrl && (
            <div className="relative z-10 flex items-center justify-start h-12 w-32 mb-2 overflow-hidden">
              <img
                src={data.agencyLogoUrl}
                alt="Agency Logo"
                className="max-h-full max-w-full object-contain object-left"
              />
            </div>
          )}
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#E63946] print:text-[#666]">
            Invoice From
          </p>
          <h1 className="mt-1 text-[20px] font-extrabold uppercase leading-none tracking-[0.02em] text-[#1D3557]">
            {data.agencyName}
          </h1>
          {data.agencyAddress && data.agencyAddress !== "—" && (
            <p className="mt-2 max-w-md whitespace-pre-line text-[11px] leading-4 text-[#457B9D]">
              {data.agencyAddress}
            </p>
          )}
          {(data.showAgencyGstin || data.agencyPan) && (
            <div className="mt-1.5 flex flex-wrap gap-4 text-[9px] uppercase tracking-[0.15em] text-[#A8DADC]">
              {data.agencyState && (
                <span>
                  {data.agencyState?.replace(/\s*\(\d+\)/, '')}
                </span>
              )}
              {data.showAgencyGstin && <span>GSTIN {data.agencyGstin}</span>}
              {data.agencyPan && <span>PAN {data.agencyPan}</span>}
            </div>
          )}
        </div>

        {/* Invoice meta — tight, data-dense */}
        <div className="self-start border-l-[3px] border-l-[#E63946] pl-3 print:border-l-[#999]">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#E63946] print:text-[#666]">
            No.
          </p>
          <p className="text-[22px] font-extrabold tracking-tight text-[#1D3557]">
            {data.invoiceNumber}
          </p>
          {data.poNumber && <><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1D3557]/60 mt-3">PO Number</p><p className="text-[16px] font-bold tracking-tight text-[#1D3557]">{data.poNumber}</p></>}
          <div className="mt-2 space-y-1">
            {[
              ["DATE", data.invoiceDate],
              ["DUE", data.dueDate],
              ["TERMS", data.paymentTerms],
              ...(data.isInternational ? [["CURR", data.displayCurrency]] : []),
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline gap-2 text-[10px]"
              >
                <span className="w-12 shrink-0 font-bold uppercase tracking-[0.2em] text-[#A8DADC]">
                  {label}
                </span>
                <span className="font-medium text-[#1D3557]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Double rule ──────────────────────── */}
      <div className="flex flex-col gap-[2px]">
        <div className="h-[2px] w-full bg-[#1D3557] print:bg-black" />
        <div className="h-[1px] w-full bg-[#1D3557]/30 print:bg-[#999]" />
      </div>

      {/* ── Parties — Tight grid ─────────────── */}
      <section className="grid gap-4 py-3 md:grid-cols-2">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
            Sender
          </p>
          <p className="mt-1 text-[13px] font-bold uppercase text-[#1D3557]">
            {data.agencyName}
          </p>
          {data.agencyAddress && data.agencyAddress !== "—" && (
            <p className="mt-0.5 whitespace-pre-line text-[11px] text-[#457B9D]">
              {data.agencyAddress}
            </p>
          )}
        </div>
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
            Recipient
          </p>
          <p className="mt-1 text-[13px] font-bold uppercase text-[#1D3557]">
            {data.clientName}
          </p>
          {data.clientAddress && data.clientAddress !== "—" && (
            <p className="mt-0.5 whitespace-pre-line text-[11px] text-[#457B9D]">
              {data.clientAddress}
            </p>
          )}
          {(data.clientState || data.clientTaxId) && (
            <div className="mt-1 flex flex-col gap-0.5 text-[9px] uppercase tracking-[0.15em] text-[#A8DADC]">
              {data.clientState && (
                <span>
                  {data.clientState?.replace(/\s*\(\d+\)/, '')}
                </span>
              )}
              {data.clientTaxId && (
                <span>
                  {data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')} {data.clientTaxId}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="h-[1px] w-full bg-[#1D3557]/20 print:bg-[#ccc]" />

      {/* ── Line Items — Red header row ─────── */}
      <section className="py-3">
        <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
          Line Items ({data.itemCount})
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="bg-[#E63946] text-[9px] font-bold uppercase tracking-[0.2em] text-white print:bg-[#eee] print:text-[#333]">
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2 text-center">Qty</th>
                <th className="px-2 py-2">Rate</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => {
                if (item.isMilestoneHeader) {
                  const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                  if (milestoneHeaderCount <= 1) return null;

                  return (
                    <tr key={item.id} className="bg-[#1D3557]/5 border-b border-[#1D3557]/10">
                      <td colSpan={2} className="px-2 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[7px] font-bold uppercase tracking-[0.4em] text-[#E63946]">
                            Milestone
                          </span>
                          <span className="text-[14px] font-extrabold uppercase text-[#1D3557] capitalize">
                            {item.description}
                          </span>
                        </div>
                      </td>
                      <td colSpan={3} className="px-2 py-3 text-right align-bottom">
                        <div className="text-[7px] font-bold uppercase tracking-[0.4em] text-[#A8DADC] mb-0.5">
                          Subtotal
                        </div>
                        <div className="font-mono text-[14px] font-bold text-[#1D3557]">
                          {item.groupSubtotalFormatted}
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-[#1D3557]/10 text-[12px] print:border-[#eee] ${
                      i % 2 === 1 ? "bg-[#F1FAEE] print:bg-[#f9f9f9]" : ""
                    }`}
                  >
                    <td className="px-2 py-2 align-top">
                      <span className="font-semibold text-[#1D3557]">
                        {item.description}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-[#457B9D]">
                        {item.type && (
                          <span className="font-bold uppercase tracking-[0.1em]">
                            {item.type}
                          </span>
                        )}
                        {item.sacCode && (
                          <span>
                            <span className="text-[#A8DADC]">HSN/SAC:</span>{" "}
                            <span className="font-bold text-[#1D3557]">
                              {item.sacCode}
                            </span>
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center align-top font-mono text-[11px] font-bold tabular-nums">
                      {item.qty}
                    </td>
                    <td className="px-2 py-2 align-top font-mono text-[11px] tabular-nums">
                      {item.rateFormatted}
                    </td>
                    <td className="px-2 py-2 align-top text-[11px] text-[#457B9D]">
                      {item.unit}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-mono text-[11px] font-bold tabular-nums text-[#1D3557]">
                      {item.amountFormatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="h-[2px] w-full bg-[#1D3557] print:bg-black" />

      {/* ── Bottom ────────────────────────────── */}
      <section className="grid gap-4 pt-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-2.5 text-[11px] text-[#457B9D]">
          {data.hasNotes && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasLicense && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
                License
              </p>
              <p className="mt-1">
                {data.licenseType}
                {data.licenseDuration ? ` — ${data.licenseDuration}` : ""}
              </p>
            </div>
          )}
          {data.hasBankDetails && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
                Bank
              </p>
              <div className="mt-1 space-y-0.5">
                {!data.isInternational ? (
                  <>
                    {data.bankName && <p>{data.bankName}</p>}
                    {data.accountNumber && <p>A/C {data.accountNumber}</p>}
                    {data.ifscCode && <p>IFSC {data.ifscCode}</p>}
                  </>
                ) : (
                  <>
                    {data.accountName && <p>{data.accountName}</p>}
                    {data.bankName && <p>{data.bankName}</p>}
                    {data.swiftBicCode && <p>SWIFT {data.swiftBicCode}</p>}
                  </>
                )}
              </div>
            </div>
          )}
          {data.hasQrCode && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
                Scan
              </p>
              <div className="mt-1.5 h-16 w-16 flex items-center justify-center overflow-hidden">
                <img
                  src={data.qrCodeUrl}
                  alt="Payment QR"
                  className="max-h-full max-w-full object-contain object-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Totals — precise alignment */}
        <div>
          <div className="space-y-1.5 text-[11px]">
            <MilestoneSummaryBlock data={data} textColor="#A8DADC" borderColor="#A8DADC" accentColor="#1D3557" />
            <div className="flex justify-between">
              <span className="font-bold uppercase tracking-[0.15em] text-[#A8DADC]">
                Subtotal
              </span>
              <span className="font-mono tabular-nums font-medium text-[#1D3557]">
                {data.subtotalFormatted}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold uppercase tracking-[0.15em] text-[#A8DADC]">
                {data.taxLabel}
              </span>
              <span className="font-mono tabular-nums font-medium text-[#1D3557]">
                {data.taxFormatted}
              </span>
            </div>
          </div>
          <div className="mt-2 border-t-[3px] border-t-[#E63946] pt-2 print:border-t-[#999]">
            <div className="flex items-baseline justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#E63946] print:text-[#666]">
                Total
              </span>
              <span className="font-mono text-[24px] font-extrabold tabular-nums text-[#1D3557]">
                {data.grandTotalFormatted}
              </span>
            </div>
          </div>
          {data.approximateUsd && (
            <p className="mt-1.5 text-right text-[9px] text-[#A8DADC]">
              ≈ {data.approximateUsd}
            </p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-1.5 text-[9px] text-[#A8DADC]">
              {data.taxComplianceNote}
            </p>
          )}
        </div>
      </section>

      {/* ── Compliance Footer ──────────────────── */}
      <section className="grid gap-4 border-t-[2px] border-t-[#1D3557] pt-3 lg:grid-cols-2 print:border-t-black">
        {data.grandTotalRaw > 0 && (
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
              Amount in Words
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-[#1D3557]">
              {data.amountInWords}
            </p>
            {data.reverseCharge && (
              <p className="mt-2 border-l-4 border-[#E63946] pl-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#E63946] print:border-black print:text-black">
                ★ Tax is Payable on Reverse Charge Basis ★
              </p>
            )}
          </div>
        )}
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E63946] print:text-[#666]">
            Authorized Signatory
          </p>
          <div className="mt-4 flex flex-col items-start">
            {data.signatureUrl ? (
              <div className="flex flex-col items-start gap-1">
                <img
                  src={data.signatureUrl}
                  alt="Signature"
                  className="h-10 w-auto object-contain brightness-0"
                />
                <p className="text-[8px] italic text-[#A8DADC]">
                  Digitally Signed
                </p>
              </div>
            ) : (
              <div className="mt-2 w-full border-b-2 border-[#1D3557] pb-1">
                <p className="text-[11px] font-medium text-[#457B9D]">
                  {data.authorizedSignatory || data.agencyName}
                </p>
              </div>
            )}
            <p className="mt-1 text-[9px] text-[#A8DADC]">Signature</p>
          </div>
        </div>
      </section>

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
