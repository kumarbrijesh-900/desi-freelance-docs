/**
 * ─── CLASSIC TEMPLATE ──────────────────────────────
 */

import type { InvoiceTemplateProps } from "./template-types";
import { InvoiceWatermark } from "./Watermark";

export default function ClassicTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="font-['DM_Sans',_sans-serif] text-[#111118]">
      {/* ── Top Rule ──────────────────────────── */}
      <div className="h-[3px] w-full bg-[#111118] print:bg-black" />

      {/* ── Header ────────────────────────────── */}
      <header className="mt-5 grid gap-5 pb-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0">
          {data.agencyLogoUrl && (
            <img
              src={data.agencyLogoUrl}
              alt="Logo"
              className="mb-3 max-h-11 w-auto object-contain"
            />
          )}
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">
            Issued By
          </p>
          <h1 className="mt-1.5 text-[28px] font-bold leading-none tracking-tight">
            {data.agencyName}
          </h1>
          <p className="mt-2.5 max-w-xl whitespace-pre-line text-[13px] leading-5 text-[#555]">
            {data.agencyAddress}
          </p>
          {(data.agencyState || data.showAgencyGstin || data.agencyPan) && (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#888]">
              {data.agencyState && <span>State: {data.agencyState}{data.agencyStateCode ? ` (${data.agencyStateCode})` : ""}</span>}
              {data.showAgencyGstin && <span>GSTIN: {data.agencyGstin}</span>}
              {data.agencyPan && <span>PAN: {data.agencyPan}</span>}
            </div>
          )}
        </div>

        <div className="self-start border border-[#E2E2EA] px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">
            Invoice
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">
            {data.invoiceNumber}
          </p>
          <div className="mt-3 space-y-2 text-[13px] leading-5 text-[#555]">
            <div className="flex justify-between gap-4 border-b border-[#F0F0F2] pb-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#6E6E7A]">Invoice Date</span>
              <span className="font-medium text-[#111118]">{data.invoiceDate}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F0F0F2] pb-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#6E6E7A]">Due Date</span>
              <span className="font-medium text-[#111118]">{data.dueDate}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#6E6E7A]">Terms</span>
              <span className="font-medium text-[#111118]">{data.paymentTerms}</span>
            </div>
            {data.isInternational && (
              <div className="flex justify-between gap-4 border-t border-[#F0F0F2] pt-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#6E6E7A]">Currency</span>
                <span className="font-medium text-[#111118]">{data.displayCurrency}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Parties ───────────────────────────── */}
      <section className="grid gap-4 border-y border-[#E2E2EA] py-4 md:grid-cols-2 print:border-[#ccc]">
        <div className="border border-[#E2E2EA] px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">From</p>
          <p className="mt-1.5 text-[15px] font-semibold">{data.agencyName}</p>
          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-5 text-[#555]">{data.agencyAddress}</p>
          {data.agencyState && (
            <p className="mt-1.5 text-[11px] text-[#888]">State: {data.agencyState}{data.agencyStateCode ? ` (${data.agencyStateCode})` : ""}</p>
          )}
        </div>

        <div className="border border-[#E2E2EA] px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Bill To</p>
          <p className="mt-1.5 text-[15px] font-semibold">{data.clientName}</p>
          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-5 text-[#555]">{data.clientAddress}</p>
          {!data.isInternational && data.clientState && (
            <p className="mt-1.5 text-[11px] text-[#888]">State: {data.clientState}{data.clientStateCode ? ` (${data.clientStateCode})` : ""}</p>
          )}
          {data.isInternational && data.clientCountry && (
            <p className="mt-1.5 text-[11px] text-[#888]">Country: {data.clientCountry}</p>
          )}
          {data.clientTaxId && (
            <p className="mt-1.5 text-[11px] text-[#888]">{data.clientTaxLabel}: {data.clientTaxId}</p>
          )}
        </div>
      </section>

      {/* ── Line Items ────────────────────────── */}
      <section className="py-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Line Items</p>
            <h2 className="mt-1 text-[18px] font-bold tracking-tight">Services & Deliverables</h2>
          </div>
          <p className="text-[11px] text-[#888]">{data.itemCount} item{data.itemCount === 1 ? "" : "s"}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#111118] text-[10px] uppercase tracking-[0.16em] text-[#6E6E7A]">
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-3 py-2 font-semibold">Qty</th>
                <th className="px-3 py-2 font-semibold">Rate</th>
                <th className="px-3 py-2 font-semibold">Unit</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-[#F0F0F2] text-[13px] leading-5 ${
                    i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 align-top">
                    <span className="font-semibold text-[#111118]">{item.description}</span>
                    <span className="mt-0.5 flex gap-2 text-[10px] uppercase tracking-[0.12em] text-[#999]">
                      <span>{item.type}</span>
                      <span>•</span>
                      <span>SAC {item.sacCode}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top font-medium">{item.qty}</td>
                  <td className="px-3 py-2.5 align-top font-medium">{item.rateFormatted}</td>
                  <td className="px-3 py-2.5 align-top text-[#555]">{item.unit}</td>
                  <td className="px-3 py-2.5 text-right align-top font-semibold">{item.amountFormatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom Section ────────────────────── */}
      <section className="grid gap-4 border-t border-[#E2E2EA] pt-4 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
        {/* Left: Notes + License + Payment */}
        <div className="space-y-3">
          {data.hasNotes && (
            <div className="border border-[#E2E2EA] px-4 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Notes</p>
              <p className="mt-1.5 whitespace-pre-line text-[13px] leading-5 text-[#555]">{data.notes}</p>
            </div>
          )}

          {data.hasLicense && (
            <div className="border border-[#E2E2EA] px-4 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">License</p>
              <dl className="mt-1.5 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 text-[13px] text-[#555]">
                <dt>Included</dt><dd className="font-medium text-[#111118]">Yes</dd>
                <dt>Type</dt><dd className="font-medium text-[#111118]">{data.licenseType}</dd>
                {data.licenseDuration && (
                  <><dt>Duration</dt><dd className="font-medium text-[#111118]">{data.licenseDuration}</dd></>
                )}
              </dl>
            </div>
          )}

          {data.hasBankDetails && (
            <div className="border border-[#E2E2EA] px-4 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Payment Details</p>
              <dl className="mt-1.5 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 text-[13px] text-[#555]">
                {!data.isInternational ? (
                  <>
                    {data.bankName && <><dt>Bank</dt><dd className="font-medium text-[#111118]">{data.bankName}</dd></>}
                    {data.accountName && <><dt>Account</dt><dd className="font-medium text-[#111118]">{data.accountName}</dd></>}
                    {data.accountNumber && <><dt>Number</dt><dd className="font-medium text-[#111118]">{data.accountNumber}</dd></>}
                    {data.ifscCode && <><dt>IFSC</dt><dd className="font-medium text-[#111118]">{data.ifscCode}</dd></>}
                  </>
                ) : (
                  <>
                    {data.accountName && <><dt>Beneficiary</dt><dd className="font-medium text-[#111118]">{data.accountName}</dd></>}
                    {data.bankName && <><dt>Bank</dt><dd className="font-medium text-[#111118]">{data.bankName}</dd></>}
                    {data.bankAddress && <><dt>Bank Addr</dt><dd className="whitespace-pre-line font-medium text-[#111118]">{data.bankAddress}</dd></>}
                    {data.accountNumber && <><dt>Account</dt><dd className="font-medium text-[#111118]">{data.accountNumber}</dd></>}
                    {data.swiftBicCode && <><dt>SWIFT/BIC</dt><dd className="font-medium text-[#111118]">{data.swiftBicCode}</dd></>}
                    {data.ibanRoutingCode && <><dt>IBAN</dt><dd className="font-medium text-[#111118]">{data.ibanRoutingCode}</dd></>}
                  </>
                )}
              </dl>
            </div>
          )}

          {data.hasQrCode && (
            <div className="border border-[#E2E2EA] px-4 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Scan to Pay</p>
              <img src={data.qrCodeUrl} alt="Payment QR" className="mt-2 max-h-28 w-auto" />
            </div>
          )}
        </div>

        {/* Right: Totals */}
        <div className="border border-[#E2E2EA] bg-[#FAFAFA] px-4 py-3 print:bg-[#f8f8f8]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Amount Due</p>
          <div className="mt-3 space-y-2 text-[13px] text-[#555]">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-[#111118]">{data.subtotalFormatted}</span></div>
            <div className="flex justify-between"><span>{data.taxLabel}</span><span className="font-medium text-[#111118]">{data.taxFormatted}</span></div>
            <div className="border-t-2 border-[#111118] pt-2">
              <div className="flex justify-between">
                <span className="font-bold text-[#111118]">Grand Total</span>
                <span className="text-[16px] font-bold text-[#111118]">{data.grandTotalFormatted}</span>
              </div>
            </div>
            {data.approximateUsd && (
              <p className="border-t border-[#E2E2EA] pt-2 text-[11px] text-[#888]">
                Approx. USD (reference): <span className="font-medium text-[#111118]">{data.approximateUsd}</span>
              </p>
            )}
            {data.taxComplianceNote && (
              <p className="border-t border-[#E2E2EA] pt-2 text-[11px] text-[#888]">{data.taxComplianceNote}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Compliance Footer ──────────────────── */}
      <section className="grid gap-4 border-t border-[#E2E2EA] py-4 lg:grid-cols-2 lg:items-start">
        {/* Amount in Words */}
        {data.grandTotalRaw > 0 && (
          <div className="border border-[#E2E2EA] px-4 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Total Amount in Words</p>
            <p className="mt-1.5 text-[13px] font-semibold leading-5 text-[#111118]">{data.amountInWords}</p>
            <div className="mt-2 flex items-center gap-3 border-t border-[#F0F0F2] pt-2 text-[11px] text-[#888]">
              <span>Reverse Charge (RCM): <strong className="font-semibold text-[#111118]">{data.reverseCharge ? "Yes" : "No"}</strong></span>
            </div>
          </div>
        )}

        {/* Authorized Signatory */}
        <div className="border border-[#E2E2EA] px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6E6E7A]">Authorized Signatory</p>
          <div className="mt-6 border-b border-[#111118] pb-1">
            <p className="text-[13px] font-medium text-[#555]">{data.authorizedSignatory || data.agencyName}</p>
          </div>
          <p className="mt-1 text-[10px] text-[#888]">Signature</p>
        </div>
      </section>

      <InvoiceWatermark />
    </div>
  );
}
