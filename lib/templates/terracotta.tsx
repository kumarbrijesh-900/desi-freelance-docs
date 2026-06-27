/**
 * ─── TERRACOTTA TEMPLATE ──────────────────────────
 *
 * Design: "The artisan's receipt."
 * Warm earth tones, rounded corners, hand-crafted feel.
 * Like receiving an invoice from a ceramic studio
 * in Pondicherry or a leather workshop in Jodhpur.
 *
 * Key elements:
 * • 5px terracotta bar at top — warm, grounded
 * • Warm cream section backgrounds
 * • Rounded corners (8px) on all containers
 * • Terracotta left-border cards for line items
 * • Handwritten-style "Thank you" footer note
 * • Soft, warm typography — approachable not corporate
 * • Print: cream → white, terracotta borders preserved
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function TerracottaTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[color:var(--color-ink)] bg-[color:var(--color-paper-2)] tabular-nums min-h-[295mm] pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:min-h-0 print:h-auto">
      {/* ── Background Elements ────────────────── */}
      <div className="absolute top-[5%] -left-20 w-[400px] h-[400px] bg-[color:var(--color-coral)]/[0.02] rounded-full blur-[120px] pointer-events-none z-0 rotate-12 print:hidden" />
      <div className="absolute bottom-[15%] -right-20 w-[350px] h-[350px] bg-[color:var(--color-clay)]/[0.03] rounded-full blur-[100px] pointer-events-none z-0 print:hidden" />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply print:hidden"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/handmade-paper.png")',
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] print:hidden"
        style={{
          backgroundImage: "radial-gradient(var(--color-coral) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[color:var(--color-coral)]/[0.02] rounded-full blur-[140px] pointer-events-none z-0 print:hidden" />

      {/* ── Terracotta bar ────────────────────── */}
      <div className="relative z-10 h-[5px] w-full rounded-t-sm bg-[color:var(--color-coral)] print:bg-[color:var(--color-strong)]" />

      {/* ── Header ────────────────────────────── */}
      <header className="rounded-b-lg bg-[color:var(--color-paper)] px-5 py-5 print:bg-[color:var(--color-paper-2)]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="relative z-10 flex items-center justify-start h-14 w-40 mb-3 overflow-hidden">
              {data.agencyLogoUrl && (
                <img
                  src={data.agencyLogoUrl}
                  alt="Agency Logo"
                  className="max-h-full max-w-full object-contain object-left"
                />
              )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
              Studio
            </p>
            <h1 className="mt-1 text-[24px] font-bold leading-none tracking-tight text-[color:var(--color-ink)]">
              {data.agencyName}
            </h1>
            {data.agencyAddress && data.agencyAddress !== "—" && (
              <p className="mt-2 max-w-md whitespace-pre-line text-[12px] leading-5 text-[color:var(--color-ink-2)]">
                {data.agencyAddress}
              </p>
            )}
            {(data.agencyState || data.showAgencyGstin) && (
              <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-[color:var(--color-ink-2)]">
                {data.agencyState && (
                  <span>
                    State: {data.agencyState}
                  </span>
                )}
                {data.showAgencyGstin && <span>GSTIN: {data.agencyGstin}</span>}
                {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
              </div>
            )}
          </div>

          <div className="shrink-0 border border-[color:var(--color-soft)] bg-white px-4 py-3 text-right print:border-[color:var(--color-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
              Invoice
            </p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-[color:var(--color-ink)]">
              {data.invoiceNumber}
            </p>
            {data.poNumber && <><p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] print:text-[color:var(--color-ink-2)]">PO Number</p><p className="text-[18px] font-bold text-[color:var(--color-ink)]">{data.poNumber}</p></>}
            <div className="mt-2 space-y-1 text-[11px] text-[color:var(--color-ink-2)]">
              <p>{data.invoiceDate}</p>
              <p>Due {data.dueDate}</p>
              <p>{data.paymentTerms}</p>
              {data.isInternational && <p>{data.displayCurrency}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* ── Parties — Warm cards ──────────────── */}
      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)] print:border-[color:var(--color-soft)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
            From
          </p>
          <p className="mt-1.5 text-[14px] font-bold text-[color:var(--color-ink)]">
            {data.agencyName}
          </p>
          {data.agencyAddress && data.agencyAddress !== "—" && (
            <p className="mt-1 whitespace-pre-line text-[12px] text-[color:var(--color-ink-2)]">
              {data.agencyAddress}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)] print:border-[color:var(--color-soft)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
            Bill To
          </p>
          <p className="mt-1.5 text-[14px] font-bold text-[color:var(--color-ink)]">
            {data.clientName}
          </p>
          {data.clientAddress && data.clientAddress !== "—" && (
            <p className="mt-1 whitespace-pre-line text-[12px] text-[color:var(--color-ink-2)]">
              {data.clientAddress}
            </p>
          )}
          {(data.clientState || data.clientTaxId) && (
            <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-[color:var(--color-ink-2)]">
              {data.clientState && (
                <span className="font-semibold text-[color:var(--color-ink-2)]">
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

      {/* ── Line Items — Left-border accent ──── */}
      <section className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
          Work Delivered
        </p>

        <div className="mt-3 space-y-2">
          {data.lineItems.map((item) => {
            if (item.isMilestoneHeader) {
              const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
              if (milestoneHeaderCount <= 1) return null;

              return (
                <div
                  key={item.id}
                  className="flex items-end justify-between border-y border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
                      Milestone
                    </p>
                    <p className="mt-1 text-[16px] font-bold text-[color:var(--color-ink)] capitalize">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">
                      Subtotal
                    </p>
                    <p className="text-[16px] font-bold tabular-nums text-[color:var(--color-ink)]">
                      {item.groupSubtotalFormatted}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 border border-[color:var(--color-soft)] border-l-[4px] border-l-[color:var(--color-coral)] bg-white px-4 py-3 print:border-l-[color:var(--color-soft)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[color:var(--color-ink)]">
                    {item.description}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[color:var(--color-ink-2)]">
                    {item.type} · {item.qty} × {item.rateFormatted}
                  </p>
                  {item.sacCode && (
                    <p className="mt-1 text-[10px] text-[color:var(--color-ink-2)]">
                      <span className="text-[color:var(--color-ink-2)]">HSN/SAC:</span>{" "}
                      <span className="font-bold text-[color:var(--color-ink)]">
                        {item.sacCode}
                      </span>
                      {item.unit && (
                        <span className="text-[color:var(--color-ink-2)]">
                          {" "}
                          &nbsp;·&nbsp; Unit:{" "}
                          <span className="font-bold text-[color:var(--color-ink)]">
                            {item.unit}
                          </span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-[15px] font-bold tabular-nums text-[color:var(--color-ink)]">
                  {item.amountFormatted}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bottom ────────────────────────────── */}
      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Left */}
        <div className="space-y-3 text-[12px] text-[color:var(--color-ink-2)]">
          {data.hasNotes && (
            <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
                Notes
              </p>
              <p className="mt-1.5 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.hasLicense && (
            <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
                License
              </p>
              <p className="mt-1.5">
                {data.licenseType}
                {data.licenseDuration ? ` · ${data.licenseDuration}` : ""}
              </p>
            </div>
          )}
          {data.hasBankDetails && (
            <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
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

        {/* Right: Totals */}
        <div>
          <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
              Amount Due
            </p>
            <div className="mt-3 space-y-2 text-[12px] text-[color:var(--color-ink-2)]">
              <MilestoneSummaryBlock data={data} textColor="var(--color-ink-2)" borderColor="var(--color-soft)" accentColor="var(--color-coral)" />
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums font-bold text-[color:var(--color-ink)]">
                  {data.subtotalFormatted}
                </span>
              </div>
              {data.taxRows.map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span>{row.label}</span>
                  <span className="tabular-nums font-bold text-[color:var(--color-ink)]">
                    {row.amountFormatted}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-[color:var(--color-coral)] px-3 py-2.5 text-right text-white print:bg-[color:var(--color-paper)] print:text-[color:var(--color-ink)]">
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/60 print:text-[color:var(--color-ink-2)]">
                Grand Total
              </p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums">
                {data.grandTotalFormatted}
              </p>
            </div>
          </div>
          {data.approximateUsd && (
            <p className="mt-2 text-right text-[10px] text-[color:var(--color-ink-2)]">
              ≈ {data.approximateUsd}
            </p>
          )}
          {data.taxComplianceNote && (
            <p className="mt-2 text-[10px] text-[color:var(--color-ink-2)]">
              {data.taxComplianceNote}
            </p>
          )}
        </div>
      </section>

      {/* ── Compliance Footer ──────────────────── */}
      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        {data.grandTotalRaw > 0 && (
          <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
              Amount in Words
            </p>
            <p className="mt-1.5 text-[12px] font-bold text-[color:var(--color-ink)]">
              {data.amountInWords}
            </p>
            {data.reverseCharge && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-coral)] print:text-black">
                ★ Tax is Payable on Reverse Charge Basis ★
              </p>
            )}
          </div>
        )}
        <div className="rounded-lg border border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-4 py-3 print:bg-[color:var(--color-paper-2)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-coral)]">
            Authorized Signatory
          </p>
          <div className="mt-4 flex flex-col items-center">
            {data.signatureUrl ? (
              <div className="flex flex-col items-center gap-1">
                <img
                  src={data.signatureUrl}
                  alt="Signature"
                  className="h-10 w-auto object-contain brightness-0 opacity-80"
                />
                <p className="text-[8px] italic text-[color:var(--color-ink-2)]">
                  Digitally Signed
                </p>
              </div>
            ) : (
              <div className="mt-2 w-full border-b border-[color:var(--color-ink)] pb-1 text-center">
                <p className="text-[12px] font-normal text-[color:var(--color-ink-2)]">
                  {data.authorizedSignatory || data.agencyName}
                </p>
              </div>
            )}
            <p className="mt-1 text-[10px] text-[color:var(--color-ink-2)]">Signature</p>
          </div>
        </div>
      </section>

      {/* ── Warm footer ────────────────────── */}
      <div className="mt-5 text-center text-[11px] italic text-[color:var(--color-ink-2)]">
        Thank you for your patronage ✦
      </div>

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
