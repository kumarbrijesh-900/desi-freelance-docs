/**
 * ─── CLASSIC TEMPLATE ──────────────────────────────
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function ClassicTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#111118] bg-white min-h-[297mm] p-[15mm] box-border relative overflow-hidden">
      {/* ── Background Patterns ────────────────── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#111118 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #111118 0, #111118 1px, transparent 0, transparent 10px)",
        }}
      />

      <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#F0F0F2] rounded-full blur-3xl opacity-20 z-0 pointer-events-none" />
      <div className="absolute bottom-40 -left-10 w-64 h-64 bg-[#E0E0E5] rounded-full blur-[100px] opacity-15 z-0 pointer-events-none" />

      {/* ── Top Accent ──────────────────────────── */}
      <div className="relative z-10 h-1 w-full bg-[#111118] mb-12" />

      {/* ── Header ────────────────────────────── */}
      <header className="flex justify-between items-start mb-16">
        <div className="max-w-[400px]">
          <div className="relative z-10 flex items-center justify-start h-16 w-48 mb-6 overflow-hidden">
            {data.agencyLogoUrl ? (
              <img
                src={data.agencyLogoUrl}
                alt="Agency Logo"
                className="max-h-full max-w-full object-contain object-left"
              />
            ) : (
              <div className="w-full h-full border border-dashed border-[#D1D1D6] bg-gray-50/30 flex items-center justify-center text-[9px] font-bold text-[#A8A08E] uppercase tracking-[0.2em]">
                Agency Logo
              </div>
            )}
          </div>
          <div className="text-[12px] leading-relaxed text-[#555] space-y-1">
            <p className="font-bold text-[#111118] text-[14px] mb-1">
              {data.agencyName}
            </p>
            <p className="whitespace-pre-line max-w-[280px]">
              {data.agencyAddress}
            </p>
            {(data.agencyState || data.showAgencyGstin || data.agencyPan) && (
              <div className="pt-2 flex flex-col gap-0.5 text-[11px] text-[#888]">
                {data.agencyState && (
                  <span>
                    {data.agencyState}
                    {data.agencyStateCode ? ` (${data.agencyStateCode})` : ""}
                  </span>
                )}
                {data.showAgencyGstin && (
                  <span className="font-medium text-[#555]">
                    GSTIN {data.agencyGstin}
                  </span>
                )}
                {data.agencyPan && <span>PAN {data.agencyPan}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-[42px] font-black tracking-tighter leading-none mb-6">
            INVOICE
          </h1>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">
                Number
              </p>
              <p className="text-[16px] font-bold">{data.invoiceNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">
                  Date
                </p>
                <p className="text-[13px] font-medium">{data.invoiceDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">
                  Due
                </p>
                <p className="text-[13px] font-medium text-[#E63946]">
                  {data.dueDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Client Section ─────────────────────── */}
      <section className="mb-16 pb-8 border-b border-[#F0F0F2]">
        <div className="grid grid-cols-[1fr_200px] gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-4">
              Billed To
            </p>
            <div className="text-[18px] font-bold mb-2">{data.clientName}</div>
            <p className="text-[13px] text-[#555] leading-relaxed whitespace-pre-line max-w-[320px]">
              {data.clientAddress}
            </p>
            <div className="mt-3 flex gap-4 text-[11px] text-[#888]">
              {data.clientState && (
                <span>
                  {data.clientState}
                  {data.clientStateCode ? ` (${data.clientStateCode})` : ""}
                </span>
              )}
              {data.clientTaxId && (
                <span>
                  {data.clientTaxLabel}: {data.clientTaxId}
                </span>
              )}
            </div>
          </div>
          <div className="text-right self-end">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">
              Payment Terms
            </p>
            <p className="text-[13px] font-medium">{data.paymentTerms}</p>
            {data.isInternational && (
              <p className="mt-2 text-[11px] font-bold text-[#111118]">
                CURRENCY: {data.displayCurrency}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-16">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#111118]">
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-left">
                Description
              </th>
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-center w-[60px]">
                Qty
              </th>
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-right w-[120px]">
                Rate
              </th>
              <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-right w-[140px]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F2]">
            {data.lineItems.map((item) => {
              if (item.isMilestoneHeader) {
                return (
                  <tr key={item.id} className="bg-gray-50/60 border-y border-gray-100">
                    <td colSpan={3} className="py-5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A8A08E]">
                          Milestone Section
                        </span>
                        <div className="text-[16px] font-bold text-[#111118]">
                          {item.description}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right align-bottom">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#A8A08E] mb-1">
                        Subtotal
                      </div>
                      <div className="text-[15px] font-black text-[#111118]">
                        {item.groupSubtotalFormatted}
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={item.id}>
                  <td className="py-6 pr-8">
                    <div className="font-bold text-[15px] mb-1">
                      {item.description}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#444]">
                      {item.type && (
                        <span className="font-medium">{item.type}</span>
                      )}
                      {item.sacCode && (
                        <span>
                          <span className="text-[#888]">HSN/SAC:</span>{" "}
                          <span className="font-semibold text-[#222]">
                            {item.sacCode}
                          </span>
                        </span>
                      )}
                      {item.unit && (
                        <span>
                          <span className="text-[#888]">Unit:</span>{" "}
                          <span className="font-medium">{item.unit}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-6 text-center text-[14px] font-medium">
                    {item.qty}
                  </td>
                  <td className="py-6 text-right text-[14px] font-medium">
                    {item.rateFormatted}
                  </td>
                  <td className="py-6 text-right text-[15px] font-bold">
                    {item.amountFormatted}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Totals ────────────────────────────── */}
      <section className="flex justify-end mb-20 relative">
        <div
          className="absolute -inset-4 z-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #111118 0, #111118 1px, transparent 0, transparent 8px)",
          }}
        />

        <div className="relative z-10 w-[320px] space-y-3">
          <MilestoneSummaryBlock data={data} />
          <div className="flex justify-between text-[13px] text-[#555]">
            <span>Subtotal</span>
            <span className="font-medium text-[#111118]">
              {data.subtotalFormatted}
            </span>
          </div>
          <div className="flex justify-between text-[13px] text-[#555]">
            <span>{data.taxLabel}</span>
            <span className="font-medium text-[#111118]">
              {data.taxFormatted}
            </span>
          </div>
          <div className="pt-4 border-t border-[#111118] flex justify-between items-baseline">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              Total Due
            </span>
            <span className="text-[28px] font-black">
              {data.grandTotalFormatted}
            </span>
          </div>
          {data.approximateUsd && (
            <p className="text-right text-[10px] text-[#888] italic pt-1">
              ≈ {data.approximateUsd}
            </p>
          )}
        </div>
      </section>

      {/* ── Footer / Legal ───────────────────── */}
      <section className="mt-auto grid grid-cols-2 gap-16 items-start">
        <div className="space-y-8">
          {data.hasBankDetails && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-3">
                Bank Details
              </p>
              <div className="text-[12px] text-[#555] leading-relaxed space-y-0.5">
                {!data.isInternational ? (
                  <>
                    <p className="font-bold text-[#111118]">{data.bankName}</p>
                    <p>Account: {data.accountNumber}</p>
                    <p>IFSC: {data.ifscCode}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[#111118]">{data.bankName}</p>
                    <p>SWIFT: {data.swiftBicCode}</p>
                    <p>Account: {data.accountNumber}</p>
                  </>
                )}
                {data.lineItems.some((i) => i.isMilestoneHeader) && (
                  <p className="mt-3 text-[11px] font-medium italic text-[#A8A08E] border-t border-[#F0F0F2] pt-2">
                    Note: Please transfer the relevant Milestone Subtotal as outlined above.
                  </p>
                )}
              </div>
            </div>
          )}

          {data.hasNotes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-2">
                Notes
              </p>
              <p className="text-[11px] text-[#777] leading-relaxed whitespace-pre-line max-w-[340px]">
                {data.notes}
              </p>
            </div>
          )}

          <div className="mt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-3">
              Payment QR
            </p>
            <div className="h-20 w-20 flex items-center justify-center overflow-hidden">
              {data.hasQrCode ? (
                <img
                  src={data.qrCodeUrl}
                  alt="Payment QR"
                  className="max-h-full max-w-full object-contain object-center"
                />
              ) : (
                <div className="w-full h-full border border-dashed border-[#D1D1D6] bg-gray-50/30 flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 opacity-10 border border-[#111118]" />
                  <span className="text-[7px] font-bold text-[#A8A08E] uppercase tracking-widest">
                    QR Code
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-right space-y-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-6">
              Authorized Signatory
            </p>
            <div className="flex flex-col items-end">
              {data.signatureUrl ? (
                <img
                  src={data.signatureUrl}
                  alt="Signature"
                  className="h-12 w-auto object-contain mb-2 brightness-0"
                />
              ) : (
                <div className="text-[20px] font-bold mb-2">
                  {data.authorizedSignatory || data.agencyName}
                </div>
              )}
              <div className="h-px w-48 bg-[#111118] mb-2" />
              <p className="text-[9px] text-[#A8A08E] uppercase tracking-widest font-medium">
                Digital Signature
              </p>
            </div>
          </div>

          {data.amountInWords && (
            <div className="pt-4 border-t border-[#F0F0F2]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">
                Amount in Words
              </p>
              <p className="text-[11px] font-medium text-[#555] italic">
                {data.amountInWords}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Statutory RCM Disclosure (GST Act mandatory) ── */}
      {data.reverseCharge && (
        <div className="relative z-10 mt-12 border border-[#111118] px-6 py-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#111118]">
            ★ Tax is Payable on Reverse Charge Basis ★
          </p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
