/**
 * ─── CLASSIC TEMPLATE ──────────────────────────────
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MilestoneSummaryBlock } from "./MilestoneSummaryBlock";

export default function ClassicTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[color:var(--color-ink)] bg-[color:var(--color-paper-2)] min-h-[295mm] tabular-nums pt-[15mm] px-[15mm] pb-[10mm] box-border relative overflow-visible print:overflow-visible print:bg-white print:min-h-0 print:h-auto">
      {/* ── Background Patterns ────────────────── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] print:hidden"
        style={{
          backgroundImage: "radial-gradient(var(--color-ink) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.02] print:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-ink) 0, var(--color-ink) 1px, transparent 0, transparent 10px)",
        }}
      />

      <div className="absolute -top-20 -right-20 w-80 h-80 bg-[color:var(--color-paper)] rounded-full blur-3xl opacity-20 z-0 pointer-events-none print:hidden" />
      <div className="absolute bottom-40 -left-10 w-64 h-64 bg-[color:var(--color-strong)] rounded-full blur-[100px] opacity-15 z-0 pointer-events-none print:hidden" />

      {/* ── Top Accent ──────────────────────────── */}
      <div className="relative z-10 h-px w-full bg-[color:var(--color-acid)] mb-8" />

      {/* ── Header ────────────────────────────── */}
      <header className="flex justify-between items-start mb-10">
        <div className="max-w-[400px]">
          {data.agencyLogoUrl && (
            <div className="relative z-10 flex items-center justify-start h-16 w-48 mb-6 overflow-hidden">
              <img
                src={data.agencyLogoUrl}
                alt="Agency Logo"
                className="max-h-full max-w-full object-contain object-left"
              />
            </div>
          )}
          <div className="text-[12px] leading-relaxed text-[color:var(--color-ink-2)] space-y-1">
            <p className="font-bold text-[color:var(--color-ink)] text-[14px] mb-1">
              {data.agencyName}
            </p>
            {data.agencyAddress && data.agencyAddress !== "—" && (
              <p className="whitespace-pre-line max-w-[280px]">
                {data.agencyAddress}
              </p>
            )}
            {(data.agencyState || data.showAgencyGstin || data.agencyPan) && (
              <div className="pt-2 flex flex-col gap-0.5 text-[11px] text-[color:var(--color-ink-2)]">
                {data.agencyState && (
                  <span>
                    {data.agencyState}
                  </span>
                )}
                {data.showAgencyGstin && (
                  <span className="font-bold text-[color:var(--color-ink-2)]">
                    GSTIN {data.agencyGstin}
                  </span>
                )}
                {data.agencyPan && <span>PAN {data.agencyPan}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-[30px] font-black tracking-tighter leading-none mb-4">
            INVOICE
          </h1>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-1">
                Number
              </p>
              <p className="text-[16px] font-bold">{data.invoiceNumber}</p>
            </div>
            {data.poNumber && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-1">PO Number</p>
                <p className="text-[14px] font-bold">{data.poNumber}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-8 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-1">
                  Date
                </p>
                <p className="text-[13px] font-normal">{data.invoiceDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-1">
                  Due
                </p>
                <p className="text-[13px] font-normal text-[color:var(--color-ochre-deep)]">
                  {data.dueDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Client Section ─────────────────────── */}
      <section className="mb-10 pb-6 border-b border-[color:var(--color-soft)]">
        <div className="grid grid-cols-[1fr_200px] gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-4">
              Billed To
            </p>
            <div className="text-[18px] font-bold mb-2">{data.clientName}</div>
            {data.clientAddress && data.clientAddress !== "—" && (
              <p className="text-[13px] text-[color:var(--color-ink-2)] leading-relaxed whitespace-pre-line max-w-[320px]">
                {data.clientAddress}
              </p>
            )}
            <div className="mt-3 flex gap-4 text-[11px] text-[color:var(--color-ink-2)]">
              {data.clientState && (
                <span>
                  {data.clientState}
                </span>
              )}
              {data.clientTaxId && (
                <span>
                  {data.clientTaxLabel?.replace('Client ', '').replace(' (Optional)', '')} {data.clientTaxId}
                </span>
              )}
            </div>
          </div>
          <div className="text-right self-end">
            {data.clientState && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-1">
                  Place of Supply
                </p>
                <p className="text-[13px] font-normal">{data.clientState}</p>
              </div>
            )}
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-1">
              Payment Terms
            </p>
            <p className="text-[13px] font-normal">{data.paymentTerms}</p>
            {data.isInternational && (
              <p className="mt-2 text-[11px] font-bold text-[color:var(--color-ink)]">
                CURRENCY: {data.displayCurrency}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="mb-10">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[color:var(--color-ink)]">
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
          <tbody className="divide-y divide-[color:var(--color-soft)]">
            {data.lineItems.map((item) => {
              if (item.isMilestoneHeader) {
                // Hide milestone header for single-milestone invoices
                const milestoneHeaderCount = data.lineItems.filter(i => i.isMilestoneHeader).length;
                if (milestoneHeaderCount <= 1) return null;

                return (
                  <tr key={item.id} className="bg-[color:var(--color-paper)]/60 border-y border-[color:var(--color-soft)]">
                    <td colSpan={3} className="py-5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)]">
                          Milestone
                        </span>
                        <div className="text-[16px] font-bold text-[color:var(--color-ink)] capitalize">
                          {item.description}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right align-bottom">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-2)] mb-1">
                        Subtotal
                      </div>
                      <div className="text-[15px] font-black text-[color:var(--color-ink)]">
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
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--color-ink-2)]">
                      {item.type && (
                        <span className="font-bold">{item.type}</span>
                      )}
                      {item.sacCode && (
                        <span>
                          <span className="text-[color:var(--color-ink-2)]">HSN/SAC:</span>{" "}
                          <span className="font-bold text-[color:var(--color-ink)]">
                            {item.sacCode}
                          </span>
                        </span>
                      )}
                      {item.unit && (
                        <span>
                          <span className="text-[color:var(--color-ink-2)]">Unit:</span>{" "}
                          <span className="font-bold">{item.unit}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-6 text-center text-[14px] font-normal">
                    {item.qty}
                  </td>
                  <td className="py-6 text-right text-[14px] font-normal">
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
      <section className="flex justify-end mb-12 relative">
        <div
          className="absolute -inset-4 z-0 pointer-events-none opacity-[0.03] print:hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--color-ink) 0, var(--color-ink) 1px, transparent 0, transparent 8px)",
          }}
        />

        <div className="relative z-10 w-[320px] space-y-3">
          <MilestoneSummaryBlock data={data} />
          <div className="flex justify-between text-[13px] text-[color:var(--color-ink-2)]">
            <span>Subtotal</span>
            <span className="font-bold text-[color:var(--color-ink)]">
              {data.subtotalFormatted}
            </span>
          </div>
          {data.taxRows.map((row) => (
            <div key={row.label} className="flex justify-between text-[13px] text-[color:var(--color-ink-2)]">
              <span>{row.label}</span>
              <span className="font-bold text-[color:var(--color-ink)]">
                {row.amountFormatted}
              </span>
            </div>
          ))}
          <div className="pt-4 border-t border-[color:var(--color-ink)] flex justify-between items-baseline">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              Total Due
            </span>
            <span className="text-[28px] font-black">
              {data.grandTotalFormatted}
            </span>
          </div>
          {data.amountInWords && (
            <p className="text-right text-[11px] font-normal text-[color:var(--color-ink-2)] italic pt-1">
              {data.amountInWords}
            </p>
          )}
          {data.approximateUsd && (
            <p className="text-right text-[10px] text-[color:var(--color-ink-2)] italic pt-1">
              ≈ {data.approximateUsd}
            </p>
          )}
          {data.taxComplianceNote && (
            <p className="text-right text-[10px] text-[color:var(--color-ink-2)] leading-4 pt-1">
              {data.taxComplianceNote}
            </p>
          )}
        </div>
      </section>

      {/* ── Footer / Legal ───────────────────── */}
      <section className="mt-auto grid grid-cols-2 gap-10 items-start">
        <div className="space-y-8">
          {data.hasBankDetails && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-3">
                Bank Details
              </p>
              <div className="text-[12px] text-[color:var(--color-ink-2)] leading-relaxed space-y-0.5">
                {!data.isInternational ? (
                  <>
                    <p className="font-bold text-[color:var(--color-ink)]">{data.bankName}</p>
                    <p>Account: {data.accountNumber}</p>
                    <p>IFSC: {data.ifscCode}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[color:var(--color-ink)]">{data.bankName}</p>
                    <p>SWIFT: {data.swiftBicCode}</p>
                    <p>Account: {data.accountNumber}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {data.hasNotes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-2">
                Notes
              </p>
              <p className="text-[11px] text-[color:var(--color-ink-2)] leading-relaxed whitespace-pre-line max-w-[340px]">
                {data.notes}
              </p>
            </div>
          )}

          {data.hasQrCode && (
            <div className="mt-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-3">
                Payment QR
              </p>
              <div className="h-20 w-20 flex items-center justify-center overflow-hidden">
                <img
                  src={data.qrCodeUrl}
                  alt="Payment QR"
                  className="max-h-full max-w-full object-contain object-center"
                />
              </div>
            </div>
          )}
        </div>

        <div className="text-right space-y-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-6">
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
              <div className="h-px w-48 bg-[color:var(--color-ink)] mb-2" />
              <p className="text-[9px] text-[color:var(--color-ink-2)] uppercase tracking-widest font-normal">
                Digital Signature
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Statutory RCM Disclosure (GST Act mandatory) ── */}
      {data.reverseCharge && (
        <div className="relative z-10 mt-12 border border-[color:var(--color-ink)] px-6 py-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink)]">
            ★ Tax is Payable on Reverse Charge Basis ★
          </p>
        </div>
      )}

      <LegalDisclaimer />
      <InvoiceWatermark />
    </div>
  );
}
