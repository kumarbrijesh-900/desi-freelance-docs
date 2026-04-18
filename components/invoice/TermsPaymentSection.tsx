"use client";

import { useEffect, useState } from "react";
import type {
  PaymentDetails,
  InvoiceMeta,
  LicenseType,
} from "@/types/invoice";
import UploadToast from "@/components/ui/UploadToast";
import ChoiceCards from "@/components/ui/ChoiceCards";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/ui/app-icons";
import {
  appFieldErrorTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
  getAppSubtlePanelClass,
} from "@/lib/ui-foundation";
import {
  appFieldFullWidthStackClass,
  appFieldPairGridClass,
} from "@/lib/form-foundation";

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
}

type StructuredBankAddressFields = {
  line1: string;
  line2: string;
  cityRegion: string;
  postalCode: string;
  country: string;
};

function parseStructuredBankAddress(
  bankAddress: string
): StructuredBankAddressFields {
  const normalized = bankAddress.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return {
      line1: "",
      line2: "",
      cityRegion: "",
      postalCode: "",
      country: "",
    };
  }

  const lines = normalized.split("\n");

  if (lines.length > 5) {
    return {
      line1: normalized,
      line2: "",
      cityRegion: "",
      postalCode: "",
      country: "",
    };
  }

  return {
    line1: lines[0]?.trim() ?? "",
    line2: lines[1]?.trim() ?? "",
    cityRegion: lines[2]?.trim() ?? "",
    postalCode: lines[3]?.trim() ?? "",
    country: lines[4]?.trim() ?? "",
  };
}

function composeStructuredBankAddress(fields: StructuredBankAddressFields) {
  const parts = [
    fields.line1,
    fields.line2,
    fields.cityRegion,
    fields.postalCode,
    fields.country,
  ];
  let lastNonEmptyIndex = -1;

  parts.forEach((part, index) => {
    if (part.trim()) {
      lastNonEmptyIndex = index;
    }
  });

  if (lastNonEmptyIndex === -1) return "";

  return parts
    .slice(0, lastNonEmptyIndex + 1)
    .map((part) => part.trim())
    .join("\n");
}

