"use client";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
  invoiceDefaultUnitByType,
  invoiceRateUnitLabels as baseRateUnitLabels,
} from "@/lib/invoice-deliverables";
import { getInvoiceLineItemCatalogEntry } from "@/lib/invoice-line-item-catalog";

const invoiceRateUnitLabels: Record<string, string> = {
  ...baseRateUnitLabels,
  "per-sqft": "Per sq.ft",
  "per-room": "Per room",
  "per-floor": "Per floor",
  "per-drawing": "Per drawing",
  "per-site": "Per site",
  "per-visit": "Per visit",
  "lump-sum": "Lump sum",
};
import {
  getCurrencySymbol,
  type InvoiceDisplayCurrency,
} from "@/lib/international-billing-options";
import {
  getDefaultSacCodeForType,
} from "@/lib/invoice-sac";
import AppSelectField from "@/components/ui/AppSelectField";
import AppTextField from "@/components/ui/AppTextField";
import { PencilIcon, ChevronDownIcon } from "@/components/ui/app-icons";
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
  freeRevisionRounds?: number;
  extraRevisionFeePercent?: number;
  isReadOnly?: boolean;
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
  freeRevisionRounds = 2,
  extraRevisionFeePercent = 15,
  isReadOnly = false,
}: DeliverablesSectionProps) {
  const createDefaultLineItem = useCallback((): InvoiceLineItem => {
    return {
      id: crypto.randomUUID(),
      type: (isGuestMode ? "" : "Other") as InvoiceLineItemType,
      description: "",
      qty: isGuestMode ? "" : 1,
      rate: isGuestMode ? "" : 0,
      rateUnit: (isGuestMode ? "" : "per-deliverable") as InvoiceRateUnit,
      subType: "",
    } as any;
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
    if (isReadOnly) return "";
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
    if (isReadOnly) return;
    const next = [...effectiveMilestones, createDefaultMilestone(effectiveMilestones.length)];
    onChange(next);
  }, [createDefaultMilestone, effectiveMilestones, isReadOnly, onChange]);

  const removeMilestone = useCallback((milestoneId: string) => {
    if (isReadOnly) return;
    onChange(effectiveMilestones.filter((m) => m.id !== milestoneId));
  }, [effectiveMilestones, isReadOnly, onChange]);

  const updateMilestoneTitle = useCallback((milestoneId: string, title: string) => {
    if (isReadOnly) return;
    onChange(effectiveMilestones.map((m) => m.id === milestoneId ? { ...m, title } : m));
  }, [effectiveMilestones, isReadOnly, onChange]);

  // Line item operations
  const addLineItem = useCallback((milestoneId: string) => {
    if (isReadOnly) return;
    onChange(effectiveMilestones.map((m) =>
      m.id === milestoneId
        ? { ...m, lineItems: [...m.lineItems, createDefaultLineItem()] }
        : m
    ));
  }, [createDefaultLineItem, effectiveMilestones, isReadOnly, onChange]);

  const removeLineItem = useCallback((milestoneId: string, itemId: string) => {
    if (isReadOnly) return;
    onChange(effectiveMilestones.map((m) =>
      m.id === milestoneId
        ? { ...m, lineItems: m.lineItems.filter((li) => li.id !== itemId) }
        : m
    ));
  }, [effectiveMilestones, isReadOnly, onChange]);

  const updateLineItem = useCallback((milestoneId: string, itemId: string, patch: Partial<InvoiceLineItem>) => {
    if (isReadOnly) return;
    onChange(effectiveMilestones.map((m) =>
      m.id === milestoneId
        ? { ...m, lineItems: m.lineItems.map((li) => li.id === itemId ? { ...li, ...patch } : li) }
        : m
    ));
  }, [effectiveMilestones, isReadOnly, onChange]);

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
        {(freeRevisionRounds > 0 || extraRevisionFeePercent > 0) && (
          <div className="flex items-center gap-2 border-2 border-[color:var(--border-subtle)] bg-[#FFFBE6] px-4 py-2.5 mb-4">
            <span className="text-[12px]">📎</span>
            <p className="text-[11px] font-medium text-[color:var(--text-secondary)]">
              Revision policy: <strong>{freeRevisionRounds}</strong> free rounds per deliverable. Extra rounds at <strong>{extraRevisionFeePercent}%</strong> of item total.
            </p>
          </div>
        )}
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
                className={cn(
                  "overflow-visible border bg-white shadow-sm transition-all",
                  isReadOnly
                    ? "border-[#D4D2CC] hover:shadow-sm"
                    : "border-[color:var(--border-subtle)] hover:shadow-md",
                )}
              >
                {/* Milestone header */}
                {effectiveMilestones.length > 1 && (
                  <div className="flex flex-col gap-4 bg-[color:var(--bg-surface-soft)] px-6 py-5 md:flex-row md:items-center border-b border-[color:var(--border-subtle)] rounded-t-2xl">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-muted)] mb-1">
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
                          className="text-xl font-bold bg-transparent border-transparent hover:border-[color:var(--border-subtle)] focus:border-gray-900 rounded px-1 -ml-1 w-full transition-all outline-none border"
                        />
                        {!isReadOnly && <PencilIcon className="h-4 w-4 text-gray-300" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Milestone Subtotal</p>
                        <p className="text-lg font-black text-[color:var(--text-primary)]">{formatCurrency(milestoneSubtotal, currency)}</p>
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(milestone.id)}
                          className="text-gray-300 hover:text-[#FF5C00] text-xl transition-colors"
                        >
                          ×
                        </button>
                      )}
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
                            isReadOnly={isReadOnly}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => addLineItem(milestone.id)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[color:var(--text-muted)] transition-colors hover:text-lime-600 group"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-full border border-[color:var(--border-subtle)] group-hover:border-lime-200 group-hover:bg-lime-50 transition-all">+</span>
                      Add Line Item
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!isReadOnly && MAX_MILESTONES > 1 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={addMilestone}
              disabled={effectiveMilestones.length >= MAX_MILESTONES}
              className={cn(
                "w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#111118] bg-white py-6 text-[13px] font-bold text-[color:var(--text-muted)] transition-all group",
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
  isReadOnly,
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
  isReadOnly?: boolean;
}) {
  const catalogEntry = getInvoiceLineItemCatalogEntry(item.type);
  const hasSubTypes = (catalogEntry as any)?.hasSubTypes;
  const subTypeOptions = (catalogEntry as any)?.subTypes || [];
  const selectedSubType = subTypeOptions.find((st: any) => st.key === (item as any).subType);

  const allowedUnits = (selectedSubType 
    ? selectedSubType.units 
    : (invoiceAllowedUnitsByType[item.type] || [])) as string[];

  const suggestions = (selectedSubType
    ? selectedSubType.descriptions
    : getInvoiceDescriptionSuggestions(item.type)) as string[];

  const showSuggestions = activeDescriptionId === item.id && suggestions.length > 0;
  
  const sacCode = useMemo(() => {
    if (selectedSubType) return selectedSubType.sacCode;
    return getDefaultSacCodeForType(item.type);
  }, [item.type, selectedSubType]);

  const total = Number(item.qty || 0) * Number(item.rate || 0);

  const handleItemTypeChange = (val: string) => {
    onFieldManualEdit(`deliverables.${itemIndex}.type`);
    const newEntry = getInvoiceLineItemCatalogEntry(val);
    const patch: any = { 
      type: val as InvoiceLineItemType,
      subType: "" // Reset sub-type when parent type changes
    };

    // If changing to a type with sub-types, clear unit and description
    if ((newEntry as any)?.hasSubTypes) {
      patch.rateUnit = "";
      patch.description = "";
      patch.sacCode = (newEntry as any).defaultSacCode;
    } else {
      patch.rateUnit = invoiceDefaultUnitByType[val as InvoiceLineItemType];
      patch.sacCode = getDefaultSacCodeForType(val as InvoiceLineItemType);
    }
    
    onUpdate(patch);
  };

  const handleSubTypeChange = (subTypeKey: string) => {
    const st = subTypeOptions.find((s: any) => s.key === subTypeKey);
    if (!st) return;

    onUpdate({
      subType: subTypeKey,
      sacCode: st.sacCode,
      rateUnit: (st.units.includes(item.rateUnit) ? item.rateUnit : st.units[0]) as any,
      description: st.descriptions.includes(item.description) ? item.description : ""
    } as any);
  };

  return (
    <div className={cn(
      "group relative border-2 bg-white p-4 transition-all",
      isReadOnly
        ? "border-[#D4D2CC] hover:shadow-none"
        : "border-[#111118] hover:shadow-[var(--brutal-shadow-sm)]",
    )}>
      {/* Delete button */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center bg-white border-2 border-[#111118] text-[color:var(--text-muted)] shadow-[var(--brutal-shadow-pressed)] transition-all hover:border-[#FF5C00] hover:bg-[#FFF0EC] hover:text-[#FF5C00] lg:opacity-0 lg:group-hover:opacity-100"
        >
          ×
        </button>
      )}

      <div className="space-y-4">
        {/* Row 1: Type & SAC */}
        <div className="flex flex-col gap-1.5">
          <div className="min-w-[200px] w-full md:w-fit">
            <label className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight mb-1.5 block ml-0.5">
              Item Type
            </label>
            <BrutalSelect
              value={item.type}
              onChange={handleItemTypeChange}
              options={invoiceLineItemTypeOptions.map(opt => ({ label: opt, value: opt }))}
              placeholder="Select category..."
              className={getInputStateClass(`deliverables.${itemIndex}.type`, item.type)}
              isReadOnly={isReadOnly}
            />
          </div>

          {/* Sub-type Dropdown (Conditional) */}
          {hasSubTypes && (
            <div className="min-w-[200px] w-full md:w-fit mt-1">
              <label className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight mb-1.5 block ml-0.5">
                Sub-Type
              </label>
              <BrutalSelect
                value={(item as any).subType || ""}
                onChange={handleSubTypeChange}
                options={subTypeOptions.map((st: any) => ({ label: st.label, value: st.key }))}
                placeholder="Select sub-type..."
                className={getInputStateClass(`deliverables.${itemIndex}.subType`, (item as any).subType || "")}
                isReadOnly={isReadOnly}
              />
            </div>
          )}
          {sacCode && (
            <div className="flex items-center gap-1.5 pl-1">
              <p className="text-[11px] font-medium text-[color:var(--text-muted)]">
                SAC: {sacCode}
              </p>
              <AppTooltip content={<>
  Services Accounting Code (SAC) for services, or Harmonized System of Nomenclature (HSN) for goods. Mandatory for Indian GST compliance.
</>} />
            </div>
          )}
        </div>

        {/* Row 2: Description */}
        <div className="relative">
          <label className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight mb-1.5 block ml-0.5">
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
              "h-11 text-[14px]",
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
          {!isReadOnly && showSuggestions && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full max-w-md border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-md)] py-1 overflow-y-auto max-h-60">
              {suggestions.map((s: string) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onFieldManualEdit(`deliverables.${itemIndex}.description`);
                    onUpdate({ description: s });
                    setActiveDescriptionId(null);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-[#BEFF00] hover:text-[#111118] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Unit / Rate / Qty */}
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          {/* 1. UNIT */}
          <div className="w-full flex-[2_1_140px] sm:w-[160px] sm:flex-none">
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight m-0 p-0 block ml-0.5">
                Unit
                {autoFilledFields.has(`deliverables.${itemIndex}.unit`) && (
                  <span className="autofill-indicator ml-1">auto-filled</span>
                )}
              </label>
              <AppTooltip content={<>
  How you measure delivery — per screen, per hour, per deliverable, per video, etc.
</>} />
            </div>
            <BrutalSelect
              value={item.rateUnit}
              onChange={(val) => {
                onFieldManualEdit(`deliverables.${itemIndex}.unit`);
                onUpdate({ rateUnit: val as InvoiceRateUnit });
              }}
              options={allowedUnits.map(u => ({ label: invoiceRateUnitLabels[u], value: u }))}
              placeholder="Select unit..."
              className={getInputStateClass(`deliverables.${itemIndex}.unit`, item.rateUnit)}
              isReadOnly={isReadOnly}
            />
          </div>

          {/* 2. RATE */}
          <div className="w-full flex-[2_1_140px] sm:w-[160px] sm:flex-none">
            <label className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight mb-1.5 block ml-0.5">
              Rate{item.rateUnit ? ` / ${invoiceRateUnitLabels[item.rateUnit]?.replace('Per ', '').replace('Lump sum', 'LUMP SUM') || ''}` : ''}
              {autoFilledFields.has(`deliverables.${itemIndex}.rate`) && (
                <span className="autofill-indicator ml-1">auto-filled</span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)] font-medium pointer-events-none z-10">
                {getCurrencySymbol(currency)}
              </span>
              <AppTextField
                type="number"
                value={item.rate}
                placeholder={isGuestMode ? "Enter" : "0"}
                className={isReadOnly
                  ? "h-11 text-[14px] !pl-10 border-[#D4D2CC] bg-[#F5F4F0] text-[#6B6660] shadow-none"
                  : cn(
                      "h-11 text-[14px] !pl-10",
                      getInputStateClass(`deliverables.${itemIndex}.rate`, item.rate),
                    )
                }
                errorText={(showAllErrors || touchedFields[`${item.id}:rate`]) ? errors?.rate : undefined}
                onChange={(e) => {
                  onFieldManualEdit(`deliverables.${itemIndex}.rate`);
                  onUpdate({ rate: e.target.value });
                }}
                onBlur={() => markTouched(item.id, "rate")}
              />
            </div>
          </div>

          {/* 3. QTY */}
          <div className="w-full flex-[1_1_80px] sm:w-[80px] sm:flex-none">
            <label className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight mb-1.5 block ml-0.5">
              {(item.rateUnit as string) === 'per-hour' ? 'Hours'
               : (item.rateUnit as string) === 'per-day' ? 'Days'
               : (item.rateUnit as string) === 'per-screen' ? 'Screens'
               : (item.rateUnit as string) === 'per-revision' ? 'Revisions'
               : (item.rateUnit as string) === 'per-video' ? 'Videos'
               : (item.rateUnit as string) === 'per-image' ? 'Images'
               : (item.rateUnit as string) === 'per-post' ? 'Posts'
               : (item.rateUnit as string) === 'per-concept' ? 'Concepts'
               : (item.rateUnit as string) === 'per-sqft' ? 'Sq.ft'
               : (item.rateUnit as string) === 'per-room' ? 'Rooms'
               : (item.rateUnit as string) === 'per-floor' ? 'Floors'
               : (item.rateUnit as string) === 'per-drawing' ? 'Drawings'
               : (item.rateUnit as string) === 'per-site' ? 'Sites'
               : (item.rateUnit as string) === 'per-visit' ? 'Visits'
               : 'Qty'}
              {autoFilledFields.has(`deliverables.${itemIndex}.quantity`) && (
                <span className="autofill-indicator ml-1">auto-filled</span>
              )}
            </label>
            <AppTextField
              type="number"
              value={item.qty}
              placeholder={isGuestMode ? "Enter" : "0"}
              className={cn(
                "h-11 text-[14px]",
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

          <div className="w-full sm:w-auto sm:ml-auto pb-2 text-right">
            <label className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight mb-1.5 block">
              Total
            </label>
            <p className="text-[13px] font-bold text-[color:var(--text-primary)]">
              {formatCurrency(total, currency)}
            </p>
          </div>
        </div>

        {/* Contextual helper strip */}
        {total > 0 && item.rateUnit && (
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
            <span className="inline-block w-1 h-1 bg-gray-300" />
            <span>
              {item.rateUnit === 'per-hour' && Number(item.qty) > 0
                ? `${item.qty} hours × ${formatCurrency(Number(item.rate), currency)}/hr = ${formatCurrency(total, currency)}`
                : item.rateUnit === 'per-day' && Number(item.qty) > 0
                ? `${item.qty} days × ${formatCurrency(Number(item.rate), currency)}/day = ${formatCurrency(total, currency)}`
                : item.rateUnit === 'per-screen' && Number(item.qty) > 0
                ? `${item.qty} screens × ${formatCurrency(Number(item.rate), currency)}/screen = ${formatCurrency(total, currency)}`
                : item.rateUnit === 'per-video' && Number(item.qty) > 0
                ? `${item.qty} videos × ${formatCurrency(Number(item.rate), currency)}/video = ${formatCurrency(total, currency)}`
                : `${item.qty} × ${formatCurrency(Number(item.rate), currency)} = ${formatCurrency(total, currency)}`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function BrutalSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  isReadOnly = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  isReadOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  if (isReadOnly) {
    return (
      <div
        className={cn(
          "flex h-11 w-full items-center border-2 border-[#D4D2CC] bg-[#F5F4F0] px-3 text-[14px] font-normal text-[#6B6660]",
          className,
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border-2 border-[#111118] bg-white text-left text-[14px] font-normal text-[color:var(--text-primary)] h-11 pl-3 pr-10 flex items-center cursor-pointer hover:shadow-[var(--brutal-shadow-pressed)] transition-all relative"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <ChevronDownIcon className={cn("h-4 w-4 text-[color:var(--text-muted)] transition-transform duration-200", isOpen && "rotate-180")} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full z-50 border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-md)] max-h-[280px] overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-[14px] transition-colors border-b border-[color:var(--border-subtle)] last:border-b-0",
                  isSelected
                    ? "font-bold text-[#111118] bg-[#F4FFE0]"
                    : "text-[color:var(--text-primary)] hover:bg-[#BEFF00] hover:text-[#111118]"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
