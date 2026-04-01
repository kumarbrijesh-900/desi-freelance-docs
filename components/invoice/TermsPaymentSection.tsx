"use client";

import { useEffect, useState } from "react";
import type {
  PaymentDetails,
  InvoiceMeta,
  LicenseType,
} from "@/types/invoice";
import UploadToast from "@/components/ui/UploadToast";
import ChoiceCards from "@/components/ui/ChoiceCards";

interface TermsPaymentSectionProps {
  value: PaymentDetails;
  meta: InvoiceMeta;
  clientLocation: "domestic" | "international";
  onChange: (value: PaymentDetails) => void;
  onMetaChange: (value: InvoiceMeta) => void;
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
}

function getLicenseExplanation(
  licenseType: LicenseType | ""
): string {
  switch (licenseType) {
    case "full-assignment":
      return "Full assignment means complete ownership of the final work is transferred to the client upon the agreed conditions, usually after full payment. The freelancer no longer retains commercial rights to the assigned work unless separately agreed.";

    case "exclusive-license":
      return "Exclusive license means the client receives exclusive rights to use the work for the agreed purpose and duration. The freelancer retains ownership unless otherwise stated, but cannot license the same work to others during the exclusive period.";

    case "non-exclusive-license":
      return "Non-exclusive license means the client receives permission to use the work for the agreed purpose, while the freelancer retains ownership and may reuse, resell, or license the work elsewhere unless restricted by contract.";

    default:
      return "Choose Yes if this invoice includes usage rights or ownership terms for the work. Choose No if licensing is not part of this invoice.";
  }
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex items-center">
      <span
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-500"
        aria-label="More information"
      >
        i
      </span>

      <span className="pointer-events-none absolute left-1/2 top-6 z-[100] hidden w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-5 text-gray-600 shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

export default function TermsPaymentSection({
  value,
  meta,
  clientLocation,
  onChange,
  onMetaChange,
  paymentTermsError,
  errors,
}: TermsPaymentSectionProps) {
  const [isQrDragOver, setIsQrDragOver] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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

  const licenseExplanation = getLicenseExplanation(
    value.license.licenseType
  );

  const showLicenseFields = value.license.isLicenseIncluded;
  const showLicenseDuration =
    value.license.licenseType === "exclusive-license" ||
    value.license.licenseType === "non-exclusive-license";
  const isInternational = clientLocation === "international";

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl border p-3 text-sm text-black outline-none focus:border-black ${
      hasError ? "border-red-400 bg-red-50/30" : "border-gray-300"
    }`;

  return (
    <>
      <UploadToast message={toastMessage} visible={showToast} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
          Terms & Payment
        </h2>

        <div className="space-y-4">
          {isInternational ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <label className="mb-2 block text-sm font-medium text-amber-950">
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
                <p className="mt-3 text-xs font-medium leading-5 text-amber-950/85">
                  International invoices usually need a clear forex-settlement trail. If this will settle in INR or you are unsure, review bank and FEMA documentation before final delivery.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="mb-2 inline-flex items-center text-sm font-medium text-black">
              Payment Terms *
              <InfoTooltip text="Payment Terms define when payment is due after the invoice date, such as Net 15, Net 30, or Due on receipt. This helps set clear client expectations and can also be used to auto-suggest the due date." />
            </label>
            <input
              type="text"
              value={meta.paymentTerms}
              onChange={(e) => updateMetaField("paymentTerms", e.target.value)}
              placeholder="Net 15 (payment due within 15 days of invoice date)"
              className={inputClass(paymentTermsError)}
            />
            {paymentTermsError ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {paymentTermsError}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    License Included?
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateLicenseField("isLicenseIncluded", true)
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        value.license.isLicenseIncluded
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white text-black hover:border-black"
                      }`}
                    >
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...value,
                          license: {
                            isLicenseIncluded: false,
                            licenseType: "",
                            licenseDuration: "",
                          },
                        })
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        !value.license.isLicenseIncluded
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white text-black hover:border-black"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {showLicenseFields && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      License Type *
                    </label>

                    <div className="flex flex-wrap gap-3">
                      {[
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
                      ].map((option) => {
                        const isSelected =
                          value.license.licenseType === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateLicenseField(
                                "licenseType",
                                option.value as LicenseType
                              )
                            }
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                              isSelected
                                ? "border-black bg-black text-white"
                                : "border-gray-300 bg-white text-black hover:border-black"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showLicenseFields && showLicenseDuration && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      License Duration *
                    </label>
                    <input
                      type="text"
                      value={value.license.licenseDuration}
                      onChange={(e) =>
                        updateLicenseField("licenseDuration", e.target.value)
                      }
                      placeholder="Example: 3 years"
                      className={inputClass(errors?.licenseDuration)}
                    />
                    {errors?.licenseDuration ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.licenseDuration}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-black">
                License Explanation
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {licenseExplanation}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Terms / Notes
            </label>
            <textarea
              rows={3}
              value={value.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Example: 1.5% monthly late fee applies. Final files delivered after full payment."
              className="w-full rounded-xl border border-gray-300 p-3 text-sm text-black outline-none focus:border-black"
            />
          </div>

          {!isInternational ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={value.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    placeholder="Bank name"
                    className={inputClass(errors?.bankName)}
                  />
                  {errors?.bankName ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.bankName}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={value.accountName}
                    onChange={(e) => updateField("accountName", e.target.value)}
                    placeholder="Name on bank account"
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm text-black outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={value.accountNumber}
                    onChange={(e) => updateField("accountNumber", e.target.value)}
                    placeholder="Bank account number"
                    className={inputClass(errors?.accountNumber)}
                  />
                  {errors?.accountNumber ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.accountNumber}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={value.ifscCode}
                    onChange={(e) => updateField("ifscCode", e.target.value)}
                    placeholder="Bank IFSC code"
                    className={inputClass(errors?.ifscCode)}
                  />
                  {errors?.ifscCode ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.ifscCode}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-black">Payment QR</p>

                  {value.qrCodeUrl ? (
                    <button
                      type="button"
                      onClick={removeQr}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-400 hover:bg-red-50"
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
                  className={`flex min-h-[180px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed bg-white p-4 text-center text-sm transition ${
                    isQrDragOver
                      ? "border-black text-black"
                      : "border-gray-300 text-gray-500 hover:border-black"
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
                      className="max-h-[150px] w-auto object-contain"
                    />
                  ) : (
                    <div>
                      Drag & drop QR here
                      <br />
                      or click to upload
                      <br />
                      <span className="text-xs text-gray-400">PNG, JPG, SVG</span>
                    </div>
                  )}
                </label>

                <p className="mt-3 text-xs leading-5 text-gray-500">
                  Upload or drop a payment QR image to show it in invoice preview
                  and export.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <p className="text-sm font-medium text-black">
                  International Wire Details
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Share bank transfer details for international client payments.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Beneficiary / Account Name
                  </label>
                  <input
                    type="text"
                    value={value.accountName}
                    onChange={(e) => updateField("accountName", e.target.value)}
                    placeholder="Beneficiary name on bank account"
                    className={inputClass(errors?.accountName)}
                  />
                  {errors?.accountName ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.accountName}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={value.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    placeholder="Receiving bank name"
                    className={inputClass(errors?.bankName)}
                  />
                  {errors?.bankName ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.bankName}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Bank Full Address
                  </label>
                  <textarea
                    rows={3}
                    value={value.bankAddress}
                    onChange={(e) => updateField("bankAddress", e.target.value)}
                    placeholder="Full bank branch address"
                    className={inputClass(errors?.bankAddress)}
                  />
                  {errors?.bankAddress ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.bankAddress}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={value.accountNumber}
                    onChange={(e) => updateField("accountNumber", e.target.value)}
                    placeholder="Bank account number"
                    className={inputClass(errors?.accountNumber)}
                  />
                  {errors?.accountNumber ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.accountNumber}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    SWIFT / BIC Code
                  </label>
                  <input
                    type="text"
                    value={value.swiftBicCode}
                    onChange={(e) => updateField("swiftBicCode", e.target.value)}
                    placeholder="Bank SWIFT or BIC code"
                    className={inputClass(errors?.swiftBicCode)}
                  />
                  {errors?.swiftBicCode ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.swiftBicCode}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black">
                    IBAN / Routing / Sort Code
                  </label>
                  <input
                    type="text"
                    value={value.ibanRoutingCode}
                    onChange={(e) =>
                      updateField("ibanRoutingCode", e.target.value)
                    }
                    placeholder="IBAN, routing number, or sort code"
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm text-black outline-none focus:border-black"
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
