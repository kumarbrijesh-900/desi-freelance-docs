"use client";

import { useEffect, useState, useRef } from "react";
import {
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from "@/components/ui/app-icons";
import { AnimatePresence, motion } from "@/components/ui/motion-primitives";
import type { InvoiceFormData, InvoiceStepperStep } from "@/types/invoice";
import { cn } from "@/lib/ui-foundation";
import type { BriefAutofillFieldSummary } from "@/lib/invoice-brief-intake";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  INTERNATIONAL_CURRENCY_OPTIONS,
} from "@/lib/international-billing-options";

interface BriefSummaryModalProps {
  isOpen: boolean;
  extractedData: InvoiceFormData;
  lowConfidenceFields: BriefAutofillFieldSummary[];
  confidentFields: BriefAutofillFieldSummary[];
  missingFieldsGroups: { step: InvoiceStepperStep; fields: string[] }[];
  isNewClient: boolean;
  isLoggedIn: boolean;
  onContinueManually: (data: InvoiceFormData) => void;
  onParseAgain: () => void;
  onSubmit: (data: InvoiceFormData, shouldSaveClient: boolean) => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function isMandatoryField(label: string, data: InvoiceFormData): boolean {
  const l = label.toLowerCase();
  // Always mandatory core fields
  if (l.includes("agency name")) return true;
  if (l.includes("client name")) return true;
  if (l.includes("invoice date")) return true;
  if (l.includes("currency")) return true;
  if (l.includes("description") || l.includes("deliverable")) return true;
  if (l.includes("rate")) return true;

  // Conditionally mandatory
  if (
    l.includes("gstin") &&
    !l.includes("client") &&
    data.agency.gstRegistrationStatus === "registered"
  )
    return true;
  if (l.includes("pan") && data.agency.gstRegistrationStatus !== "registered")
    return true;
  if (
    l.includes("bank name") ||
    l.includes("account number") ||
    l.includes("ifsc")
  )
    return true;

  return false;
}

function getExtractedValueForLabel(
  label: string,
  data: InvoiceFormData,
): string {
  const l = label.toLowerCase();
  if (l.includes("agency name")) return data.agency.agencyName;
  if (l.includes("agency state")) return data.agency.agencyState || "";
  if (l.includes("agency registered") || l.includes("gst status"))
    return String(data.agency.gstRegistrationStatus === "registered");
  if (l.includes("gstin") && !l.includes("client"))
    return data.agency.gstin || "";
  if (l.includes("pan")) return data.agency.pan || "";
  if (
    l.includes("agency address") ||
    (l.includes("address") && !l.includes("client") && !l.includes("bank"))
  )
    return data.agency.addressLine1 || data.agency.address || "";

  if (l.includes("client name")) return data.client.clientName;
  if (
    l.includes("client address") ||
    (l.includes("address line") && l.includes("client"))
  )
    return data.client.clientAddressLine1 || data.client.clientAddress || "";
  if (l.includes("client state")) return data.client.clientState || "";
  if (l.includes("client country")) return data.client.clientCountry || "";
  if (
    l.includes("client gstin") ||
    (l.includes("gstin") && l.includes("client"))
  )
    return data.client.clientGstin || "";
  if (l.includes("currency")) return data.client.clientCurrency || "";

  // Deliverables
  if (l.includes("rate")) return data.lineItems[0]?.rate?.toString() || "";
  if (l.includes("qty") || l.includes("quantity"))
    return data.lineItems[0]?.qty?.toString() || "";
  if (l.includes("sac")) return data.lineItems[0]?.sacCode || "";
  if (l.includes("description") || l.includes("deliverable"))
    return data.lineItems[0]?.description || "";

  if (l.includes("payment terms")) return data.meta.paymentTerms?.toString() || "15";
  if (l.includes("bank name")) return data.payment.bankName || "";
  if (l.includes("account number")) return data.payment.accountNumber || "";
  if (l.includes("ifsc")) return data.payment.ifscCode || "";
  if (l.includes("swift") || l.includes("bic"))
    return data.payment.swiftBicCode || "";
  if (l.includes("account name") || l.includes("beneficiary"))
    return data.payment.accountName || "";
  if (l.includes("bank address")) return data.payment.bankAddress || "";

  if (l.includes("invoice number")) return data.meta.invoiceNumber || "";
  if (l.includes("invoice date")) return data.meta.invoiceDate || "";
  if (l.includes("due date")) return data.meta.dueDate || "";

  return "";
}

function setFormDataValue(
  data: InvoiceFormData,
  label: string,
  value: string,
): InvoiceFormData {
  const next = { ...data };
  const l = label.toLowerCase();

  if (l.includes("agency name")) next.agency.agencyName = value;
  if (l.includes("agency state")) next.agency.agencyState = value as any;
  if (l.includes("gst status") || l.includes("registered"))
    next.agency.gstRegistrationStatus =
      value === "true" ? "registered" : "not-registered";
  if (l.includes("gstin") && !l.includes("client")) next.agency.gstin = value;
  if (l.includes("pan")) next.agency.pan = value;
  if (l.includes("agency address")) next.agency.addressLine1 = value;

  if (l.includes("client name")) next.client.clientName = value;
  if (l.includes("client address")) next.client.clientAddressLine1 = value;
  if (l.includes("client state")) next.client.clientState = value as any;
  if (l.includes("client country")) next.client.clientCountry = value as any;
  if (
    l.includes("client gstin") ||
    (l.includes("gstin") && l.includes("client"))
  )
    next.client.clientGstin = value;
  if (l.includes("currency")) next.client.clientCurrency = value as any;

  if (l.includes("description") || l.includes("deliverable")) {
    if (!next.lineItems[0])
      next.lineItems[0] = {
        id: "line-1",
        description: "",
        qty: 1,
        rate: 0,
        type: "Other",
        rateUnit: "per-deliverable",
      };
    next.lineItems[0].description = value;
  }
  if (l.includes("rate")) {
    if (!next.lineItems[0])
      next.lineItems[0] = {
        id: "line-1",
        description: "",
        qty: 1,
        rate: 0,
        type: "Other",
        rateUnit: "per-deliverable",
      };
    next.lineItems[0].rate = parseFloat(value) || 0;
  }
  if (l.includes("qty") || l.includes("quantity")) {
    if (!next.lineItems[0])
      next.lineItems[0] = {
        id: "line-1",
        description: "",
        qty: 1,
        rate: 0,
        type: "Other",
        rateUnit: "per-deliverable",
      };
    next.lineItems[0].qty = parseFloat(value) || 0;
  }

  if (l.includes("bank name")) next.payment.bankName = value;
  if (l.includes("account number")) next.payment.accountNumber = value;
  if (l.includes("ifsc")) next.payment.ifscCode = value;
  if (l.includes("account name")) next.payment.accountName = value;

  if (l.includes("invoice number")) next.meta.invoiceNumber = value;
  if (l.includes("invoice date")) next.meta.invoiceDate = value;
  if (l.includes("due date")) next.meta.dueDate = value;
  if (l.includes("payment terms")) next.meta.paymentTerms = parseInt(value, 10) || 15;

  return next;
}

function getFieldType(label: string): "text" | "select" | "date" | "checkbox" {
  const l = label.toLowerCase();
  if (l.includes("state") || l.includes("country") || l.includes("currency"))
    return "select";
  if (l.includes("date")) return "date";
  if (
    l.includes("registered") ||
    l.includes("status") ||
    l.includes("available") ||
    l.includes("lut")
  )
    return "checkbox";
  return "text";
}

function getSelectOptions(label: string): string[] {
  const l = label.toLowerCase();
  if (l.includes("state")) return [...INDIA_STATE_OPTIONS];
  if (l.includes("country")) return ["India", ...INTERNATIONAL_COUNTRY_OPTIONS];
  if (l.includes("currency"))
    return ["INR", ...INTERNATIONAL_CURRENCY_OPTIONS.map((c) => c.code)];
  return [];
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

function EditableRow({
  label,
  value,
  isApproved,
  isMandatory,
  isLowConfidence,
  onApprove,
}: EditableRowProps) {
  const [editValue, setEditValue] = useState(value);
  const fieldType = getFieldType(label);
  const options = getSelectOptions(label);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleToggle = () => {
    const nextValue = editValue === "true" ? "false" : "true";
    setEditValue(nextValue);
    onApprove(label, nextValue);
  };

  const handleTick = () => {
    onApprove(label, editValue);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 border p-4 transition-all duration-200",
        isApproved
          ? "border-[color:var(--color-lime-700)] bg-[color:var(--color-lime-900)]/10"
          : isLowConfidence
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-white/[0.08] bg-white/[0.02]",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isApproved
              ? "text-[color:var(--color-lime-400)]"
              : isLowConfidence
                ? "text-amber-500"
                : isMandatory
                  ? "text-cyan-500"
                  : "text-[color:var(--text-muted)]",
          )}
        >
          {label} {isMandatory && <span className="text-[#FF5C00]">*</span>}
        </span>
        {isLowConfidence && (
          <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-amber-500/70 border border-amber-500/30 px-1.5 py-0.5 rounded">
            Low Confidence
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-0">
          {fieldType === "checkbox" ? (
            <button
              onClick={handleToggle}
              className={cn(
                "flex h-9 w-full items-center justify-between border px-3 transition-all text-sm",
                editValue === "true"
                  ? "border-[color:var(--color-lime-700)] bg-[color:var(--color-lime-900)]/20 text-[color:var(--color-lime-400)]"
                  : "border-white/[0.1] bg-white/[0.03] text-[color:var(--text-muted)]",
              )}
            >
              <span className="font-bold">
                {editValue === "true" ? "YES / ENABLED" : "NO / DISABLED"}
              </span>
              <div
                className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center transition-all",
                  editValue === "true"
                    ? "bg-[color:var(--color-lime-500)] border-transparent"
                    : "bg-white/5 border-white/10",
                )}
              >
                {editValue === "true" && (
                  <CheckIcon className="h-3 w-3 text-black" />
                )}
              </div>
            </button>
          ) : fieldType === "select" ? (
            <select
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                if (isApproved) onApprove(label, e.target.value);
              }}
              className="h-9 w-full border border-white/[0.1] bg-black px-3 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 appearance-none"
            >
              <option value="">Select {label}...</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={fieldType === "date" ? "date" : "text"}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                if (isApproved) onApprove(label, e.target.value);
              }}
              placeholder={`Enter ${label.toLowerCase()}...`}
              className="h-9 w-full border border-white/[0.1] bg-black px-3 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
            />
          )}
        </div>

        {fieldType !== "checkbox" && (
          <button
            onClick={handleTick}
            disabled={!editValue.trim() || (isApproved && !isLowConfidence)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center border transition-all",
              isApproved
                ? "border-transparent bg-[color:var(--color-lime-500)] text-black"
                : "border-white/[0.1] bg-white/[0.03] text-[color:var(--text-muted)] hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-20",
            )}
          >
            <CheckIcon className="h-5 w-5" />
          </button>
        )}
      </div>
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

  const lowConfLabels = new Set(lowConfidenceFields.map((f) => f.label));
  const missingFlatLabels = missingFieldsGroups.flatMap((g) => g.fields);

  // Group fields for the "Review Required" section: ALL Mandatory fields + ALL Low Confidence fields
  const allLabels = new Set([
    ...lowConfLabels,
    ...confidentFields.map((f) => f.label),
    ...missingFlatLabels,
  ]);
  const reviewRequiredLabels = Array.from(allLabels).filter(
    (l) => isMandatoryField(l, localData) || lowConfLabels.has(l),
  );

  const allReviewed = reviewRequiredLabels.every((label) => {
    const val = getExtractedValueForLabel(label, localData);
    const fieldType = getFieldType(label);
    if (fieldType === "checkbox") return approvedFields.has(label);
    return approvedFields.has(label) && val.trim().length > 0;
  });

  const handleApproveField = (label: string, value: string) => {
    setLocalData((prev) => setFormDataValue(prev, label, value));
    setApprovedFields((prev) => {
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
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#0c0c12] shadow-[var(--brutal-shadow-lg)] border border-white/[0.1]"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5 bg-gradient-to-r from-transparent to-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center bg-indigo-light text-indigo-brand shadow-inner">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight leading-none">
                  Extraction Summary
                </h2>
                <p className="text-sm text-[color:var(--text-muted)] mt-1.5 font-medium">
                  Please validate the details before generating the invoice.
                </p>
              </div>
            </div>
            <button
              onClick={() => onContinueManually(localData)}
              className="p-2 text-[color:var(--text-secondary)] hover:text-white transition-all hover:rotate-90 duration-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scroll-smooth">
            {isNewClient && isLoggedIn && (
              <label className="flex items-start gap-4 cursor-pointer border border-cyan-500/20 bg-cyan-500/[0.03] p-5 hover:bg-cyan-500/[0.05] transition-all group">
                <input
                  type="checkbox"
                  checked={shouldSaveClient}
                  onChange={(e) => setShouldSaveClient(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500 transition-all cursor-pointer"
                />
                <div>
                  <p className="font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    New Client Detected: {localData.client.clientName}
                  </p>
                  <p className="text-xs text-cyan-500/60 mt-1 leading-relaxed font-medium">
                    Would you like to save this client to your Master Directory?
                    This happens automatically once you save the invoice.
                  </p>
                </div>
              </label>
            )}

            {/* ─── Extracted Successfully ─── */}
            {confidentFields.length > 0 && (() => {
              const successFields = confidentFields.filter(f => {
                const val = getExtractedValueForLabel(f.label, localData);
                return val && val.trim().length > 0 && !lowConfLabels.has(f.label);
              });
              if (successFields.length === 0) return null;
              return (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-brand px-1">
                    Extracted Successfully
                  </h3>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]">
                    {successFields.map((f) => {
                      const val = getExtractedValueForLabel(f.label, localData);
                      return (
                        <div key={f.label} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-[12px] text-[color:var(--text-muted)] font-medium">{f.label}</span>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[13px] text-white font-medium max-w-[220px] truncate">{val}</span>
                            <CheckIcon className="h-3.5 w-3.5 text-indigo-brand shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ─── Needs Review ─── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">
                  Needs Review
                </h3>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-500"
                      style={{
                        width: `${(approvedFields.size / (reviewRequiredLabels.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold font-mono text-cyan-500/80">
                    {approvedFields.size}/{reviewRequiredLabels.length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {reviewRequiredLabels.map((label) => (
                  <EditableRow
                    key={label}
                    label={label}
                    value={getExtractedValueForLabel(label, localData)}
                    isApproved={approvedFields.has(label)}
                    isMandatory={isMandatoryField(label, localData)}
                    isLowConfidence={lowConfLabels.has(label)}
                    onApprove={handleApproveField}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.08] bg-black/40 p-6 flex items-center justify-between gap-4">
            <button
              onClick={onParseAgain}
              className="px-5 py-2.5 text-sm font-bold text-[color:var(--text-muted)] hover:text-white transition-colors"
            >
              Parse Again
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSubmit(localData, shouldSaveClient)}
                disabled={!allReviewed}
                className={cn(
                  "px-8 py-3 text-sm font-black transition-all shadow-lg active:scale-95",
                  allReviewed
                    ? "bg-[color:var(--color-lime-500)] text-black hover:bg-[color:var(--color-lime-400)] shadow-lime-500/20"
                    : "bg-white/[0.05] text-white/20 cursor-not-allowed",
                )}
              >
                Generate Invoice
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
