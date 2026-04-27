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
import { InfoCircleIcon, SparklesIcon } from "@/components/ui/app-icons";
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
  "xl:grid-cols-[2fr_3fr_1fr_1.5fr_1.5fr_1fr_min-content]";

let lineItemIdCounter = 0;
const sacHelpTooltipCopy =
  "SAC = Services Accounting Code used for GST classification of services on invoices.";

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
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [activeDescriptionId, setActiveDescriptionId] = useState<string | null>(
    null,
  );
  const [isSacHelpOpen, setIsSacHelpOpen] = useState(false);
  const descriptionInputRefs = useRef<Record<string, HTMLInputElement | null>>(
    {},
  );
  const openDescriptionAssist = (id: string) => setActiveDescriptionId(id);
  const closeDescriptionAssist = (id: string) =>
    setActiveDescriptionId((current) => (current === id ? null : current));
  const updateItem = <K extends keyof InvoiceLineItem>(
    id: string,
    key: K,
    fieldValue: InvoiceLineItem[K],
  ) => {
    onChange(
      value.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: fieldValue,
            }
          : item,
      ),
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
      }),
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
        type: "UI/UX Design",
        description: "",
        qty: 1,
        rate: 0,
        rateUnit: invoiceDefaultUnitByType["UI/UX Design"],
        sacCode: getDefaultSacCodeForType("UI/UX Design"),
        is_milestone_header: false,
      },
    ]);
  };

  const addMilestoneHeader = () => {
    onChange([
      ...value,
      {
        id: createLineItemId(value),
        type: "Other",
        description: "",
        qty: 0,
        rate: 0,
        rateUnit: "per-deliverable",
        sacCode: "",
        is_milestone_header: true,
        milestone_status: "PENDING",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (value.length <= 1) return;
    onChange(value.filter((item) => item.id !== id));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= value.length) return;

    const newValue = [...value];
    const temp = newValue[index];
    newValue[index] = newValue[nextIndex];
    newValue[nextIndex] = temp;
    onChange(newValue);
  };

  const canDeleteRows = value.length > 1;
  const currencySymbol = getCurrencySymbol(currency);
  const lineItemErrorSlotClass = cn(appFieldErrorTextClass, "min-h-[18px]");
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
      "pl-9",
    );
  const markTouched = (
    itemId: string,
    field: "description" | "qty" | "rate",
  ) => {
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
    error?: string,
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
          : getAppPanelClass(),
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

      <div className="space-y-6">
        <div
          className={cn(
            "mb-2 hidden xl:grid xl:gap-4 xl:px-4 xl:py-3 border-b border-[color:var(--border-subtle)] pb-4",
            lineItemDesktopGridClass,
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Type
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Description
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Qty
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Rate
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Unit
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Total
          </span>
          <span />
        </div>

        <div
          className="space-y-4 xl:space-y-2 overflow-visible"
          data-testid="line-items-list"
        >
          {value.map((item, index) => {
            if (item.is_milestone_header) {
              // Calculate group subtotal
              let groupSubtotal = 0;
              for (let i = index + 1; i < value.length; i++) {
                if (value[i].is_milestone_header) break;
                groupSubtotal += (value[i].qty ?? 0) * (value[i].rate ?? 0);
              }

              return (
                <div
                  key={item.id}
                  className="relative z-10 -mx-2 mb-4 mt-8 rounded-lg bg-[color:var(--bg-surface-muted)]/60 border-y border-[color:var(--border-subtle)] px-6 py-4 xl:py-5 group/milestone"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    {/* Move controls for milestone */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover/milestone:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"
                      >
                        <span className="text-[10px] block transform rotate-180">▼</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === value.length - 1}
                        className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"
                      >
                        <span className="text-[10px] block">▼</span>
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                          Milestone Section
                        </span>
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="e.g. Phase 1: Brand Strategy & Discovery"
                        className="w-full border-none bg-transparent p-0 text-[16px] font-bold tracking-tight text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:ring-0"
                      />
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                          Section Subtotal
                        </p>
                        <p className="text-[15px] font-black text-[color:var(--text-primary)]">
                          {formatCurrency(groupSubtotal, currency)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <span className="text-xl">×</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const lineTotal = item.qty * item.rate;
            const allowedUnits = invoiceAllowedUnitsByType[item.type];
            const rowErrors = errors?.[item.id];
            const descriptionError = getVisibleRowError(
              item.id,
              "description",
              rowErrors?.description,
            );
            const qtyError = getVisibleRowError(item.id, "qty", rowErrors?.qty);
            const rateError = getVisibleRowError(
              item.id,
              "rate",
              rowErrors?.rate,
            );
            const sacError = getVisibleRowError(
              item.id,
              "sacCode",
              rowErrors?.sacCode,
            );
            const descriptionSuggestions = getInvoiceDescriptionSuggestions(
              item.type,
            );
            const resolvedSacCode = resolveLineItemSacCode(item);
            const needsManualSacEntry = isManualSacRequired(item.type);
            const showSuggestionAssist = activeDescriptionId === item.id;
            const descriptionPanelId = `${item.id}-description-suggestions`;
            const showSacHelpIcon = index === 0;
            const sacTooltipId = `${item.id}-sac-help`;
            const compactLabelClass = cn(
              appFieldLabelClass,
              "xl:sr-only xl:absolute xl:h-px xl:w-px xl:overflow-hidden xl:whitespace-nowrap xl:border-0 xl:p-0",
            );

            return (
              <div
                key={item.id}
                data-testid="line-item-row"
                className={cn(
                  "relative overflow-visible px-4 py-4 xl:py-3 rounded-xl transition-colors hover:bg-gray-50/50 group",
                  showSuggestionAssist ? "z-40" : "z-0",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] pb-2 xl:hidden">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Line {index + 1}
                  </p>
                  <p className="text-[11px] font-semibold text-[color:var(--text-secondary)]">
                    {formatCurrency(lineTotal, currency)}
                  </p>
                </div>

                <div
                  className={cn(
                    "grid grid-cols-1 gap-4 xl:items-start xl:gap-4",
                    lineItemDesktopGridClass,
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
                          e.target.value as InvoiceLineItemType,
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

                    <div className="mt-1.5">
                      {needsManualSacEntry ? (
                        <div className="space-y-1">
                          <input
                            suppressHydrationWarning
                            type="text"
                            inputMode="numeric"
                            value={item.sacCode ?? ""}
                            onChange={(e) =>
                              updateSacCode(item.id, e.target.value)
                            }
                            onBlur={() => markSacTouched(item.id)}
                            placeholder="SAC"
                            className={cn(
                              inputClass(sacError, Boolean(item.sacCode)),
                              "h-7 px-2 text-[10px] uppercase font-bold tracking-wider placeholder:normal-case"
                            )}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                            SAC
                          </span>
                          <span className="text-[10px] font-bold tracking-[0.01em] text-[color:var(--text-secondary)]">
                            {resolvedSacCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "min-w-0 space-y-1.5",
                      showSuggestionAssist ? "relative z-30" : "",
                    )}
                  >
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
                          placeholder={
                            invoiceDescriptionPlaceholderByType[item.type]
                          }
                          className={cn(
                            inputClass(
                              descriptionError,
                              Boolean(item.description),
                            ),
                            "pr-12",
                            showSuggestionAssist
                              ? "border-[color:var(--focus-ring)] shadow-[0_0_0_2px_var(--app-focus-ring)]"
                              : "",
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
                          className="app-focus-ring absolute inset-y-1.5 right-1.5 inline-flex w-9 items-center justify-center rounded-[10px] border border-transparent text-[color:var(--text-soft)] transition-[background-color,border-color,color,box-shadow] duration-[var(--app-duration-fast)] hover:border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-surface-soft)] hover:text-[color:var(--text-secondary)]"
                        >
                          <SparklesIcon className="h-4 w-4" />
                        </button>
                        {showSuggestionAssist &&
                        descriptionSuggestions.length > 0 ? (
                          <div
                            id={descriptionPanelId}
                            role="listbox"
                            aria-label={`Suggested descriptions for ${item.type}`}
                            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-[0_14px_28px_rgba(37,37,65,0.12)]"
                          >
                            <div className="flex items-center gap-2 border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-muted)] px-3 py-1.5">
                              <SparklesIcon className="h-3.5 w-3.5 text-[color:var(--state-info-text)]" />
                              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--state-info-text)]">
                                Suggestions for {item.type}
                              </span>
                            </div>
                            <div className="max-h-48 overflow-y-auto py-1">
                              {descriptionSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  role="option"
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    applyDescriptionSuggestion(
                                      item.id,
                                      suggestion,
                                    )
                                  }
                                  className="block w-full px-3 py-2 text-left text-[12px] leading-5 text-[color:var(--text-secondary)] transition-[background-color,color] duration-[var(--app-duration-fast)] hover:bg-[color:var(--bg-surface-soft)] hover:text-[color:var(--text-primary)]"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <p
                      className={cn(
                        lineItemErrorSlotClass,
                        descriptionError ? "" : "invisible",
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
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                      onBlur={() => markTouched(item.id, "qty")}
                      className={inputClass(qtyError, item.qty > 0)}
                      {...numberInputProps}
                    />
                    <p
                      className={cn(
                        lineItemErrorSlotClass,
                        qtyError ? "" : "invisible",
                      )}
                    >
                      {qtyError ?? "Quantity error"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <label className={compactLabelClass}>Rate</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-[color:var(--text-muted)]">
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
                            Math.max(0, Number(e.target.value) || 0),
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
                        rateError ? "" : "invisible",
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
                          e.target.value as InvoiceRateUnit,
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

                  <div className="min-w-0 xl:min-w-[100px] xl:text-right">
                    <span className={compactLabelClass}>Total</span>
                    <div className="flex h-11 w-full items-center justify-end">
                      <span className="text-[14px] font-bold tracking-tight text-[color:var(--text-primary)]">
                        {formatCurrency(lineTotal, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-end xl:pt-1 gap-1">
                    {/* Move controls for item */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-20"
                      >
                        <span className="text-[9px] block transform rotate-180">▼</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === value.length - 1}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-20"
                      >
                        <span className="text-[9px] block">▼</span>
                      </button>
                    </div>

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
                          "h-9 w-9 shrink-0 rounded-full border-transparent px-0 text-[color:var(--text-soft)] hover:border-[color:var(--state-danger-border)] hover:bg-[color:var(--state-danger-bg)] hover:text-[color:var(--state-danger-text)] transition-all",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="text-lg font-medium leading-none"
                        >
                          ×
                        </span>
                      </button>
                    ) : (
                      <div className="hidden xl:block w-9" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <div
            className={cn(
              "grid grid-cols-1",
              lineItemDesktopGridClass
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addLineItem}
                className={cn(
                  getAppButtonClass({
                    variant: "ghost",
                    size: "md",
                  }),
                  "justify-start px-4 font-bold tracking-[0.01em] hover:bg-[color:var(--bg-surface-muted)] text-[color:var(--color-lime-600)] transition-all",
                )}
              >
                <span className="mr-2 text-xl font-medium">+</span>
                Add line item
              </button>

              <button
                type="button"
                onClick={addMilestoneHeader}
                className={cn(
                  getAppButtonClass({
                    variant: "ghost",
                    size: "md",
                  }),
                  "justify-start px-4 font-bold tracking-[0.01em] hover:bg-[color:var(--color-lime-50)] text-[color:var(--color-lime-700)] transition-all border-dashed border-[color:var(--color-lime-200)]",
                )}
              >
                <span className="mr-2 text-xl font-medium">⚑</span>
                Add Milestone Section
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
