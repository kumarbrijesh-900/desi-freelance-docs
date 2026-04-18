"use client";
import { useRef, useState } from "react";
import type {
  InvoiceLineItem,
  InvoiceLineItemType,
  InvoiceRateUnit,
} from "@/types/invoice";
import {
  getInvoiceDescriptionSuggestions,
  invoiceAllowedUnitsByType,
  invoiceDefaultUnitByType,
  invoiceDescriptionPlaceholderByType,
  invoiceLineItemTypeOptions,
  invoiceRateUnitLabels,
} from "@/lib/invoice-deliverables";
import {
  getCurrencySymbol,
  type InvoiceDisplayCurrency,
} from "@/lib/international-billing-options";
import {
  getDefaultSacCodeForType,
  isManualSacRequired,
  resolveLineItemSacCode,
} from "@/lib/invoice-sac";
import AppSelectField from "@/components/ui/AppSelectField";
import { SparklesIcon } from "@/components/ui/app-icons";
import {
  appFieldErrorTextClass,
  appFieldHelperTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
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
      sacCode?: string;
    }
  >;
  showAllErrors?: boolean;
}

const lineItemDesktopGridClass =
  "lg:grid-cols-[minmax(136px,1.08fr)_minmax(0,3.24fr)_minmax(76px,0.58fr)_minmax(116px,0.88fr)_minmax(136px,1fr)_minmax(124px,0.92fr)_48px]";

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
  const [activeDescriptionId, setActiveDescriptionId] = useState<string | null>(
    null
  );
  const descriptionInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const openDescriptionAssist = (id: string) => setActiveDescriptionId(id);
  const closeDescriptionAssist = (id: string) =>
    setActiveDescriptionId((current) => (current === id ? null : current));
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

        const allowedUnits = invoiceAllowedUnitsByType[nextType];
        const fallbackUnit = invoiceDefaultUnitByType[nextType];
        const nextRateUnit = allowedUnits.includes(item.rateUnit)
          ? item.rateUnit
          : fallbackUnit;

        return {
          ...item,
          type: nextType,
          rateUnit: nextRateUnit,
          sacCode: isManualSacRequired(nextType)
            ? ""
            : getDefaultSacCodeForType(nextType),
          // Keep any user-entered description intact when the type changes.
          description: item.description.trim() ? item.description : "",
        };
      })
    );
  };

  const applyDescriptionSuggestion = (id: string, suggestion: string) => {
    updateItem(id, "description", suggestion);
    closeDescriptionAssist(id);
    setTouchedFields((prev) => ({
      ...prev,
      [`${id}:description`]: true,
    }));
  };

  const updateSacCode = (id: string, nextSacCode: string) => {
    updateItem(id, "sacCode", nextSacCode.replace(/\D/g, "").slice(0, 6));
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
        rateUnit: invoiceDefaultUnitByType["UI/UX"],
        sacCode: getDefaultSacCodeForType("UI/UX"),
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
  const markSacTouched = (itemId: string) => {
    const key = `${itemId}:sacCode`;
    setTouchedFields((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };
  const getVisibleRowError = (
    itemId: string,
    field: "description" | "qty" | "rate" | "sacCode",
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

      <div className="invoice-line-item-workspace space-y-4">
        <div className={cn("invoice-line-item-head mb-2 hidden lg:grid lg:gap-2 lg:px-3 lg:py-3", lineItemDesktopGridClass)}>
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

        <div className="space-y-3 overflow-visible" data-testid="line-items-list">
          {value.map((item, index) => {
            const lineTotal = item.qty * item.rate;
            const allowedUnits = invoiceAllowedUnitsByType[item.type];
            const rowErrors = errors?.[item.id];
            const descriptionError = getVisibleRowError(
              item.id,
              "description",
              rowErrors?.description
            );
            const qtyError = getVisibleRowError(item.id, "qty", rowErrors?.qty);
            const rateError = getVisibleRowError(item.id, "rate", rowErrors?.rate);
            const sacError = getVisibleRowError(
              item.id,
              "sacCode",
              rowErrors?.sacCode
            );
            const descriptionSuggestions = getInvoiceDescriptionSuggestions(item.type);
            const resolvedSacCode = resolveLineItemSacCode(item);
            const needsManualSacEntry = isManualSacRequired(item.type);
            const showSuggestionAssist = activeDescriptionId === item.id;
            const descriptionPanelId = `${item.id}-description-suggestions`;
            const compactLabelClass = cn(
              appFieldLabelClass,
              "lg:sr-only lg:absolute lg:h-px lg:w-px lg:overflow-hidden lg:whitespace-nowrap lg:border-0 lg:p-0"
            );

            return (
              <div
                key={item.id}
                data-testid="line-item-row"
                data-row-tone={index === 0 ? "default" : "muted"}
                className="invoice-line-item-row overflow-hidden px-4 py-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200/75 pb-2 lg:hidden">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Line {index + 1}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {formatCurrency(lineTotal, currency)}
                  </p>
                </div>

                <div
                  className={cn(
                    "grid grid-cols-1 gap-3 lg:items-start lg:gap-3",
                    lineItemDesktopGridClass
                  )}
                >
                  <div className="min-w-0">
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
                      className="px-3 pr-10"
                    >
                      {invoiceLineItemTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </AppSelectField>

                    <div className="mt-2 min-h-[44px]">
                      {needsManualSacEntry ? (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            SAC Code *
                          </label>
                          <input
                            suppressHydrationWarning
                            type="text"
                            inputMode="numeric"
                            value={item.sacCode ?? ""}
                            onChange={(e) =>
                              updateSacCode(item.id, e.target.value)
                            }
                            onBlur={() => markSacTouched(item.id)}
                            placeholder="6-digit SAC"
                            className={inputClass(
                              sacError,
                              Boolean(item.sacCode)
                            )}
                          />
                          {sacError ? (
                            <p className={appFieldErrorTextClass}>{sacError}</p>
                          ) : (
                            <p className={appFieldHelperTextClass}>
                              Enter the exact SAC for this custom service line.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex min-h-11 items-center justify-between rounded-[12px] bg-slate-100/82 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] ring-1 ring-inset ring-white/72">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            SAC
                          </span>
                          <span className="text-[12px] font-semibold tracking-[0.01em] text-slate-700">
                            {resolvedSacCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <label className={compactLabelClass}>Description *</label>
                    <div className="space-y-0">
                      <div className="relative">
                        <input
                          ref={(node) => {
                            descriptionInputRefs.current[item.id] = node;
                          }}
                          suppressHydrationWarning
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            updateItem(item.id, "description", e.target.value);
                            openDescriptionAssist(item.id);
                          }}
                          onFocus={() => openDescriptionAssist(item.id)}
                          onBlur={() => {
                            markTouched(item.id, "description");
                            closeDescriptionAssist(item.id);
                          }}
                          placeholder={invoiceDescriptionPlaceholderByType[item.type]}
                          className={cn(
                            inputClass(
                              descriptionError,
                              Boolean(item.description)
                            ),
                            "pr-12",
                            showSuggestionAssist
                              ? "rounded-b-none border-b-transparent shadow-none"
                              : ""
                          )}
                          title={
                            item.description ||
                            invoiceDescriptionPlaceholderByType[item.type]
                          }
                          aria-expanded={showSuggestionAssist}
                          aria-controls={descriptionPanelId}
                        />
                        <button
                          type="button"
                          aria-label={`Show description suggestions for line item ${index + 1}`}
                          aria-expanded={showSuggestionAssist}
                          aria-controls={descriptionPanelId}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            if (showSuggestionAssist) {
                              closeDescriptionAssist(item.id);
                              return;
                            }

                            openDescriptionAssist(item.id);
                            descriptionInputRefs.current[item.id]?.focus();
                          }}
                          className="app-focus-ring absolute inset-y-1.5 right-1.5 inline-flex w-9 items-center justify-center rounded-[10px] border border-transparent text-slate-400 transition-[background-color,border-color,color,box-shadow] duration-[var(--app-duration-fast)] hover:border-slate-200/80 hover:bg-slate-50/90 hover:text-slate-700"
                        >
                          <SparklesIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {showSuggestionAssist && descriptionSuggestions.length > 0 ? (
                      <div
                        id={descriptionPanelId}
                        role="listbox"
                        aria-label={`Suggested descriptions for ${item.type}`}
                        className="-mt-px overflow-hidden rounded-b-[12px] border border-slate-200/82 bg-white/96 shadow-[0_14px_28px_rgba(15,23,42,0.07)]"
                      >
                        <div className="flex items-center gap-2 border-b border-slate-200/78 bg-slate-50/92 px-3 py-2">
                          <SparklesIcon className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Suggestions for {item.type}
                          </span>
                        </div>
                        <div className="max-h-52 overflow-y-auto py-1">
                          {descriptionSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              role="option"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() =>
                                applyDescriptionSuggestion(item.id, suggestion)
                              }
                              className="block w-full px-3 py-2.5 text-left text-[12px] leading-5 text-slate-700 transition-[background-color,color] duration-[var(--app-duration-fast)] hover:bg-slate-50 hover:text-slate-950"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <p
                      className={cn(
                        lineItemErrorSlotClass,
                        descriptionError ? "" : "invisible"
                      )}
                    >
                      {descriptionError ?? "Description error"}
                    </p>
                  </div>

                  <div className="min-w-0">
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

                  <div className="min-w-0">
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

                  <div className="min-w-0">
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
                      className="px-3 pr-10"
                    >
                      {allowedUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {invoiceRateUnitLabels[unit]}
                        </option>
                      ))}
                    </AppSelectField>
                    <div className="min-h-[18px]" />
                  </div>

                  <div className="min-w-0 lg:min-w-[124px]">
                    <span className={compactLabelClass}>Total</span>
                    <div className="invoice-line-item-total flex h-11 w-full min-w-0 items-center justify-between gap-2 overflow-hidden px-3.5 py-0 text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Auto
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {formatCurrency(lineTotal, currency)}
                      </span>
                    </div>
                    <div className="min-h-[18px]" />
                  </div>

                  <div className="flex items-start justify-end lg:pt-0.5">
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
                          "h-10 w-10 shrink-0 rounded-full border-transparent px-0 text-slate-400 hover:border-rose-200/75 hover:bg-rose-50/92 hover:text-rose-700"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="text-lg font-semibold leading-none"
                        >
                          ×
                        </span>
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

        <div className="border-t border-slate-200/80 pt-3">
          <button
            type="button"
            onClick={addLineItem}
            className={getAppButtonClass({
              variant: "secondary",
              size: "md",
            })}
          >
            + Add line item
          </button>
        </div>
      </div>
    </section>
  );
}