function getLicenseExplanation(
  licenseType: LicenseType | ""
): string {
  switch (licenseType) {
    case "full-assignment":
      return "Full assignment transfers ownership of the final work to the client once the agreed conditions are met.";

    case "exclusive-license":
      return "Exclusive license gives the client sole usage rights for the agreed purpose and duration while you retain ownership.";

    case "non-exclusive-license":
      return "Non-exclusive license lets the client use the work while you keep ownership and can reuse it elsewhere.";

    default:
      return "Use this only when the invoice includes usage rights or ownership terms.";
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
}: TermsPaymentSectionProps) {
  const [isQrDragOver, setIsQrDragOver] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isLicenseSectionExpanded, setIsLicenseSectionExpanded] = useState(
    value.license.isLicenseIncluded ||
      Boolean(value.license.licenseType || value.license.licenseDuration)
  );
  const [bankAddressFields, setBankAddressFields] =
    useState<StructuredBankAddressFields>(() =>
      parseStructuredBankAddress(value.bankAddress)
    );

  useEffect(() => {
    if (!showToast) return;

    const timer = window.setTimeout(() => {
      setShowToast(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    setBankAddressFields(parseStructuredBankAddress(value.bankAddress));
  }, [value.bankAddress]);

  const updateField = <K extends keyof PaymentDetails>(
    key: K,
    fieldValue: PaymentDetails[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const updateMetaField = <K extends keyof InvoiceMeta>(
    key: K,
    fieldValue: InvoiceMeta[K]
  ) => {
    onMetaChange({
      ...meta,
      [key]: fieldValue,
    });
  };

  const updateLicenseField = <
    K extends keyof PaymentDetails["license"]
  >(
    key: K,
    fieldValue: PaymentDetails["license"][K]
  ) => {
    onChange({
      ...value,
      license: {
        ...value.license,
        [key]: fieldValue,
      },
    });
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(false);

    requestAnimationFrame(() => {
      setShowToast(true);
    });
  };

  const readQrFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateField("qrCodeUrl", String(reader.result));
      triggerToast("QR uploaded");
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    readQrFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleQrDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsQrDragOver(false);
    readQrFile(event.dataTransfer.files?.[0]);
  };

  const removeQr = () => {
    updateField("qrCodeUrl", "");
  };
  const markTouched = (field: string) => {
    setTouchedFields((prev) =>
      prev[field] ? prev : { ...prev, [field]: true }
    );
  };
  const getVisibleError = (field: string, error?: string) =>
    showAllErrors || touchedFields[field] ? error : undefined;

  const updateBankAddressField = (
    key: keyof StructuredBankAddressFields,
    fieldValue: string
  ) => {
    const nextAddressFields = {
      ...bankAddressFields,
      [key]: fieldValue,
    };

    setBankAddressFields(nextAddressFields);
    updateField("bankAddress", composeStructuredBankAddress(nextAddressFields));
  };

  const licenseExplanation = getLicenseExplanation(
    value.license.licenseType
  );
  const hasLicenseContent = Boolean(
    value.license.isLicenseIncluded ||
      value.license.licenseType ||
      value.license.licenseDuration
  );
  const isLicenseSectionOpen = isLicenseSectionExpanded;

  const showLicenseFields = value.license.isLicenseIncluded;
  const showLicenseDuration =
    value.license.licenseType === "exclusive-license" ||
    value.license.licenseType === "non-exclusive-license";
  const isInternational = clientLocation === "international";
  const licenseToggleLabel = isLicenseSectionOpen
    ? "Hide terms"
    : hasLicenseContent
    ? "Review terms"
    : "Add terms";

  const inputClass = (hasError?: string, hasValue?: boolean, multiline = false) =>
    getAppFieldClass({
      hasError,
      hasValue,
      multiline,
    });
  const paymentTermsFieldError = getVisibleError(
    "paymentTerms",
    paymentTermsError
  );
  const licenseDurationError = getVisibleError(
    "licenseDuration",
    errors?.licenseDuration
  );
  const accountNameError = getVisibleError("accountName", errors?.accountName);
  const bankNameError = getVisibleError("bankName", errors?.bankName);
  const accountNumberError = getVisibleError(
    "accountNumber",
    errors?.accountNumber
  );
  const ifscCodeError = getVisibleError("ifscCode", errors?.ifscCode);
  const bankAddressError = getVisibleError("bankAddress", errors?.bankAddress);
  const swiftBicCodeError = getVisibleError(
    "swiftBicCode",
    errors?.swiftBicCode
  );

  return (
    <>
      <UploadToast message={toastMessage} visible={showToast} />

      <section
        className={cn(
          embedded
            ? "rounded-none border-0 bg-transparent p-0 shadow-none"
            : getAppPanelClass()
        )}
      >
        {!embedded ? (
          <div className="mb-6 space-y-2">
            <h2 className={appSectionTitleClass}>Payment</h2>
            <p className={appSectionDescriptionClass}>
              Add payment and bank details.
            </p>
          </div>
        ) : null}

        <div className={appFieldFullWidthStackClass}>
          {isInternational ? (
            <div className="space-y-1.5" data-testid="payment-settlement-control">
              <label className={appFieldLabelClass}>
                Settlement Type
              </label>
              <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[12px] border border-slate-200/90 bg-slate-50/88 p-1">
                {[
                  { value: "forex", label: "Forex" },
                  { value: "inr", label: "INR" },
                  { value: "unknown", label: "Not sure" },
                ].map((option) => {
                  const isSelected =
                    value.paymentSettlementType === option.value;

                  return (
                    <label key={option.value} className="block cursor-pointer">
                      <input
                        type="radio"
                        name="payment-settlement-type"
                        value={option.value}
                        checked={value.paymentSettlementType === option.value}
                        onChange={() =>
                          updateField(
                            "paymentSettlementType",
                            option.value as PaymentDetails["paymentSettlementType"]
                          )
                        }
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex min-h-[34px] items-center justify-center rounded-[9px] border px-3 py-1 text-[12px] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,box-shadow] duration-[var(--app-duration-fast)]",
                          isSelected
                            ? "app-soft-choice-option-active text-slate-950"
                            : "app-soft-choice-option text-slate-700 hover:text-slate-950"
                        )}
                      >
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {value.paymentSettlementType &&
              value.paymentSettlementType !== "forex" ? (
                <p className="text-[11px] leading-5 text-slate-500">
                  Confirm the settlement route before final delivery.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="w-full md:max-w-[288px]">
            <label className={appFieldLabelClass}>
              Payment Terms *
            </label>
            <input
              suppressHydrationWarning
              type="text"
              value={meta.paymentTerms}
              onChange={(e) => updateMetaField("paymentTerms", e.target.value)}
              onBlur={() => markTouched("paymentTerms")}
              placeholder="Net 15"
              className={inputClass(
                paymentTermsFieldError,
                Boolean(meta.paymentTerms)
              )}
            />
            {paymentTermsFieldError ? (
              <p className={appFieldErrorTextClass}>
                {paymentTermsFieldError}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              getAppSubtlePanelClass("muted"),
              "invoice-optional-zone invoice-utility-widget space-y-3 border border-slate-200/70 px-3 py-3"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-[13px] font-semibold tracking-[0.01em] text-slate-950">
                  Licensing
                </p>
                <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/86 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  {hasLicenseContent ? "Included" : "Optional"}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsLicenseSectionExpanded((current) => !current)
                }
                className={getAppButtonClass({ variant: "tertiary", size: "sm" })}
              >
                {isLicenseSectionOpen ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : hasLicenseContent ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
                {licenseToggleLabel}
              </button>
            </div>

            {isLicenseSectionOpen ? (
              <div className="space-y-3">
                  <div>
                    <label className={appFieldLabelClass}>
                      License Included?
                    </label>

                      <ChoiceCards
                        name="license-included"
                        value={value.license.isLicenseIncluded ? "yes" : "no"}
                      onChange={(nextValue) => {
                        if (nextValue === "yes") {
                          updateLicenseField("isLicenseIncluded", true);
                          return;
                        }

                        onChange({
                          ...value,
                          license: {
                            isLicenseIncluded: false,
                            licenseType: "",
                            licenseDuration: "",
                          },
                        });
                      }}
                        variant="inline"
                        options={[
                          {
                            value: "yes",
                          label: "Yes",
                        },
                        {
                          value: "no",
                          label: "No",
                        },
                      ]}
                    />
                  </div>

                  {showLicenseFields ? (
                    <div>
                      <label className={appFieldLabelClass}>
                        License Type *
                      </label>

                      <ChoiceCards
                        name="license-type"
                        value={value.license.licenseType}
                        onChange={(nextValue) =>
                          updateLicenseField("licenseType", nextValue as LicenseType)
                        }
                        variant="inline"
                        options={[
                          {
                            label: "Full assignment",
                            value: "full-assignment",
                          },
                          {
                            label: "Exclusive",
                            value: "exclusive-license",
                          },
                          {
                            label: "Non-exclusive",
                            value: "non-exclusive-license",
                          },
                        ]}
                      />
                    </div>
                  ) : null}

                  {showLicenseFields && showLicenseDuration ? (
                    <div className="max-w-[260px]">
                      <label className={appFieldLabelClass}>
                        License Duration *
                      </label>
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={value.license.licenseDuration}
                        onChange={(e) =>
                          updateLicenseField("licenseDuration", e.target.value)
                        }
                        onBlur={() => markTouched("licenseDuration")}
                        placeholder="Example: 3 years"
                        className={inputClass(
                          licenseDurationError,
                          Boolean(value.license.licenseDuration)
                        )}
                      />
                      {licenseDurationError ? (
                        <p className={appFieldErrorTextClass}>
                          {licenseDurationError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                {showLicenseFields && value.license.licenseType ? (
                  <p className="text-[11px] leading-5 text-slate-500">
                    {licenseExplanation}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <label className={appFieldLabelClass}>
              Terms / Notes
            </label>
            <textarea
              suppressHydrationWarning
              rows={3}
              value={value.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Example: 1.5% monthly late fee applies. Final files delivered after full payment."
              className={inputClass(undefined, Boolean(value.notes), true)}
            />
          </div>

          {!isInternational ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_76px] xl:items-start">
              <div className={appFieldPairGridClass}>
                <div>
                  <label className={appFieldLabelClass}>
                    Bank Name
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    onBlur={() => markTouched("bankName")}
                    placeholder="Bank name"
                    className={inputClass(bankNameError, Boolean(value.bankName))}
                  />
                  {bankNameError ? (
                    <p className={appFieldErrorTextClass}>
                      {bankNameError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={appFieldLabelClass}>
                    Account Name
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.accountName}
                    onChange={(e) => updateField("accountName", e.target.value)}
                    onBlur={() => markTouched("accountName")}
                    placeholder="Name as per bank account"
                    className={inputClass(
                      accountNameError,
                      Boolean(value.accountName)
                    )}
                  />
                  {accountNameError ? (
                    <p className={appFieldErrorTextClass}>
                      {accountNameError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={appFieldLabelClass}>
                    Account Number
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.accountNumber}
                    onChange={(e) => updateField("accountNumber", e.target.value)}
                    onBlur={() => markTouched("accountNumber")}
                    placeholder="Bank account number"
                    className={inputClass(
                      accountNumberError,
                      Boolean(value.accountNumber)
                    )}
                  />
                  {accountNumberError ? (
                    <p className={appFieldErrorTextClass}>
                      {accountNumberError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={appFieldLabelClass}>
                    IFSC Code
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.ifscCode}
                    onChange={(e) => updateField("ifscCode", e.target.value)}
                    onBlur={() => markTouched("ifscCode")}
                    placeholder="Bank IFSC code"
                    className={inputClass(
                      ifscCodeError,
                      Boolean(value.ifscCode)
                    )}
                  />
                  {ifscCodeError ? (
                    <p className={appFieldErrorTextClass}>
                      {ifscCodeError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="invoice-utility-widget flex flex-col items-end gap-1 rounded-[14px] p-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold tracking-[0.01em] text-slate-900">QR</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">Optional</p>
                  </div>

                  {value.qrCodeUrl ? (
                    <button
                      type="button"
                      onClick={removeQr}
                      className={cn(
                        getAppButtonClass({
                          variant: "destructive-lite",
                          size: "sm",
                        }),
                        "h-[30px] px-2 text-[11px]"
                      )}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsQrDragOver(true);
                  }}
                  onDragLeave={() => setIsQrDragOver(false)}
                  onDrop={handleQrDrop}
                  className={`app-dropzone-surface flex aspect-square w-full max-w-[64px] cursor-pointer items-center justify-center rounded-[12px] border-2 border-dashed px-1 py-1 text-center text-sm ${
                    isQrDragOver
                      ? "app-dropzone-accept text-slate-950"
                      : "text-slate-500 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />

                  {value.qrCodeUrl ? (
                    <img
                      src={value.qrCodeUrl}
                      alt="Payment QR preview"
                      className="max-h-[50px] w-auto object-contain"
                    />
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-700">QR</p>
                      <p className="text-[9px] uppercase tracking-[0.08em] text-slate-400">Upload</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border-t border-slate-200/70 pt-4">
              <div className={appFieldPairGridClass}>
                <div>
                  <label className={appFieldLabelClass}>
                    Beneficiary Name
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.accountName}
                    onChange={(e) => updateField("accountName", e.target.value)}
                    onBlur={() => markTouched("accountName")}
                    placeholder="Beneficiary name on bank account"
                    className={inputClass(
                      accountNameError,
                      Boolean(value.accountName)
                    )}
                  />
                  {accountNameError ? (
                    <p className={appFieldErrorTextClass}>
                      {accountNameError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={appFieldLabelClass}>
                    Bank Name
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    onBlur={() => markTouched("bankName")}
                    placeholder="Receiving bank name"
                    className={inputClass(
                      bankNameError,
                      Boolean(value.bankName)
                    )}
                  />
                  {bankNameError ? (
                    <p className={appFieldErrorTextClass}>
                      {bankNameError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={appFieldLabelClass}>
                    Account Number
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.accountNumber}
                    onChange={(e) => updateField("accountNumber", e.target.value)}
                    onBlur={() => markTouched("accountNumber")}
                    placeholder="Bank account number"
                    className={inputClass(
                      accountNumberError,
                      Boolean(value.accountNumber)
                    )}
                  />
                  {accountNumberError ? (
                    <p className={appFieldErrorTextClass}>
                      {accountNumberError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={appFieldLabelClass}>
                    SWIFT / BIC
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.swiftBicCode}
                    onChange={(e) => updateField("swiftBicCode", e.target.value)}
                    onBlur={() => markTouched("swiftBicCode")}
                    placeholder="Bank SWIFT or BIC code"
                    className={inputClass(
                      swiftBicCodeError,
                      Boolean(value.swiftBicCode)
                    )}
                  />
                  {swiftBicCodeError ? (
                    <p className={appFieldErrorTextClass}>
                      {swiftBicCodeError}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-2 md:max-w-[420px]">
                  <label className={appFieldLabelClass}>
                    IBAN / Routing / Sort Code
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.ibanRoutingCode}
                    onChange={(e) =>
                      updateField("ibanRoutingCode", e.target.value)
                    }
                    placeholder="IBAN, routing number, or sort code"
                    className={inputClass(
                      undefined,
                      Boolean(value.ibanRoutingCode)
                    )}
                  />
                </div>

                <div
                  className="md:col-span-2"
                  data-testid="international-bank-address-group"
                >
                  <label className={appFieldLabelClass}>
                    Bank Address
                  </label>
                  <div className={appFieldFullWidthStackClass}>
                    <div>
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={bankAddressFields.line1}
                        onChange={(e) =>
                          updateBankAddressField("line1", e.target.value)
                        }
                        onBlur={() => markTouched("bankAddress")}
                        placeholder="Address Line 1"
                        className={inputClass(
                          bankAddressError,
                          Boolean(bankAddressFields.line1)
                        )}
                      />
                    </div>

                    <div>
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={bankAddressFields.line2}
                        onChange={(e) =>
                          updateBankAddressField("line2", e.target.value)
                        }
                        onBlur={() => markTouched("bankAddress")}
                        placeholder="Address Line 2"
                        className={inputClass(
                          undefined,
                          Boolean(bankAddressFields.line2)
                        )}
                      />
                    </div>

                    <div className={appFieldPairGridClass}>
                      <div>
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={bankAddressFields.cityRegion}
                          onChange={(e) =>
                            updateBankAddressField("cityRegion", e.target.value)
                          }
                          onBlur={() => markTouched("bankAddress")}
                          placeholder="City / Region"
                          className={inputClass(
                            undefined,
                            Boolean(bankAddressFields.cityRegion)
                          )}
                        />
                      </div>

                      <div>
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={bankAddressFields.postalCode}
                          onChange={(e) =>
                            updateBankAddressField("postalCode", e.target.value)
                          }
                          onBlur={() => markTouched("bankAddress")}
                          placeholder="Postal Code"
                          className={inputClass(
                            undefined,
                            Boolean(bankAddressFields.postalCode)
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={bankAddressFields.country}
                        onChange={(e) =>
                          updateBankAddressField("country", e.target.value)
                        }
                        onBlur={() => markTouched("bankAddress")}
                        placeholder="Country"
                        className={inputClass(
                          undefined,
                          Boolean(bankAddressFields.country)
                        )}
                      />
                    </div>
                  </div>
                  {bankAddressError ? (
                    <p className={cn(appFieldErrorTextClass, "mt-2")}>
                      {bankAddressError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
