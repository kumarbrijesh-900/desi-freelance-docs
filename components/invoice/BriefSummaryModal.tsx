"use client";

/**
 * BriefSummaryModal — Human-in-the-Loop extraction review gate.
 *
 * Flow (per original spec):
 *  1. New Client detection banner (checkbox to save to Master after invoice save)
 *  2. REVIEW REQUIRED fields — ALL Mandatory fields + ALL Low Confidence fields.
 *     Each shows extracted value in an editable input with a tick button.
 *     Submit is LOCKED until ALL these fields are ticked (approved/corrected).
 *  3. CONFIDENT OPTIONAL fields — read-only chips for reference.
 *  4. MISSING OPTIONAL fields — informational chips.
 *  5. Submit is active only when all review-required fields are ticked and filled.
 *  6. Footer: Parse Again | Continue Manually | Submit (locked → unlocked)
 */

import { useState, useEffect, useRef } from "react";
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

function isMandatoryField(label: string, data: InvoiceFormData): boolean {
  const l = label.toLowerCase();
  const isInternational = data.client.clientLocation === "international";

  if (l.includes("agency name") || l.includes("business") || l.includes("trade name")) return true;
  if (l.includes("agency state")) return true;
  if (l.includes("agency address") || (l.includes("address") && !l.includes("client") && !l.includes("bank"))) return true;

  if (l.includes("client name")) return true;
  if (l.includes("client address")) return true;
  if (l.includes("client state") && !isInternational) return true;
  if (l.includes("client country") && isInternational) return true;

  if (l.includes("invoice number")) return true;
  if (l.includes("invoice date")) return true;
  if (l.includes("due date")) return true;
  if (l.includes("payment terms")) return true;

  if (l.includes("description")) return true;
  if (l.includes("qty") || l.includes("quantity")) return true;
  if (l.includes("rate")) return true;

  if (l.includes("bank name")) return true;
  if (l.includes("account number")) return true;
  if (isInternational) {
    if (l.includes("account name") || l.includes("beneficiary")) return true;
    if (l.includes("swift") || l.includes("bic")) return true;
    if (l.includes("bank address")) return true;
  }

  return false;
}

function setFormDataValue(data: InvoiceFormData, label: string, value: string): InvoiceFormData {
  const next = { ...data };
  const l = label.toLowerCase();

  if (l.includes("agency name") || l.includes("business") || l.includes("trade name")) next.agency.agencyName = value;
  else if (l.includes("agency state")) next.agency.agencyState = value as any;
  else if (l.includes("gstin") && !l.includes("client")) next.agency.gstin = value;
  else if (l.includes("pan")) next.agency.pan = value;
  else if (l.includes("agency address") || (l.includes("address") && !l.includes("client") && !l.includes("bank"))) {
    next.agency.addressLine1 = value;
    next.agency.address = value;
  }
  else if (l.includes("client name")) next.client.clientName = value;
  else if (l.includes("client address")) {
    next.client.clientAddressLine1 = value;
    next.client.clientAddress = value;
  }
  else if (l.includes("client state")) next.client.clientState = value as any;
  else if (l.includes("client country")) next.client.clientCountry = value as any;
  else if (l.includes("client gstin") || (l.includes("gstin") && l.includes("client"))) next.client.clientGstin = value;
  else if (l.includes("currency")) next.client.clientCurrency = value as any;
  else if (l.includes("description")) { if (next.lineItems[0]) next.lineItems[0].description = value; }
  else if (l.includes("qty") || l.includes("quantity")) { if (next.lineItems[0]) next.lineItems[0].qty = parseFloat(value) || 0; }
  else if (l.includes("rate")) { if (next.lineItems[0]) next.lineItems[0].rate = parseFloat(value) || 0; }
  else if (l.includes("invoice number")) next.meta.invoiceNumber = value;
  else if (l.includes("invoice date")) next.meta.invoiceDate = value;
  else if (l.includes("due date")) next.meta.dueDate = value;
  else if (l.includes("payment terms")) next.meta.paymentTerms = value;
  else if (l.includes("bank name")) next.payment.bankName = value;
  else if (l.includes("account number")) next.payment.accountNumber = value;
  else if (l.includes("ifsc")) next.payment.ifscCode = value;
  else if (l.includes("swift") || l.includes("bic")) next.payment.swiftBicCode = value;
  else if (l.includes("account name") || l.includes("beneficiary")) next.payment.accountName = value;
  else if (l.includes("bank address")) next.payment.bankAddress = value;

  return next;
}

