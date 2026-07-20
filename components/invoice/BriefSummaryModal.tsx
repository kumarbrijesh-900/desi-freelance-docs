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
import type { InvoiceFormData, InvoiceStepperStep, InvoiceLineItem } from "@/types/invoice";
import { cn } from "@/lib/ui-foundation";
import type { BriefAutofillFieldSummary } from "@/lib/invoice-brief-intake";
import type {
  NormalizedBriefMilestone,
  BriefParserProvider,
} from "@/lib/brief-parser-gateway";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  INTERNATIONAL_CURRENCY_OPTIONS,
} from "@/lib/international-billing-options";

const formatConfidentValue = (label: string, value: string) => {
  const l = label.toLowerCase();
  const v = value.trim();
  if (l.includes("gst registration")) {
    if (v === "true") return "Registered";
    if (v === "false") return "Not registered";
  }
  if (l.includes("settlement")) {
    if (v.toLowerCase() === "inr") return "Domestic (INR)";
    if (v.toLowerCase() === "forex") return "International (forex)";
  }
  if (v === "true") return "Yes";
  if (v === "false") return "No";
  return value;
};

const PROVIDER_LABELS: Record<BriefParserProvider, string> = {
  "gemini-flash": "Gemini Flash",
  "groq-llama": "Groq Llama",
  grok: "Grok",
};

interface BriefSummaryModalProps {
  isOpen: boolean;
  extractedData: InvoiceFormData;
  lowConfidenceFields: BriefAutofillFieldSummary[];
  confidentFields: BriefAutofillFieldSummary[];
  missingFieldsGroups: { step: InvoiceStepperStep; fields: string[] }[];
  isNewClient: boolean;
  isLoggedIn: boolean;
  parsedMilestones: NormalizedBriefMilestone[];
  providerUsed: BriefParserProvider | null;
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
  if (
    l.includes("agency registered") ||
    l.includes("gst status") ||
    l.includes("gst registration")
  )
    return String(data.agency.gstRegistrationStatus === "registered");
  if (l.includes("gstin") && !l.includes("client"))
    return data.agency.gstin || "";
  if (l.includes("pan")) return data.agency.pan || "";
  if (l.includes("agency address line 2")) return data.agency.addressLine2 || "";
  if (l.includes("agency city")) return data.agency.city || "";
  if (
    l.includes("agency") &&
    (l.includes("pin") || l.includes("postal") || l.includes("zip"))
  )
    return data.agency.pinCode || "";
  if (
    l.includes("agency address") ||
    (l.includes("address") && !l.includes("client") && !l.includes("bank"))
  )
    return data.agency.addressLine1 || data.agency.address || "";

  if (l.includes("client name")) return data.client.clientName;
  if (l.includes("client address line 2"))
    return data.client.clientAddressLine2 || "";
  if (l.includes("client city")) return data.client.clientCity || "";
  if (
    l.includes("client") &&
    (l.includes("pin") || l.includes("postal") || l.includes("zip"))
  )
    return data.client.clientPinCode || "";
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

  if (l.includes("email")) return data.client.clientEmail || "";
  if (l.includes("location")) return data.client.clientLocation || "";
  if (l.includes("sez")) return data.client.isClientSezUnit || "";
  if (l.includes("lut")) return data.agency.lutNumber || "";
  if (l.includes("settlement"))
    return data.payment.paymentSettlementType || "";
  if (l.includes("license type")) return data.payment.license.licenseType || "";
  if (l.includes("license duration"))
    return data.payment.license.licenseDuration || "";
  if (l.includes("license"))
    return String(data.payment.license.isLicenseIncluded);

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
  if (
    l.includes("gst status") ||
    l.includes("registered") ||
    l.includes("gst registration")
  )
    next.agency.gstRegistrationStatus =
      value === "true" ? "registered" : "not-registered";
  if (l.includes("gstin") && !l.includes("client")) next.agency.gstin = value;
  if (l.includes("pan")) next.agency.pan = value;
  if (l.includes("agency address line 2")) next.agency.addressLine2 = value;
  if (l.includes("agency city")) next.agency.city = value;
  if (
    l.includes("agency") &&
    (l.includes("pin") || l.includes("postal") || l.includes("zip"))
  )
    next.agency.pinCode = value;
  if (l.includes("agency address") && !l.includes("line 2"))
    next.agency.addressLine1 = value;

