"use client";
import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  Milestone,
  InvoiceLineItem,
  InvoiceLineItemType,
  InvoiceRateUnit,
  MilestoneStatus,
} from "@/types/invoice";
import {
  getInvoiceDescriptionSuggestions,
  invoiceAllowedUnitsByType,
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
} from "@/lib/invoice-sac";
import AppSelectField from "@/components/ui/AppSelectField";
import AppTextField from "@/components/ui/AppTextField";
import { PencilIcon } from "@/components/ui/app-icons";
import {
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppPanelClass,
} from "@/lib/ui-foundation";

const MAX_MILESTONES = 5;

interface DeliverablesSectionProps {
  milestones: Milestone[];
  currency?: InvoiceDisplayCurrency;
  onChange: (milestones: Milestone[]) => void;
  embedded?: boolean;
  errors?: Record<string, { description?: string; qty?: string; rate?: string; sacCode?: string }>;
  showAllErrors?: boolean;
  autoFilledFields?: Set<string>;
  onFieldManualEdit?: (fieldPath: string) => void;
  isGuestMode?: boolean;
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
  milestones,
  currency = "INR",
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
  autoFilledFields = new Set(),
  onFieldManualEdit = () => {},
  isGuestMode = false,
}: DeliverablesSectionProps) {
  const createDefaultLineItem = useCallback((): InvoiceLineItem => {
    return {
      id: crypto.randomUUID(),
      type: (isGuestMode ? "" : "Other") as InvoiceLineItemType,
      description: "",
      qty: isGuestMode ? "" : 1,
      rate: isGuestMode ? "" : 0,
      rateUnit: (isGuestMode ? "" : "per-deliverable") as InvoiceRateUnit,
    };
  }, [isGuestMode]);

  const createDefaultMilestone = useCallback((index: number): Milestone => {
    return {
      id: crypto.randomUUID(),
      title: `Milestone ${index + 1}`,
      status: "PENDING" as MilestoneStatus,
      lineItems: [createDefaultLineItem()],
    };
  }, [createDefaultLineItem]);

  const getInputStateClass = (fieldPath: string, fieldValue: string | number) => {
    if (typeof fieldValue === "string" && !fieldValue.trim()) return "";
    if (autoFilledFields.has(fieldPath)) return "input-autofilled";
    return "input-manual";
  };
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [activeDescriptionId, setActiveDescriptionId] = useState<string | null>(null);

  const effectiveMilestones = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      return [createDefaultMilestone(0)];
    }
    return milestones;
  }, [milestones]);

  const markTouched = (id: string, field: string) => {
    setTouchedFields((prev) => ({ ...prev, [`${id}:${field}`]: true }));
  };

  // Milestone-level operations
  const addMilestone = useCallback(() => {
    const next = [...effectiveMilestones, createDefaultMilestone(effectiveMilestones.length)];
    onChange(next);
  }, [effectiveMilestones, onChange]);

  const removeMilestone = useCallback((milestoneId: string) => {
    onChange(effectiveMilestones.filter((m) => m.id !== milestoneId));
  }, [effectiveMilestones, onChange]);

  const updateMilestoneTitle = useCallback((milestoneId: string, title: string) => {
    onChange(effectiveMilestones.map((m) => m.id === milestoneId ? { ...m, title } : m));
  }, [effectiveMilestones, onChange]);

  // Line item operations
  const addLineItem = useCallback((milestoneId: string) => {
    onChange(effectiveMilestones.map((m) =>
      m.id === milestoneId
        ? { ...m, lineItems: [...m.lineItems, createDefaultLineItem()] }
        : m
    ));
  }, [effectiveMilestones, onChange]);

  const removeLineItem = useCallback((milestoneId: string, itemId: string) => {
    onChange(effectiveMilestones.map((m) =>
      m.id === milestoneId
        ? { ...m, lineItems: m.lineItems.filter((li) => li.id !== itemId) }
        : m
    ));
  }, [effectiveMilestones, onChange]);

  const updateLineItem = useCallback((milestoneId: string, itemId: string, patch: Partial<InvoiceLineItem>) => {
    onChange(effectiveMilestones.map((m) =>
      m.id === milestoneId
        ? { ...m, lineItems: m.lineItems.map((li) => li.id === itemId ? { ...li, ...patch } : li) }
        : m
    ));
  }, [effectiveMilestones, onChange]);

  return (
    <section
      className={cn(
        "overflow-visible",
        embedded ? "rounded-none border-0 bg-transparent p-0 shadow-none" : getAppPanelClass(),
      )}
    >
      {!embedded && (
        <div className="mb-6 space-y-2">
          <h2 className={appSectionTitleClass}>Items</h2>
          <p className={appSectionDescriptionClass}>Add the billable line items.</p>
        </div>
      )}

      <div className="space-y-8">
        <AnimatePresence initial={false}>
          {effectiveMilestones.map((milestone, mIdx) => {
            const milestoneSubtotal = milestone.lineItems.reduce(
              (sum, li) => sum + Number(li.qty || 0) * Number(li.rate || 0),
              0
            );

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="overflow-visible border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
              >
                {/* Milestone header */}
                {effectiveMilestones.length > 1 && (
                  <div className="flex flex-col gap-4 bg-gray-50 px-6 py-5 md:flex-row md:items-center border-b border-gray-100 rounded-t-2xl">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                        {mIdx + 1 === effectiveMilestones.length && effectiveMilestones.length === MAX_MILESTONES
                          ? "Final Milestone"
                          : `Milestone ${mIdx + 1}`}
                      </p>
                      <div className="flex items-center gap-2 max-w-md">
                        <input
                          type="text"
                          value={milestone.title}
                          placeholder="e.g. Phase 1: Research"
                          onChange={(e) => updateMilestoneTitle(milestone.id, e.target.value)}
                          className="text-xl font-bold bg-transparent border-transparent hover:border-gray-200 focus:border-gray-900 rounded px-1 -ml-1 w-full transition-all outline-none border"
                        />
                        <PencilIcon className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Milestone Subtotal</p>
                        <p className="text-lg font-black text-gray-900">{formatCurrency(milestoneSubtotal, currency)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMilestone(milestone.id)}
                        className="text-gray-300 hover:text-red-500 text-xl transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Line items */}
                <div className="p-4 space-y-4">
                  <div className="space-y-4">
                    <AnimatePresence initial={false}>
                      {milestone.lineItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <LineItemCard
                            item={item}
                            currency={currency}
                            errors={errors?.[item.id]}
                            showAllErrors={showAllErrors}
                            touchedFields={touchedFields}
                            markTouched={markTouched}
                            activeDescriptionId={activeDescriptionId}
                            setActiveDescriptionId={setActiveDescriptionId}
                            onUpdate={(patch) => updateLineItem(milestone.id, item.id, patch)}
                            onRemove={() => removeLineItem(milestone.id, item.id)}
                            autoFilledFields={autoFilledFields}
                            onFieldManualEdit={onFieldManualEdit}
                            getInputStateClass={getInputStateClass}
                            milestoneIndex={mIdx}
                            itemIndex={milestone.lineItems.indexOf(item)}
                            isGuestMode={isGuestMode}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    onClick={() => addLineItem(milestone.id)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 transition-colors hover:text-lime-600 group"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-200 group-hover:border-lime-200 group-hover:bg-lime-50 transition-all">+</span>
                    Add Line Item
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {MAX_MILESTONES > 1 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={addMilestone}
              disabled={effectiveMilestones.length >= MAX_MILESTONES}
              className={cn(
                "w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-white py-6 text-[13px] font-bold text-gray-500 transition-all group",
                effectiveMilestones.length >= MAX_MILESTONES
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-[#4F46E5]/5"
              )}
            >
              <span className="text-2xl text-gray-300 group-hover:text-[#4F46E5]">+</span>
              Add Project Milestone · {MAX_MILESTONES - effectiveMilestones.length} of {MAX_MILESTONES} left
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function LineItemCard({
  item,
  currency,
  errors,
  showAllErrors,
  touchedFields,
  markTouched,
  activeDescriptionId,
  setActiveDescriptionId,
  onUpdate,
  onRemove,
  autoFilledFields,
  onFieldManualEdit,
  getInputStateClass,
  milestoneIndex,
  itemIndex,
  isGuestMode,
}: {
  item: InvoiceLineItem;
  currency: InvoiceDisplayCurrency;
  errors?: { description?: string; qty?: string; rate?: string; sacCode?: string };
  showAllErrors?: boolean;
  touchedFields: Record<string, boolean>;
  markTouched: (id: string, field: string) => void;
  activeDescriptionId: string | null;
  setActiveDescriptionId: (id: string | null) => void;
  onUpdate: (patch: Partial<InvoiceLineItem>) => void;
  onRemove: () => void;
  autoFilledFields: Set<string>;
  onFieldManualEdit: (fieldPath: string) => void;
  getInputStateClass: (fieldPath: string, fieldValue: string | number) => string;
  milestoneIndex: number;
  itemIndex: number;
  isGuestMode?: boolean;
}) {
  const allowedUnits = invoiceAllowedUnitsByType[item.type] || [];
  const suggestions = getInvoiceDescriptionSuggestions(item.type);
  const showSuggestions = activeDescriptionId === item.id && suggestions.length > 0;
  const sacCode = useMemo(() => getDefaultSacCodeForType(item.type), [item.type]);
  const total = Number(item.qty || 0) * Number(item.rate || 0);

  return (
    <div className="group relative border border-gray-200 bg-white p-4 transition-all hover:border-gray-400 hover:shadow-sm">
      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100"
      >
        ×
      </button>

      <div className="space-y-4">
        {/* Row 1: Type & SAC */}
        <div className="flex flex-col gap-1.5">
          <div className="min-w-[200px] w-full md:w-fit">
            <AppSelectField
              value={item.type}
              onChange={(e) => {
                onFieldManualEdit(`deliverables.${itemIndex}.type`);
                onUpdate({ type: e.target.value as InvoiceLineItemType });
              }}
              className={cn(
                "h-10 text-sm font-semibold",
                getInputStateClass(`deliverables.${itemIndex}.type`, item.type)
              )}
            >
              {!item.type && <option value="" disabled selected>Select category...</option>}
              {invoiceLineItemTypeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </AppSelectField>
          </div>
          {sacCode && (
            <div className="flex items-center gap-1.5 pl-1">
              <p className="text-[11px] font-medium text-[color:var(--text-muted)]">
                SAC: {sacCode}
              </p>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[10px] text-gray-400 cursor-help shrink-0"
                title="Service Accounting Code — identifies the type of service for GST classification. Auto-filled based on your selected category."
              >
                ?
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Description */}
        <div className="relative">
          <label className="sr-only">
            Description
            {autoFilledFields.has(`deliverables.${itemIndex}.description`) && (
              <span className="autofill-indicator">auto-filled</span>
            )}
          </label>
          <AppTextField
            type="text"
            value={item.description}
            placeholder={
              isGuestMode 
                ? "Select/Type item..." 
                : (invoiceDescriptionPlaceholderByType[item.type] || "Description")
            }
            className={cn(
              "w-full text-sm h-10",
              getInputStateClass(`deliverables.${itemIndex}.description`, item.description)
            )}
            errorText={(showAllErrors || touchedFields[`${item.id}:description`]) ? errors?.description : undefined}
            onChange={(e) => {
              onFieldManualEdit(`deliverables.${itemIndex}.description`);
              onUpdate({ description: e.target.value });
            }}
            onFocus={() => setActiveDescriptionId(item.id)}
            onBlur={() => {
              markTouched(item.id, "description");
              setTimeout(() => {
                if (activeDescriptionId === item.id) setActiveDescriptionId(null);
              }, 200);
            }}
          />
          {showSuggestions && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full max-w-md bg-white border border-gray-100 shadow-[var(--brutal-shadow-lg)] py-1 overflow-y-auto max-h-60 ring-1 ring-black/5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onFieldManualEdit(`deliverables.${itemIndex}.description`);
                    onUpdate({ description: s });
                    setActiveDescriptionId(null);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Qty / Rate / Unit */}
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="w-full flex-[1_1_80px] sm:w-[80px] sm:flex-none">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight mb-1.5 block ml-0.5">
              Qty
              {autoFilledFields.has(`deliverables.${itemIndex}.quantity`) && (
                <span className="autofill-indicator ml-1">auto-filled</span>
              )}
            </label>
            <AppTextField
              type="number"
              value={item.qty}
              placeholder={isGuestMode ? "Enter" : "0"}
              className={cn(
                "h-10 text-sm w-full",
                getInputStateClass(`deliverables.${itemIndex}.quantity`, item.qty)
              )}
              errorText={(showAllErrors || touchedFields[`${item.id}:qty`]) ? errors?.qty : undefined}
              onChange={(e) => {
                onFieldManualEdit(`deliverables.${itemIndex}.quantity`);
                onUpdate({ qty: e.target.value });
              }}
              onBlur={() => markTouched(item.id, "qty")}
            />
          </div>

          <div className="w-full flex-[2_1_140px] sm:w-[160px] sm:flex-none">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight mb-1.5 block ml-0.5">
              Rate
              {autoFilledFields.has(`deliverables.${itemIndex}.rate`) && (
                <span className="autofill-indicator ml-1">auto-filled</span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none z-10">
                {getCurrencySymbol(currency)}
              </span>
              <AppTextField
                type="number"
                value={item.rate}
                placeholder={isGuestMode ? "Enter" : "0"}
                className={cn(
                  "h-10 text-sm !pl-10 w-full",
                  getInputStateClass(`deliverables.${itemIndex}.rate`, item.rate)
                )}
                errorText={(showAllErrors || touchedFields[`${item.id}:rate`]) ? errors?.rate : undefined}
                onChange={(e) => {
                  onFieldManualEdit(`deliverables.${itemIndex}.rate`);
                  onUpdate({ rate: e.target.value });
                }}
                onBlur={() => markTouched(item.id, "rate")}
              />
            </div>
          </div>

          <div className="w-full flex-[2_1_140px] sm:w-[160px] sm:flex-none">
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight m-0 p-0 block ml-0.5">
                Unit
                {autoFilledFields.has(`deliverables.${itemIndex}.unit`) && (
                  <span className="autofill-indicator ml-1">auto-filled</span>
                )}
              </label>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[10px] text-gray-400 cursor-help shrink-0"
                title="How you measure delivery — per screen, per hour, per deliverable, per video, etc."
              >
                ?
              </span>
            </div>
            <AppSelectField
              value={item.rateUnit}
              onChange={(e) => {
                onFieldManualEdit(`deliverables.${itemIndex}.unit`);
                onUpdate({ rateUnit: e.target.value as InvoiceRateUnit });
              }}
              className={cn(
                "h-10 text-sm",
                getInputStateClass(`deliverables.${itemIndex}.unit`, item.rateUnit)
              )}
            >
              {!item.rateUnit && <option value="" disabled selected>Select unit...</option>}
              {allowedUnits.map((u) => <option key={u} value={u}>{invoiceRateUnitLabels[u]}</option>)}
            </AppSelectField>
          </div>

          <div className="w-full sm:w-auto sm:ml-auto pb-2 text-right">
            <p className="text-[13px] font-bold text-[color:var(--text-primary)]">
              {formatCurrency(total, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
