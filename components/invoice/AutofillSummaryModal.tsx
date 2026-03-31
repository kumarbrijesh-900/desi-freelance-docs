"use client";

import type { ReactNode } from "react";
import ChoiceCards from "@/components/ui/ChoiceCards";
import type { InvoiceFieldErrors } from "@/lib/invoice-validation";
import { requiresExplicitExportTaxChoice } from "@/lib/invoice-compliance";
import type {
  BriefClarificationAction,
  BriefAutofillFieldSummary,
  BriefClarificationSuggestion,
} from "@/lib/invoice-brief-intake";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  INTERNATIONAL_CURRENCY_OPTIONS,
} from "@/lib/international-billing-options";
import type {
  InvoiceFormData,
  InvoiceLineItemType,
  InvoiceRateUnit,
  InvoiceStepperStep,
} from "@/types/invoice";

interface AutofillSummaryModalProps {
  confidentFields: BriefAutofillFieldSummary[];
  inferredFields: BriefAutofillFieldSummary[];
  lowConfidenceFields: BriefAutofillFieldSummary[];
  clarificationSuggestions: BriefClarificationSuggestion[];
  missingFieldGroups: Array<{
    step: InvoiceStepperStep;
    fields: string[];
  }>;
  recommendedStep: InvoiceStepperStep;
  formData: InvoiceFormData;
  fieldErrors: InvoiceFieldErrors;
  isInlineFormOpen: boolean;
  isPreviewReady: boolean;
  onClarificationAnswer: (
    suggestionId: string,
    action: BriefClarificationAction
  ) => void;
  onFormDataChange: (
    updater: (prev: InvoiceFormData) => InvoiceFormData
  ) => void;
  onClose: () => void;
  onManualCheck: () => void;
  onOpenFillMissing: () => void;
  onPreview: () => void;
}

const lineItemTypeOptions: InvoiceLineItemType[] = [
  "Logo Design",
  "UI/UX",
  "Illustration",
  "Photography",
  "Video Editing",
  "Social Media",
  "Other",
];

const rateUnitOptions: Array<{
  value: InvoiceRateUnit;
  label: string;
}> = [
  { value: "per-deliverable", label: "Per deliverable" },
  { value: "per-item", label: "Per item" },
  { value: "per-screen", label: "Per screen" },
  { value: "per-hour", label: "Per hour" },
  { value: "per-day", label: "Per day" },
  { value: "per-revision", label: "Per revision" },
  { value: "per-concept", label: "Per concept" },
  { value: "per-post", label: "Per post" },
  { value: "per-video", label: "Per video" },
  { value: "per-image", label: "Per image" },
];

function getStepLabel(step: InvoiceStepperStep) {
  switch (step) {
    case "agency":
      return "Agency Details";
    case "client":
      return "Client Details";
    case "deliverables":
      return "Deliverables";
    case "payment":
      return "Payment & Terms";
    case "meta":
      return "Invoice Meta";
    case "totals":
      return "Compliance";
    default:
      return "Invoice";
  }
}

function getOriginLabel(origin: BriefAutofillFieldSummary["origin"]) {
  return origin === "ai" ? "AI" : "Parser";
}

