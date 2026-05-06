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
}

function createDefaultLineItem(): InvoiceLineItem {
  return {
    id: crypto.randomUUID(),
    type: "Other" as InvoiceLineItemType,
    description: "",
    qty: 1,
    rate: 0,
    rateUnit: "per-deliverable" as InvoiceRateUnit,
  };
}

function createDefaultMilestone(index: number): Milestone {
  return {
    id: crypto.randomUUID(),
    title: `Milestone ${index + 1}`,
    status: "PENDING" as MilestoneStatus,
    lineItems: [createDefaultLineItem()],
  };
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
}: DeliverablesSectionProps) {
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
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
              >
                {/* Milestone header */}
                <div className="flex flex-col gap-4 bg-gray-50 px-6 py-5 md:flex-row md:items-center border-b border-gray-100">
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
                    {effectiveMilestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(milestone.id)}
                        className="text-gray-300 hover:text-red-500 text-xl transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Line items */}
                <div className="p-4 space-y-4">
                  <div className="hidden xl:grid grid-cols-[140px_1fr_90px_130px_120px_110px_40px] gap-4 px-4 opacity-40">
                    <span className="text-[9px] font-bold uppercase">Type</span>
                    <span className="text-[9px] font-bold uppercase">Description</span>
                    <span className="text-[9px] font-bold uppercase text-center">Qty</span>
                    <span className="text-[9px] font-bold uppercase">Rate</span>
                    <span className="text-[9px] font-bold uppercase">Unit</span>
                    <span className="text-[9px] font-bold uppercase text-right">Total</span>
                    <span />
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {milestone.lineItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <LineItemRow
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
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    onClick={() => addLineItem(milestone.id)}
                    className="text-xs font-bold text-gray-400 hover:text-lime-600 transition-colors flex items-center gap-1 group"
                  >
                    <span className="text-lg transition-transform group-hover:scale-125">+</span> Add Line Item
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
                "w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-6 text-sm font-bold text-gray-400 transition-all group",
                effectiveMilestones.length >= MAX_MILESTONES
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-gray-300 hover:bg-gray-100/80 hover:text-gray-600"
              )}
            >
              <span className="text-2xl text-gray-300 group-hover:text-gray-400">+</span>
              Add Project Milestone ({MAX_MILESTONES - effectiveMilestones.length}/{MAX_MILESTONES} remaining)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function LineItemRow({
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
}: {
  item: InvoiceLineItem;
  currency: InvoiceDisplayCurrency;
  errors?: { description?: string; qty?: string; rate?: string };
  showAllErrors?: boolean;
  touchedFields: Record<string, boolean>;
  markTouched: (id: string, field: string) => void;
  activeDescriptionId: string | null;
  setActiveDescriptionId: (id: string | null) => void;
  onUpdate: (patch: Partial<InvoiceLineItem>) => void;
  onRemove: () => void;
}) {
  const allowedUnits = invoiceAllowedUnitsByType[item.type] || [];
  const suggestions = getInvoiceDescriptionSuggestions(item.type);
  const showSuggestions = activeDescriptionId === item.id && suggestions.length > 0;
  const sacCode = useMemo(() => getDefaultSacCodeForType(item.type), [item.type]);
  const total = Number(item.qty || 0) * Number(item.rate || 0);

  return (
    <div className="group relative grid grid-cols-1 xl:grid-cols-[140px_1fr_90px_130px_120px_110px_40px] gap-4 items-start rounded-xl p-3 xl:p-2 transition-all hover:bg-gray-50/80 border border-transparent hover:border-gray-100 xl:border-none">
      {/* Type */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Type</label>
        <AppSelectField
          value={item.type}
          onChange={(e) => onUpdate({ type: e.target.value as InvoiceLineItemType })}
          className="h-9 text-xs"
        >
          {invoiceLineItemTypeOptions.map((opt) => {
            const code = getDefaultSacCodeForType(opt as InvoiceLineItemType);
            return (
              <option key={opt} value={opt}>
                {opt}{code ? ` - SAC ${code}` : ""}
              </option>
            );
          })}
        </AppSelectField>
        {sacCode && <p className="text-[10px] text-gray-400 font-medium pl-1">SAC: {sacCode}</p>}
      </div>

      {/* Description */}
      <div className="relative">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Description</label>
        <AppTextField
          type="text"
          value={item.description}
          placeholder={invoiceDescriptionPlaceholderByType[item.type]}
          className="h-9 text-xs w-full"
          errorText={(showAllErrors || touchedFields[`${item.id}:description`]) ? errors?.description : undefined}
          onChange={(e) => onUpdate({ description: e.target.value })}
          onFocus={() => setActiveDescriptionId(item.id)}
          onBlur={() => {
            markTouched(item.id, "description");
            setTimeout(() => {
              if (activeDescriptionId === item.id) setActiveDescriptionId(null);
            }, 200);
          }}
        />
        {showSuggestions && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full bg-white border border-gray-100 shadow-xl rounded-lg py-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onUpdate({ description: s }); setActiveDescriptionId(null); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Qty */}
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Quantity</label>
        <AppTextField
          type="number"
          value={item.qty}
          className="h-9 text-xs text-center w-full"
          errorText={(showAllErrors || touchedFields[`${item.id}:qty`]) ? errors?.qty : undefined}
          onChange={(e) => onUpdate({ qty: e.target.value })}
          onBlur={() => markTouched(item.id, "qty")}
        />
      </div>

      {/* Rate */}
      <div className="relative">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Rate</label>
        <div className="relative">
          <AppTextField
            type="number"
            value={item.rate}
            className="h-9 text-xs pl-6 w-full"
            errorText={(showAllErrors || touchedFields[`${item.id}:rate`]) ? errors?.rate : undefined}
            onChange={(e) => onUpdate({ rate: e.target.value })}
            onBlur={() => markTouched(item.id, "rate")}
          />
          <span className="absolute left-2 top-[10px] text-[10px] text-gray-400">{getCurrencySymbol(currency)}</span>
        </div>
      </div>

      {/* Unit */}
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Unit</label>
        <AppSelectField
          value={item.rateUnit}
          onChange={(e) => onUpdate({ rateUnit: e.target.value as InvoiceRateUnit })}
          className="h-9 text-xs"
        >
          {allowedUnits.map((u) => <option key={u} value={u}>{invoiceRateUnitLabels[u]}</option>)}
        </AppSelectField>
      </div>

      {/* Total */}
      <div className="flex h-auto xl:h-9 items-center justify-end pt-1 xl:pt-0">
        <span className="text-[13px] font-bold text-[color:var(--text-primary)]">
          {formatCurrency(total, currency)}
        </span>
      </div>

      {/* Remove */}
      <div className="flex h-auto xl:h-9 items-center justify-center pt-1 xl:pt-0">
        <button
          type="button"
          onClick={onRemove}
          className="xl:opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xl transition-all p-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
