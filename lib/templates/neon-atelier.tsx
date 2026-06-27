/**
 * ─── STUDIO PRO TEMPLATE ──────────────────────────
 *
 * Design: "Contemporary Creative Studio."
 * A high-fidelity, A4-optimized design featuring a vibrant
 * multi-accent palette and modern geometric typography.
 *
 * Key elements:
 * • Electric Cobalt (#2D5BFF) — structural power
 * • Vivid Coral (#FF725E) — highlight markers
 * • Modern Teal (#00C896) — client indicators
 * • Outfit & Inter font system — geometric precision
 * • Bento-style summary blocks
 * • Strict A4 print constraints
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function StudioProTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-inter text-[#111118] bg-[#FAF9F6] min-h-[295mm] tabular-nums w-full max-w-[210mm] mx-auto relative overflow-visible print:overflow-visible print:m-0 print:border-none print:min-h-0 print:h-auto">
      {/* ── Background Elements ────────────────── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] print:hidden"
        style={{
          backgroundImage: "radial-gradient(#111118 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.01] print:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #111118 0, #111118 1px, transparent 0, transparent 40px)",
        }}
      />

      <div className="absolute top-[40%] -right-20 select-none pointer-events-none text-[320px] font-outfit font-black text-[#111118]/[0.01] -rotate-12 z-0 print:hidden">
        STUDIO
      </div>

      {/* Technical Crosshairs */}
      <div className="absolute top-[10mm] left-[10mm] w-4 h-4 text-[#111118]/10 pointer-events-none z-0 print:hidden">
        <div className="absolute top-1/2 left-0 w-full h-px bg-current" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-current" />
      </div>
      <div className="absolute bottom-[10mm] right-[10mm] w-4 h-4 text-[#111118]/10 pointer-events-none z-0 print:hidden">
        <div className="absolute top-1/2 left-0 w-full h-px bg-current" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-current" />
      </div>

      {/* ── A4 Header Accent (No Bleed) ────── */}
      <div className="absolute top-0 right-[20mm] w-[280px] h-[280px] bg-[#2D5BFF] z-0 rounded-b-[20px] print:hidden" />

      {/* ── Content Wrapper ─────────────────── */}
      <div className="relative z-10 p-[20mm] box-border min-h-[297mm] flex flex-col">
        {/* ── Top Row: Agency & Date ─────────── */}
        <header className="flex justify-between mb-20">
          <div className="max-w-[250px]">
            <div className="w-[60px] h-[6px] bg-[#FF725E] mb-4" />
            <div className="relative z-10 flex items-center justify-start h-16 w-48 mb-4 overflow-hidden">
              {data.agencyLogoUrl && (
                <img
                  src={data.agencyLogoUrl}
                  alt="Agency Logo"
                  className="max-h-full max-w-full object-contain object-left"
                />
              )}
            </div>
            <div className="text-[11px] text-[#666] leading-relaxed space-y-1">
              <p className="font-bold text-[#111118]">{data.agencyName}</p>
              {data.agencyAddress && data.agencyAddress !== "—" && (
                <p className="whitespace-pre-line">{data.agencyAddress}</p>
              )}
              {(data.agencyState || data.showAgencyGstin) && (
                <div className="flex flex-wrap gap-x-3 pt-1">
                  {data.agencyState && (
                    <span>
                      {data.agencyState}
                    </span>
                  )}
                  {data.showAgencyGstin && (
                    <span className="font-bold">GSTIN {data.agencyGstin}</span>
                  )}
                  {data.agencyPan && <span>PAN {data.agencyPan}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="text-right text-white print:text-[#111118] pt-4">
            <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-white/50 print:text-[#666] block mb-2">
              Invoice Reference
            </span>
            <div className="font-outfit text-[18px] font-bold tracking-wider">
              {data.invoiceNumber}
            </div>
            {data.poNumber && <><span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] block mb-2 border-b-2 border-[#111118] pb-1 mt-6">PO Number</span><div className="font-outfit text-[16px] font-bold tracking-wider">{data.poNumber}</div></>}
            <div className="mt-8">
              <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-white/50 print:text-[#666] block mb-2">
                Issue Date
              </span>
              <div className="font-outfit text-[16px] font-bold">
                {data.invoiceDate}
              </div>
            </div>
            <div className="mt-4">
              <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-white/50 print:text-[#666] block mb-2">
                Due Date
              </span>
              <div className="font-outfit text-[16px] font-bold">
                {data.dueDate}
              </div>
            </div>
          </div>
        </header>

        {/* ── Impact ID Section ─────────────── */}
        <div className="mb-14">
          <h1 className="font-outfit text-[72px] font-black leading-[0.8] tracking-tighter mb-2">
            INVOICE.
          </h1>
          <div className="bg-[#111118] text-white print:bg-transparent print:text-[#111118] print:border print:border-[#111118] px-3 py-1 font-outfit text-[12px] font-bold tracking-[0.15em] inline-block">
            STATUS: {data.isDraft ? "DRAFT" : "AUTHORIZED"}
          </div>
        </div>

        {/* ── Parties Grid ──────────────────── */}
        <section className="grid grid-cols-2 gap-x-[30mm] mb-12 items-start">
          <div className="border-l-4 border-[#00C896] pl-5 py-1">
            <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-[#666] block mb-3">
              Bill To
            </span>
            <div className="font-outfit text-[24px] font-extrabold text-[#111118] mb-2">
              {data.clientName}
            </div>
            {data.clientAddress && data.clientAddress !== "—" && (
              <p className="text-[12px] text-[#666] leading-relaxed whitespace-pre-line">
                {data.clientAddress}
              </p>
            )}
            {(data.clientState || data.clientTaxId) && (
              <div className="mt-2 flex flex-col gap-0.5 text-[10px] font-bold text-[#666] uppercase tracking-wider">
                {data.clientState && (
                  <span className="font-semibold">
                    Place of Supply: {data.clientState}
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
          <div className="text-right">
            <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-[#666] block mb-3">
              Project Details
            </span>
            <div className="font-outfit text-[16px] font-bold text-[#2D5BFF]">
              {data.projectName || "General Services"}
            </div>
            {data.isInternational && (
              <p className="mt-2 text-[11px] font-bold text-[#111118]">
                CURRENCY: {data.displayCurrency}
              </p>
            )}
            <p className="mt-2 text-[11px] text-[#666] font-normal uppercase tracking-tight">
              Terms: {data.paymentTerms}
            </p>
          </div>
        </section>

        {/* ── Items Table ───────────────────── */}
        <section className="flex-grow">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#111118] text-white print:bg-transparent print:text-[#111118] print:border-b-2 print:border-[#111118]">
                <th className="font-outfit text-[10px] uppercase tracking-[0.2em] font-bold text-left p-4">
                  Service Description
                </th>
                <th className="font-outfit text-[10px] uppercase tracking-[0.2em] font-bold text-center p-4">
                  Qty
                </th>
                <th className="font-outfit text-[10px] uppercase tracking-[0.2em] font-bold text-right p-4">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item) => {
                if (item.isMilestoneHeader) {
                  const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                  if (milestoneHeaderCount <= 1) return null;

                  return (
                    <tr key={item.id} className="bg-[#FAF9F6] border-y border-[#e8e6e1]">
                      <td colSpan={2} className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-outfit text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#666]">
                            Milestone
                          </span>
                          <div className="font-outfit text-[18px] font-black text-[#111118] capitalize">
                            {item.description}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right align-bottom">
                        <div className="font-outfit text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#666] mb-1">
                          Subtotal
                        </div>
                        <div className="font-outfit text-[16px] font-black text-[#111118]">
                          {item.groupSubtotalFormatted}
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id} className="border-b border-[#e8e6e1]">
                    <td className="p-4 align-top">
                      <div className="font-outfit font-extrabold text-[16px] text-[#111118] mb-1">
                        {item.description}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#555]">
                        {item.type && (
                          <span className="font-bold">{item.type}</span>
                        )}
                        {item.sacCode && (
                          <span>
                            <span className="text-[#666]">HSN/SAC:</span>{" "}
                            <span className="font-bold text-[#333]">
                              {item.sacCode}
                            </span>
                          </span>
                        )}
                        {item.unit && (
                          <span>
                            <span className="text-[#666]">Unit:</span>{" "}
                            <span className="font-bold">{item.unit}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-top text-center font-bold text-[#111118]">
                      {item.qty}
                    </td>
                    <td className="p-4 align-top text-right font-outfit font-extrabold text-[16px] text-[#111118]">
                      {item.amountFormatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ── Summary & Compliance ─────────── */}
        <section className="mt-12">
          <div className="flex justify-end items-stretch mb-10">
            <div className="text-right mr-8 pt-4">
              <MilestoneSummaryBlock data={data} textColor="#888" borderColor="#e8e6e1" accentColor="#2D5BFF" />
              <div className="text-[12px] text-[#666] mb-2">
                Subtotal:{" "}
                <span className="font-bold text-[#111118]">
                  {data.subtotalFormatted}
                </span>
              </div>
              {data.taxRows.map((row) => (
                <div key={row.label} className="text-[12px] text-[#666]">
                  {row.label}:{" "}
                  <span className="font-bold text-[#111118]">
                    {row.amountFormatted}
                  </span>
                </div>
              ))}
              {data.approximateUsd && (
                <div className="text-[10px] text-[#666] mt-2 italic">
                  ≈ {data.approximateUsd}
                </div>
              )}
              {data.taxComplianceNote && (
                <div className="text-[10px] text-[#666] mt-2 leading-4">
                  {data.taxComplianceNote}
                </div>
              )}
            </div>
            <div className="bg-[#2D5BFF] text-white print:bg-transparent print:text-[#111118] print:border-t-4 print:border-[#2D5BFF] p-8 print:py-4 print:px-0 min-w-[250px] text-right">
              <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-white/40 print:text-[#666] block mb-2">
                Grand Total Due
              </span>
              <div className="font-outfit text-[42px] font-black leading-none">
                {data.grandTotalFormatted}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 items-end">
            <div>
              <div className="p-5 border border-[#eee] border-t-4 border-[#FF725E] bg-white">
                <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-[#FF725E] block mb-3">
                  Payment Instructions
                </span>
                <div className="text-[11px] text-[#555] leading-relaxed">
                  {data.hasBankDetails && (
                    <div className="space-y-1">
                      {!data.isInternational ? (
                        <>
                          <p>
                            <strong className="text-[#111118]">
                              {data.bankName}
                            </strong>
                          </p>
                          <p>Account: {data.accountNumber}</p>
                          <p>IFSC: {data.ifscCode}</p>
                        </>
                      ) : (
                        <>
                          <p>
                            <strong className="text-[#111118]">
                              {data.bankName}
                            </strong>
                          </p>
                          <p>SWIFT: {data.swiftBicCode}</p>
                          <p>Beneficiary: {data.accountName}</p>
                        </>
                      )}
                    </div>
                  )}
                  {data.hasQrCode && (
                    <div>
                      <p className="font-outfit text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#666] mb-2">
                        Scan to Pay
                      </p>
                      <div className="h-16 w-16 flex items-center justify-center overflow-hidden">
                        <img
                          src={data.qrCodeUrl}
                          alt="Payment QR"
                          className="max-h-full max-w-full object-contain object-center"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <span className="font-outfit text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#666] block mb-1">
                  Amount in Words
                </span>
                <p className="text-[11px] font-bold text-[#111118]">
                  {data.amountInWords}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="mb-6">
                <span className="font-outfit text-[9px] uppercase tracking-[0.25em] font-extrabold text-[#666] block mb-3">
                  Authorized Signatory
                </span>
                <div className="flex flex-col items-end gap-2">
                  {data.signatureUrl ? (
                    <img
                      src={data.signatureUrl}
                      alt="Signature"
                      className="h-10 w-auto object-contain brightness-0"
                    />
                  ) : (
                    <div className="font-outfit text-[24px] font-black tracking-tighter text-[#111118]">
                      {data.authorizedSignatory || data.agencyName}
                    </div>
                  )}
                  <div className="w-[150px] h-[1px] bg-[#111118]/20" />
                  <p className="text-[8px] uppercase tracking-widest text-[#666]">
                    Official Signature
                  </p>
                </div>
              </div>
              <p className="text-[9px] text-[#666] uppercase tracking-[0.1em]">
                © 2026 {data.agencyName}. All Rights Reserved.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Statutory RCM Disclosure ── */}
      {data.reverseCharge && (
        <div className="mx-[20mm] mb-4 border border-[#111118] px-6 py-3 text-center">
          <p className="font-outfit text-[11px] font-bold uppercase tracking-[0.2em] text-[#111118]">
            ★ Tax is Payable on Reverse Charge Basis ★
          </p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