function getInputClass(hasError?: string) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm text-black outline-none transition focus:border-black ${
    hasError ? "border-red-400 bg-red-50/30" : "border-gray-300 bg-white"
  }`;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-medium text-red-600">{message}</p>;
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-black">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SummaryFieldList({
  fields,
}: {
  fields: BriefAutofillFieldSummary[];
}) {
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-800">
      {fields.map((field) => (
        <li
          key={`${field.step}-${field.label}-${field.origin}-${field.confidence}`}
          className="flex items-start justify-between gap-3"
        >
          <span>{field.label}</span>
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
            {getOriginLabel(field.origin)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MiniForm({
  formData,
  fieldErrors,
  visibleSteps,
  onFormDataChange,
}: {
  formData: InvoiceFormData;
  fieldErrors: InvoiceFieldErrors;
  visibleSteps: Set<InvoiceStepperStep>;
  onFormDataChange: (
    updater: (prev: InvoiceFormData) => InvoiceFormData
  ) => void;
}) {
  const showComplianceSection =
    visibleSteps.has("agency") ||
    visibleSteps.has("totals") ||
    formData.agency.gstRegistrationStatus === "registered";
  const showInternationalClientFields =
    formData.client.clientLocation === "international";
  const showLicenseDuration =
    formData.payment.license.isLicenseIncluded &&
    (formData.payment.license.licenseType === "exclusive-license" ||
      formData.payment.license.licenseType === "non-exclusive-license");
  const needsExportChoice = requiresExplicitExportTaxChoice(
    formData.agency,
    formData.client
  );

  const updateLineItem = (
    lineItemId: string,
    updater: (current: InvoiceFormData["lineItems"][number]) => InvoiceFormData["lineItems"][number]
  ) => {
    onFormDataChange((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === lineItemId ? updater(item) : item
      ),
    }));
  };

  return (
    <div className="space-y-4">
      {visibleSteps.has("agency") ? (
        <SectionCard
          title="Agency Details"
          subtitle="Complete the core agency fields needed for a valid invoice."
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Agency Name *
            </label>
            <input
              type="text"
              value={formData.agency.agencyName}
              onChange={(event) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  agency: {
                    ...prev.agency,
                    agencyName: event.target.value,
                  },
                }))
              }
              className={getInputClass(fieldErrors.agency.agencyName)}
            />
            <ErrorText message={fieldErrors.agency.agencyName} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Address *
            </label>
            <textarea
              rows={3}
              value={formData.agency.address}
              onChange={(event) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  agency: {
                    ...prev.agency,
                    address: event.target.value,
                  },
                }))
              }
              className={getInputClass(fieldErrors.agency.address)}
            />
            <ErrorText message={fieldErrors.agency.address} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Agency State *
            </label>
            <select
              value={formData.agency.agencyState}
              onChange={(event) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  agency: {
                    ...prev.agency,
                    agencyState: event.target.value as InvoiceFormData["agency"]["agencyState"],
                  },
                }))
              }
              className={getInputClass(fieldErrors.agency.agencyState)}
            >
              <option value="">Select state or union territory</option>
              {INDIA_STATE_OPTIONS.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
            <ErrorText message={fieldErrors.agency.agencyState} />
          </div>
        </SectionCard>
      ) : null}

      {showComplianceSection ? (
        <SectionCard
          title="Compliance"
          subtitle="Finish the GST and export-compliance choices required by the current invoice logic."
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              GST Registration
            </label>
            <ChoiceCards
              name="modal-gst-registration"
              variant="segmented"
              columns={2}
              value={formData.agency.gstRegistrationStatus}
              options={[
                {
                  value: "registered",
                  label: "Registered",
                },
                {
                  value: "not-registered",
                  label: "Not Registered",
                },
              ]}
              onChange={(value) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  agency: {
                    ...prev.agency,
                    gstRegistrationStatus: value,
                  },
                }))
              }
            />
          </div>

          {formData.agency.gstRegistrationStatus === "registered" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                GSTIN *
              </label>
              <input
                type="text"
                value={formData.agency.gstin}
                onChange={(event) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    agency: {
                      ...prev.agency,
                      gstin: event.target.value
                        .toUpperCase()
                        .replace(/\s+/g, ""),
                    },
                  }))
                }
                className={getInputClass(fieldErrors.agency.gstin)}
              />
              <ErrorText message={fieldErrors.agency.gstin} />
            </div>
          ) : null}

          {formData.agency.gstRegistrationStatus === "registered" &&
          formData.client.clientLocation === "international" ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  Valid LUT for current financial year?
                </label>
                <ChoiceCards
                  name="modal-lut-availability"
                  variant="segmented"
                  columns={2}
                  value={formData.agency.lutAvailability}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  onChange={(value) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      agency: {
                        ...prev.agency,
                        lutAvailability: value,
                      },
                    }))
                  }
                />
              </div>

              {formData.agency.lutAvailability === "yes" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    LUT Number / ARN
                  </label>
                  <input
                    type="text"
                    value={formData.agency.lutNumber}
                    onChange={(event) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        agency: {
                          ...prev.agency,
                          lutNumber: event.target.value,
                        },
                      }))
                    }
                    className={getInputClass()}
                    placeholder="Optional but recommended"
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {needsExportChoice ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Export tax handling *
              </label>
              <ChoiceCards
                name="modal-export-tax-choice"
                value={formData.agency.noLutTaxHandling}
                options={[
                  {
                    value: "add-igst",
                    label: "Add 18% IGST",
                    description: "Charge IGST directly on the client invoice.",
                  },
                  {
                    value: "keep-zero-tax",
                    label: "Keep client invoice at 0%",
                    description:
                      "Keep the client-facing invoice tax-clean and handle IGST separately.",
                  },
                ]}
                onChange={(value) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    agency: {
                      ...prev.agency,
                      noLutTaxHandling: value,
                    },
                  }))
                }
              />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {visibleSteps.has("client") ? (
        <SectionCard
          title="Client Details"
          subtitle="Complete the billing identity and location needed for the invoice."
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Client Name *
            </label>
            <input
              type="text"
              value={formData.client.clientName}
              onChange={(event) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  client: {
                    ...prev.client,
                    clientName: event.target.value,
                  },
                }))
              }
              className={getInputClass(fieldErrors.client.clientName)}
            />
            <ErrorText message={fieldErrors.client.clientName} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Client Address *
            </label>
            <textarea
              rows={3}
              value={formData.client.clientAddress}
              onChange={(event) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  client: {
                    ...prev.client,
                    clientAddress: event.target.value,
                  },
                }))
              }
              className={getInputClass(fieldErrors.client.clientAddress)}
            />
            <ErrorText message={fieldErrors.client.clientAddress} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Client Location
            </label>
            <ChoiceCards
              name="modal-client-location"
              variant="segmented"
              columns={2}
              value={formData.client.clientLocation}
              options={[
                { value: "domestic", label: "Domestic (India)" },
                { value: "international", label: "International" },
              ]}
              onChange={(value) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  client: {
                    ...prev.client,
                    clientLocation: value,
                    clientCountry:
                      value === "domestic" ? "" : prev.client.clientCountry,
                    clientState:
                      value === "international" ? "" : prev.client.clientState,
                  },
                }))
              }
            />
          </div>

          {showInternationalClientFields ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  Country *
                </label>
                <select
                  value={formData.client.clientCountry}
                  onChange={(event) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      client: {
                        ...prev.client,
                        clientCountry:
                          event.target.value as InvoiceFormData["client"]["clientCountry"],
                      },
                    }))
                  }
                  className={getInputClass(fieldErrors.client.clientCountry)}
                >
                  <option value="">Select country</option>
                  {INTERNATIONAL_COUNTRY_OPTIONS.map((countryName) => (
                    <option key={countryName} value={countryName}>
                      {countryName}
                    </option>
                  ))}
                </select>
                <ErrorText message={fieldErrors.client.clientCountry} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  Currency
                </label>
                <select
                  value={formData.client.clientCurrency}
                  onChange={(event) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      client: {
                        ...prev.client,
                        clientCurrency:
                          event.target.value as InvoiceFormData["client"]["clientCurrency"],
                      },
                    }))
                  }
                  className={getInputClass()}
                >
                  <option value="">Keep INR as primary</option>
                  {INTERNATIONAL_CURRENCY_OPTIONS.map((currencyOption) => (
                    <option key={currencyOption.code} value={currencyOption.code}>
                      {currencyOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Client State *
              </label>
              <select
                value={formData.client.clientState}
                onChange={(event) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    client: {
                      ...prev.client,
                      clientState:
                        event.target.value as InvoiceFormData["client"]["clientState"],
                    },
                  }))
                }
                className={getInputClass(fieldErrors.client.clientState)}
              >
                <option value="">Select state or union territory</option>
                {INDIA_STATE_OPTIONS.map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </select>
              <ErrorText message={fieldErrors.client.clientState} />
            </div>
          )}
        </SectionCard>
      ) : null}

      {visibleSteps.has("deliverables") ? (
        <SectionCard
          title="Deliverables"
          subtitle="Complete the required line-item details for the invoice."
        >
          {formData.lineItems.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <p className="text-sm font-semibold text-black">
                Line Item {index + 1}
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Type
                  </label>
                  <select
                    value={item.type}
                    onChange={(event) =>
                      updateLineItem(item.id, (current) => ({
                        ...current,
                        type: event.target.value as InvoiceLineItemType,
                      }))
                    }
                    className={getInputClass()}
                  >
                    {lineItemTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Rate Unit
                  </label>
                  <select
                    value={item.rateUnit}
                    onChange={(event) =>
                      updateLineItem(item.id, (current) => ({
                        ...current,
                        rateUnit: event.target.value as InvoiceRateUnit,
                      }))
                    }
                    className={getInputClass()}
                  >
                    {rateUnitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) =>
                      updateLineItem(item.id, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className={getInputClass(fieldErrors.lineItems[item.id]?.description)}
                  />
                  <ErrorText message={fieldErrors.lineItems[item.id]?.description} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(event) =>
                      updateLineItem(item.id, (current) => ({
                        ...current,
                        qty: Number(event.target.value),
                      }))
                    }
                    className={getInputClass(fieldErrors.lineItems[item.id]?.qty)}
                  />
                  <ErrorText message={fieldErrors.lineItems[item.id]?.qty} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Rate *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={item.rate}
                    onChange={(event) =>
                      updateLineItem(item.id, (current) => ({
                        ...current,
                        rate: Number(event.target.value),
                      }))
                    }
                    className={getInputClass(fieldErrors.lineItems[item.id]?.rate)}
                  />
                  <ErrorText message={fieldErrors.lineItems[item.id]?.rate} />
                </div>
              </div>
            </div>
          ))}
        </SectionCard>
      ) : null}

      {visibleSteps.has("payment") ? (
        <SectionCard
          title="Payment & Terms"
          subtitle="Complete the active payment-mode requirements for this invoice."
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Payment Terms *
            </label>
            <input
              type="text"
              value={formData.meta.paymentTerms}
              onChange={(event) =>
                onFormDataChange((prev) => ({
                  ...prev,
                  meta: {
                    ...prev.meta,
                    paymentTerms: event.target.value,
                  },
                }))
              }
              className={getInputClass(fieldErrors.meta.paymentTerms)}
            />
            <ErrorText message={fieldErrors.meta.paymentTerms} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {showInternationalClientFields ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  Beneficiary / Account Name *
                </label>
                <input
                  type="text"
                  value={formData.payment.accountName}
                  onChange={(event) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        accountName: event.target.value,
                      },
                    }))
                  }
                  className={getInputClass(fieldErrors.payment.accountName)}
                />
                <ErrorText message={fieldErrors.payment.accountName} />
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Bank Name *
              </label>
              <input
                type="text"
                value={formData.payment.bankName}
                onChange={(event) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    payment: {
                      ...prev.payment,
                      bankName: event.target.value,
                    },
                  }))
                }
                className={getInputClass(fieldErrors.payment.bankName)}
              />
              <ErrorText message={fieldErrors.payment.bankName} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Account Number *
              </label>
              <input
                type="text"
                value={formData.payment.accountNumber}
                onChange={(event) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    payment: {
                      ...prev.payment,
                      accountNumber: event.target.value,
                    },
                  }))
                }
                className={getInputClass(fieldErrors.payment.accountNumber)}
              />
              <ErrorText message={fieldErrors.payment.accountNumber} />
            </div>

            {showInternationalClientFields ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    SWIFT / BIC Code *
                  </label>
                  <input
                    type="text"
                    value={formData.payment.swiftBicCode}
                    onChange={(event) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        payment: {
                          ...prev.payment,
                          swiftBicCode: event.target.value
                            .toUpperCase()
                            .replace(/\s+/g, ""),
                        },
                      }))
                    }
                    className={getInputClass(fieldErrors.payment.swiftBicCode)}
                  />
                  <ErrorText message={fieldErrors.payment.swiftBicCode} />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Bank Full Address *
                  </label>
                  <textarea
                    rows={3}
                    value={formData.payment.bankAddress}
                    onChange={(event) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        payment: {
                          ...prev.payment,
                          bankAddress: event.target.value,
                        },
                      }))
                    }
                    className={getInputClass(fieldErrors.payment.bankAddress)}
                  />
                  <ErrorText message={fieldErrors.payment.bankAddress} />
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  value={formData.payment.ifscCode}
                  onChange={(event) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        ifscCode: event.target.value
                          .toUpperCase()
                          .replace(/\s+/g, ""),
                      },
                    }))
                  }
                  className={getInputClass(fieldErrors.payment.ifscCode)}
                />
                <ErrorText message={fieldErrors.payment.ifscCode} />
              </div>
            )}

            {showLicenseDuration ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  License Duration *
                </label>
                <input
                  type="text"
                  value={formData.payment.license.licenseDuration}
                  onChange={(event) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        license: {
                          ...prev.payment.license,
                          licenseDuration: event.target.value,
                        },
                      },
                    }))
                  }
                  className={getInputClass(fieldErrors.payment.licenseDuration)}
                />
                <ErrorText message={fieldErrors.payment.licenseDuration} />
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {visibleSteps.has("meta") ? (
        <SectionCard
          title="Invoice Meta"
          subtitle="Complete the required document dates and invoice reference."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Invoice Number *
              </label>
              <input
                type="text"
                value={formData.meta.invoiceNumber}
                onChange={(event) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      invoiceNumber: event.target.value,
                    },
                  }))
                }
                className={getInputClass(fieldErrors.meta.invoiceNumber)}
              />
              <ErrorText message={fieldErrors.meta.invoiceNumber} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.meta.invoiceDate}
                onChange={(event) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      invoiceDate: event.target.value,
                    },
                  }))
                }
                className={getInputClass(fieldErrors.meta.invoiceDate)}
              />
              <ErrorText message={fieldErrors.meta.invoiceDate} />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-black">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.meta.dueDate}
                onChange={(event) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      dueDate: event.target.value,
                    },
                  }))
                }
                className={getInputClass(fieldErrors.meta.dueDate)}
              />
              <ErrorText message={fieldErrors.meta.dueDate} />
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

export default function AutofillSummaryModal({
  confidentFields,
  inferredFields,
  lowConfidenceFields,
  clarificationSuggestions,
  missingFieldGroups,
  recommendedStep,
  formData,
  fieldErrors,
  isInlineFormOpen,
  isPreviewReady,
  onClarificationAnswer,
  onFormDataChange,
  onClose,
  onManualCheck,
  onOpenFillMissing,
  onPreview,
}: AutofillSummaryModalProps) {
  const missingFieldsCount = missingFieldGroups.reduce(
    (count, group) => count + group.fields.length,
    0
  );
  const visibleSteps = new Set(missingFieldGroups.map((group) => group.step));

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/35 px-4 py-4">
      <div className="flex max-h-[min(92vh,960px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                Autofill Summary
              </p>
              <h2 className="mt-1 text-2xl font-bold text-black">
                Finish the invoice from extracted details
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                AI filled what it could. You can confirm ambiguities here,
                complete any missing required fields inside this modal, or jump
                back to the editor for a manual check. Recommended next stop:{" "}
                <span className="font-medium text-black">
                  {getStepLabel(recommendedStep)}
                </span>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-black hover:border-black"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-6 py-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black">
                Needs confirmation
              </p>
              {clarificationSuggestions.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {clarificationSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="text-sm font-semibold text-black">
                        {suggestion.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-700">
                        {suggestion.message}
                      </p>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">
                        Review in {getStepLabel(suggestion.step)}
                      </p>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {suggestion.options.map((option) => (
                          <button
                            key={`${suggestion.id}-${option.id}`}
                            type="button"
                            onClick={() =>
                              onClarificationAnswer(suggestion.id, option.action)
                            }
                            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left text-sm font-medium text-black transition hover:border-black"
                          >
                            <span>{option.label}</span>
                            {option.helper ? (
                              <span className="mt-1 block text-xs font-normal leading-5 text-gray-600">
                                {option.helper}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  No high-value confirmation questions are blocking the current
                  autofill result.
                </p>
              )}
            </div>

            {isInlineFormOpen ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-black">
                    Fill Missing Details
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Complete the remaining required fields here. The same
                    invoice state updates live as you type.
                  </p>
                </div>

                {visibleSteps.size > 0 ? (
                  <MiniForm
                    formData={formData}
                    fieldErrors={fieldErrors}
                    visibleSteps={visibleSteps}
                    onFormDataChange={onFormDataChange}
                  />
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    All currently required fields are complete. You can preview
                    the invoice now or switch to a manual check if you want one
                    more pass in the full editor.
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-950">
                  Confidently filled
                </p>
                {confidentFields.length > 0 ? (
                  <SummaryFieldList fields={confidentFields} />
                ) : (
                  <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                    No high-confidence fields were autofilled yet.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">
                  Inferred and autofilled
                </p>
                {inferredFields.length > 0 ? (
                  <SummaryFieldList fields={inferredFields} />
                ) : (
                  <p className="mt-3 text-sm leading-6 text-amber-900/80">
                    No medium-confidence inferred fields were applied.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-black">
                  Needs review
                </p>
                {lowConfidenceFields.length > 0 ? (
                  <SummaryFieldList fields={lowConfidenceFields} />
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    No low-confidence fields were held back.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Missing required fields
                </p>
                {missingFieldGroups.length > 0 ? (
                  <div className="mt-3 space-y-4">
                    {missingFieldGroups.map((group) => (
                      <div key={group.step}>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                          {getStepLabel(group.step)}
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-900">
                          {group.fields.map((field) => (
                            <li key={`${group.step}-${field}`}>{field}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    All required fields are satisfied under the current invoice
                    logic.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              {isPreviewReady
                ? "The invoice is complete enough to preview safely."
                : missingFieldsCount > 0
                ? `${missingFieldsCount} required field${
                    missingFieldsCount === 1 ? "" : "s"
                  } still need attention before preview is unlocked.`
                : "Review the extracted details or keep working in the editor."}
            </p>

            <div className="flex flex-wrap justify-end gap-3">
              {missingFieldsCount > 0 && !isInlineFormOpen ? (
                <button
                  type="button"
                  onClick={onOpenFillMissing}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-black hover:border-black"
                >
                  Fill Missing Details
                </button>
              ) : null}

              <button
                type="button"
                onClick={onManualCheck}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-black hover:border-black"
              >
                Manual Check
              </button>

              {isPreviewReady ? (
                <button
                  type="button"
                  onClick={onPreview}
                  className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Preview & Download
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
