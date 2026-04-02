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

  useEffect(() => {
    if (!showToast) return;

    const timer = window.setTimeout(() => {
      setShowToast(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [showToast]);

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

  const licenseExplanation = getLicenseExplanation(
    value.license.licenseType
  );
  const hasLicenseContent = Boolean(
    value.license.isLicenseIncluded ||
      value.license.licenseType ||
      value.license.licenseDuration
  );
  const isLicenseSectionOpen = isLicenseSectionExpanded || hasLicenseContent;

  const showLicenseFields = value.license.isLicenseIncluded;
  const showLicenseDuration =
    value.license.licenseType === "exclusive-license" ||
    value.license.licenseType === "non-exclusive-license";
  const isInternational = clientLocation === "international";

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
        <div className={cn(embedded ? "space-y-2" : "mb-6 space-y-2")}>
          {!embedded ? <h2 className={appSectionTitleClass}>Payment</h2> : null}
          <p className={appSectionDescriptionClass}>
            Add payment terms and the payout details that should appear on the invoice.
          </p>
        </div>

        <div className="space-y-6">
          {isInternational ? (
            <div className={cn(getAppSubtlePanelClass("warning"), "space-y-3")}>
              <label className={cn(appFieldLabelClass, "mb-0 text-amber-950")}>
                Settlement Type
              </label>
              <ChoiceCards
                name="payment-settlement-type"
                value={value.paymentSettlementType}
                onChange={(nextValue) =>
                  updateField("paymentSettlementType", nextValue)
                }
                variant="segmented"
                columns={2}
                options={[
                  {
                    value: "forex",
                    label: "Forex",
                    description: "Use when payment settles in foreign currency.",
                  },
                  {
                    value: "inr",
                    label: "INR",
                    description: "Use when export proceeds settle in rupees.",
                  },
                  {
                    value: "unknown",
                    label: "Unknown",
                    description: "Leave this until the settlement route is confirmed.",
                  },
                ]}
              />
              {value.paymentSettlementType !== "forex" ? (
                <p className="text-xs font-medium leading-5 text-amber-950/85">
                  International invoices usually need a clear forex-settlement trail. Review the settlement route before final delivery.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
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

          <div className="space-y-4 border-t border-slate-200/70 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-950">
                  Licensing
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsLicenseSectionExpanded((current) =>
                    hasLicenseContent ? true : !current
                  )
                }
                className={getAppButtonClass({ variant: "ghost", size: "sm" })}
              >
                {hasLicenseContent
                  ? "License active"
                  : isLicenseSectionOpen
                  ? "Hide"
                  : "Add"}{" "}
                license terms
              </button>
            </div>

            {isLicenseSectionOpen ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_176px] xl:items-start">
                <div className="space-y-4">
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
                      variant="segmented"
                      columns={2}
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
                        variant="cards"
                        columns={2}
                        options={[
                          {
                            label: "Full assignment",
                            value: "full-assignment",
                          },
                          {
                            label: "Exclusive license",
                            value: "exclusive-license",
                          },
                          {
                            label: "Non-exclusive license",
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
                </div>

                <div className={cn(getAppSubtlePanelClass("muted"), "space-y-2 p-3.5")}>
                  <p className="text-sm font-medium text-slate-900">
                    License summary
                  </p>
                  <p className="text-sm leading-6 text-slate-500">
                    {licenseExplanation}
                  </p>
                </div>
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
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_128px] xl:items-start">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Payment QR</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">Optional</p>
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
                        "h-8 px-3 text-xs"
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
                  className={`app-dropzone-surface flex aspect-square w-full max-w-[112px] cursor-pointer items-center justify-center rounded-[12px] border-2 border-dashed px-3 py-3 text-center text-sm ${
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
                      className="max-h-[64px] w-auto object-contain"
                    />
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium text-slate-700">Upload</p>
                      <p className="text-[11px] text-slate-400">QR</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border-t border-slate-200/70 pt-5">
              <div className="mb-2">
                <p className="text-sm font-medium text-slate-900">International wire details</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={appFieldLabelClass}>
                    Beneficiary / Account Name
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
                    className={inputClass(bankNameError, Boolean(value.bankName))}
                  />
                  {bankNameError ? (
                    <p className={appFieldErrorTextClass}>
                      {bankNameError}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className={appFieldLabelClass}>
                    Bank Full Address
                  </label>
                  <textarea
                    suppressHydrationWarning
                    rows={3}
                    value={value.bankAddress}
                    onChange={(e) => updateField("bankAddress", e.target.value)}
                    onBlur={() => markTouched("bankAddress")}
                    placeholder="Full bank branch address"
                    className={inputClass(
                      bankAddressError,
                      Boolean(value.bankAddress),
                      true
                    )}
                  />
                  {bankAddressError ? (
                    <p className={appFieldErrorTextClass}>
                      {bankAddressError}
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
                    SWIFT / BIC Code
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

                <div className="md:col-span-2">
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
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
