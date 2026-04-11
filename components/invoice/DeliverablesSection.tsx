"use client";
import { useState } from "react";
import type {
  InvoiceLineItem,
  InvoiceLineItemType,
  InvoiceRateUnit,
} from "@/types/invoice";
import {
  getCurrencySymbol,
  type InvoiceDisplayCurrency,
} from "@/lib/international-billing-options";
import AppSelectField from "@/components/ui/AppSelectField";
import {
  appFieldErrorTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
  getAppSubtlePanelClass,
} from "@/lib/ui-foundation";

interface DeliverablesSectionProps {
  value: InvoiceLineItem[];
  currency?: InvoiceDisplayCurrency;
  onChange: (value: InvoiceLineItem[]) => void;
  embedded?: boolean;
  errors?: Record<
    string,
    {
      description?: string;
      qty?: string;
      rate?: string;
    }
  >;
  showAllErrors?: boolean;
}

const typeOptions: InvoiceLineItemType[] = [
  "Logo Design",
  "UI/UX",
  "Illustration",
  "Photography",
  "Video Editing",
  "Social Media",
  "Other",
];

const unitLabels: Record<InvoiceRateUnit, string> = {
  "per-deliverable": "Per deliverable",
  "per-item": "Per item",
  "per-screen": "Per screen",
  "per-hour": "Per hour",
  "per-day": "Per day",
  "per-revision": "Per revision",
  "per-concept": "Per concept",
  "per-post": "Per post",
  "per-video": "Per video",
  "per-image": "Per image",
};

const allowedUnitsByType: Record<InvoiceLineItemType, InvoiceRateUnit[]> = {
  "Logo Design": [
    "per-deliverable",
    "per-concept",
    "per-revision",
    "per-item",
  ],
  "UI/UX": [
    "per-screen",
    "per-hour",
    "per-day",
    "per-deliverable",
    "per-revision",
  ],
  Illustration: [
    "per-item",
    "per-deliverable",
    "per-revision",
    "per-concept",
  ],
  Photography: [
    "per-image",
    "per-hour",
    "per-day",
    "per-deliverable",
  ],
  "Video Editing": [
    "per-video",
    "per-hour",
    "per-day",
    "per-deliverable",
    "per-revision",
  ],
  "Social Media": [
    "per-post",
    "per-item",
    "per-deliverable",
    "per-revision",
  ],
  Other: ["per-deliverable", "per-item", "per-hour", "per-day"],
};

const defaultUnitByType: Record<InvoiceLineItemType, InvoiceRateUnit> = {
  "Logo Design": "per-deliverable",
  "UI/UX": "per-screen",
  Illustration: "per-item",
  Photography: "per-image",
  "Video Editing": "per-video",
  "Social Media": "per-post",
  Other: "per-deliverable",
};

const shortPlaceholders: Record<InvoiceLineItemType, string> = {
  "Logo Design": "Primary logo design",
  "UI/UX": "Landing page UI design",
  Illustration: "Editorial illustration set",
  Photography: "Product photography set",
  "Video Editing": "Short-form video edits",
  "Social Media": "Social media creative set",
  Other: "Describe the deliverable",
};

let lineItemIdCounter = 0;

