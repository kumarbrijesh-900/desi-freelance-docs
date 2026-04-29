"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
} from "@/lib/invoice-sac";
import AppSelectField from "@/components/ui/AppSelectField";
import { PencilIcon, SparklesIcon } from "@/components/ui/app-icons";
import {
  appFieldErrorTextClass,
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
  "xl:grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_2fr_80px_120px_110px_100px_40px] xl:gap-4 xl:items-start";


const MAX_MILESTONES = 5;

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
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [activeDescriptionId, setActiveDescriptionId] = useState<string | null>(
    null,
  );
  const descriptionInputRefs = useRef<Record<string, HTMLInputElement | null>>(
    {},
  );
  const milestoneTitleRefs = useRef<Record<string, HTMLInputElement | null>>(
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

  const addMilestone = () => {
    if (milestones.length >= MAX_MILESTONES) return;

    const milestoneId = createLineItemId(value);
    // Note: We don't call createLineItemId twice on the same 'value' because it might return the same ID.
    // Instead, we manually increment or pass a temp array.
    const tempValueWithMilestone = [
      ...value,
      {
        id: milestoneId,
        type: "Other",
        description: "",
        qty: 0,
        rate: 0,
        rateUnit: "per-deliverable",
        sacCode: "",
        is_milestone_header: true,
        milestone_status: "PENDING",
      } as InvoiceLineItem,
    ];

    const lineItemId = createLineItemId(tempValueWithMilestone);

    onChange([
      ...tempValueWithMilestone,
      {
        id: lineItemId,
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

  const addLineItemToMilestone = (milestoneId: string) => {
    const nextValue = [...value];
    let milestoneIndex = nextValue.findIndex((item) => item.id === milestoneId);
    
    // Fallback for virtual milestone (if ID isn't in value array)
    if (milestoneIndex === -1) {
      // Create the real header in the array first
      const newHeader: InvoiceLineItem = {
        id: milestoneId,
        type: "Other",
        description: "Project Deliverables",
        qty: 0,
        rate: 0,
        rateUnit: "per-deliverable",
        sacCode: "",
        is_milestone_header: true,
      };
      nextValue.unshift(newHeader);
      milestoneIndex = 0;
    }

    // Find the end of this milestone's items
    let insertIndex = milestoneIndex + 1;
    while (insertIndex < nextValue.length && !nextValue[insertIndex].is_milestone_header) {
      insertIndex++;
    }

    nextValue.splice(insertIndex, 0, {
      id: createLineItemId(nextValue),
      type: "UI/UX Design",
      description: "",
      qty: 1,
      rate: 0,
      rateUnit: invoiceDefaultUnitByType["UI/UX Design"],
      sacCode: getDefaultSacCodeForType("UI/UX Design"),
      is_milestone_header: false,
    });
    onChange(nextValue);
  };

  const updateMilestoneTitle = (milestoneId: string, title: string) => {
    const nextValue = [...value];
    const index = nextValue.findIndex((item) => item.id === milestoneId);

    if (index !== -1) {
      nextValue[index] = { ...nextValue[index], description: title };
    } else {
      // Virtual milestone being promoted to real
      nextValue.unshift({
        id: milestoneId,
        type: "Other",
        description: title,
        qty: 0,
        rate: 0,
        rateUnit: "per-deliverable",
        sacCode: "",
        is_milestone_header: true,
      });
    }
    onChange(nextValue);
  };

  const removeMilestone = (milestoneId: string) => {
    const nextValue = [...value];
    const index = nextValue.findIndex((item) => item.id === milestoneId);
    if (index === -1) return;

    let countToRemove = 1;
    while (
      index + countToRemove < nextValue.length &&
      !nextValue[index + countToRemove].is_milestone_header
    ) {
      countToRemove++;
    }

    nextValue.splice(index, countToRemove);
    onChange(nextValue);
  };

  const removeLineItem = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  const markTouched = (
    itemId: string,
    field: "description" | "qty" | "rate",
  ) => {
    const key = `${itemId}:${field}`;
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

  const currencySymbol = getCurrencySymbol(currency);
  const errorSlotClass = "min-h-[18px] flex flex-col justify-end";


  // ─── Milestone Grouping Logic ───
  const milestones: {
    header: InvoiceLineItem;
    items: InvoiceLineItem[];
  }[] = [];

  let currentGroup: { header: InvoiceLineItem; items: InvoiceLineItem[] } | null = null;

  value.forEach((item) => {
    if (item.is_milestone_header) {
      if (currentGroup) milestones.push(currentGroup);
      currentGroup = { header: item, items: [] };
    } else {
      if (!currentGroup) {
        currentGroup = {
          header: {
            id: "default-milestone-" + createLineItemId(value),
            type: "Other",
            description: "Project Deliverables",
            qty: 0,
            rate: 0,
            rateUnit: "per-deliverable",
            sacCode: "",
            is_milestone_header: true,
          },
          items: [],
        };
      }
      currentGroup.items.push(item);
    }
  });
  if (currentGroup) milestones.push(currentGroup);

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

      <div className="space-y-10">
        <div className="space-y-8" data-testid="milestones-list">
          <AnimatePresence mode="popLayout" initial={false}>
            {milestones.map((milestone, mIndex) => {
              const { header, items } = milestone;
              
              // Calculate subtotal for this milestone
              const milestoneSubtotal = items.reduce(
                (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
                0
              );

              return (
                <motion.div
                  layout
                  key={header.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="group/milestone relative rounded-2xl border border-[color:var(--border-default)] bg-white shadow-sm"
                >
                {/* Milestone Header / Title Bar */}
                <div className="flex flex-col gap-4 bg-gray-50 px-6 py-5 md:flex-row md:items-center border-b border-[color:var(--border-subtle)]">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                        {mIndex + 1 === MAX_MILESTONES ? "Final Milestone" : `Milestone ${mIndex + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 group/title">
                      <div className="relative max-w-md">
                        <input
                          ref={(el) => {
                            milestoneTitleRefs.current[header.id] = el;
                          }}
                          type="text"
                          value={header.description}
                          onChange={(e) => updateMilestoneTitle(header.id, e.target.value)}
                          placeholder="e.g. Phase 1: Discovery & Strategy"
                          className={cn(
                            "text-xl font-bold text-gray-900 bg-transparent border rounded px-2 -ml-2 transition-colors cursor-text",
                            errors?.[header.id]?.description && (showAllErrors || touchedFields[`${header.id}:description`])
                              ? "border-red-500 ring-1 ring-red-500 bg-red-50/10"
                              : "border-transparent hover:border-gray-300 focus:border-gray-900 focus:ring-0",
                            "placeholder:text-gray-300 placeholder:font-medium"
                          )}
                          onBlur={() => markTouched(header.id, "description")}
                        />
                      </div>
                      <PencilIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        Milestone Subtotal
                      </p>
                      <p className="text-[16px] font-black text-[color:var(--text-primary)]">
                        {formatCurrency(milestoneSubtotal, currency)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMilestone(header.id)}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>
                </div>

                {/* Child Level: Line Items Table */}
                <div className="p-2 sm:p-4">
                  {/* Table Header (Desktop only) */}
                  {items.length > 0 && (
                    <div
                      className={cn(
                        "mb-0 hidden xl:grid xl:gap-4 xl:px-4 xl:py-1 opacity-60",
                        lineItemDesktopGridClass,
                      )}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Type</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Description</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)] text-center">Qty</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Rate</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Unit</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)] text-right">Total</span>
                      <span />
                    </div>
                  )}

                  <div className="space-y-4 xl:space-y-0">
                    {items.map((item) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        currency={currency}
                        errors={errors?.[item.id]}
                        showAllErrors={showAllErrors}
                        touchedFields={touchedFields}
                        activeDescriptionId={activeDescriptionId}
                        descriptionInputRefs={descriptionInputRefs}
                        onUpdateItem={updateItem}
                        onHandleTypeChange={handleTypeChange}
                        onOpenDescriptionAssist={openDescriptionAssist}
                        onCloseDescriptionAssist={closeDescriptionAssist}
                        onApplyDescriptionSuggestion={applyDescriptionSuggestion}
                        onMarkTouched={markTouched}
                        onRemoveLineItem={removeLineItem}
                      />
                    ))}
                  </div>

                  {/* Add Line Item Button (Inside Milestone Block) */}
                  <div className="mt-2 px-3">
                    <button
                      type="button"
                      onClick={() => addLineItemToMilestone(header.id)}
                      className="inline-flex items-center gap-2 py-2 text-[12px] font-bold text-gray-400 hover:text-[color:var(--app-primary)] transition-colors"
                    >
                      <span className="text-lg">+</span>
                      Add Line Item
                    </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>

        {/* Add Milestone Button (At the Root level) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={addMilestone}
            disabled={milestones.length >= MAX_MILESTONES}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-6 text-sm font-bold text-gray-400 transition-all group",
              milestones.length >= MAX_MILESTONES 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:border-gray-300 hover:bg-gray-100/80 hover:text-gray-600"
            )}
          >
            <span className={cn("text-2xl text-gray-300 transition-colors", milestones.length < MAX_MILESTONES && "group-hover:text-gray-400")}>+</span>
            Add Project Milestone ({MAX_MILESTONES - milestones.length}/{MAX_MILESTONES})
          </button>
          <p className="mt-4 text-[11px] text-gray-400 text-center sm:text-left">
            Milestones help group your deliverables into logical phases like "Phase 1: Research" or "Phase 2: Execution".
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Sub-Components (Extracted for Stability) ───

interface LineItemRowProps {
  item: InvoiceLineItem;
  currency: InvoiceDisplayCurrency;
  errors?: {
    description?: string;
    qty?: string;
    rate?: string;
    sacCode?: string;
  };
  showAllErrors: boolean;
  touchedFields: Record<string, boolean>;
  activeDescriptionId: string | null;
  descriptionInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onUpdateItem: (id: string, key: keyof InvoiceLineItem, value: any) => void;
  onHandleTypeChange: (id: string, nextType: InvoiceLineItemType) => void;
  onOpenDescriptionAssist: (id: string) => void;
  onCloseDescriptionAssist: (id: string) => void;
  onApplyDescriptionSuggestion: (id: string, suggestion: string) => void;
  onMarkTouched: (itemId: string, field: "description" | "qty" | "rate") => void;
  onRemoveLineItem: (id: string) => void;
}

function LineItemRow({
  item,
  currency,
  errors,
  showAllErrors,
  touchedFields,
  activeDescriptionId,
  descriptionInputRefs,
  onUpdateItem,
  onHandleTypeChange,
  onOpenDescriptionAssist,
  onCloseDescriptionAssist,
  onApplyDescriptionSuggestion,
  onMarkTouched,
  onRemoveLineItem,
}: LineItemRowProps) {
  const lineTotal = Number(item.qty || 0) * Number(item.rate || 0);
  const allowedUnits = invoiceAllowedUnitsByType[item.type];
  const descriptionError = (showAllErrors || touchedFields[`${item.id}:description`]) ? errors?.description : undefined;
  const qtyError = (showAllErrors || touchedFields[`${item.id}:qty`]) ? errors?.qty : undefined;
  const rateError = (showAllErrors || touchedFields[`${item.id}:rate`]) ? errors?.rate : undefined;
  const descriptionSuggestions = getInvoiceDescriptionSuggestions(item.type);
  const showSuggestionAssist = activeDescriptionId === item.id;
  const currencySymbol = getCurrencySymbol(currency);

  const errorSlotClass = "min-h-[18px] flex flex-col justify-end";
  const compactLabelClass = cn(
    appFieldLabelClass,
    "xl:sr-only xl:absolute xl:h-px xl:w-px xl:overflow-hidden xl:whitespace-nowrap xl:border-0 xl:p-0",
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
      "pl-9",
    );

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
    <div
      className={cn(
        "relative px-3 py-3 xl:py-2 rounded-xl transition-colors hover:bg-gray-50/50 group/row border border-transparent xl:border-0 border-dashed border-gray-200",
        showSuggestionAssist ? "z-40" : "z-0",
      )}
    >
      <div className={lineItemDesktopGridClass}>
        <div className="min-w-0">
          <label className={compactLabelClass}>Type</label>
          <AppSelectField
            value={item.type}
            onChange={(e) => onHandleTypeChange(item.id, e.target.value as InvoiceLineItemType)}
            hasValue
            className="h-9 text-[13px] px-2 pr-8 w-full min-w-0"
          >
            {invoiceLineItemTypeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </AppSelectField>
        </div>

        <div className={cn("min-w-0 space-y-1", showSuggestionAssist ? "relative z-30" : "")}>
          <label className={compactLabelClass}>Description</label>
          <div className="relative">
            <input
              ref={(node) => { descriptionInputRefs.current[item.id] = node; }}
              type="text"
              value={item.description}
              onChange={(e) => {
                onUpdateItem(item.id, "description", e.target.value);
                onOpenDescriptionAssist(item.id);
              }}
              onFocus={() => onOpenDescriptionAssist(item.id)}
              onBlur={() => {
                onMarkTouched(item.id, "description");
                onCloseDescriptionAssist(item.id);
              }}
              placeholder={invoiceDescriptionPlaceholderByType[item.type]}
              className={cn(
                inputClass(descriptionError, Boolean(item.description)),
                "h-9 text-[13px] pr-10 w-full min-w-0",
                showSuggestionAssist ? "border-[color:var(--focus-ring)] shadow-[0_0_0_2px_var(--app-focus-ring)]" : ""
              )}
            />
            <div className={errorSlotClass}>
              {descriptionError && <p className={cn(appFieldErrorTextClass, "text-[10px]")}>{descriptionError}</p>}
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (showSuggestionAssist) {
                  onCloseDescriptionAssist(item.id);
                  return;
                }
                onOpenDescriptionAssist(item.id);
                descriptionInputRefs.current[item.id]?.focus();
              }}
              className="absolute right-1 top-1 h-7 w-7 rounded-lg text-[color:var(--text-soft)] hover:bg-gray-100 flex items-center justify-center"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
            </button>
            {showSuggestionAssist && descriptionSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden border border-[color:var(--border-default)] bg-white shadow-xl rounded-lg">
                <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Suggestions</span>
                </div>
                <div className="max-h-40 overflow-y-auto py-1">
                  {descriptionSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplyDescriptionSuggestion(item.id, suggestion)}
                      className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <label className={compactLabelClass}>Qty</label>
          <input
            type="number"
            value={item.qty}
            onChange={(e) => onUpdateItem(item.id, "qty", e.target.value)}
            onBlur={() => onMarkTouched(item.id, "qty")}
            className={cn(inputClass(qtyError, Number(item.qty) > 0), "h-9 text-[13px] text-center w-full min-w-0")}
            {...numberInputProps}
          />
          <div className={errorSlotClass}>
            {qtyError && <p className={cn(appFieldErrorTextClass, "text-[10px] text-center")}>{qtyError}</p>}
          </div>
        </div>

        <div className="min-w-0">
          <label className={compactLabelClass}>Rate</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{currencySymbol}</span>
            <input
              type="number"
              value={item.rate}
              onChange={(e) => onUpdateItem(item.id, "rate", e.target.value)}
              onBlur={() => onMarkTouched(item.id, "rate")}
              className={cn(rateInputClass(rateError, Number(item.rate) > 0), "h-9 text-[13px] pl-6 w-full min-w-0")}
              {...numberInputProps}
            />
          </div>
          <div className={errorSlotClass}>
            {rateError && <p className={cn(appFieldErrorTextClass, "text-[10px]")}>{rateError}</p>}
          </div>
        </div>

        <div className="min-w-0">
          <label className={compactLabelClass}>Unit</label>
          <AppSelectField
            value={item.rateUnit}
            onChange={(e) => onUpdateItem(item.id, "rateUnit", e.target.value as InvoiceRateUnit)}
            hasValue
            className="h-9 text-[12px] px-2 pr-8 w-full min-w-0"
          >
            {allowedUnits.map((unit) => (
              <option key={unit} value={unit}>{invoiceRateUnitLabels[unit]}</option>
            ))}
          </AppSelectField>
        </div>

        <div className="min-w-0 xl:text-right">
          <label className={compactLabelClass}>Total</label>
          <div className="flex h-9 items-center justify-end">
            <span className="text-[13px] font-bold text-[color:var(--text-primary)]">
              {formatCurrency(lineTotal, currency)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => onRemoveLineItem(item.id)}
            className="h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

