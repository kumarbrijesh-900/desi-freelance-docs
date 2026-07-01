"use client";

import { useEffect, useState, useRef } from "react";
import {
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
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
        "group relative flex flex-col gap-3 rounded-[12px] border p-4 transition-colors",
        isApproved
          ? "border-[#bcd8c8] bg-acc-soft"
          : isLowConfidence
            ? "border-[color:rgba(200,148,59,0.4)] bg-[#faf4e5]"
            : "border-soft bg-paper",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[13px] font-semibold",
            isApproved
              ? "text-grass"
              : isLowConfidence
                ? "text-ochre-deep"
                : isMandatory
                  ? "text-ink"
                  : "text-ink-2",
          )}
        >
          {label} {isMandatory && <span className="text-coral">*</span>}
        </span>
        {isLowConfidence && (
          <span className="flex items-center gap-1 rounded-full border border-[color:rgba(200,148,59,0.3)] bg-[color:rgba(200,148,59,0.14)] px-2 py-0.5 text-[11px] font-semibold text-ochre-deep">
            Low confidence
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          {fieldType === "checkbox" ? (
            <button
              onClick={handleToggle}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-[10px] border px-3 text-sm transition-colors",
                editValue === "true"
                  ? "border-[#bcd8c8] bg-acc-soft text-grass"
                  : "border-soft bg-paper-2 text-ink-2",
              )}
            >
              <span className="font-semibold">
                {editValue === "true" ? "Yes" : "No"}
              </span>
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-[6px] border transition-colors",
                  editValue === "true"
                    ? "border-transparent bg-acid"
                    : "border-soft bg-paper",
                )}
              >
                {editValue === "true" && (
                  <CheckIcon className="h-3 w-3 text-acc-ink" />
                )}
              </div>
            </button>
          ) : fieldType === "select" ? (
            <div className="relative">
              <select
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  if (isApproved) onApprove(label, e.target.value);
                }}
                className="h-9 w-full appearance-none rounded-[10px] border border-soft bg-paper-2 pl-3 pr-10 text-sm text-ink outline-none focus:border-acid focus:ring-2 focus:ring-acc-soft"
              >
                <option value="">Select {label.toLowerCase()}…</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-3">
                <ChevronDownIcon className="h-4 w-4" />
              </span>
            </div>
          ) : (
            <input
              type={fieldType === "date" ? "date" : "text"}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                if (isApproved) onApprove(label, e.target.value);
              }}
              placeholder={`Enter ${label.toLowerCase()}…`}
              className="h-9 w-full rounded-[10px] border border-soft bg-paper-2 px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-acid focus:ring-2 focus:ring-acc-soft"
            />
          )}
        </div>

        {fieldType !== "checkbox" && (
          <button
            onClick={handleTick}
            disabled={!editValue.trim() || (isApproved && !isLowConfidence)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border transition-colors",
              isApproved
                ? "border-transparent bg-acid text-acc-ink"
                : "border-soft bg-paper-2 text-ink-3 hover:border-acid hover:text-acid disabled:opacity-40",
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
        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#16110c]/60 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] border border-soft bg-paper-2"
          style={{ boxShadow: "var(--shadow-chunk-lg)" }}
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#e6dcc6] px-6 py-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-acc-soft text-acid">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-[19px] font-bold leading-tight tracking-[-0.01em] text-ink">
                  Review the details
                </h2>
                <p className="mt-1 text-[13px] text-ink-2">
                  Confirm what we pulled from your brief before generating.
                </p>
              </div>
            </div>
            <button
              onClick={() => onContinueManually(localData)}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] text-ink-3 transition-colors hover:bg-[#efe6d1] hover:text-ink"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {isNewClient && isLoggedIn && (
              <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#bcd8c8] bg-acc-soft p-4">
                <input
                  type="checkbox"
                  checked={shouldSaveClient}
                  onChange={(e) => setShouldSaveClient(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-soft text-acid focus:ring-acc-soft"
                />
                <div>
                  <p className="text-[14px] font-semibold text-ink">
                    Save {localData.client.clientName} to your client directory
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">
                    Happens automatically when you generate the invoice.
                  </p>
                </div>
              </label>
            )}

            {/* ─── Extracted with confidence ─── */}
            {confidentFields.length > 0 &&
              (() => {
                const successFields = confidentFields.filter((f) => {
                  const val = getExtractedValueForLabel(f.label, localData);
                  return (
                    val && val.trim().length > 0 && !lowConfLabels.has(f.label)
                  );
                });
                if (successFields.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-0.5">
                      <span className="h-2 w-2 rounded-full bg-grass" />
                      <h3 className="text-[13px] font-semibold text-ink">
                        Extracted with confidence
                      </h3>
                    </div>
                    <div className="overflow-hidden rounded-[14px] border border-soft bg-paper">
                      {successFields.map((f, i) => {
                        const val = getExtractedValueForLabel(f.label, localData);
                        return (
                          <div
                            key={f.label}
                            className={cn(
                              "flex items-center justify-between px-4 py-2.5",
                              i > 0 && "border-t border-[#e2d8c1]",
                            )}
                          >
                            <span className="text-[13px] text-ink-2">
                              {f.label}
                            </span>
                            <div className="flex items-center gap-2.5">
                              <span className="max-w-[240px] truncate text-[13px] font-semibold text-ink">
                                {val}
                              </span>
                              <CheckIcon className="h-3.5 w-3.5 shrink-0 text-grass" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {/* ─── Needs review ─── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-0.5">
                <span className="h-2 w-2 rounded-full bg-ochre" />
                <h3 className="text-[13px] font-semibold text-ink">
                  Needs review
                </h3>
                <div className="ml-auto flex items-center gap-2.5">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e6dcc6]">
                    <div
                      className="h-full rounded-full bg-acid transition-all duration-500"
                      style={{
                        width: `${(approvedFields.size / (reviewRequiredLabels.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums text-ink-2">
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

          <div className="flex items-center justify-between gap-4 border-t border-[#e6dcc6] bg-[#f7f0df] px-6 py-4">
            <button
              onClick={onParseAgain}
              className="rounded-[10px] px-4 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-[#efe6d1] hover:text-ink"
            >
              Parse again
            </button>
            <button
              onClick={() => onSubmit(localData, shouldSaveClient)}
              disabled={!allReviewed}
              className={cn(
                "rounded-[12px] px-8 py-3 text-sm font-bold transition-all active:scale-[0.97]",
                allReviewed
                  ? "bg-acid text-acc-ink hover:bg-acid-2"
                  : "cursor-not-allowed bg-[#ece3cf] text-ink-3",
              )}
            >
              Generate invoice
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
