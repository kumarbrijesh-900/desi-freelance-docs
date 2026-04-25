"use client";

/**
 * BriefSummaryModal — Human-in-the-Loop extraction review gate.
 *
 * Flow (per original spec):
 *  1. New Client detection banner (checkbox to save to Master after invoice save)
 *  2. LOW CONFIDENCE fields — each shows extracted value in an editable input,
 *     with a tick button. Submit is LOCKED until ALL low-conf fields are ticked
 *     (either approved or manually corrected and ticked).
 *  3. MANDATORY fields (Confident) — shown for review.
 *  4. MISSING (empty) fields — if mandatory, show input. Otherwise informational chips.
 *  5. Submit is active only when all mandatory fields are filled and low-conf are checked.
 *  6. Footer: Parse Again | Continue Manually | Submit (locked → unlocked)
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "@/components/ui/motion-primitives";
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from "@/components/ui/app-icons";
import { cn, getAppButtonClass } from "@/lib/ui-foundation";
import type { InvoiceFormData, InvoiceStepperStep } from "@/types/invoice";
import type { BriefAutofillFieldSummary } from "@/lib/invoice-brief-intake";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface BriefSummaryModalProps {
  isOpen: boolean;
  extractedData: InvoiceFormData;
  lowConfidenceFields: BriefAutofillFieldSummary[];
  confidentFields: BriefAutofillFieldSummary[];
  missingFieldsGroups: Array<{ step: InvoiceStepperStep; fields: string[] }>;
  isNewClient: boolean;
  isLoggedIn: boolean;
  onContinueManually: (data: InvoiceFormData) => void;
  onParseAgain: () => void;
  onSubmit: (data: InvoiceFormData, shouldSaveClient: boolean) => void;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Identify if a field label corresponds to a mandatory field.
 */
function isMandatoryField(label: string, data: InvoiceFormData): boolean {
  const l = label.toLowerCase();
  const isInternational = data.client.clientLocation === "international";

  // Agency
  if (l.includes("agency name") || l.includes("business") || l.includes("trade name")) return true;
  if (l.includes("agency state")) return true;
  if (l.includes("agency address") || (l.includes("address") && !l.includes("client") && !l.includes("bank"))) return true;

  // Client
  if (l.includes("client name")) return true;
  if (l.includes("client address")) return true;
  if (l.includes("client state") && !isInternational) return true;
  if (l.includes("client country") && isInternational) return true;

  // Meta
  if (l.includes("invoice number")) return true;
  if (l.includes("invoice date")) return true;
  if (l.includes("due date")) return true;
  if (l.includes("payment terms")) return true;

  // Items (we check first item for simplicity in summary)
  if (l.includes("description")) return true;
  if (l.includes("qty") || l.includes("quantity")) return true;
  if (l.includes("rate")) return true;

  // Payment
  if (l.includes("bank name")) return true;
  if (l.includes("account number")) return true;
  if (isInternational) {
    if (l.includes("account name") || l.includes("beneficiary")) return true;
    if (l.includes("swift") || l.includes("bic")) return true;
    if (l.includes("bank address")) return true;
  }

  return false;
}

/**
 * Map field label → path in InvoiceFormData
 */
