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
  const effectiveMsaDays = client.msaPaymentTermsDays ?? selectedClientMsa?.msa_payment_terms_days;
  const effectiveBoilerplate = client.msaNotesBoilerplate ?? selectedClientMsa?.msa_notes_boilerplate ?? "";
  const hasLocalMsaData = Boolean(client.msaPaymentTermsDays || client.msaNotesBoilerplate);
  const hasAnyMsaAuthority = Boolean(selectedClientMsa || hasLocalMsaData);

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
          {/* Section A: Contract Terms */}
          <div>
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Contract Terms
              </h3>
              <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
            </div>

            <div className={cn(
              "flex flex-col gap-1.5 rounded-xl border transition-all duration-300",
              isAddendumMode 
                ? "bg-amber-50 border-amber-200 py-3 px-4 ring-1 ring-amber-500/5" 
                : "bg-transparent border-[color:var(--border-subtle)] p-5"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[14px] font-medium text-[color:var(--text-primary)]">
                      {isAddendumMode 
                        ? "You are overriding the MSA with project-specific terms." 
                        : "Using your Master Service Agreement."}
                    </p>
                    
                    {isAddendumMode ? (
                      <div className="flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-1 ring-1 ring-inset ring-amber-600/20">
                        <FileEdit size={12} className="text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">PROJECT OVERRIDE ⚠</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-inset ring-emerald-600/20">
                        <ShieldCheck size={12} className="text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">MSA ENFORCED ✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] text-[color:var(--text-muted)]">
                    {isAddendumMode 
                      ? "These will apply only to this invoice." 
                      : "Terms locked to client defaults."}
                  </p>
                </div>
              </div>

              <div className="mt-2.5">
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
                  className="text-[12px] font-bold link-indigo hover:underline flex items-center gap-1.5"
                >
                  {isAddendumMode ? (
                    <span>← Revert to Master Agreement</span>
                  ) : (
                    <span>Override with project-specific terms →</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section B: Settlement & Terms */}
          <div>
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Settlement & Terms
              </h3>
              <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
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

              <div className={cn(appFieldPairGridClass, "items-start", isReadOnly && "opacity-70")}>
                  <div className="flex items-center gap-2">
                    <label className={appFieldLabelClass}>
                      <span className="flex items-center gap-1.5">
                        {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                        Days until payment
                      </span>
                      {autoFilledFields.has("meta.paymentTerms") && (
                        <span className="autofill-indicator">auto-filled</span>
                      )}
                    </label>
                  </div>
                  <div className="relative">
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
                        getInputStateClass("meta.paymentTerms", meta.paymentTerms),
                        isReadOnly && "bg-gray-50 cursor-not-allowed text-gray-600 border-transparent shadow-none",
                        "pr-12",
                      )}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-[12px] font-medium text-[color:var(--text-soft)]">Days</span>
                    </div>
                  </div>
                  <p className={cn(appFieldHelperTextClass, "text-[10px]")}>From invoice issue date.</p>
                  {paymentTermsFieldError && <p className={appFieldErrorTextClass}>{paymentTermsFieldError}</p>}
                </div>

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
                      getInputStateClass("meta.dueDate", meta.dueDate),
                      isReadOnly && "bg-gray-50 cursor-not-allowed text-gray-600 border-transparent shadow-none",
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
                    getInputStateClass("payment.terms", value.terms || value.notes),
                    isReadOnly && "bg-gray-50 cursor-not-allowed text-gray-600 border-transparent shadow-none",
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
                  <span className="flex items-center gap-1.5">
                    {isReadOnly && <Lock size={11} className="text-[color:var(--text-soft)]" />}
                    License Included?
                  </span>
                </label>
                <div className={isReadOnly ? "opacity-60 pointer-events-none" : ""}>
                  <ChoiceCards
                    name="license-included"
                    value={value.license.isLicenseIncluded ? "yes" : "no"}
                    disabled={isReadOnly}
                    onChange={(nextValue) => {
                      if (nextValue === "yes") { updateLicenseField("isLicenseIncluded", true); return; }
                      onChange({ ...value, license: { isLicenseIncluded: false, licenseType: "", licenseDuration: "" } });
                    }}
                    variant="inline"
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                  />
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
                                  getInputStateClass("payment.license.licenseDuration", value.license.licenseDuration),
                                  isReadOnly && "bg-gray-50 cursor-not-allowed text-gray-600 border-transparent shadow-none",
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
                          <label className={appFieldLabelClass}>
                            IFSC Code
                            {autoFilledFields.has("payment.ifscCode") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
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
                          <label onDragOver={(e) => { e.preventDefault(); setIsQrDragOver(true); }} onDragLeave={() => setIsQrDragOver(false)} onDrop={handleQrDrop} className={cn("flex min-h-[100px] max-w-[280px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all", isQrDragOver ? "border-[color:var(--color-lime-500)] bg-[color:var(--color-lime-50)]" : "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface-muted)]")}>
                            <input type="file" accept="image/*" onChange={handleQrUpload} className="sr-only" />
                            <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-[color:var(--border-subtle)]"><Sparkles size={16} className="text-[color:var(--text-muted)]" /></div>
                            <div className="text-center"><p className="text-[12px] font-semibold text-[color:var(--text-primary)]">Upload QR code</p><p className="text-[10px] text-[color:var(--text-soft)]">JPG, PNG</p></div>
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
