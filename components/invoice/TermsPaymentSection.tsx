"use client";

import { useEffect, useState } from "react";
import type { PaymentDetails, InvoiceMeta, LicenseType } from "@/types/invoice";
import UploadToast from "@/components/ui/UploadToast";
import ChoiceCards from "@/components/ui/ChoiceCards";

import {
  appFieldErrorTextClass,
  appFieldHelperTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppFieldClass,
  getAppPanelClass,
} from "@/lib/ui-foundation";
import {
  appFieldFullWidthStackClass,
  appFieldPairGridClass,
} from "@/lib/form-foundation";
import { Link, Sparkles, AlertTriangle, ShieldCheck, FileEdit, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, getDaysDifference } from "@/lib/date-math";

interface TermsPaymentSectionProps {
  value: PaymentDetails;
  meta: InvoiceMeta;
  clientLocation: "domestic" | "international";
  onChange: (value: PaymentDetails) => void;
  onMetaChange: (value: InvoiceMeta) => void;
  embedded?: boolean;
  paymentTermsError?: string;
  errors?: {
    licenseDuration?: string;
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankAddress?: string;
    swiftBicCode?: string;
  };
  showAllErrors?: boolean;
  autoFilledFields?: Set<string>;
  onFieldManualEdit?: (fieldPath: string) => void;
  selectedClientMsa?: import("@/lib/supabase/clients").SavedClient | null;
  client: import("@/types/invoice").ClientDetails;
  agency: import("@/types/invoice").AgencyDetails;
}

type StructuredBankAddressFields = {
  line1: string;
  line2: string;
  cityRegion: string;
  postalCode: string;
  country: string;
};

function parseStructuredBankAddress(bankAddress: string): StructuredBankAddressFields {
  const normalized = bankAddress.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return { line1: "", line2: "", cityRegion: "", postalCode: "", country: "" };
  const lines = normalized.split("\n");
  if (lines.length > 5) return { line1: normalized, line2: "", cityRegion: "", postalCode: "", country: "" };
  return {
    line1: lines[0]?.trim() ?? "",
    line2: lines[1]?.trim() ?? "",
    cityRegion: lines[2]?.trim() ?? "",
    postalCode: lines[3]?.trim() ?? "",
    country: lines[4]?.trim() ?? "",
  };
}

function composeStructuredBankAddress(fields: StructuredBankAddressFields) {
  const parts = [fields.line1, fields.line2, fields.cityRegion, fields.postalCode, fields.country];
  let lastNonEmptyIndex = -1;
  parts.forEach((part, index) => { if (part.trim()) lastNonEmptyIndex = index; });
  if (lastNonEmptyIndex === -1) return "";
  return parts.slice(0, lastNonEmptyIndex + 1).map((part) => part.trim()).join("\n");
}

function getLicenseExplanation(licenseType: LicenseType | ""): string {
  switch (licenseType) {
    case "full-assignment": return "Full assignment transfers ownership of the final work to the client once the agreed conditions are met.";
    case "exclusive-license": return "Exclusive license gives the client sole usage rights for the agreed purpose and duration while you retain ownership.";
    case "non-exclusive-license": return "Non-exclusive license lets the client use the work while you keep ownership and can reuse it elsewhere.";
    default: return "Use this only when the invoice includes usage rights or ownership terms.";
  }
}

