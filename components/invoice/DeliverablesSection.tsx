"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Control } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import type {
  InvoiceLineItem,
  InvoiceLineItemType,
  InvoiceRateUnit,
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
  isManualSacRequired,
} from "@/lib/invoice-sac";
import AppSelectField from "@/components/ui/AppSelectField";
import AppTextField from "@/components/ui/AppTextField";
import { PencilIcon, SparklesIcon } from "@/components/ui/app-icons";
import {
  appFieldErrorTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
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

// v1: single-milestone only. Will be raised to 5 in v1.5 when multi-milestone billing cycles ship.
const MAX_MILESTONES = 1;

// DEFAULT MILESTONE STRUCTURE
const createDefaultMilestone = (): InvoiceLineItem[] => [
  {
    id: crypto.randomUUID(),
    type: "Other" as InvoiceLineItemType,
    description: "",
    qty: 1,
    rate: 0,
    rateUnit: "per-deliverable" as InvoiceRateUnit,
    is_milestone_header: true,
  },
  {
    id: crypto.randomUUID(),
    type: "Other" as InvoiceLineItemType,
    description: "",
    qty: 1,
    rate: 0,
    rateUnit: "per-deliverable" as InvoiceRateUnit,
    is_milestone_header: false,
  }
];

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
  const [activeDescriptionId, setActiveDescriptionId] = useState<string | null>(null);
  const descriptionInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const milestoneTitleRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Ensure ONE default milestone if value is empty (State Initialization Level)
  const initialItems = useMemo(() => {
    if (value && value.length > 0) return value;
    return createDefaultMilestone();
  }, [value]);

  const { register, control, handleSubmit, setValue, reset } = useForm({
    defaultValues: {
      items: initialItems,
    },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Sync with parent state ONLY on blur or structural changes
  const syncToParent = useCallback((data: { items: InvoiceLineItem[] }) => {
    onChange(data.items);
  }, [onChange]);

  useEffect(() => {
    // Intercept empty arrays and inject default milestone
    const nextItems = (value && value.length > 0) ? value : createDefaultMilestone();
    reset({ items: nextItems });
  }, [value, reset]);

  const markTouched = (itemId: string, field: string) => {
    setTouchedFields((prev) => ({ ...prev, [`${itemId}:${field}`]: true }));
  };

  const openDescriptionAssist = (id: string) => setActiveDescriptionId(id);
  const closeDescriptionAssist = (id: string) => {
    setTimeout(() => {
      if (activeDescriptionId === id) setActiveDescriptionId(null);
    }, 200);
  };

  const applyDescriptionSuggestion = (id: string, index: number, suggestion: string) => {
    setValue(`items.${index}.description`, suggestion);
    setActiveDescriptionId(null);
  };

  const addMilestone = useCallback(() => {
    const newItems = createDefaultMilestone();
    const updatedItems = [...fields, ...newItems];
    append(newItems);
    onChange(updatedItems);
  }, [append, fields, onChange]);

  const removeMilestone = (headerId: string) => {
    const index = fields.findIndex((f) => f.id === headerId);
    if (index === -1) return;
    
    const toRemove = [index];
    for (let i = index + 1; i < fields.length; i++) {
      if (fields[i].is_milestone_header) break;
      toRemove.push(i);
    }
    
    remove(toRemove);
    const updatedItems = fields.filter((_, i) => !toRemove.includes(i));
    onChange(updatedItems);
  };

  const addLineItemToMilestone = (headerId: string) => {
    const index = fields.findIndex((f) => f.id === headerId);
    if (index === -1) return;
    
    let insertAt = index + 1;
    for (let i = index + 1; i < fields.length; i++) {
      if (fields[i].is_milestone_header) break;
      insertAt = i + 1;
    }

    const newItem: InvoiceLineItem = {
      id: crypto.randomUUID(),
      type: "Other",
      description: "",
      qty: 1,
      rate: 0,
      rateUnit: "per-deliverable",
      is_milestone_header: false,
    };
    
    const updatedItems = [...fields];
    updatedItems.splice(insertAt, 0, newItem);
    reset({ items: updatedItems });
    onChange(updatedItems);
  };

  const removeLineItem = (id: string) => {
    const index = fields.findIndex((f) => f.id === id);
    if (index === -1) return;
    remove(index);
    const updatedItems = fields.filter((f) => f.id !== id);
    onChange(updatedItems);
  };

  // Grouping for render
  const milestones: { header: any; index: number; items: { field: any; index: number }[] }[] = [];
  let currentMilestone: { header: any; index: number; items: { field: any; index: number }[] } | null = null;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field.is_milestone_header) {
      if (currentMilestone) milestones.push(currentMilestone);
      currentMilestone = { header: field, index: i, items: [] };
    } else if (currentMilestone) {
      currentMilestone.items.push({ field, index: i });
    }
  }
  if (currentMilestone) milestones.push(currentMilestone);

  return (
    <section
      className={cn(
        "overflow-visible",
        embedded ? "rounded-none border-0 bg-transparent p-0 shadow-none" : getAppPanelClass(),
      )}
      onBlur={handleSubmit(syncToParent)}
    >
      {!embedded && (
        <div className="mb-6 space-y-2">
          <h2 className={appSectionTitleClass}>Items</h2>
          <p className={appSectionDescriptionClass}>Add the billable line items.</p>
        </div>
      )}

      <div className="space-y-10">
        <div className="space-y-8">
          <AnimatePresence initial={false}>
            {milestones.map((milestone, mIdx) => (
              <motion.div
                key={milestone.header.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MilestoneGroup
                  milestone={milestone}
                  mIdx={mIdx}
                  canRemoveMilestone={milestones.length > 1}
                  control={control}
                  register={register}
                  currency={currency}
                  errors={errors}
                  showAllErrors={showAllErrors}
                  touchedFields={touchedFields}
                  markTouched={markTouched}
                  milestoneTitleRefs={milestoneTitleRefs}
                  descriptionInputRefs={descriptionInputRefs}
                  activeDescriptionId={activeDescriptionId}
                  openDescriptionAssist={openDescriptionAssist}
                  closeDescriptionAssist={closeDescriptionAssist}
                  applyDescriptionSuggestion={applyDescriptionSuggestion}
                  onRemoveMilestone={removeMilestone}
                  onAddLineItem={addLineItemToMilestone}
                  onRemoveLineItem={removeLineItem}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {MAX_MILESTONES > 1 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={addMilestone}
              disabled={milestones.length >= MAX_MILESTONES}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-6 text-sm font-bold text-gray-400 transition-all group",
                milestones.length >= MAX_MILESTONES ? "opacity-50 cursor-not-allowed" : "hover:border-gray-300 hover:bg-gray-100/80 hover:text-gray-600"
              )}
            >
              <span className="text-2xl text-gray-300 group-hover:text-gray-400">+</span>
              Add Project Milestone ({MAX_MILESTONES - milestones.length}/{MAX_MILESTONES})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Sub-Components ───

function RowTotal({ control, index, currency }: { control: Control<any>, index: number, currency: InvoiceDisplayCurrency }) {
  const qty = useWatch({ control, name: `items.${index}.qty` });
  const rate = useWatch({ control, name: `items.${index}.rate` });
  const total = Number(qty || 0) * Number(rate || 0);

  return (
    <div className="flex flex-col items-end xl:block">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden mb-1">Total</label>
      <span className="text-[13px] font-bold text-[color:var(--text-primary)]">
        {formatCurrency(total, currency)}
      </span>
    </div>
  );
}

function MilestoneSubtotal({ control, items, currency }: { control: Control<any>, items: { index: number }[], currency: InvoiceDisplayCurrency }) {
  const watchedItems = useWatch({
    control,
    name: items.map(i => `items.${i.index}`),
  });

  const subtotal = (watchedItems || []).reduce(
    (sum: number, item: any) => sum + (Number(item?.qty || 0) * Number(item?.rate || 0)),
    0
  );

  return (
    <div className="text-right">
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Milestone Subtotal</p>
      <p className="text-lg font-black text-gray-900">{formatCurrency(subtotal, currency)}</p>
    </div>
  );
}

function MilestoneGroup({
  milestone,
  mIdx,
  canRemoveMilestone,
  control,
  register,
  currency,
  errors,
  showAllErrors,
  touchedFields,
  markTouched,
  milestoneTitleRefs,
  descriptionInputRefs,
  activeDescriptionId,
  openDescriptionAssist,
  closeDescriptionAssist,
  applyDescriptionSuggestion,
  onRemoveMilestone,
  onAddLineItem,
  onRemoveLineItem,
}: any) {
  const { header, index: headerIndex, items } = milestone;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 bg-gray-50 px-6 py-5 md:flex-row md:items-center border-b border-gray-100">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            {MAX_MILESTONES === 1 ? "Project Details" : (mIdx + 1 === MAX_MILESTONES ? "Final Milestone" : `Milestone ${mIdx + 1}`)}
          </p>
          <div className="flex items-center gap-2 max-w-md">
            <AppTextField
              {...register(`items.${headerIndex}.description`)}
              ref={(el: HTMLInputElement | null) => {
                const { ref } = register(`items.${headerIndex}.description`);
                ref(el);
                milestoneTitleRefs.current[header.id] = el;
              }}
              placeholder="e.g. Phase 1: Research"
              className={cn(
                "text-xl font-bold bg-transparent border-transparent hover:border-gray-200 focus:border-gray-900 rounded px-1 -ml-1 w-full transition-all",
                errors?.[header.id]?.description && (showAllErrors || touchedFields[`${header.id}:description`]) && "border-red-500 ring-1 ring-red-500"
              )}
              onBlur={() => markTouched(header.id, "description")}
            />
            <PencilIcon className="h-4 w-4 text-gray-300" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <MilestoneSubtotal control={control} items={items} currency={currency} />
          {canRemoveMilestone && (
            <button type="button" onClick={() => onRemoveMilestone(header.id)} className="text-gray-300 hover:text-red-500 text-xl transition-colors">×</button>
          )}
        </div>
      </div>

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
            {items.map((item: any) => (
              <motion.div
                key={item.field.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LineItemRow
                  index={item.index}
                  field={item.field}
                  control={control}
                  register={register}
                  currency={currency}
                  errors={errors?.[item.field.id]}
                  showAllErrors={showAllErrors}
                  touchedFields={touchedFields}
                  markTouched={markTouched}
                  descriptionInputRefs={descriptionInputRefs}
                  activeDescriptionId={activeDescriptionId}
                  openDescriptionAssist={openDescriptionAssist}
                  closeDescriptionAssist={closeDescriptionAssist}
                  applyDescriptionSuggestion={applyDescriptionSuggestion}
                  onRemove={onRemoveLineItem}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => onAddLineItem(header.id)}
          className="text-xs font-bold text-gray-400 hover:text-lime-600 transition-colors flex items-center gap-1 group"
        >
          <span className="text-lg transition-transform group-hover:scale-125">+</span> Add Line Item
        </button>
      </div>
    </div>
  );
}

function LineItemRow({
  index,
  field,
  control,
  register,
  currency,
  errors,
  showAllErrors,
  touchedFields,
  markTouched,
  descriptionInputRefs,
  activeDescriptionId,
  openDescriptionAssist,
  closeDescriptionAssist,
  applyDescriptionSuggestion,
  onRemove,
}: any) {
  const type = useWatch({ control, name: `items.${index}.type` });
  const allowedUnits = invoiceAllowedUnitsByType[type as InvoiceLineItemType] || [];
  const showSuggestions = activeDescriptionId === field.id;
  const suggestions = getInvoiceDescriptionSuggestions(type as InvoiceLineItemType);
  
  const sacCode = useMemo(() => getDefaultSacCodeForType(type as InvoiceLineItemType), [type]);

  return (
    <div className="group relative grid grid-cols-1 xl:grid-cols-[140px_1fr_90px_130px_120px_110px_40px] gap-4 items-start rounded-xl p-3 xl:p-2 transition-all hover:bg-gray-50/80 border border-transparent hover:border-gray-100 xl:border-none">
      {/* Type & SAC */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Type</label>
        <AppSelectField {...register(`items.${index}.type`)} className="h-9 text-xs">
          {invoiceLineItemTypeOptions.map(opt => {
            const code = getDefaultSacCodeForType(opt as InvoiceLineItemType);
            return (
              <option key={opt} value={opt}>
                {opt}{code ? ` - SAC ${code}` : ""}
              </option>
            );
          })}
        </AppSelectField>
        {sacCode && (
          <p className="text-[10px] text-gray-400 font-medium pl-1">SAC: {sacCode}</p>
        )}
      </div>

      {/* Description */}
      <div className="relative">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Description</label>
        <AppTextField
          {...register(`items.${index}.description`)}
          ref={(el: HTMLInputElement | null) => {
            const { ref } = register(`items.${index}.description`);
            ref(el);
            descriptionInputRefs.current[field.id] = el;
          }}
          type="text"
          placeholder={invoiceDescriptionPlaceholderByType[type as InvoiceLineItemType]}
          className="h-9 text-xs w-full"
          errorText={(showAllErrors || touchedFields[`${field.id}:description`]) ? errors?.description : undefined}
          onFocus={() => openDescriptionAssist(field.id)}
          onBlur={() => { markTouched(field.id, "description"); closeDescriptionAssist(field.id); }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full bg-white border border-gray-100 shadow-xl rounded-lg py-1">
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyDescriptionSuggestion(field.id, index, s)}
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
          {...register(`items.${index}.qty`)}
          type="number"
          className="h-9 text-xs text-center w-full"
          errorText={(showAllErrors || touchedFields[`${field.id}:qty`]) ? errors?.qty : undefined}
          onBlur={() => markTouched(field.id, "qty")}
        />
      </div>

      {/* Rate */}
      <div className="relative">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Rate</label>
        <div className="relative">
          <AppTextField
            {...register(`items.${index}.rate`)}
            type="number"
            className="h-9 text-xs pl-6 w-full"
            errorText={(showAllErrors || touchedFields[`${field.id}:rate`]) ? errors?.rate : undefined}
            onBlur={() => markTouched(field.id, "rate")}
          />
          <span className="absolute left-2 top-[10px] text-[10px] text-gray-400">{getCurrencySymbol(currency)}</span>
        </div>
      </div>

      {/* Unit */}
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight xl:hidden pl-1 mb-1 block">Unit</label>
        <AppSelectField {...register(`items.${index}.rateUnit`)} className="h-9 text-xs">
          {allowedUnits.map(u => <option key={u} value={u}>{invoiceRateUnitLabels[u]}</option>)}
        </AppSelectField>
      </div>

      {/* Total */}
      <div className="flex h-auto xl:h-9 items-center justify-end pt-1 xl:pt-0">
        <RowTotal control={control} index={index} currency={currency} />
      </div>

      {/* Actions */}
      <div className="flex h-auto xl:h-9 items-center justify-center pt-1 xl:pt-0">
        <button 
          type="button" 
          onClick={() => onRemove(field.id)} 
          className="xl:opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xl transition-all p-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