function getExtractedValueForLabel(label: string, data: InvoiceFormData): string {
  const l = label.toLowerCase();
  if (l.includes("agency name") || l.includes("business") || l.includes("trade name")) return data.agency.agencyName;
  if (l.includes("agency state")) return data.agency.agencyState || "";
  if (l.includes("gstin") && !l.includes("client")) return data.agency.gstin || "";
  if (l.includes("pan")) return data.agency.pan || "";
  if (l.includes("agency address") || (l.includes("address") && !l.includes("client") && !l.includes("bank"))) return data.agency.addressLine1 || data.agency.address || "";
  if (l.includes("client name")) return data.client.clientName;
  if (l.includes("client address") || (l.includes("address line") && l.includes("client"))) return data.client.clientAddressLine1 || data.client.clientAddress || "";
  if (l.includes("client state")) return data.client.clientState || "";
  if (l.includes("client country")) return data.client.clientCountry || "";
  if (l.includes("client gstin") || (l.includes("gstin") && l.includes("client"))) return data.client.clientGstin || "";
  if (l.includes("currency")) return data.client.clientCurrency || "";
  if (l.includes("rate")) return data.lineItems[0]?.rate?.toString() || "";
  if (l.includes("qty") || l.includes("quantity")) return data.lineItems[0]?.qty?.toString() || "";
  if (l.includes("sac")) return data.lineItems[0]?.sacCode || "";
  if (l.includes("description") || l.includes("deliverable")) return data.lineItems[0]?.description || "";
  if (l.includes("payment terms")) return data.meta.paymentTerms || "";
  if (l.includes("bank name")) return data.payment.bankName || "";
  if (l.includes("account number")) return data.payment.accountNumber || "";
  if (l.includes("ifsc")) return data.payment.ifscCode || "";
  if (l.includes("swift") || l.includes("bic")) return data.payment.swiftBicCode || "";
  if (l.includes("account name") || l.includes("beneficiary")) return data.payment.accountName || "";
  if (l.includes("bank address")) return data.payment.bankAddress || "";
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

  useEffect(() => { setEditValue(value); }, [value]);

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
    <div className={cn(
      "group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
      isApproved ? "border-[color:var(--color-lime-700)] bg-[color:var(--color-lime-900)]/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
    )}>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isLowConfidence ? "text-amber-500" : isMandatory ? "text-cyan-500" : "text-gray-500")}>
          {label}{isMandatory && <span className="ml-1 text-red-500">*</span>}
          {isLowConfidence && <span className="ml-2 text-[8px] border border-amber-500/30 px-1 rounded text-amber-500/70">Low Conf</span>}
        </p>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleTick}
            onKeyDown={(e) => { if (e.key === "Enter") handleTick(); if (e.key === "Escape") { setIsEditing(false); setEditValue(value); } }}
            className="w-full rounded-lg border border-cyan-600/50 bg-black/40 px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
          />
        ) : (
          <button type="button" onClick={handleStartEdit} className={cn("w-full text-left rounded-lg px-3 py-1 text-sm transition-colors", isApproved ? "text-[color:var(--color-lime-400)]" : value ? "text-white" : "text-gray-500 italic")}>
            {value || `Enter ${label.toLowerCase()}…`}
          </button>
        )}
      </div>
      <button type="button" onClick={handleTick} disabled={isApproved && !isEditing} className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200", isApproved ? "border-[color:var(--color-lime-600)] bg-[color:var(--color-lime-500)] text-[#111118]" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-cyan-500 hover:bg-cyan-500 hover:text-black")}>
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

  // Group fields for the "Review Required" section: ALL Mandatory fields + ALL Low Confidence fields
  const allLabels = new Set([...lowConfLabels, ...confidentFields.map(f => f.label), ...missingFlatLabels]);
  const reviewRequiredLabels = Array.from(allLabels).filter(l => isMandatoryField(l, localData) || lowConfLabels.has(l));
  
  // Group fields for other sections
  const confidentOptional = confidentFields.filter(f => !isMandatoryField(f.label, localData) && !lowConfLabels.has(f.label));
  const missingOptional = missingFlatLabels.filter(l => !isMandatoryField(l, localData) && !lowConfLabels.has(l));

  const allReviewed = reviewRequiredLabels.every(label => {
    const val = getExtractedValueForLabel(label, localData);
    return approvedFields.has(label) && val.trim().length > 0;
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#0c0c12] shadow-2xl border border-white/[0.1]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5 bg-gradient-to-r from-transparent to-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-lime-950)] text-[color:var(--color-lime-400)] shadow-inner">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight leading-none">Extraction Summary</h2>
                <p className="text-sm text-gray-500 mt-1.5 font-medium">Please validate the details before generating the invoice.</p>
              </div>
            </div>
            <button onClick={() => onContinueManually(localData)} className="p-2 text-gray-600 hover:text-white transition-all hover:rotate-90 duration-300"><XMarkIcon className="h-6 w-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scroll-smooth">
            {isNewClient && isLoggedIn && (
              <label className="flex items-start gap-4 cursor-pointer rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5 hover:bg-cyan-500/[0.05] transition-all group">
                <input type="checkbox" checked={shouldSaveClient} onChange={(e) => setShouldSaveClient(e.target.checked)} className="mt-1 h-5 w-5 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500 transition-all cursor-pointer" />
                <div>
                  <p className="font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">New Client Detected: {localData.client.clientName}</p>
                  <p className="text-xs text-cyan-500/60 mt-1 leading-relaxed font-medium">Would you like to save this client to your Master Directory? This happens automatically once you save the invoice.</p>
                </div>
              </label>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Review Required</h3>
                <div className="flex items-center gap-2">
                   <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${(approvedFields.size / (reviewRequiredLabels.length || 1)) * 100}%` }} />
                   </div>
                   <span className="text-[10px] font-bold font-mono text-cyan-500/80">{approvedFields.size}/{reviewRequiredLabels.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {reviewRequiredLabels.map(label => (
                  <EditableRow key={label} label={label} value={getExtractedValueForLabel(label, localData)} isApproved={approvedFields.has(label)} isMandatory={isMandatoryField(label, localData)} isLowConfidence={lowConfLabels.has(label)} onApprove={handleApproveField} />
                ))}
                {reviewRequiredLabels.length === 0 && <div className="text-center py-8 text-gray-600 text-sm italic border-2 border-dashed border-white/[0.03] rounded-3xl bg-white/[0.01]">All mandatory data was extracted with high confidence.</div>}
              </div>
            </div>

            {confidentOptional.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/20">Confident Optional</h3>
                <div className="flex flex-wrap gap-2 px-1">
                  {confidentOptional.map(f => (
                    <div key={f.label} className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3.5 py-2 group hover:bg-white/[0.04] transition-all">
                      <CheckIcon className="h-3.5 w-3.5 text-lime-500/60 group-hover:text-lime-500 transition-colors" />
                      <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors font-medium">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingOptional.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/20">Missing Optional</h3>
                <div className="flex flex-wrap gap-2 px-1">
                  {missingOptional.map(l => (
                    <div key={l} className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-3.5 py-2 group hover:bg-white/[0.03] transition-all">
                      <span className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors font-medium">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#09090e] px-6 py-6 gap-4">
            <button onClick={onParseAgain} className="text-sm font-bold text-gray-600 hover:text-white transition-colors flex items-center gap-2 group"><SparklesIcon className="h-4 w-4 text-gray-700 group-hover:text-lime-500 transition-colors" /> Parse Again</button>
            <div className="flex items-center gap-3">
              <button onClick={() => onContinueManually(localData)} className="text-sm font-bold text-gray-500 hover:text-white transition-colors px-4">Continue Manually</button>
              <button onClick={() => onSubmit(localData, shouldSaveClient)} disabled={!allReviewed} className={cn("relative overflow-hidden group", getAppButtonClass({ variant: "primary", size: "lg" }), !allReviewed && "opacity-20 cursor-not-allowed grayscale pointer-events-none")}>
                <span className="relative z-10 flex items-center gap-2">{allReviewed ? "Submit ✓" : `Check ${reviewRequiredLabels.length - approvedFields.size} Fields`}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-lime-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
