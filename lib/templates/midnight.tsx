/**
 * ─── MIDNIGHT TEMPLATE ────────────────────────────
 *
 * Design: "Premium after-hours."
 * Deep navy header, violet accent system,
 * clean white body. Feels like luxury tech invoicing.
 * Inspired by Stripe receipts meets Linear's UI.
 *
 * Key elements:
 * • Deep navy (#1A1A2E) header — contained, not full-bg
 * • Violet (#6C63FF) accent lines & highlights
 * • Borderless table with violet row separators
 * • Grand total with violet background accent
 * • Condensed, modern sans-serif feel
 * • Print: navy → light gray, violet → dark gray
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function MidnightTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#1A1A2E] bg-white min-h-[295mm] pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">
      {/* ── Background Elements ────────────────── */}
      <div className="absolute top-[10%] -right-20 w-96 h-96 bg-[#6C63FF]/[0.04] rounded-full blur-[120px] pointer-events-none z-0 print:hidden" />
      <div className="absolute bottom-[20%] -left-20 w-80 h-80 bg-[#9B93FF]/[0.05] rounded-full blur-[100px] pointer-events-none z-0 print:hidden" />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.02] print:hidden"
        style={{
          backgroundImage: "radial-gradient(#6C63FF 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <svg
        className="absolute top-0 right-0 w-[400px] h-[400px] text-[#6C63FF]/[0.02] pointer-events-none z-0 print:hidden"
        viewBox="0 0 400 400"
      >
        <path d="M0,100 C150,200 250,0 400,100 V400 H0 Z" fill="currentColor" />
      </svg>

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.02] mix-blend-overlay print:hidden"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/stardust.png")',
        }}
      />
      {/* ── Violet accent line ────────────────── */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#6C63FF] to-[#9B93FF] print:bg-[#888]" />

      {/* ── Navy Header ───────────────────────── */}
      <header className="bg-[#1A1A2E] px-5 py-5 print:bg-[#f0f0f5] print:text-[#111]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="relative z-10 flex items-center justify-start h-14 w-40 mb-3 overflow-hidden">
              {data.agencyLogoUrl && (
                <img
                  src={data.agencyLogoUrl}
                  alt="Agency Logo"
                  className="max-h-full max-w-full object-contain object-left brightness-0 invert print:brightness-100 print:invert-0"
                />
              )}
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#6C63FF] print:text-[#666]">
              From
            </p>
            <h1 className="mt-1 text-[22px] font-bold leading-none tracking-tight text-[#F0F0F5] print:text-[#111]">
              {data.agencyName}
            </h1>
            {data.agencyAddress && data.agencyAddress !== "—" && (
              <p className="mt-2 max-w-md whitespace-pre-line text-[12px] leading-5 text-[#F0F0F5]/50 print:text-[#777]">
                {data.agencyAddress}
              </p>
            )}
            {(data.showAgencyGstin || data.agencyPan) && (
              <div className="mt-1.5 flex flex-wrap gap-4 text-[10px] text-[#F0F0F5]/30 print:text-[#999]">
                {data.agencyState && (
                  <span>
                    {data.agencyState?.replace(/\s*\(\d+\)/, '')}
                  </span>
                )}
                {data.showAgencyGstin && <span>GSTIN: {data.agencyGstin}</span>}
                {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-lg bg-[#F0F0F5]/10 px-4 py-3 text-right print:bg-[#e8e8f0]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">
              Invoice
            </p>
            <p className="mt-1 text-[26px] font-bold text-[#F0F0F5] print:text-[#111]">
              {data.invoiceNumber}
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-[#F0F0F5]/50 print:text-[#888]">
              <p>{data.invoiceDate}</p>
              <p>Due {data.dueDate}</p>
              <p>{data.paymentTerms}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Client panel ─────────────────────── */}
      <section className="border-b border-[#E8E8F0] px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#6C63FF] print:text-[#666]">
          Bill To
        </p>
        <p className="mt-1.5 text-[16px] font-semibold">{data.clientName}</p>
        {data.clientAddress && data.clientAddress !== "—" && (
          <p className="mt-1 whitespace-pre-line text-[12px] text-[#666]">
            {data.clientAddress}
          </p>
        )}
        {(data.clientState || data.clientTaxId) && (
          <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-[#999]">
            {data.clientState && (
              <span>
                {data.clientState?.replace(/\s*\(\d+\)/, '')}
              </span>
            )}
            {data.clientTaxId && (
              <span>
                {data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')}: {data.clientTaxId}
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── Line Items — Violet separators ───── */}
      <section className="px-5 py-4">
        <div className="flex items-end justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#6C63FF] print:text-[#666]">
            Services
          </p>
          <p className="text-[10px] text-[#999]">
            {data.itemCount} item{data.itemCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Responsive Ledger */}
        <div className="mt-6">
          {/* Table Header - Desktop Only */}
          <div className="hidden md:grid md:grid-cols-[1fr_80px_120px_80px_110px] gap-4 border-b border-[#6C63FF]/20 pb-3 text-[9px] uppercase tracking-[0.16em] text-[#999] px-2">
            <div className="font-semibold">Description</div>
            <div className="font-semibold text-center">Qty</div>
            <div className="font-semibold">Rate</div>
            <div className="font-semibold">Unit</div>
            <div className="font-semibold text-right">Amount</div>
          </div>

          {/* Line Items */}
          <div className="divide-y divide-[#6C63FF]/8">
            {data.lineItems.map((item) => {
              if (item.isMilestoneHeader) {
                const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                if (milestoneHeaderCount <= 1) return null;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row md:items-end justify-between border-y border-[#6C63FF]/10 bg-[#6C63FF]/5 px-4 py-4 my-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#6C63FF]">
                        Milestone
                      </p>
                      <p className="mt-1 text-[16px] font-bold text-[#1A1A2E] capitalize">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right mt-2 md:mt-0">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-[#999]">
                        Subtotal
                      </p>
                      <p className="text-[15px] font-bold tabular-nums text-[#1A1A2E]">
                        {item.groupSubtotalFormatted}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_80px_110px] gap-2 md:gap-4 py-4 md:py-3 md:px-2 group"
                >
                  {/* Mobile: Description + Total row */}
                  <div className="flex justify-between items-start md:block">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[#1A1A2E] leading-tight md:font-semibold md:text-[13px]">
                        {item.description}
                      </p>
                      {/* Desktop Subtext */}
                      <div className="hidden md:flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-[#888]">
                        {item.type && (
                          <span className="font-medium text-[#aaa]">{item.type}</span>
                        )}
                        {item.sacCode && (
                          <span>
                            HSN/SAC: <span className="font-semibold text-[#ccc]">{item.sacCode}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right md:hidden">
                      <p className="text-[15px] font-black text-[#1A1A2E] tabular-nums">
                        {item.amountFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Mobile: Type+SAC and Qty x Rate row */}
                  <div className="flex items-center justify-between md:hidden mt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C63FF]/70">
                        {item.type || "Service"}
                      </span>
                      {item.sacCode && (
                        <span className="text-[10px] text-[#999]">SAC {item.sacCode}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[#888] font-medium">
                        {item.qty} {item.unit} × {item.rateFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Desktop-only Columns */}
                  <div className="hidden md:flex items-center justify-center tabular-nums text-[13px] font-medium">
                    {item.qty}
                  </div>
                  <div className="hidden md:flex items-center tabular-nums text-[13px] font-medium">
                    {item.rateFormatted}
                  </div>
                  <div className="hidden md:flex items-center text-[12px] text-[#666]">
                    {item.unit}
                  </div>
                  <div className="hidden md:flex items-center justify-end tabular-nums font-bold text-[13px]">
                    {item.amountFormatted}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom ────────────────────────────── */}
      <section className="grid gap-4 border-t border-[#E8E8F0] px-5 pt-4 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="space-y-3 text-[12px] text-[#666]">
          {data.hasNotes && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">
                Notes
              </p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasLicense && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">
                License
              </p>
              <p className="mt-1.5">
                {data.licenseType}
                {data.licenseDuration ? ` · ${data.licenseDuration}` : ""}
              </p>
            </div>
          )}
          {data.hasBankDetails && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">
                Payment
              </p>
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
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#666]">
                Scan to Pay
              </p>
              <div className="mt-2 h-16 w-16 flex items-center justify-center overflow-hidden">
                <img
                  src={data.qrCodeUrl}
                  alt="Payment QR"
                  className="max-h-full max-w-full object-contain object-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Totals — Violet accent */}
        <div>
          <div className="space-y-2 text-[12px] text-[#666]">
            <MilestoneSummaryBlock data={data} textColor="#aaa" borderColor="#333" accentColor="#fff" />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-[#1A1A2E]">
                {data.subtotalFormatted}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{data.taxLabel}</span>
              <span className="tabular-nums font-medium text-[#1A1A2E]">
                {data.taxFormatted}
              </span>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#5548D9] px-4 py-3 text-right text-white print:bg-[#e8e8f0] print:text-[#111]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/60 print:text-[#888]">
              Total Due
            </p>
            <p className="mt-1 text-[22px] font-bold tabular-nums">
              {data.grandTotalFormatted}
            </p>
          </div>
          {data.approximateUsd && (
            <p className="mt-2 text-right text-[10px] text-[#999]">
              ≈ {data.approximateUsd}
            </p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-2 text-[10px] text-[#999]">
              {data.taxComplianceNote}
            </p>
          )}
        </div>
      </section>

      {/* ── Compliance Footer ──────────────────── */}
      <section className="mt-4 grid gap-4 border-t border-[#E8E8F0] pt-4 lg:grid-cols-2">
        {data.grandTotalRaw > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#888]">
              Amount in Words
            </p>
            <p className="mt-1.5 text-[12px] font-semibold text-[#1A1A2E]">
              {data.amountInWords}
            </p>
            {data.reverseCharge && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6C63FF] print:text-black">
                ★ Tax is Payable on Reverse Charge Basis ★
              </p>
            )}
          </div>
        )}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6C63FF] print:text-[#888]">
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
                <p className="text-[8px] italic text-[#999]">
                  Digitally Signed
                </p>
              </div>
            ) : (
              <div className="mt-2 w-full border-b border-[#1A1A2E] pb-1">
                <p className="text-[12px] font-medium text-[#666]">
                  {data.authorizedSignatory || data.agencyName}
                </p>
              </div>
            )}
            <p className="mt-1 text-[10px] text-[#999]">Signature</p>
          </div>
        </div>
      </section>

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
