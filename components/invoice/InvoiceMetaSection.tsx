"use client";

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

interface InvoiceMetaSectionProps {
  value: InvoiceMeta;
  onChange: (value: InvoiceMeta) => void;
  embedded?: boolean;
  errors?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
  };
}

export default function InvoiceMetaSection({
  value,
  onChange,
  embedded = false,
  errors,
}: InvoiceMetaSectionProps) {
  const updateField = <K extends keyof InvoiceMeta>(
    key: K,
    fieldValue: InvoiceMeta[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const inputClass = (hasError?: string, hasValue?: boolean) =>
    getAppFieldClass({
      hasError,
      hasValue,
    });

  return (
    <section
      className={cn(
        embedded
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : getAppPanelClass()
      )}
    >
        <div className={cn(embedded ? "space-y-2" : "mb-6 space-y-2")}>
          {!embedded ? <h2 className={appSectionTitleClass}>Invoice Details</h2> : null}
          <p className={appSectionDescriptionClass}>
            Keep numbering and dates compact here.
          </p>
        </div>

      <div className="grid grid-cols-1 gap-4 md:max-w-[560px] md:grid-cols-[minmax(0,1fr)_164px_164px] md:items-start">
        <div>
          <label className={appFieldLabelClass}>
            Invoice Number *
          </label>
          <input
            type="text"
            value={value.invoiceNumber}
            onChange={(e) => updateField("invoiceNumber", e.target.value)}
            placeholder="INV-2026-001"
            className={inputClass(errors?.invoiceNumber, Boolean(value.invoiceNumber))}
          />
          {errors?.invoiceNumber ? (
            <p className={appFieldErrorTextClass}>
              {errors.invoiceNumber}
            </p>
          ) : null}
        </div>

        <div>
          <label className={appFieldLabelClass}>
            Invoice Date *
          </label>
          <input
            type="date"
            value={value.invoiceDate}
            onChange={(e) => updateField("invoiceDate", e.target.value)}
            className={inputClass(errors?.invoiceDate, Boolean(value.invoiceDate))}
          />
          {errors?.invoiceDate ? (
            <p className={appFieldErrorTextClass}>
              {errors.invoiceDate}
            </p>
          ) : null}
        </div>

        <div>
          <label className={appFieldLabelClass}>
            Due Date *
          </label>
          <input
            type="date"
            value={value.dueDate}
            onChange={(e) => updateField("dueDate", e.target.value)}
            className={inputClass(errors?.dueDate, Boolean(value.dueDate))}
          />
          {errors?.dueDate ? (
            <p className={appFieldErrorTextClass}>
              {errors.dueDate}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
