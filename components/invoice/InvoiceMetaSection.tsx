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
}

export default function InvoiceMetaSection({
  value,
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
}: InvoiceMetaSectionProps) {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );

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
            <label className={appFieldLabelClass}>Invoice Number *</label>
            <input
              suppressHydrationWarning
              type="text"
              value={value.invoiceNumber}
              onChange={(e) => updateField("invoiceNumber", e.target.value)}
              onBlur={() => markTouched("invoiceNumber")}
              placeholder="INV-2026-001"
              className={inputClass(
                invoiceNumberError,
                Boolean(value.invoiceNumber),
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
              <label className={appFieldLabelClass}>Invoice Date *</label>
              <input
                suppressHydrationWarning
                type="date"
                value={value.invoiceDate}
                onChange={(e) => updateField("invoiceDate", e.target.value)}
                onBlur={() => markTouched("invoiceDate")}
                className={inputClass(
                  invoiceDateError,
                  Boolean(value.invoiceDate),
                )}
              />
              {invoiceDateError ? (
                <p className={appFieldErrorTextClass}>{invoiceDateError}</p>
              ) : null}
            </div>

            <div className="md:max-w-[240px]">
              <label className={appFieldLabelClass}>Due Date *</label>
              <input
                suppressHydrationWarning
                type="date"
                value={value.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
                onBlur={() => markTouched("dueDate")}
                className={inputClass(dueDateError, Boolean(value.dueDate))}
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
