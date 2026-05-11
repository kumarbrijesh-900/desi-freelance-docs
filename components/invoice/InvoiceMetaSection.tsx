"use client";

import { useState, useEffect } from "react";
import type { InvoiceMeta } from "@/types/invoice";
import {
  appFieldErrorTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppFieldClass,
  getAppPanelClass,
} from "@/lib/ui-foundation";
import {
  appFieldFullWidthStackClass,
  appFieldPairGridClass,
} from "@/lib/form-foundation";

interface InvoiceMetaSectionProps {
  value: InvoiceMeta;
  onChange: (value: InvoiceMeta) => void;
  embedded?: boolean;
  errors?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
  };
  showAllErrors?: boolean;
  autoFilledFields?: Set<string>;
  onFieldManualEdit?: (fieldPath: string) => void;
}

export default function InvoiceMetaSection({
  value,
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
  autoFilledFields = new Set(),
  onFieldManualEdit = () => {},
}: InvoiceMetaSectionProps) {
  const getInputStateClass = (fieldPath: string, fieldValue: string | number) => {
    if (typeof fieldValue === "string" && !fieldValue.trim()) return "";
    if (autoFilledFields.has(fieldPath)) return "input-autofilled";
    return "input-manual";
  };
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const updateField = <K extends keyof InvoiceMeta>(
    key: K,
    fieldValue: InvoiceMeta[K],
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  // Task 1: Auto-Fill Master Defaults
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const updates: Partial<InvoiceMeta> = {};

    // Generate temporary number if missing
    if (!value.invoiceNumber || value.invoiceNumber.trim() === "") {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 9000) + 1000;
      updates.invoiceNumber = `INV-${year}-${random}`;
    }

    // Default to today's date if missing
    if (!value.invoiceDate || value.invoiceDate === "") {
      updates.invoiceDate = today;
    }

    if (Object.keys(updates).length > 0) {
      onChange({
        ...value,
        ...updates,
      });
    }
  }, []);
  const markTouched = (field: string) => {
    setTouchedFields((prev) =>
      prev[field] ? prev : { ...prev, [field]: true },
    );
  };
  const getVisibleError = (field: string, error?: string) =>
    showAllErrors || touchedFields[field] ? error : undefined;

  const inputClass = (hasError?: string, hasValue?: boolean) =>
    getAppFieldClass({
      hasError,
      hasValue,
    });
  const invoiceNumberError = getVisibleError(
    "invoiceNumber",
    errors?.invoiceNumber,
  );
  const invoiceDateError = getVisibleError("invoiceDate", errors?.invoiceDate);
  const dueDateError = getVisibleError("dueDate", errors?.dueDate);

  return (
    <section
      className={cn(
        embedded
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : getAppPanelClass(),
      )}
    >
      {!embedded ? (
        <div className="mb-6 space-y-2">
          <h2 className={appSectionTitleClass}>Invoice Details</h2>
          <p className={appSectionDescriptionClass}>
            Confirm invoice number and dates.
          </p>
        </div>
      ) : null}

      <div className="space-y-10">
        {/* Section A: Identity */}
        <div>
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
              Identity
            </h3>
            <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
          </div>

          <div className="max-w-[320px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">
                Invoice Number *
                {autoFilledFields.has("meta.invoiceNumber") && (
                  <span className="autofill-indicator">auto-filled</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!value.invoiceNumber) return;
                  navigator.clipboard.writeText(value.invoiceNumber.trim());
                  setCopiedField('invoiceNumber');
                  setTimeout(() => setCopiedField(null), 1500);
                }}
                className="inline-flex items-center gap-1.5 text-[color:var(--text-primary)] hover:text-[#4F46E5] transition-colors cursor-pointer group"
                title="Click to copy"
              >
                <span className="text-[11px] font-medium">Copy</span>
                <span className="text-[12px] text-gray-300 group-hover:text-[#4F46E5] transition-colors">
                  {copiedField === 'invoiceNumber' ? '✓' : '⎘'}
                </span>
              </button>
            </div>
            <input
              suppressHydrationWarning
              type="text"
              value={value.invoiceNumber}
              onChange={(e) => {
                onFieldManualEdit("meta.invoiceNumber");
                updateField("invoiceNumber", e.target.value);
              }}
              onBlur={() => markTouched("invoiceNumber")}
              placeholder="INV-2026-001"
              className={cn(
                inputClass(invoiceNumberError, Boolean(value.invoiceNumber)),
                getInputStateClass("meta.invoiceNumber", value.invoiceNumber),
              )}
            />
            {invoiceNumberError ? (
              <p className={appFieldErrorTextClass}>{invoiceNumberError}</p>
            ) : null}
          </div>
        </div>

        {/* Section B: Timelines */}
        <div>
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
              Timelines
            </h3>
            <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
          </div>

          <div className={appFieldPairGridClass}>
            <div className="md:max-w-[240px]">
              <label className={appFieldLabelClass}>
                Invoice Date *
                {autoFilledFields.has("meta.invoiceDate") && (
                  <span className="autofill-indicator">auto-filled</span>
                )}
              </label>
              <input
                suppressHydrationWarning
                type="date"
                value={value.invoiceDate}
                onChange={(e) => {
                  onFieldManualEdit("meta.invoiceDate");
                  updateField("invoiceDate", e.target.value);
                }}
                onBlur={() => markTouched("invoiceDate")}
                className={cn(
                  inputClass(invoiceDateError, Boolean(value.invoiceDate)),
                  getInputStateClass("meta.invoiceDate", value.invoiceDate),
                )}
              />
              {invoiceDateError ? (
                <p className={appFieldErrorTextClass}>{invoiceDateError}</p>
              ) : null}
            </div>

            <div className="md:max-w-[240px]">
              <label className={appFieldLabelClass}>
                Due Date *
                {autoFilledFields.has("meta.dueDate") && (
                  <span className="autofill-indicator">auto-filled</span>
                )}
              </label>
              <input
                suppressHydrationWarning
                type="date"
                value={value.dueDate}
                onChange={(e) => {
                  onFieldManualEdit("meta.dueDate");
                  updateField("dueDate", e.target.value);
                }}
                onBlur={() => markTouched("dueDate")}
                className={cn(
                  inputClass(dueDateError, Boolean(value.dueDate)),
                  getInputStateClass("meta.dueDate", value.dueDate),
                )}
              />
              {dueDateError ? (
                <p className={appFieldErrorTextClass}>{dueDateError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
