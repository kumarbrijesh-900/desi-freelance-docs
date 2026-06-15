"use client";
import { AppTooltip } from "@/components/ui/AppTooltip";

import { useState, useEffect } from "react";
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
  paymentTerms?: string;
  bankName?: string;
  onExportTaxDecisionChange?: (value: InternationalTaxHandling) => void;
  onChange: (value: TaxConfig) => void;
  hasItems?: boolean;
  defaultExpanded?: boolean;
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
  paymentTerms = "",
  bankName = "",
  onExportTaxDecisionChange,
  onChange,
  hasItems = false,
  defaultExpanded = false,
}: TotalsTaxesSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(defaultExpanded);
  const subtotal = computed.subtotal;
  const taxAmount = computed.taxAmount;
  const grandTotal = computed.grandTotal;

  const [displayTotal, setDisplayTotal] = useState(grandTotal);

  useEffect(() => {
    const start = displayTotal;
    const end = grandTotal;
    if (start === end) return;
    
    const duration = 400; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayTotal(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [grandTotal]);
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
        : "rounded-[var(--app-radius-card)] bg-[color:var(--color-paper)] px-4 py-3 text-sm leading-6 text-[color:var(--color-ink)] ring-1 ring-inset ring-[color:var(--color-soft)]";
  const taxAmountHelperText =
    computed.taxType === "cgst_sgst"
      ? `CGST ${formatCurrency(computed.cgst ?? 0, currency)} + SGST ${formatCurrency(
          computed.sgst ?? 0,
          currency,
        )}`
      : computed.taxType === "igst"
        ? `IGST ${formatCurrency(computed.igst ?? 0, currency)}`
        : isLocked
          ? "No tax is currently applied to this invoice."
          : "Calculated from the current subtotal and GST percentage.";
  const rateHelperText = isLocked
    ? "This total tax rate is calculated automatically from client location, GST registration, and billing state."
    : "Set the exact GST percentage applied to the subtotal.";
  const taxModeSummaryLabel =
    computed.taxType === "cgst_sgst"
      ? "CGST + SGST"
      : computed.taxType === "igst"
        ? "IGST"
        : "No tax";

  return (
    <section
      className={cn(
        embedded
          ? "rounded-2xl border-0 bg-transparent p-0 shadow-none"
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
              <p className="text-sm font-normal leading-6 text-[color:var(--state-warning-text)]">
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
                <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--state-warning-text)]">
                  Estimated IGST liability:{" "}
                  {formatCurrency(estimatedIgstLiability, "INR")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="space-y-6">
          {/* Summary Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[14px]">
              <dt className="text-[color:var(--color-ink-2)]">Subtotal</dt>
              <dd className="font-normal text-[color:var(--color-ink)]">
                {formatCurrency(subtotal, currency)}
              </dd>
            </div>

            <div className="flex items-start justify-between text-[14px]">
              <dt className="text-[color:var(--color-ink-2)]">
                {computed.taxType !== "exempt" 
                  ? `Tax (${effectiveRate}% ${taxModeSummaryLabel})` 
                  : "Tax (0%)"}
              </dt>
              <dd className="text-right font-normal text-[color:var(--color-ink)]">
                {formatCurrency(taxAmount, currency)}
                {isRcmEnabled ? (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#4A7A00]">
                    RCM active — GST handled by client
                  </p>
                ) : null}
              </dd>
            </div>

            {/* Divider */}
            <div className="border-t-2 border-[#111] pt-4 mt-2" />

            <div className="flex items-center justify-between">
              <dt className="text-[15px] font-bold text-[color:var(--color-ink)]">Grand Total</dt>
              <dd className="flex flex-col items-end">
                <span
                  className={cn(
                    "tracking-tight [font-variant-numeric:tabular-nums] text-[28px] font-bold transition-colors",
                    grandTotal > 0 ? "text-[color:var(--brand-indigo-deep)]" : "text-gray-300"
                  )}
                >
                  {formatCurrency(displayTotal, currency)}
                </span>
              </dd>
            </div>

            {grandTotal === 0 && !hasItems && (
              <p className="text-[12px] text-[color:var(--color-ink-2)] italic text-right">
                Add billable items to see the final total.
              </p>
            )}

            {grandTotal === 0 && hasItems && (
              <p className="mt-2 border-2 border-[#FF5C00] bg-[#FFF0EC] p-3 text-[11px] font-bold leading-relaxed text-[#FF5C00] shadow-[var(--brutal-shadow-sm)]">
                Note: The grand total for this invoice is {formatCurrency(0, currency)}. Proceed?
              </p>
            )}
          </div>

          {/* Tax Explanation */}
          <div className="mt-6 pt-4 border-t border-[color:var(--color-soft)]">
            <p className="text-[12px] leading-relaxed text-[color:var(--color-ink-2)]">
              {complianceMessage || (computed.taxType === "exempt" ? "Tax: 0% — agency not GST registered" : taxAmountHelperText)}
            </p>
          </div>

          {/* Advanced Tax Disclosure */}
          <div className="mt-4 border-t border-[color:var(--color-soft)] pt-4">
            {!showAdvanced ? (
              <div className="flex flex-wrap items-center gap-1.5 group">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(true)}
                  className="text-[#8B5CF6] font-bold text-[12px] hover:underline"
                >
                  Advanced tax options →
                </button>
                <AppTooltip content={<>
  Override the default tax rate, enable Reverse Charge Mechanism (RCM), or adjust for SEZ clients.
</>} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[color:var(--color-ink-2)]">Advanced Options</span>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(false)}
                    className="text-[11px] font-normal text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)]"
                  >
                    Hide
                  </button>
                </div>
                {/* RCM Toggle */}
                <div
                  className={cn(
                    "border-t border-b border-[color:var(--color-soft)] bg-[color:var(--color-paper)]/30 min-w-0",
                    embedded ? "-mx-4 px-4" : "-mx-6 px-6",
                  )}
                >
                  <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 py-2 sm:py-0 sm:h-[44px]">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 group">
                      <span className="text-[13px] font-bold text-[color:var(--color-ink)]">
                        Reverse Charge (RCM)
                      </span>
                      <AppTooltip content={<>
                        Shifts the tax liability so the Client pays GST directly to the government instead of the Freelancer/Agency collecting it.
                      </>} />
                    </div>
                    <AppSwitch
                      checked={isRcmEnabled}
                      onChange={(checked) => updateField("isRcmEnabled", checked)}
                    />
                  </div>
                  {isRcmEnabled ? (
                    <div className="mb-3 border-2 border-[#111118] bg-[#F7FFD6] px-3 py-2.5 text-[11px] font-bold leading-relaxed text-[#111118] shadow-[var(--brutal-shadow-pressed)] break-normal">
                      Reverse Charge is active. The client is responsible for paying GST directly to the government instead of the freelancer/agency collecting it.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Payment Footer */}
          {(paymentTerms || bankName) && (
            <div className="mt-4 pt-4 border-t border-[color:var(--color-soft)]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--color-ink-2)]">
                Settlement
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {paymentTerms && (
                  <div className="border-2 border-[#111118] bg-[#F0EAFF] text-[#8B5CF6] text-[11px] font-bold px-3 py-1 uppercase tracking-[0.05em]">
                    {paymentTerms}
                  </div>
                )}
                {bankName && (
                  <div className="border-2 border-[#111118] bg-[color:var(--color-paper-2)] text-[color:var(--color-ink)] text-[11px] font-bold px-3 py-1 uppercase tracking-[0.05em]">
                    Bank: {bankName}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {grandTotalReferenceLabel && typeof grandTotalReferenceAmount === "number" && (
          <p className="mt-4 px-2 text-[11px] text-[color:var(--color-ink)]">
            {grandTotalReferenceLabel}: <span className="font-bold text-[color:var(--color-ink)]">{formatCurrency(grandTotalReferenceAmount, "USD")}</span>
          </p>
        )}
      </div>
    </section>
  );
}