function setFormDataValue(data: InvoiceFormData, label: string, value: string): InvoiceFormData {
  const next = { ...data };
  const l = label.toLowerCase();

  // Agency
  if (l.includes("agency name") || l.includes("business") || l.includes("trade name")) next.agency.agencyName = value;
  else if (l.includes("agency state")) next.agency.agencyState = value as any;
  else if (l.includes("gstin") && !l.includes("client")) next.agency.gstin = value;
  else if (l.includes("pan")) next.agency.pan = value;
  else if (l.includes("agency address") || (l.includes("address") && !l.includes("client") && !l.includes("bank"))) {
    next.agency.addressLine1 = value;
    next.agency.address = value;
  }
  // Client
  else if (l.includes("client name")) next.client.clientName = value;
  else if (l.includes("client address")) {
    next.client.clientAddressLine1 = value;
    next.client.clientAddress = value;
  }
  else if (l.includes("client state")) next.client.clientState = value as any;
  else if (l.includes("client country")) next.client.clientCountry = value as any;
  else if (l.includes("client gstin") || (l.includes("gstin") && l.includes("client"))) next.client.clientGstin = value;
  else if (l.includes("currency")) next.client.clientCurrency = value as any;
  // Items
  else if (l.includes("description")) { if (next.lineItems[0]) next.lineItems[0].description = value; }
  else if (l.includes("qty") || l.includes("quantity")) { if (next.lineItems[0]) next.lineItems[0].qty = parseFloat(value) || 0; }
  else if (l.includes("rate")) { if (next.lineItems[0]) next.lineItems[0].rate = parseFloat(value) || 0; }
  // Meta
  else if (l.includes("invoice number")) next.meta.invoiceNumber = value;
  else if (l.includes("invoice date")) next.meta.invoiceDate = value;
  else if (l.includes("due date")) next.meta.dueDate = value;
  else if (l.includes("payment terms")) next.meta.paymentTerms = value;
  // Payment
  else if (l.includes("bank name")) next.payment.bankName = value;
  else if (l.includes("account number")) next.payment.accountNumber = value;
  else if (l.includes("ifsc")) next.payment.ifscCode = value;
  else if (l.includes("swift") || l.includes("bic")) next.payment.swiftBicCode = value;
  else if (l.includes("account name") || l.includes("beneficiary")) next.payment.accountName = value;
  else if (l.includes("bank address")) next.payment.bankAddress = value;

  return next;
}

function getExtractedValueForLabel(
  label: string,
  data: InvoiceFormData
): string {
  const l = label.toLowerCase();

  // Agency
  if (l.includes("agency name") || l.includes("business") || l.includes("trade name"))
    return data.agency.agencyName;
  if (l.includes("agency state")) return data.agency.agencyState || "";
  if (l.includes("gstin") && !l.includes("client"))
    return data.agency.gstin || "";
  if (l.includes("pan")) return data.agency.pan || "";
  if (l.includes("agency address") || (l.includes("address") && !l.includes("client") && !l.includes("bank")))
    return data.agency.addressLine1 || data.agency.address || "";

  // Client
  if (l.includes("client name")) return data.client.clientName;
  if (l.includes("client address") || (l.includes("address line") && l.includes("client")))
    return data.client.clientAddressLine1 || data.client.clientAddress || "";
  if (l.includes("client state")) return data.client.clientState || "";
  if (l.includes("client country")) return data.client.clientCountry || "";
  if (l.includes("client gstin") || (l.includes("gstin") && l.includes("client")))
    return data.client.clientGstin || "";
  if (l.includes("currency")) return data.client.clientCurrency || "";

  // Deliverables
  if (l.includes("description") || l.includes("deliverable"))
    return data.lineItems[0]?.description || "";
  if (l.includes("rate")) return data.lineItems[0]?.rate?.toString() || "";
  if (l.includes("qty") || l.includes("quantity"))
    return data.lineItems[0]?.qty?.toString() || "";
  if (l.includes("sac")) return data.lineItems[0]?.sacCode || "";

  // Payment / meta
  if (l.includes("payment terms")) return data.meta.paymentTerms || "";
  if (l.includes("bank name")) return data.payment.bankName || "";
  if (l.includes("account number")) return data.payment.accountNumber || "";
  if (l.includes("ifsc")) return data.payment.ifscCode || "";
  if (l.includes("swift") || l.includes("bic")) return data.payment.swiftBicCode || "";
  if (l.includes("account name") || l.includes("beneficiary"))
    return data.payment.accountName || "";

  // Meta
  if (l.includes("invoice number")) return data.meta.invoiceNumber || "";
  if (l.includes("invoice date")) return data.meta.invoiceDate || "";
  if (l.includes("due date")) return data.meta.dueDate || "";

  return "";
}