export default function TermsPaymentSection({
  value,
  meta,
  clientLocation,
  onChange,
  onMetaChange,
  embedded = false,
  paymentTermsError,
  errors,
  showAllErrors = false,
  selectedClientMsa,
  client,
  agency,
  autoFilledFields = new Set(),
  onFieldManualEdit = () => {},
}: TermsPaymentSectionProps) {
  const getInputStateClass = (fieldPath: string, fieldValue: string | number) => {
    if (typeof fieldValue === "string" && !fieldValue.trim()) return "";
    if (autoFilledFields.has(fieldPath)) return "input-autofilled";
    return "input-manual";
  };
  const [isQrDragOver, setIsQrDragOver] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [bankAddressFields, setBankAddressFields] = useState<StructuredBankAddressFields>(() => parseStructuredBankAddress(value.bankAddress));

  useEffect(() => {
    if (!showToast) return;
    const timer = window.setTimeout(() => setShowToast(false), 2200);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  useEffect(() => { setBankAddressFields(parseStructuredBankAddress(value.bankAddress)); }, [value.bankAddress]);

  const updateField = <K extends keyof PaymentDetails>(key: K, fieldValue: PaymentDetails[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const updateMetaField = <K extends keyof InvoiceMeta>(key: K, fieldValue: InvoiceMeta[K]) => {
    onMetaChange({ ...meta, [key]: fieldValue });
  };

  const updateLicenseField = <K extends keyof PaymentDetails["license"]>(key: K, fieldValue: PaymentDetails["license"][K]) => {
    onChange({ ...value, license: { ...value.license, [key]: fieldValue } });
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(false);
    requestAnimationFrame(() => setShowToast(true));
  };

  const readQrFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => { updateField("qrCodeUrl", String(reader.result)); triggerToast("QR uploaded"); };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    readQrFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleQrDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsQrDragOver(false);
    readQrFile(event.dataTransfer.files?.[0]);
  };

  const removeQr = () => updateField("qrCodeUrl", "");

  const markTouched = (field: string) => setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  const getVisibleError = (field: string, error?: string) => showAllErrors || touchedFields[field] ? error : undefined;

  const updateBankAddressField = (key: keyof StructuredBankAddressFields, fieldValue: string) => {
    const nextAddressFields = { ...bankAddressFields, [key]: fieldValue };
    setBankAddressFields(nextAddressFields);
    updateField("bankAddress", composeStructuredBankAddress(nextAddressFields));
  };

  const licenseExplanation = getLicenseExplanation(value.license.licenseType);
  const showLicenseFields = value.license.isLicenseIncluded;
  const showLicenseDuration = value.license.licenseType === "exclusive-license" || value.license.licenseType === "non-exclusive-license";
  const isInternational = clientLocation === "international";

  const inputClass = (hasError?: string, hasValue?: boolean, multiline = false) => getAppFieldClass({ hasError, hasValue, multiline });
  const paymentTermsFieldError = getVisibleError("paymentTerms", paymentTermsError);
  const licenseDurationError = getVisibleError("licenseDuration", errors?.licenseDuration);
  const accountNameError = getVisibleError("accountName", errors?.accountName);
  const bankNameError = getVisibleError("bankName", errors?.bankName);
  const accountNumberError = getVisibleError("accountNumber", errors?.accountNumber);
  const ifscCodeError = getVisibleError("ifscCode", errors?.ifscCode);
  const bankAddressError = getVisibleError("bankAddress", errors?.bankAddress);
  const swiftBicCodeError = getVisibleError("swiftBicCode", errors?.swiftBicCode);

  const isAddendumMode = meta.hasAddendum;
  const isReadOnly = !isAddendumMode;

  // Derive effective MSA data from local form state (Step 2) or DB (persisted client)
  const effectiveMsaDays = selectedClientMsa?.msa_payment_terms_days ?? agency.msaPaymentTermsDays ?? client.msaPaymentTermsDays;
  const effectiveBoilerplate = selectedClientMsa?.msa_notes_boilerplate ?? agency.msaNotesBoilerplate ?? client.msaNotesBoilerplate ?? "";
  const hasClientMsa = Boolean(selectedClientMsa);
  const hasGlobalMsa = Boolean(agency.msaPaymentTermsDays || agency.msaNotesBoilerplate);
  const hasAnyMsaAuthority = hasClientMsa || hasGlobalMsa;
  const msaSourceLabel = hasClientMsa ? "CLIENT AGREEMENT ✓" : "GLOBAL TERMS APPLIED ✓";
  const msaDetailLabel = hasClientMsa ? "Using specific client agreement." : "Using your global agency defaults.";

  // Two-way sync handlers for payment terms and due date
  const handleDaysChange = (days: number) => {
    const anchorDate = meta.invoiceDate || new Date().toISOString().split("T")[0];
    const newDueDate = addDays(anchorDate, days);
    onMetaChange({
      ...meta,
      paymentTerms: days,
      dueDate: newDueDate,
    });
  };

  const handleDateChange = (date: string) => {
    const anchorDate = meta.invoiceDate || new Date().toISOString().split("T")[0];
    const days = getDaysDifference(anchorDate, date);
    onMetaChange({
      ...meta,
      paymentTerms: days,
      dueDate: date,
    });
  };

  const getMsaLicenseType = (trigger?: string): LicenseType | "" => {
    if (!trigger) return "";
    if (trigger === "upon_full_payment") return "full-assignment";
    if (trigger === "retained_by_creator") return "exclusive-license";
    return "";
  };
  const msaLicenseType = getMsaLicenseType(selectedClientMsa?.msa_ip_trigger_type);

  // LIFECYCLE SYNC: Ensure MSA data populates on mount and stays synced while in "Use Master Agreement" mode.
  useEffect(() => {
    if (!isAddendumMode && hasAnyMsaAuthority) {
      const targetDays = effectiveMsaDays ?? 0;
      const targetBoilerplate = effectiveBoilerplate || "";

      // Check if we already match to avoid redundant updates
      const isAlreadySynced = 
        meta.paymentTerms === targetDays && 
        (value.terms === targetBoilerplate || value.notes === targetBoilerplate) &&
        value.license.licenseType === msaLicenseType;

      if (!isAlreadySynced) {
        onMetaChange({
          ...meta,
          paymentTerms: targetDays,
          dueDate: addDays(meta.invoiceDate || new Date().toISOString().split("T")[0], targetDays)
        });
        updateField("terms", targetBoilerplate);
        updateLicenseField("isLicenseIncluded", Boolean(msaLicenseType));
        updateLicenseField("licenseType", msaLicenseType);
      }
    }
  }, [isAddendumMode, hasAnyMsaAuthority, effectiveMsaDays, effectiveBoilerplate, msaLicenseType]);


  return (
    <>
      <UploadToast message={toastMessage} visible={showToast} />

      <section className={cn(embedded ? "rounded-none border-0 bg-transparent p-0 shadow-none" : getAppPanelClass())}>
        {!embedded && (
          <div className="mb-8 space-y-2">
            <h2 className={appSectionTitleClass}>Payment</h2>
            <p className={appSectionDescriptionClass}>Add payment and bank details.</p>
          </div>
        )}

        <div className="space-y-10">
          {/* Section: Payment & Contract Terms */}
          <div className="space-y-6">
            <div>
              <div className="mb-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                  Payment & Contract Terms
                </h3>
                <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
              </div>

              {/* Authority Status Bar */}
              <div className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-300 mb-6",
                isAddendumMode 
                  ? "bg-amber-50 border-amber-200 ring-1 ring-amber-500/5" 
                  : "bg-[color:var(--bg-surface-soft)] border-[color:var(--border-subtle)]"
              )}>
                <div className="flex items-center gap-3">
                  {isAddendumMode ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <FileEdit size={16} />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <ShieldCheck size={16} />
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-bold text-[color:var(--text-primary)]">
                      {isAddendumMode ? "Project Override Active" : msaSourceLabel}
                    </p>
                    <p className="text-[11px] text-[color:var(--text-muted)]">
                      {isAddendumMode ? "Terms applied only to this invoice." : msaDetailLabel}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextHasAddendum = !isAddendumMode;
                    updateMetaField("hasAddendum", nextHasAddendum);
                    
                    if (!nextHasAddendum && hasAnyMsaAuthority) {
                      onMetaChange({
                        ...meta,
                        hasAddendum: false,
                        paymentTerms: effectiveMsaDays ?? 0,
                        dueDate: addDays(meta.invoiceDate || new Date().toISOString().split("T")[0], effectiveMsaDays ?? 0)
                      });
                      updateField("terms", effectiveBoilerplate);
                      updateLicenseField("isLicenseIncluded", Boolean(msaLicenseType));
                      updateLicenseField("licenseType", msaLicenseType);
                    }
                  }}
                  className="text-[11px] font-bold text-[#4F46E5] hover:underline bg-white px-3 py-1.5 rounded-lg border border-[#4F46E5]/20 shadow-sm"
                >
                  {isAddendumMode ? "Revert to MSA" : "Override Terms"}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {isInternational && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <label className={appFieldLabelClass}>Settlement Type</label>
                      <div className={cn(
                        "inline-flex max-w-full flex-wrap gap-1 rounded-[12px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-1",
                        isReadOnly && "opacity-60 cursor-not-allowed pointer-events-none"
                      )}>
                        {[
                          { value: "forex", label: "Forex" },
                          { value: "inr", label: "INR" },
                          { value: "unknown", label: "Not sure" },
                        ].map((option) => {
                          const isSelected = value.paymentSettlementType === option.value;
                          return (
                            <label key={option.value} className="block cursor-pointer">
                              <input
                                type="radio"
                                name="payment-settlement-type"
                                value={option.value}
                                checked={value.paymentSettlementType === option.value}
                                onChange={() => updateField("paymentSettlementType", option.value as any)}
                                disabled={isReadOnly}
                                className="sr-only"
                              />
                              <span className={cn("flex min-h-[34px] items-center justify-center rounded-[9px] border px-3 py-1 text-[12px] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,box-shadow] duration-[var(--app-duration-fast)]", isSelected ? "app-soft-choice-option-active text-[color:var(--text-primary)]" : "app-soft-choice-option text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]")}>
                                {option.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={cn("grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end", isReadOnly && "opacity-70")}>
                <div className="flex flex-col gap-2">
                  <label className={appFieldLabelClass}>
                    <span className="flex items-center gap-1.5">
                      {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                      Days until payment
                    </span>
                    {autoFilledFields.has("meta.paymentTerms") && (
                      <span className="autofill-indicator">auto-filled</span>
                    )}
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 15, 30, 45, 60].map((days) => (
                      <button
                        key={days}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handleDaysChange(days)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all",
                          meta.paymentTerms === days
                            ? "bg-[#111] border-[#111] text-white shadow-sm"
                            : "bg-white border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:border-[color:var(--text-soft)]",
                          isReadOnly && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {days === 0 ? "Receipt" : `Net ${days}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative min-w-[120px]">
                  <input
                    type="number"
                    readOnly={isReadOnly}
                    tabIndex={isReadOnly ? -1 : 0}
                    value={meta.paymentTerms}
                    onChange={(e) => {
                      onFieldManualEdit("meta.paymentTerms");
                      handleDaysChange(parseInt(e.target.value, 10) || 0);
                    }}
                    onBlur={() => markTouched("paymentTerms")}
                    placeholder="15"
                    className={cn(
                      inputClass(paymentTermsFieldError, true),
                      !isReadOnly && getInputStateClass("meta.paymentTerms", meta.paymentTerms),
                      isReadOnly && "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100 shadow-none",
                      "pr-12 text-right sm:text-left",
                    )}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-[12px] font-medium text-[color:var(--text-soft)]">Days</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className={cn(appFieldHelperTextClass, "text-[10px]")}>
                  {meta.paymentTerms === 0 
                    ? "Payment expected as soon as client receives invoice." 
                    : `Calculated as ${meta.paymentTerms} days after issue date.`}
                </p>
                {isReadOnly && (
                  <button 
                    type="button"
                    onClick={() => updateMetaField("hasAddendum", true)}
                    className="text-[10px] font-bold text-[#4F46E5] hover:underline"
                  >
                    Override to edit →
                  </button>
                )}
              </div>
              {paymentTermsFieldError && <p className={appFieldErrorTextClass}>{paymentTermsFieldError}</p>}

                <div className={cn("flex flex-col gap-1.5", isReadOnly && "opacity-70")}>
                  <label className={appFieldLabelClass}>
                    <span className="flex items-center gap-1.5">
                      {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                      Due Date
                    </span>
                    {autoFilledFields.has("meta.dueDate") && (
                      <span className="autofill-indicator">auto-filled</span>
                    )}
                  </label>
                  <input
                    type="date"
                    readOnly={isReadOnly}
                    tabIndex={isReadOnly ? -1 : 0}
                    value={meta.dueDate}
                    onChange={(e) => {
                      onFieldManualEdit("meta.dueDate");
                      handleDateChange(e.target.value);
                    }}
                    className={cn(
                      inputClass(undefined, Boolean(meta.dueDate)),
                      !isReadOnly && getInputStateClass("meta.dueDate", meta.dueDate),
                      isReadOnly && "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200 shadow-none",
                    )}
                  />
                  <p className={cn(appFieldHelperTextClass, "text-[10px]")}>Exact calendar deadline.</p>
                </div>

              <div className={cn("flex flex-col gap-1.5", isReadOnly && "opacity-70")}>
                <label className={appFieldLabelClass}>
                  <span className="flex items-center gap-1.5">
                    {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                    Terms / Notes
                  </span>
                  {autoFilledFields.has("payment.terms") && (
                    <span className="autofill-indicator">auto-filled</span>
                  )}
                </label>
                <textarea
                  readOnly={isReadOnly}
                  tabIndex={isReadOnly ? -1 : 0}
                  suppressHydrationWarning
                  rows={3}
                  value={value.terms || value.notes}
                  onChange={(e) => {
                    onFieldManualEdit("payment.terms");
                    updateField("terms", e.target.value);
                  }}
                  placeholder="Example: 1.5% monthly late fee applies. Final files delivered after full payment."
                  className={cn(
                    inputClass(undefined, Boolean(value.terms || value.notes), true),
                    !isReadOnly && getInputStateClass("payment.terms", value.terms || value.notes),
                    isReadOnly && "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200 shadow-none",
                    "min-h-[80px]",
                  )}
                />
              </div>
            </div>
          </div>

          {/* Section C: Licensing */}
          <div>
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Licensing
              </h3>
              <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
            </div>

            <div className="space-y-6">
              <div className={cn("flex flex-col gap-1.5", isReadOnly && "opacity-70")}>
                <label className={appFieldLabelClass}>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1.5">
                      {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                      License Included?
                    </span>
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[10px] text-gray-400 cursor-help shrink-0"
                      title="Whether the client receives intellectual property rights to the delivered work. Full Assignment = complete ownership transfer."
                    >
                      ?
                    </span>
                  </div>
                </label>
                <div className={cn("inline-flex rounded-lg border border-[color:var(--border-subtle)] overflow-hidden", isReadOnly && "opacity-60 pointer-events-none")}>
                  <button
                    type="button"
                    onClick={() => {
                      updateLicenseField("isLicenseIncluded", true);
                    }}
                    className={cn(
                      "px-6 py-1.5 text-[13px] font-medium transition-colors",
                      value.license.isLicenseIncluded
                        ? "bg-[#111] text-white"
                        : "bg-white text-[color:var(--text-muted)] hover:bg-gray-50"
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...value, license: { isLicenseIncluded: false, licenseType: "", licenseDuration: "" } });
                    }}
                    className={cn(
                      "px-6 py-1.5 text-[13px] font-medium transition-colors",
                      !value.license.isLicenseIncluded
                        ? "bg-[#111] text-white"
                        : "bg-white text-[color:var(--text-muted)] hover:bg-gray-50"
                    )}
                  >
                    No
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showLicenseFields && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-6 pt-2">
                      <div className={cn("space-y-1.5", isReadOnly && "opacity-70")}>
                        <label className={appFieldLabelClass}>
                          <span className="flex items-center gap-1.5">
                            {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                            License Type *
                          </span>
                        </label>
                        <div className={isReadOnly ? "opacity-60 pointer-events-none" : ""}>
                          <ChoiceCards 
                            name="license-type" 
                            value={value.license.licenseType} 
                            disabled={isReadOnly}
                            onChange={(nextValue) => updateLicenseField("licenseType", nextValue as any)} 
                            variant="inline" 
                            options={[{ label: "Full assignment", value: "full-assignment" }, { label: "Exclusive", value: "exclusive-license" }, { label: "Non-exclusive", value: "non-exclusive-license" }]} 
                          />
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {showLicenseDuration && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className={cn("max-w-[280px] flex flex-col gap-1.5", isReadOnly && "opacity-70")}>
                              <label className={appFieldLabelClass}>
                                <span className="flex items-center gap-1.5">
                                  {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                                  License Duration *
                                </span>
                                {autoFilledFields.has("payment.license.licenseDuration") && (
                                  <span className="autofill-indicator">auto-filled</span>
                                )}
                              </label>
                              <input
                                disabled={isReadOnly}
                                suppressHydrationWarning
                                type="text"
                                value={value.license.licenseDuration}
                                onChange={(e) => {
                                  onFieldManualEdit("payment.license.licenseDuration");
                                  updateLicenseField("licenseDuration", e.target.value);
                                }}
                                onBlur={() => markTouched("licenseDuration")}
                                placeholder="Example: 3 years"
                                className={cn(
                                  inputClass(licenseDurationError, Boolean(value.license.licenseDuration)),
                                  !isReadOnly && getInputStateClass("payment.license.licenseDuration", value.license.licenseDuration),
                                  isReadOnly && "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200 shadow-none",
                                )}
                              />
                              {licenseDurationError && <p className={appFieldErrorTextClass}>{licenseDurationError}</p>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p className="text-[11px] leading-relaxed text-[color:var(--text-muted)] bg-[color:var(--bg-surface-muted)]/50 p-3 rounded-lg border border-[color:var(--border-subtle)]">{licenseExplanation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Section D: Bank Details */}
          <div>
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Bank Details
              </h3>
              <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
            </div>

            <div className="space-y-8">
              <AnimatePresence initial={false}>
                {!isInternational ? (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-6">
                      <div className={appFieldPairGridClass}>
                        <div>
                          <label className={appFieldLabelClass}>
                            Bank Name
                            {autoFilledFields.has("payment.bankName") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
                          <input
                            suppressHydrationWarning
                            type="text"
                            value={value.bankName}
                            onChange={(e) => {
                              onFieldManualEdit("payment.bankName");
                              updateField("bankName", e.target.value);
                            }}
                            onBlur={() => markTouched("bankName")}
                            placeholder="Bank name"
                            className={cn(
                              inputClass(bankNameError, Boolean(value.bankName)),
                              getInputStateClass("payment.bankName", value.bankName),
                            )}
                          />
                          {bankNameError && <p className={appFieldErrorTextClass}>{bankNameError}</p>}
                        </div>
                        <div>
                          <label className={appFieldLabelClass}>
                            Account Name
                            {autoFilledFields.has("payment.accountName") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
                          <input
                            suppressHydrationWarning
                            type="text"
                            value={value.accountName}
                            onChange={(e) => {
                              onFieldManualEdit("payment.accountName");
                              updateField("accountName", e.target.value);
                            }}
                            onBlur={() => markTouched("accountName")}
                            placeholder="Name on account"
                            className={cn(
                              inputClass(accountNameError, Boolean(value.accountName)),
                              getInputStateClass("payment.accountName", value.accountName),
                            )}
                          />
                          {accountNameError && <p className={appFieldErrorTextClass}>{accountNameError}</p>}
                        </div>
                        <div>
                          <label className={appFieldLabelClass}>
                            Account Number
                            {autoFilledFields.has("payment.accountNumber") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
                          <input
                            suppressHydrationWarning
                            type="text"
                            value={value.accountNumber}
                            onChange={(e) => {
                              onFieldManualEdit("payment.accountNumber");
                              updateField("accountNumber", e.target.value);
                            }}
                            onBlur={() => markTouched("accountNumber")}
                            placeholder="Bank account number"
                            className={cn(
                              inputClass(accountNumberError, Boolean(value.accountNumber)),
                              getInputStateClass("payment.accountNumber", value.accountNumber),
                            )}
                          />
                          {accountNumberError && <p className={appFieldErrorTextClass}>{accountNumberError}</p>}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">
                              IFSC Code
                              {autoFilledFields.has("payment.ifscCode") && (
                                <span className="autofill-indicator">auto-filled</span>
                              )}
                            </label>
                            <span
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[10px] text-gray-400 cursor-help shrink-0"
                              title="11-character Indian Financial System Code. Found on your cheque book or bank's website (format: ABCD0123456)."
                            >
                              ?
                            </span>
                          </div>
                          <input
                            suppressHydrationWarning
                            type="text"
                            value={value.ifscCode}
                            onChange={(e) => {
                              onFieldManualEdit("payment.ifscCode");
                              updateField("ifscCode", e.target.value);
                            }}
                            onBlur={() => markTouched("ifscCode")}
                            placeholder="Bank IFSC code"
                            className={cn(
                              inputClass(ifscCodeError, Boolean(value.ifscCode)),
                              getInputStateClass("payment.ifscCode", value.ifscCode),
                            )}
                          />
                          {ifscCodeError && <p className={appFieldErrorTextClass}>{ifscCodeError}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className={appFieldLabelClass}>Payment QR Code <span className="text-[color:var(--text-soft)] text-[11px] font-normal">(Optional)</span></label>
                        {value.qrCodeUrl ? (
                          <div className="relative inline-block group">
                            <div className="overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-white p-2 shadow-sm transition-shadow group-hover:shadow-md">
                              <img src={value.qrCodeUrl} alt="Payment QR" className="h-32 w-32 object-contain" />
                            </div>
                            <button type="button" onClick={removeQr} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95">×</button>
                          </div>
                        ) : (
                          <label onDragOver={(e) => { e.preventDefault(); setIsQrDragOver(true); }} onDragLeave={() => setIsQrDragOver(false)} onDrop={handleQrDrop} className={cn("w-48 h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group", isQrDragOver ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-gray-200 bg-white hover:border-[#4F46E5] hover:bg-[#4F46E5]/5")}>
                            <input type="file" accept="image/*" onChange={handleQrUpload} className="sr-only" />
                            <div className="h-10 w-10 rounded-full bg-gray-100 group-hover:bg-[#4F46E5]/10 flex items-center justify-center transition-colors">
                              <Sparkles size={16} className="text-gray-400 group-hover:text-[#4F46E5]" />
                            </div>
                            <div className="text-center">
                              <p className="text-[12px] font-medium text-[color:var(--text-muted)] group-hover:text-[#4F46E5]">Upload QR code</p>
                              <p className="text-[10px] text-[color:var(--text-muted)]">JPG, PNG</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-8">
                      <div className={appFieldPairGridClass}>
                        <div>
                          <label className={appFieldLabelClass}>Bank Name</label>
                          <input suppressHydrationWarning type="text" value={value.bankName} onChange={(e) => updateField("bankName", e.target.value)} onBlur={() => markTouched("bankName")} placeholder="Intermediary or local bank" className={inputClass(bankNameError, Boolean(value.bankName))} />
                          {bankNameError && <p className={appFieldErrorTextClass}>{bankNameError}</p>}
                        </div>
                        <div>
                          <label className={appFieldLabelClass}>Account Name</label>
                          <input suppressHydrationWarning type="text" value={value.accountName} onChange={(e) => updateField("accountName", e.target.value)} onBlur={() => markTouched("accountName")} placeholder="Exact name on account" className={inputClass(accountNameError, Boolean(value.accountName))} />
                          {accountNameError && <p className={appFieldErrorTextClass}>{accountNameError}</p>}
                        </div>
                        <div>
                          <label className={appFieldLabelClass}>Account Number / IBAN</label>
                          <input suppressHydrationWarning type="text" value={value.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value)} onBlur={() => markTouched("accountNumber")} placeholder="IBAN or account number" className={inputClass(accountNumberError, Boolean(value.accountNumber))} />
                          {accountNumberError && <p className={appFieldErrorTextClass}>{accountNumberError}</p>}
                        </div>
                        <div>
                          <label className={appFieldLabelClass}>
                            SWIFT / BIC Code
                            {autoFilledFields.has("payment.swiftBicCode") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
                          <input
                            suppressHydrationWarning
                            type="text"
                            value={value.swiftBicCode}
                            onChange={(e) => {
                              onFieldManualEdit("payment.swiftBicCode");
                              updateField("swiftBicCode", e.target.value);
                            }}
                            onBlur={() => markTouched("swiftBicCode")}
                            placeholder="8 or 11 characters"
                            className={cn(
                              inputClass(swiftBicCodeError, Boolean(value.swiftBicCode)),
                              getInputStateClass("payment.swiftBicCode", value.swiftBicCode),
                            )}
                          />
                          {swiftBicCodeError && <p className={appFieldErrorTextClass}>{swiftBicCodeError}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-soft)]">Structured Bank Address</p>
                          <div className="grid grid-cols-1 gap-3">
                            <input
                              suppressHydrationWarning
                              type="text"
                              value={bankAddressFields.line1}
                              onChange={(e) => {
                                onFieldManualEdit("payment.bankAddress");
                                updateBankAddressField("line1", e.target.value);
                              }}
                              placeholder="Building / Street"
                              className={cn(
                                inputClass(undefined, Boolean(bankAddressFields.line1)),
                                getInputStateClass("payment.bankAddress", bankAddressFields.line1),
                              )}
                            />
                            <input
                              suppressHydrationWarning
                              type="text"
                              value={bankAddressFields.line2}
                              onChange={(e) => {
                                onFieldManualEdit("payment.bankAddress");
                                updateBankAddressField("line2", e.target.value);
                              }}
                              placeholder="Suite / Floor (Optional)"
                              className={cn(
                                inputClass(undefined, Boolean(bankAddressFields.line2)),
                                getInputStateClass("payment.bankAddress", bankAddressFields.line2),
                              )}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                suppressHydrationWarning
                                type="text"
                                value={bankAddressFields.cityRegion}
                                onChange={(e) => {
                                  onFieldManualEdit("payment.bankAddress");
                                  updateBankAddressField("cityRegion", e.target.value);
                                }}
                                placeholder="City / State"
                                className={cn(
                                  inputClass(undefined, Boolean(bankAddressFields.cityRegion)),
                                  getInputStateClass("payment.bankAddress", bankAddressFields.cityRegion),
                                )}
                              />
                              <input
                                suppressHydrationWarning
                                type="text"
                                value={bankAddressFields.postalCode}
                                onChange={(e) => {
                                  onFieldManualEdit("payment.bankAddress");
                                  updateBankAddressField("postalCode", e.target.value);
                                }}
                                placeholder="Postal Code"
                                className={cn(
                                  inputClass(undefined, Boolean(bankAddressFields.postalCode)),
                                  getInputStateClass("payment.bankAddress", bankAddressFields.postalCode),
                                )}
                              />
                            </div>
                            <input
                              suppressHydrationWarning
                              type="text"
                              value={bankAddressFields.country}
                              onChange={(e) => {
                                onFieldManualEdit("payment.bankAddress");
                                updateBankAddressField("country", e.target.value);
                              }}
                              placeholder="Country"
                              className={cn(
                                inputClass(bankAddressError, Boolean(bankAddressFields.country)),
                                getInputStateClass("payment.bankAddress", bankAddressFields.country),
                              )}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl bg-[color:var(--bg-surface-muted)]/50 p-5 ring-1 ring-inset ring-[color:var(--border-subtle)]">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-soft)] mb-4">Address Preview</p>
                          <pre className="whitespace-pre-wrap font-mono text-[11px] text-[color:var(--text-primary)] leading-relaxed">{value.bankAddress || "No address provided"}</pre>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
