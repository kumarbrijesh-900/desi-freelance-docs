"use client";

import type { InvoiceComputedValues, TaxConfig } from "@/types/invoice";
import type { InvoiceDisplayCurrency } from "@/lib/international-billing-options";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
import {
  appFieldHelperTextClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppFieldClass,
  getAppStatusPillClass,
  getAppPanelClass,
  getAppSubtlePanelClass,
} from "@/lib/ui-foundation";

type InternationalTaxHandling = "" | "add-igst" | "keep-zero-tax";

type TotalsTaxesSectionProps = {
  value: TaxConfig;
  computed: InvoiceComputedValues;
  currency?: InvoiceDisplayCurrency;
  embedded?: boolean;
  isLocked?: boolean;
  allowIgstOption?: boolean;
  modeLabel?: string;
  rateLabel?: string;
  gstOptionLabel?: string;
  complianceMessage?: string;
  complianceVariant?: "neutral" | "info" | "warning";
  exportTaxDecision?: InternationalTaxHandling;
  exportTaxHelperNote?: string;
  estimatedIgstLiability?: number;
  grandTotalReferenceLabel?: string;
  grandTotalReferenceAmount?: number;
  onExportTaxDecisionChange?: (value: InternationalTaxHandling) => void;
  onChange: (value: TaxConfig) => void;
};

function formatCurrency(
  amount = 0,
  currency: InvoiceDisplayCurrency = "INR"
) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}