/* ─── Sub-component: Editable row ───────────────────────────────────────── */

interface EditableRowProps {
  label: string;
  value: string;
  isApproved: boolean;
  isMandatory: boolean;
  isLowConfidence: boolean;
  onApprove: (label: string, value: string) => void;
}

function EditableRow({ label, value, isApproved, isMandatory, isLowConfidence, onApprove }: EditableRowProps) {
  const [editValue, setEditValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleStartEdit = () => {
    if (isApproved && !isLowConfidence) return;
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleTick = () => {
    onApprove(label, editValue);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
        isApproved
          ? "border-[color:var(--color-lime-700)] bg-[color:var(--color-lime-900)]/10"
          : isLowConfidence || (isMandatory && !value)
          ? "border-amber-700/40 bg-amber-950/20 hover:border-amber-600/60"
          : "border-white/[0.06] bg-white/[0.02]"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isLowConfidence ? "text-amber-500" : isMandatory ? "text-cyan-500" : "text-gray-500"
          )}>
            {label}
            {isMandatory && <span className="ml-1 text-red-500">*</span>}
          </p>
        </div>
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleTick}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTick();
              if (e.key === "Escape") { setIsEditing(false); setEditValue(value); }
            }}
            className="w-full rounded-lg border border-amber-600/50 bg-black/40 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
          />
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            className={cn(
              "w-full text-left rounded-lg px-3 py-1 text-sm transition-colors",
              isApproved ? "text-[color:var(--color-lime-400)]" : value ? "text-white" : "text-gray-500 italic"
            )}
          >
            {value || `Enter ${label.toLowerCase()}…`}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleTick}
        disabled={isApproved && !isEditing}
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200",
          isApproved
            ? "border-[color:var(--color-lime-600)] bg-[color:var(--color-lime-500)] text-[#111118]"
            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-amber-500 hover:bg-amber-500 hover:text-black"
        )}
      >
        <CheckIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Main Modal ─────────────────────────────────────────────────────────── */

