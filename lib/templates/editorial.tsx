/**
 * ─── EDITORIAL TEMPLATE ────────────────────────────
 *
 * Design: "The magazine receipt."
 * Inspired by Kinfolk, Cereal, Apartamento magazines.
 * Oversized invoice number, generous negative space,
 * fine hairline dividers, asymmetric two-panel layout.
 *
 * Key elements:
 * • Huge 48px invoice number — the hero element
 * • Warm off-white (#F8F7F4) surface tone
 * • Hairline (0.5px) dividers — delicate, refined
 * • Body items as editorial cards, not table rows
 * • System serif (Georgia) for headings — timeless
 * • Print: falls back to pure white background
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";

export default function EditorialTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#27272F] bg-[#F8F7F4] min-h-[297mm] p-[15mm] box-border relative overflow-hidden">
      {/* ── Background Elements ────────────────── */}
      <div className="absolute top-[20%] -left-10 select-none pointer-events-none text-[240px] font-['Georgia',_serif] italic text-[#27272F]/[0.02] -rotate-12 z-0">
        INV
      </div>

      {/* Linen Cross-hatch Pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #27272F 0, #27272F 1px, transparent 0, transparent 50%)",
          backgroundSize: "3px 3px",
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#27272F 0.8px, transparent 0.8px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-[#EEEBE5] rounded-full blur-[120px] opacity-20 z-0 pointer-events-none" />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.4] mix-blend-multiply"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/natural-paper.png")',
        }}
      />

      {/* ── Top accent line ───────────────────── */}
      <div className="relative z-10 h-[1px] w-full bg-[#27272F] print:bg-black" />

      {/* ── Masthead ──────────────────────────── */}
      <header className="pb-6 pt-6">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <div className="relative z-10 flex items-center justify-start h-14 w-40 mb-4 overflow-hidden">
              {data.agencyLogoUrl ? (
                <img
                  src={data.agencyLogoUrl}
                  alt="Agency Logo"
                  className="max-h-full max-w-full object-contain object-left"
                />
              ) : (
                <div className="w-full h-full border border-dashed border-[#D8D5CE] bg-white/40 flex items-center justify-center text-[8px] uppercase tracking-[0.3em] text-[#999] font-bold">
                  Logo
                </div>
              )}
            </div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#999]">
              Issued by
            </p>
            <h1 className="mt-1 font-['Georgia',_serif] text-[22px] font-normal italic leading-tight text-[#27272F]">
              {data.agencyName}
            </h1>
          </div>

          {/* Oversized invoice number — the hero */}
          <div className="text-right">
            <p className="font-['Georgia',_serif] text-[48px] font-normal leading-none tracking-tight text-[#27272F] md:text-[56px]">
              {data.invoiceNumber}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#999]">
              {data.invoiceDate}
            </p>
          </div>
        </div>
      </header>

      {/* ── Hairline ─────────────────────────── */}
      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Meta Strip ───────────────────────── */}
      <div className="grid grid-cols-3 gap-4 py-4 text-[11px]">
        <div>
          <p className="uppercase tracking-[0.2em] text-[#999]">Due Date</p>
          <p className="mt-1 font-medium text-[#27272F]">{data.dueDate}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-[#999]">Terms</p>
          <p className="mt-1 font-medium text-[#27272F]">{data.paymentTerms}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-[#999]">Currency</p>
          <p className="mt-1 font-medium text-[#27272F]">
            {data.displayCurrency}
          </p>
        </div>
      </div>

      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Parties — Editorial two-panel ────── */}
      <section className="relative z-10 grid gap-6 py-5 md:grid-cols-2">
        <div className="md:pr-6 md:border-r md:border-[#EEEBE5]">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
            From
          </p>
          <p className="mt-2 font-['Georgia',_serif] text-[15px] italic text-[#27272F]">
            {data.agencyName}
          </p>
          <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-[#777]">
            {data.agencyAddress}
          </p>
          {data.showAgencyGstin && (
            <p className="mt-1 text-[11px] text-[#999]">
              GSTIN {data.agencyGstin}
            </p>
          )}
        </div>
        <div className="md:pl-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
            To
          </p>
          <p className="mt-2 font-['Georgia',_serif] text-[15px] italic text-[#27272F]">
            {data.clientName}
          </p>
          <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-[#777]">
            {data.clientAddress}
          </p>
          {data.clientTaxId && (
            <p className="mt-1 text-[11px] text-[#999]">
              {data.clientTaxLabel} {data.clientTaxId}
            </p>
          )}
        </div>
      </section>

      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Line Items — Editorial card style ── */}
      <section className="py-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
          Services
        </p>

        <div className="mt-4 space-y-0">
          {data.lineItems.map((item, i) => {
            if (item.isMilestoneHeader || (item as any).is_milestone_header) {
              return (
                <div
                  key={item.id}
                  className="mt-6 flex items-end justify-between border-y border-[#EEEBE5] bg-[#EEEBE5]/40 px-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
                      Milestone Section
                    </p>
                    <p className="mt-1 font-['Georgia',_serif] text-[16px] font-bold italic text-[#27272F]">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#999]">
                      Subtotal
                    </p>
                    <p className="text-[16px] font-medium tabular-nums text-[#27272F]">
                      {item.groupSubtotalFormatted}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className={`flex items-start justify-between gap-6 py-3 ${
                  i > 0 && !data.lineItems[i - 1].isMilestoneHeader
                    ? "border-t border-[#EEEBE5] print:border-[#ddd]"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-['Georgia',_serif] text-[14px] italic leading-tight text-[#27272F]">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[#777]">
                    {item.type} · {item.qty} × {item.rateFormatted}
                  </p>
                  {item.sacCode && (
                    <p className="mt-0.5 text-[10px] text-[#555]">
                      <span className="text-[#999]">HSN/SAC:</span>{" "}
                      <span className="font-semibold text-[#27272F]">
                        {item.sacCode}
                      </span>
                      {item.unit && (
                        <span className="text-[#999]">
                          {" "}
                          · Unit:{" "}
                          <span className="font-medium text-[#555]">
                            {item.unit}
                          </span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-[15px] font-medium tabular-nums text-[#27272F]">
                  {item.amountFormatted}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-[0.5px] w-full bg-[#D8D5CE] print:bg-[#ccc]" />

      {/* ── Bottom: Totals + Payment ─────────── */}
      <section className="grid gap-6 py-5 md:grid-cols-[minmax(0,1fr)_220px]">
        {/* Left: Notes, License, Bank */}
        <div className="space-y-4 text-[12px] leading-5 text-[#777]">
          {data.hasNotes && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
                Notes
              </p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}

          {data.hasLicense && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
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
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
                Payment
              </p>
              <div className="mt-1.5 space-y-0.5">
                {!data.isInternational ? (
                  <>
                    {data.bankName && <p>{data.bankName}</p>}
                    {data.accountName && <p>A/C: {data.accountName}</p>}
                    {data.accountNumber && <p>No: {data.accountNumber}</p>}
                    {data.ifscCode && <p>IFSC: {data.ifscCode}</p>}
                  </>
                ) : (
                  <>
                    {data.accountName && <p>Beneficiary: {data.accountName}</p>}
                    {data.bankName && <p>Bank: {data.bankName}</p>}
                    {data.accountNumber && <p>Account: {data.accountNumber}</p>}
                    {data.swiftBicCode && <p>SWIFT: {data.swiftBicCode}</p>}
                    {data.ibanRoutingCode && (
                      <p>IBAN: {data.ibanRoutingCode}</p>
                    )}
                  </>
                )}
                {data.lineItems.some((i) => i.isMilestoneHeader) && (
                  <p className="mt-2 text-[10px] italic text-[#999] border-t border-[#EEEBE5] pt-1.5">
                    Note: Please transfer the relevant Milestone Subtotal as outlined above.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#999]">
              Scan to Pay
            </p>
            <div className="mt-2 h-20 w-20 flex items-center justify-center overflow-hidden">
              {data.hasQrCode ? (
                <img
                  src={data.qrCodeUrl}
                  alt="Payment QR"
                  className="max-h-full max-w-full object-contain object-center"
                />
              ) : (
                <div className="w-full h-full border border-dashed border-[#D8D5CE] bg-white/40 flex items-center justify-center text-[8px] uppercase tracking-[0.2em] text-[#999] font-bold">
                  QR
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Totals */}
        <div className="self-end">
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between text-[#777]">
              <span>Subtotal</span>
              <span className="tabular-nums">{data.subtotalFormatted}</span>
            </div>
            <div className="flex justify-between text-[#777]">
              <span>{data.taxLabel}</span>
              <span className="tabular-nums">{data.taxFormatted}</span>
            </div>
          </div>

          <div className="mt-3 border-t border-[#27272F] pt-3 print:border-black">
            <div className="flex items-baseline justify-between">
              <span className="font-['Georgia',_serif] text-[12px] italic text-[#777]">
                Total Due
              </span>
              <span className="font-['Georgia',_serif] text-[28px] font-normal text-[#27272F]">
                {data.grandTotalFormatted}
              </span>
            </div>
          </div>

          {data.approximateUsd && (
            <p className="mt-2 text-right text-[11px] text-[#999]">
              ≈ {data.approximateUsd}
            </p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-2 text-[10px] leading-4 text-[#999]">
              {data.taxComplianceNote}
            </p>
          )}
        </div>
      </section>

      {/* ── Compliance Footer ──────────────────── */}
      <section className="mt-4 grid gap-4 border-t border-[#E0E0E0] pt-4 lg:grid-cols-2">
        {data.grandTotalRaw > 0 && (
          <div>
            <p className="font-['Georgia',_serif] text-[11px] italic text-[#777]">
              Total Amount in Words
            </p>
            <p className="mt-1 text-[12px] font-medium text-[#27272F]">
              {data.amountInWords}
            </p>
            {data.reverseCharge && (
              <p className="mt-2 font-['Georgia',_serif] text-[10px] font-bold italic tracking-[0.1em] text-[#27272F]">
                ★ Tax is Payable on Reverse Charge Basis ★
              </p>
            )}
          </div>
        )}
        <div>
          <p className="font-['Georgia',_serif] text-[11px] italic text-[#777]">
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
              <div className="mt-2 w-full border-b border-[#27272F] pb-1">
                <p className="text-[12px] font-medium text-[#555]">
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
