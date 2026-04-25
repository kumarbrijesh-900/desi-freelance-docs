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
      ? "rounded-[var(--app-radius-card)] bg-[color:var(--state-warning-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]"
      : complianceVariant === "info"
      ? "rounded-[var(--app-radius-card)] bg-[color:var(--state-success-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--state-success-text)] ring-1 ring-inset ring-[color:var(--state-success-border)]"
      : "rounded-[var(--app-radius-card)] bg-[color:var(--bg-surface-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--text-secondary)] ring-1 ring-inset ring-[color:var(--border-subtle)]";
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
      <div className={cn(!embedded ? "mb-4" : "")}>
        {!embedded ? <h2 className={appSectionTitleClass}>Totals</h2> : null}
        {!embedded ? (
          <p className={cn("mt-2", appSectionDescriptionClass)}>
            Review the final billing summary.
          </p>
        ) : null}
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${onExportTaxDecisionChange ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
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
                  Estimated IGST liability: {formatCurrency(estimatedIgstLiability, "INR")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="flex flex-col gap-5">
          <div className="space-y-4">
            {isLocked ? (
              <div className={cn(getAppSubtlePanelClass("muted"), "space-y-4 px-4 py-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      Tax summary
                    </p>
                    <p className="text-[17px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
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

                <dl className="space-y-3 border-t border-[color:var(--border-subtle)] pt-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[color:var(--text-muted)]">Current outcome</dt>
                    <dd className="max-w-[220px] text-right font-medium text-[color:var(--text-primary)]">
                      {taxModeSummaryLabel}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[color:var(--text-muted)]">Applied rate</dt>
                    <dd className="text-right font-medium text-[color:var(--text-primary)]">
                      {effectiveRate}% total tax
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[color:var(--text-muted)]">Breakdown</dt>
                    <dd className="max-w-[260px] text-right leading-6 text-[color:var(--text-secondary)]">
                      {taxAmountHelperText}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className={cn(getAppSubtlePanelClass("muted"), "space-y-4 px-4 py-4")}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
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
                    {/* Persistent compliance note — visible on mobile without hover */}
                    {complianceMessage ? (
                      <p className="mt-1 text-[11px] leading-4 text-[color:var(--text-muted)]">
                        {complianceMessage}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
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
                          ? "cursor-not-allowed border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] text-[color:var(--text-soft)]"
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

          <div className="flex flex-col gap-4">
            {settlementSummary ? (
              <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 ring-1 ring-inset ring-gray-200/60">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                <p className="text-[11px] font-medium tracking-wide text-gray-500">
                  {settlementSummary}
                </p>
              </div>
            ) : null}

            {grandTotal > 0 ? (
              <div className="rounded-[16px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Amount in words
                </p>
                <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[color:var(--text-primary)]">
                  {amountToWords(grandTotal, currency)}
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-[14px] border border-[color:var(--border-subtle)] bg-gray-50 px-5 py-3 shadow-sm transition-colors duration-200 focus-within:bg-white">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-medium text-[color:var(--text-muted)]">
                  Reverse Charge (RCM)
                </p>
                <div className="group relative">
                  <InfoCircleIcon className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
                    Reverse Charge Mechanism (RCM) shifts the GST payment liability to your client. If enabled, tax is calculated for compliance but is NOT added to your Grand Total payable.
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
        </div>

        <div className={cn(getAppPanelClass(), "invoice-final-review-panel sticky top-24 h-fit space-y-4 px-5 py-5 shadow-lg")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Final review
              </p>
              <h3 className="text-[1.15rem] font-semibold tracking-[-0.024em] text-[color:var(--text-primary)]">
                Invoice totals
              </h3>
            </div>

            <span
              className={getAppStatusPillClass(
                grandTotal > 0 ? "default" : "muted"
              )}
            >
              {taxModeSummaryLabel}
            </span>
          </div>

          <dl className="invoice-total-summary-card space-y-3 rounded-[16px] px-4 py-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-[color:var(--text-muted)]">Subtotal</dt>
              <dd className="font-semibold text-[color:var(--text-primary)]">
                {formatCurrency(subtotal, currency)}
              </dd>
            </div>

            <div className="border-t border-[color:var(--border-subtle)] pt-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[color:var(--text-muted)]">Tax</dt>
                <dd className="text-right font-medium text-[color:var(--text-primary)]">
                  <span>{taxModeSummaryLabel}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[color:var(--text-muted)]">
                      {formatCurrency(taxAmount, currency)}
                    </span>
                    {isRcmEnabled && (
                      <span className="text-[10px] font-medium text-[color:var(--state-warning-text)] opacity-80">
                        (Payable by Client under RCM)
                      </span>
                    )}
                  </div>
                </dd>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-muted)]">
                {taxAmountHelperText}
              </p>
            </div>

            <div className="invoice-total-hero">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Grand total
              </dt>
              <dd className={cn(
                "mt-2 text-[36px] font-semibold tracking-[-0.03em] [font-variant-numeric:tabular-nums]",
                isRcmEnabled ? "text-[color:var(--interactive-secondary)]" : "text-[color:var(--text-primary)]"
              )}>
                {formatCurrency(grandTotal, currency)}
              </dd>
            </div>
          </dl>

          {grandTotalReferenceLabel &&
          typeof grandTotalReferenceAmount === "number" ? (
            <p className="invoice-final-review-note rounded-[14px] px-4 py-3 text-[11px] leading-5 text-[color:var(--text-secondary)]">
              {grandTotalReferenceLabel}:{" "}
              <span className="font-medium text-[color:var(--text-primary)]">
                {formatCurrency(grandTotalReferenceAmount, "USD")}
              </span>
            </p>
          ) : null}

          <p className="text-[11px] leading-5 text-[color:var(--text-muted)]">
            {grandTotal > 0
              ? isRcmEnabled 
                ? "Tax is calculated for compliance but excluded from your payable amount under RCM."
                : "Final amount payable before any offline adjustments."
              : "Add billable items to establish the final payable amount."}
          </p>
        </div>
      </div>
    </section>
  );
}