function createLineItemId(existingItems: InvoiceLineItem[]) {
  const existingCounters = existingItems
    .map((item) => item.id.match(/^line-(\d+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value));

  lineItemIdCounter = Math.max(lineItemIdCounter, ...existingCounters, 0) + 1;
  return `line-${lineItemIdCounter}`;
}

function formatCurrency(amount = 0, currency: InvoiceDisplayCurrency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${getCurrencySymbol(currency)}${amount.toLocaleString("en-IN")}`;
  }
}

export default function DeliverablesSection({
  value,
  currency = "INR",
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
}: DeliverablesSectionProps) {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const updateItem = <K extends keyof InvoiceLineItem>(
    id: string,
    key: K,
    fieldValue: InvoiceLineItem[K]
  ) => {
    onChange(
      value.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: fieldValue,
            }
          : item
      )
    );
  };

  const handleTypeChange = (id: string, nextType: InvoiceLineItemType) => {
    onChange(
      value.map((item) => {
        if (item.id !== id) return item;

        const allowedUnits = allowedUnitsByType[nextType];
        const fallbackUnit = defaultUnitByType[nextType];
        const nextRateUnit = allowedUnits.includes(item.rateUnit)
          ? item.rateUnit
          : fallbackUnit;

        return {
          ...item,
          type: nextType,
          rateUnit: nextRateUnit,
          // Keep any user-entered description intact when the type changes.
          description: item.description.trim() ? item.description : "",
        };
      })
    );
  };

  const addLineItem = () => {
    onChange([
      ...value,
      {
        id: createLineItemId(value),
        type: "UI/UX",
        description: "",
        qty: 1,
        rate: 0,
        rateUnit: defaultUnitByType["UI/UX"],
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (value.length <= 1) return;
    onChange(value.filter((item) => item.id !== id));
  };

  const canDeleteRows = value.length > 1;
  const currencySymbol = getCurrencySymbol(currency);
  const lineItemErrorSlotClass = cn(
    appFieldErrorTextClass,
    "min-h-[18px]",
  );
  const inputClass = (hasError?: string, hasValue?: boolean) =>
    getAppFieldClass({
      hasError,
      hasValue,
    });
  const rateInputClass = (hasError?: string, hasValue?: boolean) =>
    cn(
      getAppFieldClass({
        hasError,
        hasValue,
      }),
      "pl-9"
    );
  const markTouched = (itemId: string, field: "description" | "qty" | "rate") => {
    const key = `${itemId}:${field}`;
    setTouchedFields((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };
  const getVisibleRowError = (
    itemId: string,
    field: "description" | "qty" | "rate",
    error?: string
  ) => {
    return showAllErrors || touchedFields[`${itemId}:${field}`]
      ? error
      : undefined;
  };

  const numberInputProps = {
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
        e.preventDefault();
      }
    },
  };

  return (
    <section
      className={cn(
        "overflow-visible",
        embedded
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : getAppPanelClass()
      )}
    >
      {!embedded ? (
        <div className="mb-6 space-y-2">
          <h2 className={appSectionTitleClass}>Items</h2>
          <p className={appSectionDescriptionClass}>
            Add the billable line items.
          </p>
        </div>
      ) : null}

      <div className="mb-2 hidden lg:grid lg:grid-cols-[96px_minmax(0,4.1fr)_76px_148px_124px_112px_36px] lg:gap-2.5 lg:px-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Type
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Description
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Qty
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Rate
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Unit
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Total
        </span>
        <span />
      </div>

      <div className="space-y-3.5 overflow-visible" data-testid="line-items-list">
        {value.map((item, index) => {
          const lineTotal = item.qty * item.rate;
          const allowedUnits = allowedUnitsByType[item.type];
          const rowErrors = errors?.[item.id];
          const descriptionError = getVisibleRowError(
            item.id,
            "description",
            rowErrors?.description
          );
          const qtyError = getVisibleRowError(item.id, "qty", rowErrors?.qty);
          const rateError = getVisibleRowError(item.id, "rate", rowErrors?.rate);
          const compactLabelClass = cn(
            appFieldLabelClass,
            "lg:sr-only lg:absolute lg:h-px lg:w-px lg:overflow-hidden lg:whitespace-nowrap lg:border-0 lg:p-0"
          );

          return (
            <div
              key={item.id}
              data-testid="line-item-row"
              className={cn(
                getAppSubtlePanelClass(index === 0 ? "default" : "muted"),
                "px-3 py-3"
              )}
            >
              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[96px_minmax(0,4.1fr)_76px_148px_124px_112px_36px] lg:items-start lg:gap-2.5">
                <div>
                  <label className={compactLabelClass}>Type</label>
                  <AppSelectField
                    suppressHydrationWarning
                    value={item.type}
                    onChange={(e) =>
                      handleTypeChange(
                        item.id,
                        e.target.value as InvoiceLineItemType
                      )
                    }
                    hasValue
                  >
                    {typeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </AppSelectField>
                  <div className="min-h-[18px]" />
                </div>

                <div className="space-y-1.5">
                  <label className={compactLabelClass}>Description *</label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    onBlur={() => markTouched(item.id, "description")}
                    placeholder={shortPlaceholders[item.type]}
                    className={inputClass(
                      descriptionError,
                      Boolean(item.description)
                    )}
                    title={item.description || shortPlaceholders[item.type]}
                  />
                  <p
                    className={cn(
                      lineItemErrorSlotClass,
                      descriptionError ? "" : "invisible"
                    )}
                  >
                    {descriptionError ?? "Description error"}
                  </p>
                </div>

                <div>
                  <label className={compactLabelClass}>Qty *</label>
                  <input
                    suppressHydrationWarning
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "qty",
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    onBlur={() => markTouched(item.id, "qty")}
                    className={inputClass(qtyError, item.qty > 0)}
                    {...numberInputProps}
                  />
                  <p
                    className={cn(
                      lineItemErrorSlotClass,
                      qtyError ? "" : "invisible"
                    )}
                  >
                    {qtyError ?? "Quantity error"}
                  </p>
                </div>

                <div>
                  <label className={compactLabelClass}>Rate</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-slate-500">
                      {currencySymbol}
                    </span>
                    <input
                      suppressHydrationWarning
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "rate",
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      onBlur={() => markTouched(item.id, "rate")}
                      className={rateInputClass(rateError, item.rate > 0)}
                      {...numberInputProps}
                    />
                  </div>
                  <p
                    className={cn(
                      lineItemErrorSlotClass,
                      rateError ? "" : "invisible"
                    )}
                  >
                    {rateError ?? "Rate error"}
                  </p>
                </div>

                <div>
                  <label className={compactLabelClass}>Unit *</label>
                  <AppSelectField
                    suppressHydrationWarning
                    value={item.rateUnit}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "rateUnit",
                        e.target.value as InvoiceRateUnit
                      )
                    }
                    hasValue
                  >
                    {allowedUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unitLabels[unit]}
                      </option>
                    ))}
                  </AppSelectField>
                  <div className="min-h-[18px]" />
                </div>

                <div>
                  <span className={compactLabelClass}>Total</span>
                  <div
                    className={cn(
                      getAppSubtlePanelClass("muted"),
                      "flex h-11 items-center justify-end px-3 py-0 text-sm font-semibold text-slate-600"
                    )}
                  >
                    {formatCurrency(lineTotal, currency)}
                  </div>
                  <div className="min-h-[18px]" />
                </div>

                <div className="flex justify-end lg:pt-0.5">
                  {canDeleteRows ? (
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      aria-label={`Remove line item ${index + 1}`}
                      className={cn(
                        getAppButtonClass({
                          variant: "ghost",
                          size: "sm",
                        }),
                        "h-12 w-9 px-0 text-base text-slate-500 hover:text-slate-900"
                      )}
                    >
                      ×
                    </button>
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-start">
        <button
          type="button"
          onClick={addLineItem}
          className={getAppButtonClass({
            variant: "secondary",
            size: "md",
          })}
        >
          + Add New Line Item
        </button>
      </div>
    </section>
  );
}
