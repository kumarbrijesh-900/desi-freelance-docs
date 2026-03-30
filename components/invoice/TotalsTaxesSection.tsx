"use client";

import type { InvoiceComputedValues, TaxConfig } from "@/types/invoice";

type TotalsTaxesSectionProps = {
  value: TaxConfig;
  computed: InvoiceComputedValues;
  onChange: (value: TaxConfig) => void;
};

function formatCurrency(amount?: number) {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
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
  const panelClass =
    "flex h-full flex-col justify-between rounded-2xl border border-gray-200 p-4";

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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(210px,0.9fr)_minmax(210px,0.9fr)_minmax(0,0.95fr)_minmax(0,1.15fr)] xl:items-stretch">
        <div className={`${panelClass} bg-gray-50`}>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              Subtotal
            </p>
            <p className="text-3xl font-bold text-black">
              {formatCurrency(subtotal)}
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Sum of all deliverable line items before tax.
          </p>
        </div>

        <div className={`${panelClass} bg-white`}>
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              GST Type
            </label>

            <div className="relative">
              <select
                value={value.taxMode}
                onChange={(e) => {
                  const nextMode = e.target.value as TaxConfig["taxMode"];
                  updateField("taxMode", nextMode);
                  if (nextMode === "none") {
                    updateField("taxRate", 0);
                  } else if ((value.taxRate ?? 0) === 0) {
                    updateField("taxRate", 18);
                  }
                }}
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-3 pr-10 text-base text-black outline-none focus:border-black"
              >
                <option value="gst">GST</option>
                <option value="none">No Tax</option>
              </select>

              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <ChevronDownIcon />
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Choose GST when tax should be added to the invoice total.
          </p>
        </div>

        <div className={`${panelClass} bg-white`}>
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              GST %
            </label>

            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={effectiveRate}
              disabled={isNoTax}
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
                isNoTax
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-gray-300"
              }`}
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Set the exact GST percentage applied to the subtotal.
          </p>
        </div>

        <div className={`${panelClass} bg-gray-50`}>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              Tax Amount
            </p>
            <p className="text-2xl font-bold text-black">
              {formatCurrency(taxAmount)}
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Calculated from the current subtotal and GST percentage.
          </p>
        </div>

        <div className="flex h-full flex-col justify-between rounded-2xl border border-black bg-black p-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/70">
              Grand Total
            </p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(grandTotal)}
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
