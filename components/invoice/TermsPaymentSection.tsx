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
import { Link, Sparkles, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  selectedClientMsa?: import("@/lib/supabase/clients").SavedClient | null;
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
}: TermsPaymentSectionProps) {
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

  const isPaymentTermsDeviated = selectedClientMsa && meta.paymentTerms !== `Net ${selectedClientMsa.msa_payment_terms_days}`;
  const getMsaLicenseType = (trigger?: string): LicenseType | "" => {
    if (!trigger) return "";
    if (trigger === "upon_full_payment") return "full-assignment";
    if (trigger === "retained_by_creator") return "exclusive-license";
    return "";
  };
  const msaLicenseType = getMsaLicenseType(selectedClientMsa?.msa_ip_trigger_type);
  const isLicenseTypeDeviated = selectedClientMsa && value.license.licenseType !== msaLicenseType;
  const isNotesDeviated = selectedClientMsa && selectedClientMsa.msa_notes_boilerplate && value.notes !== selectedClientMsa.msa_notes_boilerplate;
  const hasMsaDeviation = isPaymentTermsDeviated || isLicenseTypeDeviated || isNotesDeviated;

  return (
    <>
      <UploadToast message={toastMessage} visible={showToast} />

      <section className={cn(embedded ? "rounded-none border-0 bg-transparent p-0 shadow-none" : getAppPanelClass())}>
        {!embedded && (
          <div className="mb-6 space-y-2">
            <h2 className={appSectionTitleClass}>Payment</h2>
            <p className={appSectionDescriptionClass}>Add payment and bank details.</p>
          </div>
        )}

        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {isInternational && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 0 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5" data-testid="payment-settlement-control">
                  <label className={appFieldLabelClass}>Settlement Type</label>
                  <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[12px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-1">
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
                            className="sr-only"
                          />
                          <span className={cn("flex min-h-[34px] items-center justify-center rounded-[9px] border px-3 py-1 text-[12px] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,box-shadow] duration-[var(--app-duration-fast)]", isSelected ? "app-soft-choice-option-active text-[color:var(--text-primary)]" : "app-soft-choice-option text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]")}>
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <AnimatePresence initial={false}>
                    {value.paymentSettlementType && value.paymentSettlementType !== "forex" && (
                      <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
                        <p className="text-[11px] leading-5 text-[color:var(--text-muted)]">Confirm the settlement route before final delivery.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className={appFieldLabelClass}>Payment Terms *</label>
              {selectedClientMsa && (
                <div className="flex items-center gap-1 mb-1.5 opacity-80">
                  {isPaymentTermsDeviated ? <Sparkles size={14} strokeWidth={1.5} className="text-amber-500" /> : <Link size={14} strokeWidth={1.5} className="text-slate-400" />}
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{isPaymentTermsDeviated ? "Override" : "Synced with MSA"}</span>
                </div>
              )}
            </div>
            <input suppressHydrationWarning type="text" value={meta.paymentTerms} onChange={(e) => updateMetaField("paymentTerms", e.target.value)} onBlur={() => markTouched("paymentTerms")} placeholder="Net 15" className={inputClass(paymentTermsFieldError, Boolean(meta.paymentTerms))} />
            {paymentTermsFieldError && <p className={appFieldErrorTextClass}>{paymentTermsFieldError}</p>}
            {isPaymentTermsDeviated && <p className={appFieldHelperTextClass}>MSA default: Net {selectedClientMsa.msa_payment_terms_days}</p>}
          </div>

          <div className="space-y-4">
            <p className="text-[13px] font-semibold tracking-[0.01em] text-[color:var(--text-primary)]">Licensing</p>
            <div className="space-y-1.5">
              <label className={appFieldLabelClass}>License Included?</label>
              <ChoiceCards
                name="license-included"
                value={value.license.isLicenseIncluded ? "yes" : "no"}
                onChange={(nextValue) => {
                  if (nextValue === "yes") { updateLicenseField("isLicenseIncluded", true); return; }
                  onChange({ ...value, license: { isLicenseIncluded: false, licenseType: "", licenseDuration: "" } });
                }}
                variant="inline"
                options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
              />
            </div>

            <AnimatePresence initial={false}>
              {showLicenseFields && (
                <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 0 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <div className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className={appFieldLabelClass}>License Type *</label>
                        {selectedClientMsa && <div className="flex items-center gap-1 mb-1.5 opacity-80">{isLicenseTypeDeviated ? <Sparkles size={14} strokeWidth={1.5} className="text-amber-500" /> : <Link size={14} strokeWidth={1.5} className="text-slate-400" />}</div>}
                      </div>
                      <ChoiceCards name="license-type" value={value.license.licenseType} onChange={(nextValue) => updateLicenseField("licenseType", nextValue as any)} variant="inline" options={[{ label: "Full assignment", value: "full-assignment" }, { label: "Exclusive", value: "exclusive-license" }, { label: "Non-exclusive", value: "non-exclusive-license" }]} />
                    </div>

                    <AnimatePresence initial={false}>
                      {showLicenseDuration && (
                        <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 0 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="overflow-hidden">
                          <div className="max-w-[260px] space-y-1.5 pt-4">
                            <label className={appFieldLabelClass}>License Duration *</label>
                            <input suppressHydrationWarning type="text" value={value.license.licenseDuration} onChange={(e) => updateLicenseField("licenseDuration", e.target.value)} onBlur={() => markTouched("licenseDuration")} placeholder="Example: 3 years" className={inputClass(licenseDurationError, Boolean(value.license.licenseDuration))} />
                            {licenseDurationError && <p className={appFieldErrorTextClass}>{licenseDurationError}</p>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence initial={false}>
                      {value.license.licenseType && (
                        <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
                          <p className="text-[11px] leading-5 text-[color:var(--text-muted)]">{licenseExplanation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className={appFieldLabelClass}>Terms / Notes</label>
              {selectedClientMsa && selectedClientMsa.msa_notes_boilerplate && <div className="flex items-center gap-1 mb-1.5 opacity-80">{isNotesDeviated ? <Sparkles size={14} strokeWidth={1.5} className="text-amber-500" /> : <Link size={14} strokeWidth={1.5} className="text-slate-400" />}</div>}
            </div>
            <textarea suppressHydrationWarning rows={3} value={value.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Example: 1.5% monthly late fee applies. Final files delivered after full payment." className={inputClass(undefined, Boolean(value.notes), true)} />
          </div>
        </div>

        {hasMsaDeviation && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold text-amber-900">Deviation from Master MSA detected</p>
                  <p className="text-xs text-amber-700 leading-relaxed mt-1">You are changing terms that were previously agreed upon in your Master Service Agreement with this client.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-1">
                    <input type="checkbox" checked={meta.hasAddendum} onChange={(e) => updateMetaField("hasAddendum", e.target.checked)} className="peer h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer" />
                  </div>
                  <span className="text-[13px] font-semibold text-amber-900 group-hover:text-black transition-colors">Apply overrides as a Project-Specific Addendum<span className="block text-[11px] font-normal text-amber-700 mt-0.5">Required to proceed with modified terms.</span></span>
                </label>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {!isInternational && (
            <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 24 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
              <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-6">
                <div className={appFieldPairGridClass}>
                  <div>
                    <label className={appFieldLabelClass}>Bank Name</label>
                    <input suppressHydrationWarning type="text" value={value.bankName} onChange={(e) => updateField("bankName", e.target.value)} onBlur={() => markTouched("bankName")} placeholder="Bank name" className={inputClass(bankNameError, Boolean(value.bankName))} />
                    {bankNameError && <p className={appFieldErrorTextClass}>{bankNameError}</p>}
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Account Name</label>
                    <input suppressHydrationWarning type="text" value={value.accountName} onChange={(e) => updateField("accountName", e.target.value)} onBlur={() => markTouched("accountName")} placeholder="Name as per bank account" className={inputClass(accountNameError, Boolean(value.accountName))} />
                    {accountNameError && <p className={appFieldErrorTextClass}>{accountNameError}</p>}
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Account Number</label>
                    <input suppressHydrationWarning type="text" value={value.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value)} onBlur={() => markTouched("accountNumber")} placeholder="Bank account number" className={inputClass(accountNumberError, Boolean(value.accountNumber))} />
                    {accountNumberError && <p className={appFieldErrorTextClass}>{accountNumberError}</p>}
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>IFSC Code</label>
                    <input suppressHydrationWarning type="text" value={value.ifscCode} onChange={(e) => updateField("ifscCode", e.target.value)} onBlur={() => markTouched("ifscCode")} placeholder="Bank IFSC code" className={inputClass(ifscCodeError, Boolean(value.ifscCode))} />
                    {ifscCodeError && <p className={appFieldErrorTextClass}>{ifscCodeError}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={appFieldLabelClass}>Payment QR Code <span className="text-[color:var(--text-soft)]">(Optional)</span></label>
                  {value.qrCodeUrl ? (
                    <div className="relative inline-block group">
                      <div className="overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-white p-2 shadow-sm transition-shadow group-hover:shadow-md">
                        <img src={value.qrCodeUrl} alt="Payment QR" className="h-32 w-32 object-contain" />
                      </div>
                      <button type="button" onClick={removeQr} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95">×</button>
                    </div>
                  ) : (
                    <label onDragOver={(e) => { e.preventDefault(); setIsQrDragOver(true); }} onDragLeave={() => setIsQrDragOver(false)} onDrop={handleQrDrop} className={cn("flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all", isQrDragOver ? "border-[color:var(--color-lime-500)] bg-[color:var(--color-lime-50)]" : "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface-muted)]")}>
                      <input type="file" accept="image/*" onChange={handleQrUpload} className="sr-only" />
                      <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-[color:var(--border-subtle)]"><Sparkles size={16} className="text-[color:var(--text-muted)]" /></div>
                      <div className="text-center"><p className="text-[12px] font-semibold text-[color:var(--text-primary)]">Click or drag QR code</p><p className="text-[10px] text-[color:var(--text-soft)]">Supports JPG, PNG</p></div>
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isInternational && (
            <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: 24 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
              <div className="space-y-6 border-t border-[color:var(--border-subtle)] pt-6">
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
                    <label className={appFieldLabelClass}>SWIFT / BIC Code</label>
                    <input suppressHydrationWarning type="text" value={value.swiftBicCode} onChange={(e) => updateField("swiftBicCode", e.target.value)} onBlur={() => markTouched("swiftBicCode")} placeholder="8 or 11 characters" className={inputClass(swiftBicCodeError, Boolean(value.swiftBicCode))} />
                    {swiftBicCodeError && <p className={appFieldErrorTextClass}>{swiftBicCodeError}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-soft)]">Bank Address</p>
                    <div className="grid grid-cols-1 gap-3">
                      <input suppressHydrationWarning type="text" value={bankAddressFields.line1} onChange={(e) => updateBankAddressField("line1", e.target.value)} placeholder="Building / Street" className={inputClass(undefined, Boolean(bankAddressFields.line1))} />
                      <input suppressHydrationWarning type="text" value={bankAddressFields.line2} onChange={(e) => updateBankAddressField("line2", e.target.value)} placeholder="Suite / Floor (Optional)" className={inputClass(undefined, Boolean(bankAddressFields.line2))} />
                      <div className="grid grid-cols-2 gap-3">
                        <input suppressHydrationWarning type="text" value={bankAddressFields.cityRegion} onChange={(e) => updateBankAddressField("cityRegion", e.target.value)} placeholder="City / State" className={inputClass(undefined, Boolean(bankAddressFields.cityRegion))} />
                        <input suppressHydrationWarning type="text" value={bankAddressFields.postalCode} onChange={(e) => updateBankAddressField("postalCode", e.target.value)} placeholder="Postal Code" className={inputClass(undefined, Boolean(bankAddressFields.postalCode))} />
                      </div>
                      <input suppressHydrationWarning type="text" value={bankAddressFields.country} onChange={(e) => updateBankAddressField("country", e.target.value)} placeholder="Country" className={inputClass(bankAddressError, Boolean(bankAddressFields.country))} />
                    </div>
                  </div>

                  <div className="rounded-xl bg-[color:var(--bg-surface-muted)] p-4 ring-1 ring-inset ring-[color:var(--border-subtle)]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-soft)] mb-3">Address Preview</p>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-[color:var(--text-primary)] leading-relaxed">{value.bankAddress || "No address provided"}</pre>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
