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
 * • Warm off-white surface tone (--color-paper-2)
 * • Hairline (0.5px) dividers — delicate, refined
 * • Body items as editorial cards, not table rows
 * • System serif (Georgia) for headings — timeless
 * • Print: falls back to pure white background
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function EditorialTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[color:var(--color-ink)] bg-[color:var(--color-paper-2)] min-h-[295mm] tabular-nums pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">
      {/* ── Background Elements ────────────────── */}
      <div className="absolute top-[20%] -left-10 select-none pointer-events-none text-[240px] font-['Georgia',_serif] italic text-[color:var(--color-ink)] opacity-[0.02] -rotate-12 z-0 print:hidden">
        INV
      </div>

      {/* Linen Cross-hatch Pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] print:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-ink) 0, var(--color-ink) 1px, transparent 0, transparent 50%)",
          backgroundSize: "3px 3px",
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] print:hidden"
        style={{
          backgroundImage: "radial-gradient(var(--color-ink) 0.8px, transparent 0.8px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-[color:var(--color-soft)] rounded-full blur-[120px] opacity-20 z-0 pointer-events-none print:hidden" />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.4] mix-blend-multiply print:hidden"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/natural-paper.png")',
        }}
      />

      {/* ── Top accent line ───────────────────── */}
      <div className="relative z-10 h-[1px] w-full bg-[color:var(--color-ink)] print:bg-black" />

      {/* ── Masthead ──────────────────────────── */}
      <header className="pb-6 pt-6">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <div className="relative z-10 flex items-center justify-start h-14 w-40 mb-4 overflow-hidden">
              {data.agencyLogoUrl && (
                <img
                  src={data.agencyLogoUrl}
                  alt="Agency Logo"
                  className="max-h-full max-w-full object-contain object-left"
                />
              )}
            </div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
              Issued by
            </p>
            <h1 className="mt-1 font-['Georgia',_serif] text-[22px] font-normal italic leading-tight text-[color:var(--color-ink)]">
              {data.agencyName}
            </h1>
          </div>

          {/* Oversized invoice number — the hero */}
          <div className="text-right">
            <p className="font-['Georgia',_serif] text-[48px] font-normal leading-none tracking-tight text-[color:var(--color-ink)] md:text-[56px]">
              {data.invoiceNumber}
            </p>
            {data.poNumber && <><p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">PO Number</p><p className="font-[\'Georgia\',_serif] text-[24px] text-[color:var(--color-ink)]">{data.poNumber}</p></>}
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">
              {data.invoiceDate}
            </p>
          </div>
        </div>
      </header>

      {/* ── Hairline ─────────────────────────── */}
      <div className="h-[0.5px] w-full bg-[color:var(--color-soft)] print:bg-[color:var(--color-soft)]" />

      {/* ── Meta Strip ───────────────────────── */}
      <div className="grid grid-cols-3 gap-4 py-4 text-[11px]">
        <div>
          <p className="uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">Due Date</p>
          <p className="mt-1 font-normal text-[color:var(--color-ink)]">{data.dueDate}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">Terms</p>
          <p className="mt-1 font-normal text-[color:var(--color-ink)]">{data.paymentTerms}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">Currency</p>
          <p className="mt-1 font-normal text-[color:var(--color-ink)]">
            {data.displayCurrency}
          </p>
        </div>
      </div>

      <div className="h-[0.5px] w-full bg-[color:var(--color-soft)] print:bg-[color:var(--color-soft)]" />

      {/* ── Parties — Editorial two-panel ────── */}
      <section className="relative z-10 grid gap-6 py-5 md:grid-cols-2">
        <div className="md:pr-6 md:border-r md:border-[color:var(--color-soft)]">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
            From
          </p>
          <p className="mt-2 font-['Georgia',_serif] text-[15px] italic text-[color:var(--color-ink)]">
            {data.agencyName}
          </p>
          {data.agencyAddress && data.agencyAddress !== "—" && (
            <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-[color:var(--color-ink-2)]">
              {data.agencyAddress}
            </p>
          )}
          {data.showAgencyGstin && (
            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-[color:var(--color-ink-2)]">
              {data.agencyState && (
                <span>
                  {data.agencyState}
                </span>
              )}
              <span className="font-bold text-[color:var(--color-ink-2)]">
                GSTIN {data.agencyGstin}
              </span>
            </div>
          )}
        </div>
        <div className="md:pl-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
            To
          </p>
          <p className="mt-2 font-['Georgia',_serif] text-[15px] italic text-[color:var(--color-ink)]">
            {data.clientName}
          </p>
          {data.clientAddress && data.clientAddress !== "—" && (
            <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-[color:var(--color-ink-2)]">
              {data.clientAddress}
            </p>
          )}
          {(data.clientState || data.clientTaxId) && (
            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-[color:var(--color-ink-2)]">
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
      </section>

      <div className="h-[0.5px] w-full bg-[color:var(--color-soft)] print:bg-[color:var(--color-soft)]" />

      {/* ── Line Items — Editorial card style ── */}
      <section className="py-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
          Services
        </p>

        <div className="mt-4 space-y-0">
            {data.lineItems.map((item, i) => {
              if (item.isMilestoneHeader) {
                const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                if (milestoneHeaderCount <= 1) return null;

                return (
                  <div
                    key={item.id}
                    className="mt-6 flex items-end justify-between border-y border-[color:var(--color-soft)] bg-[color:var(--color-paper-2)] px-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
                        Milestone
                      </p>
                      <p className="mt-1 font-['Georgia',_serif] text-[16px] font-bold italic text-[color:var(--color-ink)] capitalize">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">
                        Subtotal
                      </p>
                      <p className="text-[16px] font-normal tabular-nums text-[color:var(--color-ink)]">
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
                    ? "border-t border-[color:var(--color-soft)] print:border-[color:var(--color-soft)]"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-['Georgia',_serif] text-[14px] italic leading-tight text-[color:var(--color-ink)]">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-ink-2)]">
                    {item.type} · {item.qty} × {item.rateFormatted}
                  </p>
                  {item.sacCode && (
                    <p className="mt-0.5 text-[10px] text-[color:var(--color-ink-2)]">
                      <span className="text-[color:var(--color-ink-2)]">HSN/SAC:</span>{" "}
                      <span className="font-bold text-[color:var(--color-ink)]">
                        {item.sacCode}
                      </span>
                      {item.unit && (
                        <span className="text-[color:var(--color-ink-2)]">
                          {" "}
                          · Unit:{" "}
                          <span className="font-bold text-[color:var(--color-ink-2)]">
                            {item.unit}
                          </span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-[15px] font-normal tabular-nums text-[color:var(--color-ink)]">
                  {item.amountFormatted}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-[0.5px] w-full bg-[color:var(--color-soft)] print:bg-[color:var(--color-soft)]" />

      {/* ── Bottom: Totals + Payment ─────────── */}
      <section className="grid gap-6 py-5 md:grid-cols-[minmax(0,1fr)_220px]">
        {/* Left: Notes, License, Bank */}
        <div className="space-y-4 text-[12px] leading-5 text-[color:var(--color-ink-2)]">
          {data.hasNotes && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
                Notes
              </p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}

          {data.hasLicense && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
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
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
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
                  <p className="mt-2 text-[10px] italic text-[color:var(--color-ink-2)] border-t border-[color:var(--color-soft)] pt-1.5">
                    Note: Please transfer the relevant Milestone Subtotal as outlined above.
                  </p>
                )}
              </div>
            </div>
          )}

          {data.hasQrCode && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-2)]">
                Scan to Pay
              </p>
              <div className="mt-2 h-20 w-20 flex items-center justify-center overflow-hidden">
                <img
                  src={data.qrCodeUrl}
                  alt="Payment QR"
                  className="max-h-full max-w-full object-contain object-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Totals */}
        <div className="self-end">
          <div className="space-y-2 text-[13px]">
            <MilestoneSummaryBlock data={data} textColor="var(--color-ink-2)" borderColor="var(--color-soft)" accentColor="var(--color-ink)" />
            <div className="flex justify-between text-[color:var(--color-ink-2)]">
              <span>Subtotal</span>
              <span className="tabular-nums">{data.subtotalFormatted}</span>
            </div>
            <div className="flex justify-between text-[color:var(--color-ink-2)]">
              <span>{data.taxLabel}</span>
              <span className="tabular-nums">{data.taxFormatted}</span>
            </div>
          </div>

          <div className="mt-3 border-t border-[color:var(--color-ink)] pt-3 print:border-black">
            <div className="flex items-baseline justify-between">
              <span className="font-['Georgia',_serif] text-[12px] italic text-[color:var(--color-ink-2)]">
                Total Due
              </span>
              <span className="font-['Georgia',_serif] text-[28px] font-normal text-[color:var(--color-ink)]">
                {data.grandTotalFormatted}
              </span>
            </div>
          </div>

          {data.approximateUsd && (
            <p className="mt-2 text-right text-[11px] text-[color:var(--color-ink-2)]">
              ≈ {data.approximateUsd}
            </p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-2 text-[10px] leading-4 text-[color:var(--color-ink-2)]">
              {data.taxComplianceNote}
            </p>
          )}
        </div>
      </section>

      {/* ── Compliance Footer ──────────────────── */}
      <section className="mt-4 grid gap-4 border-t border-[color:var(--color-soft)] pt-4 lg:grid-cols-2">
        {data.grandTotalRaw > 0 && (
          <div>
            <p className="font-['Georgia',_serif] text-[11px] italic text-[color:var(--color-ink-2)]">
              Total Amount in Words
            </p>
            <p className="mt-1 text-[12px] font-normal text-[color:var(--color-ink)]">
              {data.amountInWords}
            </p>
            {data.reverseCharge && (
              <p className="mt-2 font-['Georgia',_serif] text-[10px] font-bold italic tracking-[0.1em] text-[color:var(--color-ink)]">
                ★ Tax is Payable on Reverse Charge Basis ★
              </p>
            )}
          </div>
        )}
        <div>
          <p className="font-['Georgia',_serif] text-[11px] italic text-[color:var(--color-ink-2)]">
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
                <p className="text-[8px] italic text-[color:var(--color-ink-2)]">
                  Digitally Signed
                </p>
              </div>
            ) : (
              <div className="mt-2 w-full border-b border-[color:var(--color-ink)] pb-1">
                <p className="text-[12px] font-normal text-[color:var(--color-ink-2)]">
                  {data.authorizedSignatory || data.agencyName}
                </p>
              </div>
            )}
            <p className="mt-1 text-[10px] text-[color:var(--color-ink-2)]">Signature</p>
          </div>
        </div>
      </section>

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