export default function BriefSummaryModal({
  isOpen,
  extractedData,
  lowConfidenceFields,
  confidentFields,
  missingFieldsGroups,
  isNewClient,
  isLoggedIn,
  onContinueManually,
  onParseAgain,
  onSubmit,
}: BriefSummaryModalProps) {
  const [localData, setLocalData] = useState<InvoiceFormData>(extractedData);
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set());
  const [shouldSaveClient, setShouldSaveClient] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLocalData(extractedData);
      setApprovedFields(new Set());
      setShouldSaveClient(true);
    }
  }, [isOpen, extractedData]);

  if (!isOpen) return null;

  const lowConfLabels = new Set(lowConfidenceFields.map(f => f.label));
  const missingFlatLabels = missingFieldsGroups.flatMap(g => g.fields);
  
  // Categorize
  const mandatoryMissing = missingFlatLabels.filter(l => isMandatoryField(l, localData));
  const optionalMissing = missingFlatLabels.filter(l => !isMandatoryField(l, localData));

  // For low confidence or missing mandatory, user MUST tick or fill.
  const fieldsToReview = [
    ...lowConfidenceFields.map(f => ({ label: f.label, isLowConfidence: true, isMandatory: isMandatoryField(f.label, localData) })),
    ...mandatoryMissing.map(l => ({ label: l, isLowConfidence: false, isMandatory: true }))
  ];

  const confidentMandatory = confidentFields.filter(f => isMandatoryField(f.label, localData) && !lowConfLabels.has(f.label));
  const confidentOptional = confidentFields.filter(f => !isMandatoryField(f.label, localData) && !lowConfLabels.has(f.label));

  const allReviewed = fieldsToReview.every(f => {
    const val = getExtractedValueForLabel(f.label, localData);
    return approvedFields.has(f.label) && val.trim().length > 0;
  });

  const handleApproveField = (label: string, value: string) => {
    setLocalData(prev => setFormDataValue(prev, label, value));
    setApprovedFields(prev => {
      const next = new Set(prev);
      next.add(label);
      return next;
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-[#111118] shadow-2xl border border-white/[0.08]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-lime-900)]/30 text-[color:var(--color-lime-400)]">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">Extraction Summary</h2>
                <p className="text-sm text-gray-500 mt-0.5">Validate and finalize the smart extraction</p>
              </div>
            </div>
            <button onClick={() => onContinueManually(localData)} className="p-2 text-gray-500 hover:text-white transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* New Client */}
            {isNewClient && isLoggedIn && (
              <label className="flex items-start gap-4 cursor-pointer rounded-2xl border border-cyan-900/50 bg-cyan-950/20 p-5 hover:bg-cyan-950/30 transition-colors">
                <input
                  type="checkbox"
                  checked={shouldSaveClient}
                  onChange={(e) => setShouldSaveClient(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <p className="font-bold text-cyan-400">New Client Detected: {localData.client.clientName}</p>
                  <p className="text-sm text-cyan-300/60 mt-1">Save to Master Directory after this invoice is generated?</p>
                </div>
              </label>
            )}

            {/* Fields to Review */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Review Required</h3>
                <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                  {approvedFields.size} / {fieldsToReview.length} Ticked
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {fieldsToReview.map(f => (
                  <EditableRow
                    key={f.label}
                    label={f.label}
                    value={getExtractedValueForLabel(f.label, localData)}
                    isApproved={approvedFields.has(f.label)}
                    isMandatory={f.isMandatory}
                    isLowConfidence={f.isLowConfidence}
                    onApprove={handleApproveField}
                  />
                ))}
                {fieldsToReview.length === 0 && (
                  <div className="text-center py-4 text-gray-600 text-sm italic border border-dashed border-white/5 rounded-xl">
                    No low-confidence fields found.
                  </div>
                )}
              </div>
            </div>

            {/* Confident Mandatory */}
            {confidentMandatory.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500">Confident Mandatory</h3>
                <div className="flex flex-wrap gap-2">
                  {confidentMandatory.map(f => (
                    <div key={f.label} className="flex items-center gap-2 rounded-full border border-cyan-900/30 bg-cyan-950/10 px-3 py-1.5">
                      <CheckIcon className="h-3 w-3 text-cyan-500" />
                      <span className="text-xs text-cyan-200/70">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confident Optional */}
            {confidentOptional.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Confident Optional</h3>
                <div className="flex flex-wrap gap-2">
                  {confidentOptional.map(f => (
                    <div key={f.label} className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5">
                      <CheckIcon className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-500">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Missing */}
            {optionalMissing.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-700">Missing Optional</h3>
                <div className="flex flex-wrap gap-2">
                  {optionalMissing.map(l => (
                    <div key={l} className="rounded-full border border-white/5 bg-white/[0.01] px-3 py-1.5">
                      <span className="text-xs text-gray-600">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0e0e16] px-6 py-5">
            <button
              onClick={onParseAgain}
              className="text-sm font-bold text-gray-500 hover:text-white transition-colors"
            >
              Parse Again
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onContinueManually(localData)}
                className={getAppButtonClass({ variant: "ghost", size: "md" })}
              >
                Continue Manually
              </button>
              <button
                onClick={() => onSubmit(localData, shouldSaveClient)}
                disabled={!allReviewed}
                className={cn(
                  getAppButtonClass({ variant: "primary", size: "md" }),
                  !allReviewed && "opacity-30 cursor-not-allowed saturate-0"
                )}
              >
                {allReviewed ? "Submit ✓" : `Check ${fieldsToReview.length - approvedFields.size} more`}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
