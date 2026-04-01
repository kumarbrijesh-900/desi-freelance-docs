"use client";

import type { InvoiceMeta } from "@/types/invoice";
import { cn, getAppFieldClass, getAppPanelClass } from "@/lib/ui-foundation";

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
      {!embedded ? (
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
          Invoice Meta Data
        </h2>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Invoice Number *
          </label>
          <input
            type="text"
            value={value.invoiceNumber}
            onChange={(e) => updateField("invoiceNumber", e.target.value)}
            placeholder="INV-2026-001"
            className={inputClass(errors?.invoiceNumber, Boolean(value.invoiceNumber))}
          />
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Auto-generated. You can edit this if needed.
          </p>
          {errors?.invoiceNumber ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              {errors.invoiceNumber}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Invoice Date *
          </label>
          <input
            type="date"
            value={value.invoiceDate}
            onChange={(e) => updateField("invoiceDate", e.target.value)}
            className={inputClass(errors?.invoiceDate, Boolean(value.invoiceDate))}
          />
          {errors?.invoiceDate ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              {errors.invoiceDate}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium text-black">
            Due Date *
          </label>
          <input
            type="date"
            value={value.dueDate}
            onChange={(e) => updateField("dueDate", e.target.value)}
            className={inputClass(errors?.dueDate, Boolean(value.dueDate))}
          />
          {errors?.dueDate ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              {errors.dueDate}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