export default function TotalsTaxesSection({
  value,
  computed,
  currency = "INR",
  embedded = false,
  isLocked = false,
  allowIgstOption = false,
  modeLabel = "GST Type",
  rateLabel = "GST %",
  gstOptionLabel = "GST",
  complianceMessage = "",
  complianceVariant = "neutral",
  exportTaxDecision = "",
  exportTaxHelperNote = "",
  estimatedIgstLiability,
  grandTotalReferenceLabel = "",
  grandTotalReferenceAmount,
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
  const complianceMessageClass =
    complianceVariant === "warning"
      ? "rounded-[var(--app-radius-card)] bg-amber-50/84 px-4 py-3 text-sm leading-6 text-amber-950 ring-1 ring-inset ring-amber-200/75"
      : complianceVariant === "info"
      ? "rounded-[var(--app-radius-card)] bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-950 ring-1 ring-inset ring-emerald-200/80"
      : "rounded-[var(--app-radius-card)] bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600 ring-1 ring-inset ring-slate-200/80";
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
  const taxModeSummaryLabel =
    computed.taxType === "CGST_SGST"
      ? "CGST + SGST"
      : computed.taxType === "IGST"
      ? "IGST"
      : "No tax";

  return (
    <section
      className={cn(
        embedded
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : getAppPanelClass()
      )}
    >
      <div className="mb-4">
        {!embedded ? <h2 className={appSectionTitleClass}>Totals</h2> : null}
        <p className={cn(!embedded ? "mt-2" : "", appSectionDescriptionClass)}>
          Review the final billing outcome before preview.
        </p>
        {onExportTaxDecisionChange ? (
          <div className="mt-4 rounded-[var(--app-radius-card)] bg-amber-50/80 p-4 ring-1 ring-inset ring-amber-200/80">
            <p className="text-sm font-medium leading-6 text-amber-950">
              No valid LUT has been provided for this international invoice.
              Export of services may require 18% IGST. Choose how you want to
              handle this invoice.
            </p>

            <div className="mt-4">
              <ChoiceCards
                name="export-tax-handling"
                value={exportTaxDecision}
                onChange={onExportTaxDecisionChange}
                options={[
                  {
                    value: "add-igst",
                    label: "Add 18% IGST to the client invoice",
                  },
                  {
                    value: "keep-zero-tax",
                    label:
                      "Keep client invoice at 0% tax — I will handle IGST separately",
                  },
                ]}
              />
            </div>

            {exportTaxHelperNote ? (
              <p className="mt-3 text-xs leading-5 text-amber-900/80">
                {exportTaxHelperNote}
              </p>
            ) : null}
            {typeof estimatedIgstLiability === "number" ? (
              <p className="mt-2 text-sm font-medium leading-6 text-amber-950">
                Estimated IGST liability: {formatCurrency(estimatedIgstLiability, "INR")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="space-y-4">
          {isLocked ? (
            <div className={cn(getAppSubtlePanelClass("muted"), "space-y-4 p-5")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    Tax summary
                  </p>
                  <p className="text-base font-semibold text-slate-950">
                    {taxModeSummaryLabel}
                  </p>
                </div>
                <span
                  className={getAppStatusPillClass(
                    computed.taxType === "NONE" ? "muted" : "default"
                  )}
                >
                  {computed.taxType === "NONE"
                    ? "No tax"
                    : `${effectiveRate}% applied`}
                </span>
              </div>

              <dl className="space-y-3 border-t border-slate-200/70 pt-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Current outcome</dt>
                  <dd className="max-w-[220px] text-right font-medium text-slate-950">
                    {taxModeSummaryLabel}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Applied rate</dt>
                  <dd className="text-right font-medium text-slate-950">
                    {effectiveRate}% total tax
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Breakdown</dt>
                  <dd className="max-w-[260px] text-right leading-6 text-slate-600">
                    {taxAmountHelperText}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className={cn(getAppSubtlePanelClass("muted"), "space-y-4")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {modeLabel}
                  </label>

                  <AppSelectField
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
                    className={cn(
                      isLocked ? "cursor-not-allowed" : "",
                      "text-base"
                    )}
                    hasValue={Boolean(value.taxMode)}
                  >
                    <option value="gst">{gstOptionLabel}</option>
                    {showIgstOption ? <option value="igst">IGST</option> : null}
                    <option value="none">No Tax</option>
                  </AppSelectField>

                  <p className={appFieldHelperTextClass}>
                    Choose how tax should appear on the invoice.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
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
                    className={cn(
                      getAppFieldClass({
                        hasValue: true,
                      }),
                      "text-base",
                      isNoTax || isLocked
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : ""
                    )}
                  />

                  <p className={appFieldHelperTextClass}>
                    {rateHelperText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {complianceMessage ? (
            <div className={complianceMessageClass}>{complianceMessage}</div>
          ) : null}
        </div>

        <div className={cn(getAppPanelClass("muted"), "space-y-4 px-5 py-5")}>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Final review
            </p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              Invoice totals
            </h3>
          </div>

          <dl className="space-y-3 rounded-[16px] bg-white/82 px-4 py-4 ring-1 ring-inset ring-slate-200/75">
            <div className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold text-slate-950">
                {formatCurrency(subtotal, currency)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-slate-500">Tax</dt>
              <dd className="text-right font-medium text-slate-950">
                <span>{taxModeSummaryLabel}</span>
                <span className="ml-2 text-slate-500">
                  {formatCurrency(taxAmount, currency)}
                </span>
              </dd>
            </div>

            <div className="border-t border-slate-200/80 pt-4">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Grand total
              </dt>
              <dd className="mt-2 text-[32px] font-semibold tracking-tight text-slate-950">
                {formatCurrency(grandTotal, currency)}
              </dd>
            </div>
          </dl>

          {grandTotalReferenceLabel &&
          typeof grandTotalReferenceAmount === "number" ? (
            <p className="rounded-[14px] bg-slate-50/90 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-inset ring-slate-200/80">
              {grandTotalReferenceLabel}:{" "}
              <span className="font-medium text-slate-900">
                {formatCurrency(grandTotalReferenceAmount, "USD")}
              </span>
            </p>
          ) : null}

          <p className="text-[11px] leading-5 text-slate-500">
            Final amount payable before any offline adjustments.
          </p>
        </div>
      </div>
    </section>
  );
}
