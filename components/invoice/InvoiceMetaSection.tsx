"use client";

import type { InvoiceMeta } from "@/types/invoice";

interface InvoiceMetaSectionProps {
  value: InvoiceMeta;
  onChange: (value: InvoiceMeta) => void;
  errors?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
  };
}

export default function InvoiceMetaSection({
  value,
  onChange,
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

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl border p-3 text-sm text-black outline-none focus:border-black ${
      hasError ? "border-red-400 bg-red-50/30" : "border-gray-300"
    }`;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
        Invoice Meta Data
      </h2>

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
            className={inputClass(errors?.invoiceNumber)}
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
            className={inputClass(errors?.invoiceDate)}
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
            className={inputClass(errors?.dueDate)}
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