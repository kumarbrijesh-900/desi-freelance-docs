"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
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
  onBackToSummary: () => void;
  onManualCheck: () => void;
  onOpenFillMissing: () => void;
  onPreview: () => void;
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

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

function getFieldClass(params?: {
  hasError?: string;
  hasValue?: boolean;
  multiline?: boolean;
  isSelect?: boolean;
}) {
  const { hasError, hasValue, multiline, isSelect } = params ?? {};

  return cn(
    "w-full rounded-2xl border text-[15px] font-medium leading-6 text-slate-950 outline-none transition-all duration-150",
    multiline ? "min-h-[120px] px-4 py-3.5" : "h-12 px-4",
    isSelect ? "appearance-none pr-11" : "",
    "placeholder:text-slate-400/95",
    "hover:border-slate-400 hover:bg-white",
    "focus:border-slate-950 focus:bg-white focus:ring-[3px] focus:ring-slate-950/12",
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65",
    hasError
      ? "border-red-400 bg-red-50/60 focus:border-red-500 focus:ring-red-500/12"
      : hasValue
      ? "border-slate-400 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
      : "border-slate-300 bg-slate-50/70"
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-medium leading-5 text-red-600">{message}</p>;
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2.5 block text-sm font-medium tracking-tight text-slate-900">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

function ModalButton({
  children,
  variant = "secondary",
  onClick,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold tracking-tight transition-all duration-150 focus:outline-none focus:ring-[3px] focus:ring-slate-950/12 disabled:pointer-events-none disabled:opacity-55",
        variant === "primary"
          ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] hover:bg-slate-800"
          : variant === "ghost"
          ? "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950"
          : "border border-slate-300 bg-white text-slate-950 hover:border-slate-950 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "success" | "warning" | "muted";
  children: ReactNode;
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "muted"
      ? "border-slate-200 bg-slate-50"
      : "border-slate-200 bg-white";

  return (
    <div
      className={cn(
        "rounded-[26px] border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-150",
        toneClasses
      )}
    >
      <p className="text-sm font-semibold tracking-tight text-slate-950">{title}</p>
      {children}
    </div>
  );
}

function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModalSelect({
  value,
  hasError,
  hasValue,
  onChange,
  children,
}: {
  value: string;
  hasError?: string;
  hasValue?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={getFieldClass({
          hasError,
          hasValue,
          isSelect: true,
        })}
      >
        {children}
      </select>
      <SelectChevron />
    </div>
  );
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
    <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-150">
      <div className="mb-5">
        <p className="text-sm font-semibold tracking-tight text-slate-950">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function ModalSegmentedControl<T extends string>({
  name,
  value,
  options,
  columns = 2,
  onChange,
}: {
  name: string;
  value: T | "";
  options: Array<{
    value: T;
    label: string;
    description?: string;
  }>;
  columns?: 1 | 2;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        "grid gap-2 rounded-[20px] border border-slate-200 bg-slate-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        columns === 2 ? "sm:grid-cols-2" : ""
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-[46px] rounded-2xl border px-4 py-2.5 text-left text-sm transition-all duration-150 focus:outline-none focus:ring-[3px] focus:ring-slate-950/10",
              selected
                ? "border-slate-900/15 bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "border-transparent bg-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900"
            )}
          >
            <span className="block font-medium">{option.label}</span>
            {option.description ? (
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ModalChoiceCardGroup<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | "";
  options: Array<{
    value: T;
    label: string;
    description?: string;
  }>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-3 md:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-[108px] rounded-[22px] border px-4 py-4 text-left transition-all duration-150 focus:outline-none focus:ring-[3px] focus:ring-slate-950/10",
              selected
                ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:shadow-[0_6px_16px_rgba(15,23,42,0.05)]"
            )}
          >
            <span className="block text-sm font-semibold tracking-tight">
              {option.label}
            </span>
            {option.description ? (
              <span
                className={`mt-2 block text-xs leading-5 ${
                  selected ? "text-white/80" : "text-slate-500"
                }`}
              >
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
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
  const showInternationalClientFields =
    formData.client.clientLocation === "international";
  const needsExportChoice = requiresExplicitExportTaxChoice(
    formData.agency,
    formData.client
  );
  const showComplianceSection =
    Boolean(fieldErrors.agency.gstin) ||
    (visibleSteps.has("totals") && needsExportChoice);
  const showLicenseDuration =
    Boolean(fieldErrors.payment.licenseDuration) &&
    formData.payment.license.isLicenseIncluded &&
    (formData.payment.license.licenseType === "exclusive-license" ||
      formData.payment.license.licenseType === "non-exclusive-license");
  const showAgencyBasics =
    visibleSteps.has("agency") &&
    Boolean(
      fieldErrors.agency.agencyName ||
        fieldErrors.agency.address ||
        fieldErrors.agency.agencyState
    );
  const showClientSection =
    visibleSteps.has("client") &&
    Boolean(
      fieldErrors.client.clientName ||
        fieldErrors.client.clientAddress ||
        fieldErrors.client.clientState ||
        fieldErrors.client.clientCountry
    );
  const showDeliverablesSection =
    visibleSteps.has("deliverables") &&
    formData.lineItems.some((item) => Boolean(fieldErrors.lineItems[item.id]));
  const showPaymentSection =
    visibleSteps.has("payment") &&
    Boolean(
      fieldErrors.meta.paymentTerms ||
        fieldErrors.payment.accountName ||
        fieldErrors.payment.bankName ||
        fieldErrors.payment.accountNumber ||
        fieldErrors.payment.ifscCode ||
        fieldErrors.payment.bankAddress ||
        fieldErrors.payment.swiftBicCode ||
        fieldErrors.payment.licenseDuration
    );
  const showMetaSection =
    visibleSteps.has("meta") &&
    Boolean(
      fieldErrors.meta.invoiceNumber ||
        fieldErrors.meta.invoiceDate ||
        fieldErrors.meta.dueDate
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
    <div className="space-y-5">
      {showAgencyBasics ? (
        <SectionCard
          title="Agency Details"
          subtitle="Only the agency fields still blocking validation are shown here."
        >
          {fieldErrors.agency.agencyName ? (
            <div>
              <FieldLabel required>Agency Name</FieldLabel>
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
                className={getFieldClass({
                  hasError: fieldErrors.agency.agencyName,
                  hasValue: Boolean(formData.agency.agencyName),
                })}
                placeholder="Your agency or freelance brand name"
              />
              <ErrorText message={fieldErrors.agency.agencyName} />
            </div>
          ) : null}

          {fieldErrors.agency.address ? (
            <div>
              <FieldLabel required>Address</FieldLabel>
              <textarea
                rows={4}
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
                className={getFieldClass({
                  hasError: fieldErrors.agency.address,
                  hasValue: Boolean(formData.agency.address),
                  multiline: true,
                })}
                placeholder="Business address"
              />
              <ErrorText message={fieldErrors.agency.address} />
            </div>
          ) : null}

          {fieldErrors.agency.agencyState ? (
            <div>
              <FieldLabel required>Agency State</FieldLabel>
              <ModalSelect
                value={formData.agency.agencyState}
                onChange={(value) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    agency: {
                      ...prev.agency,
                      agencyState:
                        value as InvoiceFormData["agency"]["agencyState"],
                    },
                  }))
                }
                hasError={fieldErrors.agency.agencyState}
                hasValue={Boolean(formData.agency.agencyState)}
              >
                <option value="">Select state or union territory</option>
                {INDIA_STATE_OPTIONS.map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </ModalSelect>
              <ErrorText message={fieldErrors.agency.agencyState} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {showComplianceSection ? (
        <SectionCard
          title="Compliance"
          subtitle="These controls affect GST, LUT, and export-tax readiness for the current invoice."
        >
          <div>
            <FieldLabel>GST Registration</FieldLabel>
            <ModalSegmentedControl
              name="modal-gst-registration"
              columns={2}
              value={formData.agency.gstRegistrationStatus}
              options={[
                { value: "registered", label: "Registered" },
                { value: "not-registered", label: "Not Registered" },
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

          {formData.agency.gstRegistrationStatus === "registered" &&
          fieldErrors.agency.gstin ? (
            <div>
              <FieldLabel required>GSTIN</FieldLabel>
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
                className={getFieldClass({
                  hasError: fieldErrors.agency.gstin,
                  hasValue: Boolean(formData.agency.gstin),
                })}
                placeholder="Agency GSTIN"
              />
              <ErrorText message={fieldErrors.agency.gstin} />
            </div>
          ) : null}

          {formData.agency.gstRegistrationStatus === "registered" &&
          formData.client.clientLocation === "international" ? (
            <>
              <div>
                <FieldLabel>Valid LUT for current financial year?</FieldLabel>
                <ModalSegmentedControl
                  name="modal-lut-availability"
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
                  <FieldLabel>LUT Number / ARN</FieldLabel>
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
                    className={getFieldClass({
                      hasValue: Boolean(formData.agency.lutNumber),
                    })}
                    placeholder="Optional but recommended"
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {needsExportChoice ? (
            <div>
              <FieldLabel required>Export tax handling</FieldLabel>
              <ModalChoiceCardGroup
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

      {showClientSection ? (
        <SectionCard
          title="Client Details"
          subtitle="Only the client fields still required for billing are shown."
        >
          {fieldErrors.client.clientName ? (
            <div>
              <FieldLabel required>Client Name</FieldLabel>
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
                className={getFieldClass({
                  hasError: fieldErrors.client.clientName,
                  hasValue: Boolean(formData.client.clientName),
                })}
                placeholder="Client or company name"
              />
              <ErrorText message={fieldErrors.client.clientName} />
            </div>
          ) : null}

          {fieldErrors.client.clientAddress ? (
            <div>
              <FieldLabel required>Client Address</FieldLabel>
              <textarea
                rows={4}
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
                className={getFieldClass({
                  hasError: fieldErrors.client.clientAddress,
                  hasValue: Boolean(formData.client.clientAddress),
                  multiline: true,
                })}
                placeholder="Client billing address"
              />
              <ErrorText message={fieldErrors.client.clientAddress} />
            </div>
          ) : null}

          {(fieldErrors.client.clientState || fieldErrors.client.clientCountry) ? (
            <div>
              <FieldLabel>Client Location</FieldLabel>
              <ModalSegmentedControl
                name="modal-client-location"
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
          ) : null}

          {showInternationalClientFields && fieldErrors.client.clientCountry ? (
            <>
              <div>
                <FieldLabel required>Country</FieldLabel>
                <ModalSelect
                  value={formData.client.clientCountry}
                  onChange={(value) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      client: {
                        ...prev.client,
                        clientCountry:
                          value as InvoiceFormData["client"]["clientCountry"],
                      },
                    }))
                  }
                  hasError={fieldErrors.client.clientCountry}
                  hasValue={Boolean(formData.client.clientCountry)}
                >
                  <option value="">Select country</option>
                  {INTERNATIONAL_COUNTRY_OPTIONS.map((countryName) => (
                    <option key={countryName} value={countryName}>
                      {countryName}
                    </option>
                  ))}
                </ModalSelect>
                <ErrorText message={fieldErrors.client.clientCountry} />
              </div>

              <div>
                <FieldLabel>Currency</FieldLabel>
                <ModalSelect
                  value={formData.client.clientCurrency}
                  onChange={(value) =>
                    onFormDataChange((prev) => ({
                      ...prev,
                      client: {
                        ...prev.client,
                        clientCurrency:
                          value as InvoiceFormData["client"]["clientCurrency"],
                      },
                    }))
                  }
                  hasValue={Boolean(formData.client.clientCurrency)}
                >
                  <option value="">Keep INR as primary</option>
                  {INTERNATIONAL_CURRENCY_OPTIONS.map((currencyOption) => (
                    <option key={currencyOption.code} value={currencyOption.code}>
                      {currencyOption.label}
                    </option>
                  ))}
                </ModalSelect>
              </div>
            </>
          ) : null}

          {!showInternationalClientFields && fieldErrors.client.clientState ? (
            <div>
              <FieldLabel required>Client State</FieldLabel>
              <ModalSelect
                value={formData.client.clientState}
                onChange={(value) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    client: {
                      ...prev.client,
                      clientState:
                        value as InvoiceFormData["client"]["clientState"],
                    },
                  }))
                }
                hasError={fieldErrors.client.clientState}
                hasValue={Boolean(formData.client.clientState)}
              >
                <option value="">Select state or union territory</option>
                {INDIA_STATE_OPTIONS.map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </ModalSelect>
              <ErrorText message={fieldErrors.client.clientState} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {showDeliverablesSection ? (
        <SectionCard
          title="Deliverables"
          subtitle="Only the line-item fields still failing validation are shown."
        >
          {formData.lineItems.map((item, index) => {
            const itemErrors = fieldErrors.lineItems[item.id];

            if (!itemErrors) {
              return null;
            }

            return (
              <div
                key={item.id}
                className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-950">
                  Line Item {index + 1}
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {itemErrors.description ? (
                    <div className="md:col-span-2">
                      <FieldLabel required>Description</FieldLabel>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          updateLineItem(item.id, (current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className={getFieldClass({
                          hasError: itemErrors.description,
                          hasValue: Boolean(item.description),
                        })}
                        placeholder="Describe the deliverable"
                      />
                      <ErrorText message={itemErrors.description} />
                    </div>
                  ) : null}

                  {itemErrors.qty ? (
                    <div>
                      <FieldLabel required>Quantity</FieldLabel>
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
                        className={getFieldClass({
                          hasError: itemErrors.qty,
                          hasValue: item.qty > 0,
                        })}
                      />
                      <ErrorText message={itemErrors.qty} />
                    </div>
                  ) : null}

                  {itemErrors.rate ? (
                    <div>
                      <FieldLabel required>Rate</FieldLabel>
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
                        className={getFieldClass({
                          hasError: itemErrors.rate,
                          hasValue: item.rate > 0,
                        })}
                      />
                      <ErrorText message={itemErrors.rate} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </SectionCard>
      ) : null}

      {showPaymentSection ? (
        <SectionCard
          title="Payment & Terms"
          subtitle="Only the payment fields still needed for the active payment mode are shown."
        >
          {fieldErrors.meta.paymentTerms ? (
            <div>
              <FieldLabel required>Payment Terms</FieldLabel>
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
                className={getFieldClass({
                  hasError: fieldErrors.meta.paymentTerms,
                  hasValue: Boolean(formData.meta.paymentTerms),
                })}
                placeholder="Net 15, Due on receipt, or similar"
              />
              <ErrorText message={fieldErrors.meta.paymentTerms} />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {showInternationalClientFields && fieldErrors.payment.accountName ? (
              <div>
                <FieldLabel required>Beneficiary / Account Name</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.payment.accountName,
                    hasValue: Boolean(formData.payment.accountName),
                  })}
                />
                <ErrorText message={fieldErrors.payment.accountName} />
              </div>
            ) : null}

            {fieldErrors.payment.bankName ? (
              <div>
                <FieldLabel required>Bank Name</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.payment.bankName,
                    hasValue: Boolean(formData.payment.bankName),
                  })}
                />
                <ErrorText message={fieldErrors.payment.bankName} />
              </div>
            ) : null}

            {fieldErrors.payment.accountNumber ? (
              <div>
                <FieldLabel required>Account Number</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.payment.accountNumber,
                    hasValue: Boolean(formData.payment.accountNumber),
                  })}
                />
                <ErrorText message={fieldErrors.payment.accountNumber} />
              </div>
            ) : null}

            {!showInternationalClientFields && fieldErrors.payment.ifscCode ? (
              <div>
                <FieldLabel required>IFSC Code</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.payment.ifscCode,
                    hasValue: Boolean(formData.payment.ifscCode),
                  })}
                />
                <ErrorText message={fieldErrors.payment.ifscCode} />
              </div>
            ) : null}

            {showInternationalClientFields && fieldErrors.payment.swiftBicCode ? (
              <div>
                <FieldLabel required>SWIFT / BIC Code</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.payment.swiftBicCode,
                    hasValue: Boolean(formData.payment.swiftBicCode),
                  })}
                />
                <ErrorText message={fieldErrors.payment.swiftBicCode} />
              </div>
            ) : null}

            {showInternationalClientFields && fieldErrors.payment.bankAddress ? (
              <div className="md:col-span-2">
                <FieldLabel required>Bank Full Address</FieldLabel>
                <textarea
                  rows={4}
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
                  className={getFieldClass({
                    hasError: fieldErrors.payment.bankAddress,
                    hasValue: Boolean(formData.payment.bankAddress),
                    multiline: true,
                  })}
                />
                <ErrorText message={fieldErrors.payment.bankAddress} />
              </div>
            ) : null}

            {showLicenseDuration ? (
              <div>
                <FieldLabel required>License Duration</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.payment.licenseDuration,
                    hasValue: Boolean(formData.payment.license.licenseDuration),
                  })}
                />
                <ErrorText message={fieldErrors.payment.licenseDuration} />
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {showMetaSection ? (
        <SectionCard
          title="Invoice Meta"
          subtitle="Only the missing document reference and date fields are shown."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {fieldErrors.meta.invoiceNumber ? (
              <div>
                <FieldLabel required>Invoice Number</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.meta.invoiceNumber,
                    hasValue: Boolean(formData.meta.invoiceNumber),
                  })}
                  placeholder="INV-2026-001"
                />
                <ErrorText message={fieldErrors.meta.invoiceNumber} />
              </div>
            ) : null}

            {fieldErrors.meta.invoiceDate ? (
              <div>
                <FieldLabel required>Invoice Date</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.meta.invoiceDate,
                    hasValue: Boolean(formData.meta.invoiceDate),
                  })}
                />
                <ErrorText message={fieldErrors.meta.invoiceDate} />
              </div>
            ) : null}

            {fieldErrors.meta.dueDate ? (
              <div className={fieldErrors.meta.invoiceNumber || fieldErrors.meta.invoiceDate ? "" : "md:col-span-2 md:max-w-xs"}>
                <FieldLabel required>Due Date</FieldLabel>
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
                  className={getFieldClass({
                    hasError: fieldErrors.meta.dueDate,
                    hasValue: Boolean(formData.meta.dueDate),
                  })}
                />
                <ErrorText message={fieldErrors.meta.dueDate} />
              </div>
            ) : null}
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
  onBackToSummary,
  onManualCheck,
  onOpenFillMissing,
  onPreview,
}: AutofillSummaryModalProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const missingFieldsCount = useMemo(
    () =>
      missingFieldGroups.reduce((count, group) => count + group.fields.length, 0),
    [missingFieldGroups]
  );
  const visibleSteps = useMemo(
    () => new Set(missingFieldGroups.map((group) => group.step)),
    [missingFieldGroups]
  );
  const isSummaryMode = !isInlineFormOpen;

  useEffect(() => {
    if (isInlineFormOpen) {
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isInlineFormOpen]);

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/35 px-4 py-4 backdrop-blur-[2px]">
      <div className="flex max-h-[min(92vh,960px)] w-full max-w-[1080px] flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Autofill Summary
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                {isSummaryMode
                  ? "Finish the invoice from extracted details"
                  : "Complete the remaining invoice details"}
              </h2>
              {isSummaryMode ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  AI filled what it could. You can confirm ambiguities here,
                  complete missing required fields inside this modal, or jump
                  back to the editor for a manual check. Recommended next stop:{" "}
                  <span className="font-medium text-slate-950">
                    {getStepLabel(recommendedStep)}
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Only the remaining mandatory fields are shown below. Finish
                  them here, and preview will unlock automatically as soon as
                  the invoice passes the active validation rules.
                </p>
              )}
            </div>

            <ModalButton variant="secondary" onClick={onClose}>
              Close
            </ModalButton>
          </div>
        </div>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto bg-slate-50/90 px-5 py-5 sm:px-6"
        >
          {isSummaryMode ? (
            <div className="space-y-4 transition-opacity duration-150">
              <SummaryCard title="Needs confirmation">
                {clarificationSuggestions.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {clarificationSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                      >
                        <p className="text-sm font-semibold text-slate-950">
                          {suggestion.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {suggestion.message}
                        </p>
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
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
                              className="flex min-h-[72px] items-start rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-950 transition-all duration-150 hover:border-slate-950 hover:bg-slate-50 hover:shadow-[0_4px_14px_rgba(15,23,42,0.05)] focus:outline-none focus:ring-[3px] focus:ring-slate-950/10"
                            >
                              <span>
                                <span>{option.label}</span>
                                {option.helper ? (
                                  <span className="mt-1 block text-xs font-normal leading-5 text-slate-600">
                                    {option.helper}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    No high-value confirmation questions are blocking the current
                    autofill result.
                  </p>
                )}
              </SummaryCard>

              <div className="grid gap-4 xl:grid-cols-2">
                <SummaryCard title="Confidently filled" tone="success">
                  {confidentFields.length > 0 ? (
                    <SummaryFieldList fields={confidentFields} />
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                      No high-confidence fields were autofilled yet.
                    </p>
                  )}
                </SummaryCard>

                <SummaryCard title="Inferred and autofilled" tone="warning">
                  {inferredFields.length > 0 ? (
                    <SummaryFieldList fields={inferredFields} />
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-amber-900/80">
                      No medium-confidence inferred fields were applied.
                    </p>
                  )}
                </SummaryCard>

                <SummaryCard title="Needs review">
                  {lowConfidenceFields.length > 0 ? (
                    <SummaryFieldList fields={lowConfidenceFields} />
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      No low-confidence fields were held back.
                    </p>
                  )}
                </SummaryCard>

                <SummaryCard title="Missing required fields" tone="muted">
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
                </SummaryCard>
              </div>
            </div>
          ) : (
            <div className="space-y-5 transition-opacity duration-150">
              <SummaryCard title="Fill Missing Details">
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Finish the required invoice fields here. This form updates the
                  same invoice state live, and the preview action will appear as
                  soon as everything validates cleanly.
                </p>
              </SummaryCard>

              {visibleSteps.size > 0 ? (
                <MiniForm
                  formData={formData}
                  fieldErrors={fieldErrors}
                  visibleSteps={visibleSteps}
                  onFormDataChange={onFormDataChange}
                />
              ) : (
                <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  All currently required fields are complete. You can preview
                  the invoice now or switch to a manual check if you want one
                  more pass in the full editor.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {isPreviewReady
                ? "The invoice is complete enough to preview safely."
                : missingFieldsCount > 0
                ? `${missingFieldsCount} required field${
                    missingFieldsCount === 1 ? "" : "s"
                  } still need attention before preview is unlocked.`
                : isSummaryMode
                ? "Review the extracted details or keep working in the editor."
                : "Complete the remaining required fields here to unlock preview."}
            </p>

            <div className="flex flex-wrap justify-end gap-3">
              {missingFieldsCount > 0 && isSummaryMode ? (
                <ModalButton variant="secondary" onClick={onOpenFillMissing}>
                  Fill Missing Details
                </ModalButton>
              ) : null}

              {!isSummaryMode ? (
                <ModalButton variant="ghost" onClick={onBackToSummary}>
                  Back to Summary
                </ModalButton>
              ) : null}

              <ModalButton variant="secondary" onClick={onManualCheck}>
                Manual Check
              </ModalButton>

              {isPreviewReady ? (
                <ModalButton variant="primary" onClick={onPreview}>
                  Preview & Download
                </ModalButton>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
