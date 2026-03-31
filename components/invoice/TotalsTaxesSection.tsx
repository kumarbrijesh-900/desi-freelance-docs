"use client";

import type { InvoiceComputedValues, TaxConfig } from "@/types/invoice";

type InternationalTaxHandling = "" | "add-igst" | "keep-zero-tax";

type TotalsTaxesSectionProps = {
  value: TaxConfig;
  computed: InvoiceComputedValues;
  currency?: string;
  isLocked?: boolean;
  allowIgstOption?: boolean;
  modeLabel?: string;
  rateLabel?: string;
  gstOptionLabel?: string;
  complianceMessage?: string;
  complianceVariant?: "neutral" | "info" | "warning";
  exportTaxDecision?: InternationalTaxHandling;
  exportTaxHelperNote?: string;
  onExportTaxDecisionChange?: (value: InternationalTaxHandling) => void;
  onChange: (value: TaxConfig) => void;
};

function formatCurrency(amount = 0, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 text-gray-600"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TotalsTaxesSection({
  value,
  computed,
  currency = "INR",
  isLocked = false,
  allowIgstOption = false,
  modeLabel = "GST Type",
  rateLabel = "GST %",
  gstOptionLabel = "GST",
  complianceMessage = "",
  complianceVariant = "neutral",
  exportTaxDecision = "",
  exportTaxHelperNote = "",
  onExportTaxDecisionChange,
  onChange,
}: TotalsTaxesSectionProps) {
  const subtotal = computed.subtotal;
  const taxAmount = computed.taxAmount;
  const grandTotal = computed.grandTotal;

  const updateField = <K extends keyof TaxConfig>(
    key: K,
    fieldValue: TaxConfig[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const isNoTax = value.taxMode === "none";
  const effectiveRate = isNoTax ? 0 : value.taxRate ?? 0;
  const showIgstOption = allowIgstOption || value.taxMode === "igst";
  const panelClass =
    "flex h-full flex-col justify-between rounded-2xl border border-gray-200 p-4";
  const decisionCardClass = (isSelected: boolean) =>
    `rounded-2xl border p-3 text-left transition ${
      isSelected
        ? "border-black bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
        : "border-gray-200 bg-white hover:border-gray-300"
    }`;
  const complianceMessageClass =
    complianceVariant === "warning"
      ? "mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
      : complianceVariant === "info"
      ? "mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950"
      : "mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600";
  const taxAmountHelperText =
    computed.taxType === "CGST_SGST"
      ? `CGST ${formatCurrency(computed.cgst ?? 0, currency)} + SGST ${formatCurrency(
          computed.sgst ?? 0,
          currency
        )}`
      : computed.taxType === "IGST"
      ? `IGST ${formatCurrency(computed.igst ?? 0, currency)}`
      : isLocked
      ? "No tax is currently applied to this invoice."
      : "Calculated from the current subtotal and GST percentage.";
  const rateHelperText = isLocked
    ? "This total tax rate is calculated automatically from client location, GST registration, and billing state."
    : "Set the exact GST percentage applied to the subtotal.";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
          Totals & Taxes
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Review your billing summary and configure tax in one place. Subtotal
          and grand total are read-only so users always see the final financial
          impact clearly.
        </p>
        {complianceMessage ? (
          <div className={complianceMessageClass}>
            {complianceMessage}
          </div>
        ) : null}
        {onExportTaxDecisionChange ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-sm font-medium leading-6 text-amber-950">
              No valid LUT has been provided for this international invoice.
              Export of services may require 18% IGST. Foreign clients often
              expect a tax-clean invoice. Choose how you want to handle this
              invoice.
            </p>

            <div className="mt-4 space-y-3">
              <label className={decisionCardClass(exportTaxDecision === "add-igst")}>
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="export-tax-handling"
                    value="add-igst"
                    checked={exportTaxDecision === "add-igst"}
                    onChange={() => onExportTaxDecisionChange("add-igst")}
                    className="mt-1 h-4 w-4 border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm font-medium text-black">
                    Add 18% IGST to the client invoice
                  </span>
                </span>
              </label>

              <label
                className={decisionCardClass(
                  exportTaxDecision === "keep-zero-tax"
                )}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="export-tax-handling"
                    value="keep-zero-tax"
                    checked={exportTaxDecision === "keep-zero-tax"}
                    onChange={() =>
                      onExportTaxDecisionChange("keep-zero-tax")
                    }
                    className="mt-1 h-4 w-4 border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm font-medium text-black">
                    Keep client invoice at 0% tax — I will handle IGST
                    separately
                  </span>
                </span>
              </label>
            </div>

            {exportTaxHelperNote ? (
              <p className="mt-3 text-xs leading-5 text-amber-900/80">
                {exportTaxHelperNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(210px,0.9fr)_minmax(210px,0.9fr)_minmax(0,0.95fr)_minmax(0,1.15fr)] xl:items-stretch">
        <div className={`${panelClass} bg-gray-50`}>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              Subtotal
            </p>
            <p className="text-3xl font-bold text-black">
              {formatCurrency(subtotal, currency)}
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Sum of all deliverable line items before tax.
          </p>
        </div>

        <div className={`${panelClass} bg-white`}>
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              {modeLabel}
            </label>

            <div className="relative">
              <select
                value={value.taxMode}
                disabled={isLocked}
                onChange={(e) => {
                  const nextMode = e.target.value as TaxConfig["taxMode"];
                  updateField("taxMode", nextMode);
                  if (nextMode === "none") {
                    updateField("taxRate", 0);
                  } else if ((value.taxRate ?? 0) === 0) {
                    updateField("taxRate", 18);
                  }
                }}
                className={`w-full appearance-none rounded-xl border bg-white px-3 py-3 pr-10 text-base text-black outline-none focus:border-black ${
                  isLocked
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
                    : "border-gray-300"
                }`}
              >
                <option value="gst">{gstOptionLabel}</option>
                {showIgstOption ? <option value="igst">IGST</option> : null}
                <option value="none">No Tax</option>
              </select>

              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <ChevronDownIcon />
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            {isLocked
              ? "This tax setting is controlled by your billing compliance selection."
              : "Choose GST when tax should be added to the invoice total."}
          </p>
        </div>

        <div className={`${panelClass} bg-white`}>
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              {rateLabel}
            </label>

            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={effectiveRate}
              disabled={isNoTax || isLocked}
              onChange={(e) =>
                updateField("taxRate", Math.max(0, Number(e.target.value) || 0))
              }
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                  e.preventDefault();
                }
              }}
              className={`w-full rounded-xl border bg-white px-3 py-3 text-base text-black outline-none focus:border-black ${
                isNoTax || isLocked
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-gray-300"
              }`}
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            {rateHelperText}
          </p>
        </div>

        <div className={`${panelClass} bg-gray-50`}>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              Tax Amount
            </p>
            <p className="text-2xl font-bold text-black">
              {formatCurrency(taxAmount, currency)}
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            {taxAmountHelperText}
          </p>
        </div>

        <div className="flex h-full flex-col justify-between rounded-2xl border border-black bg-black p-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/70">
              Grand Total
            </p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(grandTotal, currency)}
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-white/70">
            Final invoice amount payable by the client.
          </p>
        </div>
      </div>
    </section>
  );
}