  if (l.includes("client name")) next.client.clientName = value;
  if (l.includes("client address line 2"))
    next.client.clientAddressLine2 = value;
  if (l.includes("client city")) next.client.clientCity = value;
  if (
    l.includes("client") &&
    (l.includes("pin") || l.includes("postal") || l.includes("zip"))
  )
    next.client.clientPinCode = value;
  if (l.includes("client address") && !l.includes("line 2"))
    next.client.clientAddressLine1 = value;
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

  if (l.includes("email")) next.client.clientEmail = value;
  if (l.includes("location")) next.client.clientLocation = value as any;
  if (l.includes("sez")) next.client.isClientSezUnit = value as any;
  if (l.includes("lut")) next.agency.lutNumber = value;
  if (l.includes("settlement"))
    next.payment.paymentSettlementType = value as any;
  if (l.includes("license type")) {
    next.payment.license.licenseType = value as any;
  } else if (l.includes("license duration")) {
    next.payment.license.licenseDuration = value;
  } else if (l.includes("license")) {
    next.payment.license.isLicenseIncluded = value === "true";
  }

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
  parsedMilestones,
  providerUsed,
  onContinueManually,
  onParseAgain,
  onSubmit,
}: BriefSummaryModalProps) {
  const [localData, setLocalData] = useState<InvoiceFormData>(extractedData);
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set());
  const [shouldSaveClient, setShouldSaveClient] = useState(true);
  const [roleResolved, setRoleResolved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalData(extractedData);
      setApprovedFields(new Set());
      setShouldSaveClient(true);
      setRoleResolved(false);
    }
  }, [isOpen, extractedData]);

  if (!isOpen) return null;

  const lowConfLabels = new Set(lowConfidenceFields.map((f) => f.label));
  const missingFlatLabels = missingFieldsGroups.flatMap((g) => g.fields);

  const isDeliverableLabel = (label: string) => {
    const l = label.toLowerCase();
    return (
      l.includes("description") ||
      l.includes("deliverable") ||
      l.includes("rate") ||
      l.includes("quantity") ||
      l.includes("qty") ||
      l.includes("unit") ||
      l.includes("sac")
    );
  };

  const allLabels = new Set([
    ...lowConfLabels,
    ...confidentFields.map((f) => f.label),
    ...missingFlatLabels,
  ]);
  const confidentLabels = new Set(confidentFields.map((f) => f.label));
  const upiVpaPresent = /^[a-z0-9._-]+@[a-z][a-z0-9]{1,}$/i.test(
    (localData.payment?.accountName ?? "").trim(),
  );
  const isBankRailLabel = (l: string) =>
    ["bank name", "account number", "ifsc"].some((k) =>
      l.toLowerCase().includes(k),
    );
  const reviewRequiredLabels = Array.from(allLabels).filter(
    (l) =>
      (isMandatoryField(l, localData) || lowConfLabels.has(l)) &&
      !isDeliverableLabel(l) &&
      !(upiVpaPresent && isBankRailLabel(l)) &&
      (lowConfLabels.has(l) ||
        !confidentLabels.has(l) ||
        getExtractedValueForLabel(l, localData).trim().length === 0),
  );

  const pendingReviewCount = reviewRequiredLabels.filter((label) => {
    const fieldType = getFieldType(label);
    if (fieldType === "checkbox") return !approvedFields.has(label);
    return getExtractedValueForLabel(label, localData).trim().length === 0;
  }).length;

  const handleApproveField = (label: string, value: string) => {
    setLocalData((prev) => setFormDataValue(prev, label, value));
    setApprovedFields((prev) => {
      const next = new Set(prev);
      next.add(label);
      return next;
    });
  };

  // Who's the client? — ambiguous agency/client role assignment
  const agencyNameVal = localData.agency.agencyName.trim();
  const clientNameVal = localData.client.clientName.trim();
  const namesDistinct =
    agencyNameVal.length > 0 &&
    clientNameVal.length > 0 &&
    agencyNameVal.toLowerCase() !== clientNameVal.toLowerCase();
  const nameConfidenceWeak = lowConfidenceFields.some((f) => {
    const l = f.label.toLowerCase();
    return (
      l.includes("agency name") ||
      l.includes("client name") ||
      l.includes("business name")
    );
  });
  const showRoleQuestion = namesDistinct && nameConfidenceWeak && !roleResolved;

  const chooseClient = (clientChoice: string, agencyChoice: string) => {
    setLocalData((prev) => ({
      ...prev,
      agency: { ...prev.agency, agencyName: agencyChoice },
      client: { ...prev.client, clientName: clientChoice },
    }));
    setRoleResolved(true);
  };

  // Items — detailed, editable
  const displayItems = (localData.lineItems ?? []).filter(
    (it) => !it.is_milestone_header,
  );
  const currencyCode = (localData.client.clientCurrency || "INR").toUpperCase();
  const formatMoney = (n: number) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(n || 0);
    } catch {
      return currencyCode + " " + new Intl.NumberFormat("en-IN").format(n || 0);
    }
  };
  const updateLineItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    setLocalData((prev) => ({
      ...prev,
      lineItems: (prev.lineItems ?? []).map((it, i) =>
        i === index ? { ...it, ...patch } : it,
      ),
    }));
  };
  const itemsSubtotal = displayItems.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0),
    0,
  );
  const labelMatches = (needles: string[]) =>
    lowConfidenceFields.some((f) => {
      const l = f.label.toLowerCase();
      return needles.some((n) => l.includes(n));
    });
  const primaryDescLow =
    displayItems.length > 0 && labelMatches(["description", "deliverable"]);
  const primaryQtyLow =
    displayItems.length > 0 && labelMatches(["quantity", "qty"]);
  const primaryRateLow =
    displayItems.length > 0 &&
    lowConfidenceFields.some((f) => {
      const l = f.label.toLowerCase();
      return l.includes("rate") && !l.includes("unit");
    });
  const anyItemFieldLow = primaryDescLow || primaryQtyLow || primaryRateLow;
  const prettyUnit = (u: string) => (u || "").replace(/-/g, " ");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#16110c]/60 p-4"
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
                  Confirm what we pulled from your brief before applying.
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
            {showRoleQuestion && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="h-2 w-2 rounded-full bg-gold" />
                  <h3 className="text-[13px] font-semibold text-ink">
                    Who&apos;s the client?
                  </h3>
                </div>
                <div
                  className="rounded-[14px] border p-4"
                  style={{
                    background: "rgba(202,161,78,0.12)",
                    borderColor: "rgba(202,161,78,0.4)",
                  }}
                >
                  <p className="mb-3.5 text-[13px] leading-relaxed text-ink-2">
                    We found two names but couldn&apos;t tell which is which.
                    Pick the one you&apos;re billing.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => chooseClient(clientNameVal, agencyNameVal)}
                      className="flex-1 basis-[180px] rounded-[12px] border border-soft bg-paper-2 px-4 py-3 text-left transition hover:border-acid hover:bg-paper active:scale-[0.98]"
                    >
                      <span className="block text-[11px] tracking-wide text-ink-3">
                        Client
                      </span>
                      <span className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">
                        {clientNameVal}
                      </span>
                    </button>
                    <button
                      onClick={() => chooseClient(agencyNameVal, clientNameVal)}
                      className="flex-1 basis-[180px] rounded-[12px] border border-soft bg-paper-2 px-4 py-3 text-left transition hover:border-acid hover:bg-paper active:scale-[0.98]"
                    >
                      <span className="block text-[11px] tracking-wide text-ink-3">
                        Client
                      </span>
                      <span className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">
                        {agencyNameVal}
                      </span>
                    </button>
                  </div>
                  <p className="mt-3 text-[12px] text-ink-3">
                    Whichever you pick becomes the client — the other is saved as
                    you (the agency).
                  </p>
                </div>
              </div>
            )}

            {displayItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="h-2 w-2 rounded-full bg-ink-2" />
                  <h3 className="text-[13px] font-semibold text-ink">Items</h3>
                  <span className="ml-auto text-[12px] tabular-nums text-ink-3">
                    {displayItems.length}{" "}
                    {displayItems.length === 1 ? "deliverable" : "deliverables"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {displayItems.map((item, i) => {
                    const amount =
                      (Number(item.qty) || 0) * (Number(item.rate) || 0);
                    return (
                      <div
                        key={item.id ?? i}
                        className="rounded-[14px] border border-soft bg-paper p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          {item.type ? (
                            <span className="rounded-full bg-acc-soft px-2.5 py-1 text-[12px] font-semibold text-acid">
                              {item.type}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="font-display text-[16px] font-bold tabular-nums text-ink">
                            {formatMoney(amount)}
                          </span>
                        </div>
                        <input
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(i, { description: e.target.value })
                          }
                          placeholder="Describe this deliverable…"
                          className={cn(
                            "mb-3 h-9 w-full rounded-[10px] border bg-paper-2 px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-acid focus:ring-2 focus:ring-acc-soft",
                            i === 0 && primaryDescLow
                              ? "border-[color:rgba(200,148,59,0.5)]"
                              : "border-soft",
                          )}
                        />
                        <div className="grid grid-cols-3 gap-2.5">
                          <label className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-[11px] text-ink-3">
                              Qty
                              {i === 0 && primaryQtyLow && (
                                <span className="h-1.5 w-1.5 rounded-full bg-ochre" />
                              )}
                            </span>
                            <input
                              type="number"
                              value={String(item.qty ?? "")}
                              onChange={(e) =>
                                updateLineItem(i, { qty: e.target.value })
                              }
                              className={cn(
                                "h-9 w-full rounded-[10px] border bg-paper-2 px-2.5 text-sm tabular-nums text-ink outline-none focus:border-acid focus:ring-2 focus:ring-acc-soft",
                                i === 0 && primaryQtyLow
                                  ? "border-[color:rgba(200,148,59,0.5)]"
                                  : "border-soft",
                              )}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-[11px] text-ink-3">
                              Rate
                              {i === 0 && primaryRateLow && (
                                <span className="h-1.5 w-1.5 rounded-full bg-ochre" />
                              )}
                            </span>
                            <input
                              type="number"
                              value={String(item.rate ?? "")}
                              onChange={(e) =>
                                updateLineItem(i, { rate: e.target.value })
                              }
                              className={cn(
                                "h-9 w-full rounded-[10px] border bg-paper-2 px-2.5 text-sm tabular-nums text-ink outline-none focus:border-acid focus:ring-2 focus:ring-acc-soft",
                                i === 0 && primaryRateLow
                                  ? "border-[color:rgba(200,148,59,0.5)]"
                                  : "border-soft",
                              )}
                            />
                          </label>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-ink-3">Unit</span>
                            <div className="flex h-9 items-center rounded-[10px] border border-soft bg-paper px-2.5 text-sm text-ink-2">
                              {item.rateUnit ? prettyUnit(item.rateUnit) : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-[#e6dcc6] px-1 pt-3">
                  <span className="text-[13px] text-ink-2">Subtotal</span>
                  <span className="font-display text-[17px] font-bold tabular-nums text-ink">
                    {formatMoney(itemsSubtotal)}
                  </span>
                </div>

                {anyItemFieldLow && (
                  <p className="flex items-start gap-2 px-1 text-[12px] text-ink-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ochre" />
                    We couldn&apos;t read the flagged fields cleanly —
                    double-check them. GST is added at the next step.
                  </p>
                )}
              </div>
            )}

            {parsedMilestones.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--color-gold)]" />
                  <h3 className="text-[13px] font-semibold text-ink">
                    Payment schedule
                  </h3>
                  <span className="ml-auto text-[12px] tabular-nums text-ink-3">
                    {parsedMilestones.length}{" "}
                    {parsedMilestones.length === 1 ? "milestone" : "milestones"}
                  </span>
                </div>
                <div className="overflow-hidden rounded-[14px] border border-soft bg-paper">
                  {parsedMilestones.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-2.5",
                        i > 0 && "border-t border-[#e2d8c1]",
                      )}
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-ink">
                          {m.title?.trim() || `Milestone ${i + 1}`}
                        </span>
                        {(m.condition || m.date) && (
                          <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                            {[m.condition, m.date].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {m.percent != null && (
                          <span className="rounded-full bg-[#efe6d1] px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink-2">
                            {m.percent}%
                          </span>
                        )}
                        {m.amount != null && (
                          <span className="text-[13px] font-semibold tabular-nums text-ink">
                            {formatMoney(m.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="px-0.5 text-[12px] text-ink-3">
                  Shown for reference — milestones aren&apos;t applied to the
                  invoice yet.
                </p>
              </div>
            )}

            {confidentFields.length > 0 &&
              (() => {
                const successFields = confidentFields.filter((f) => {
                  const val = getExtractedValueForLabel(f.label, localData);
                  return (
                    val &&
                    val.trim().length > 0 &&
                    !lowConfLabels.has(f.label) &&
                    !isDeliverableLabel(f.label)
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
                        const val = formatConfidentValue(
                          f.label,
                          getExtractedValueForLabel(f.label, localData),
                        );
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

            {reviewRequiredLabels.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="h-2 w-2 rounded-full bg-ochre" />
                  <h3 className="text-[13px] font-semibold text-ink">
                    Needs your input
                  </h3>
                  <div className="ml-auto flex items-center gap-2.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e6dcc6]">
                      <div
                        className="h-full rounded-full bg-acid transition-all duration-500"
                        style={{
                          width: `${((reviewRequiredLabels.length - pendingReviewCount) / (reviewRequiredLabels.length || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums text-ink-2">
                      {reviewRequiredLabels.length - pendingReviewCount}/
                      {reviewRequiredLabels.length}
                    </span>
                  </div>
                </div>
                <p className="px-0.5 text-[12px] text-ink-3">
                  Only what the brief left blank — nothing above is repeated here.
                </p>
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
            )}

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
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#e6dcc6] bg-[#f7f0df] px-6 py-4">
            <div className="flex flex-col items-start gap-1">
              <button
                onClick={onParseAgain}
                className="rounded-[10px] px-4 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-[#efe6d1] hover:text-ink"
              >
                Parse again
              </button>
              {providerUsed && (
                <p className="px-1 text-[11px] font-medium text-ink-3">
                  Parsed by {PROVIDER_LABELS[providerUsed]}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => onSubmit(localData, shouldSaveClient)}
                className="rounded-[12px] bg-acid px-8 py-3 text-sm font-bold text-acc-ink transition-all hover:bg-acid-2 active:scale-[0.97]"
              >
                Apply to invoice
              </button>
              {pendingReviewCount > 0 && (
                <p className="text-[11px] font-medium text-[color:var(--color-ochre-deep)]">
                  {pendingReviewCount} left — you can finish them in the editor
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
