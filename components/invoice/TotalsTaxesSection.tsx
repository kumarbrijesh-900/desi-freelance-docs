"use client";

import type { InvoiceComputedValues, TaxConfig } from "@/types/invoice";
import type { InvoiceDisplayCurrency } from "@/lib/international-billing-options";
import { amountToWords } from "@/lib/amount-to-words";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
import AppSwitch from "@/components/ui/AppSwitch";
import { InfoCircleIcon } from "@/components/ui/app-icons";
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
  settlementSummary?: string;
  onExportTaxDecisionChange?: (value: InternationalTaxHandling) => void;
  onChange: (value: TaxConfig) => void;
};

function formatCurrency(amount = 0, currency: InvoiceDisplayCurrency = "INR") {
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
  settlementSummary = "",
  onExportTaxDecisionChange,
  onChange,
}: TotalsTaxesSectionProps) {
  const subtotal = computed.subtotal;
  const taxAmount = computed.taxAmount;
  const grandTotal = computed.grandTotal;
  const isRcmEnabled = value.isRcmEnabled;

  const updateField = <K extends keyof TaxConfig>(
    key: K,
    fieldValue: TaxConfig[K],
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const isNoTax = value.taxMode === "none";
  const effectiveRate = isNoTax ? 0 : (value.taxRate ?? 0);
  const showIgstOption = allowIgstOption || value.taxMode === "igst";
  const complianceMessageClass =
    complianceVariant === "warning"
      ? "rounded-[var(--app-radius-card)] bg-[color:var(--state-warning-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]"
      : complianceVariant === "info"
        ? "rounded-[var(--app-radius-card)] bg-[color:var(--state-success-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--state-success-text)] ring-1 ring-inset ring-[color:var(--state-success-border)]"
        : "rounded-[var(--app-radius-card)] bg-[color:var(--bg-surface-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--text-secondary)] ring-1 ring-inset ring-[color:var(--border-subtle)]";
  const taxAmountHelperText =
    computed.taxType === "CGST_SGST"
      ? `CGST ${formatCurrency(computed.cgst ?? 0, currency)} + SGST ${formatCurrency(
          computed.sgst ?? 0,
          currency,
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
          : getAppPanelClass(),
      )}
    >
      <div className={cn(!embedded ? "mb-4" : "")}>
        {!embedded ? <h2 className={appSectionTitleClass}>Totals</h2> : null}
        {!embedded ? (
          <p className={cn("mt-2", appSectionDescriptionClass)}>
            Review the final billing summary.
          </p>
        ) : null}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${onExportTaxDecisionChange ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            <div className="mt-4 rounded-[var(--app-radius-card)] bg-[color:var(--state-warning-bg)] p-4 ring-1 ring-inset ring-[color:var(--state-warning-border)]">
              <p className="text-sm font-medium leading-6 text-[color:var(--state-warning-text)]">
                No valid LUT has been provided for this international invoice.
                Export of services may require 18% IGST. Choose how you want to
                handle this invoice.
              </p>

              <div className="mt-4">
                <ChoiceCards
                  name="export-tax-handling"
                  value={exportTaxDecision}
                  onChange={onExportTaxDecisionChange || (() => {})}
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
                <p className="mt-3 text-xs leading-5 text-[color:var(--state-warning-text)] opacity-85">
                  {exportTaxHelperNote}
                </p>
              ) : null}
              {typeof estimatedIgstLiability === "number" ? (
                <p className="mt-2 text-sm font-medium leading-6 text-[color:var(--state-warning-text)]">
                  Estimated IGST liability:{" "}
                  {formatCurrency(estimatedIgstLiability, "INR")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-md">
        <div className="rounded-[20px] border border-[color:var(--border-subtle)] bg-white p-6 shadow-sm">
          {/* Summary Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[14px]">
              <dt className="text-[color:var(--text-muted)]">Subtotal</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">
                {formatCurrency(subtotal, currency)}
              </dd>
            </div>

            <div className="flex items-start justify-between text-[14px]">
              <dt className="text-[color:var(--text-muted)]">
                {computed.taxType !== "NONE" 
                  ? `Tax (${effectiveRate}% ${taxModeSummaryLabel})` 
                  : "Tax (0%)"}
              </dt>
              <dd className="text-right font-medium text-[color:var(--text-primary)]">
                {formatCurrency(taxAmount, currency)}
              </dd>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200 my-2" />

            <div className="flex items-center justify-between">
              <dt className="text-[18px] font-bold text-[color:var(--text-primary)]">Grand Total</dt>
              <dd className="flex flex-col items-end">
                <span
                  className={cn(
                    "text-[24px] font-bold tracking-tight [font-variant-numeric:tabular-nums]",
                    grandTotal > 0 ? "text-[color:var(--text-primary)]" : "text-gray-400"
                  )}
                >
                  {formatCurrency(grandTotal, currency)}
                </span>
              </dd>
            </div>

            {grandTotal === 0 && (
              <p className="text-[12px] text-[color:var(--text-muted)] italic text-right">
                Add billable items to see the final total.
              </p>
            )}
          </div>

          {/* Tax Explanation */}
          <div className="mt-6 pt-4 border-t border-[color:var(--border-subtle)]">
            <p className="text-[12px] leading-relaxed text-[color:var(--text-muted)]">
              {complianceMessage || (computed.taxType === "NONE" ? "Tax: 0% — agency not GST registered" : taxAmountHelperText)}
            </p>
          </div>

          {/* RCM Toggle */}
          <div className="mt-4 -mx-6 border-t border-b border-[color:var(--border-subtle)] bg-gray-50/30 px-6">
            <div className="flex h-[44px] items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[color:var(--text-primary)]">
                  Reverse Charge (RCM)
                </span>
                <div className="group relative">
                  <InfoCircleIcon className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
                    RCM shifts the GST payment liability to your client. Tax is calculated for compliance but excluded from your payable total.
                    <div className="absolute top-full left-1/2 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                  </div>
                </div>
              </div>
              <AppSwitch
                checked={isRcmEnabled}
                onChange={(checked) => updateField("isRcmEnabled", checked)}
              />
            </div>
          </div>

          {/* Payment Footer */}
          <div className="mt-4">
            <p className="text-[12px] font-medium text-[color:var(--text-muted)]">
              {settlementSummary || "Payment terms and bank details not set"}
            </p>
          </div>
        </div>

        {grandTotalReferenceLabel && typeof grandTotalReferenceAmount === "number" && (
          <p className="mt-4 px-2 text-[11px] text-[color:var(--text-secondary)]">
            {grandTotalReferenceLabel}: <span className="font-semibold text-[color:var(--text-primary)]">{formatCurrency(grandTotalReferenceAmount, "USD")}</span>
          </p>
        )}
      </div>
    </section>
  );
}
