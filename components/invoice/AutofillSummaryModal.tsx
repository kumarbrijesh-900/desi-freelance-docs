"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClipboardCheckIcon,
  DownloadIcon,
  SparklesIcon,
} from "@/components/ui/app-icons";
import {
  AnimatePresence,
  motion,
  MotionButton,
  MotionStagger,
} from "@/components/ui/motion-primitives";
import type { InvoiceFieldErrors } from "@/lib/invoice-validation";
import {
  hasExplicitExportTaxChoice,
  requiresExplicitExportTaxChoice,
} from "@/lib/invoice-compliance";
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
import {
  appMotionClasses,
  cn,
  getAppButtonClass,
  getAppFieldClass as getFieldClass,
  getAppPanelClass,
  getAppStatusPillClass,
} from "@/lib/ui-foundation";
import {
  appFieldGridClass,
  appFieldGridWideStartClass,
  appGroupGapClass,
  appMetaGridClass,
  appModalPaddingClass,
  appModalWidthClass,
  appSummaryGridClass,
} from "@/lib/layout-foundation";
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

type ModalSectionKey =
  | "agency"
  | "client"
  | "deliverables"
  | "payment"
  | "meta"
  | "totals";

type MissingFieldIdsBySection = Record<ModalSectionKey, string[]>;

const MODAL_SECTION_KEYS: ModalSectionKey[] = [
  "agency",
  "client",
  "deliverables",
  "payment",
  "meta",
  "totals",
];

function createEmptyMissingFieldIdsBySection(): MissingFieldIdsBySection {
  return {
    agency: [],
    client: [],
    deliverables: [],
    payment: [],
    meta: [],
    totals: [],
  };
}

function uniqFieldIds(fieldIds: string[]) {
  return Array.from(new Set(fieldIds));
}

function mergeMissingFieldIdsBySection(
  previous: MissingFieldIdsBySection,
  current: MissingFieldIdsBySection
) {
  const next = createEmptyMissingFieldIdsBySection();
  let hasChanges = false;

  for (const sectionKey of MODAL_SECTION_KEYS) {
    next[sectionKey] = uniqFieldIds([
      ...previous[sectionKey],
      ...current[sectionKey],
    ]);

    if (
      next[sectionKey].length !== previous[sectionKey].length ||
      next[sectionKey].some((fieldId, index) => fieldId !== previous[sectionKey][index])
    ) {
      hasChanges = true;
    }
  }

  return hasChanges ? next : previous;
}

function buildMissingFieldIdsBySection(params: {
  formData: InvoiceFormData;
  fieldErrors: InvoiceFieldErrors;
}): MissingFieldIdsBySection {
  const { formData, fieldErrors } = params;
  const sectionFieldIds = createEmptyMissingFieldIdsBySection();

  if (fieldErrors.agency.agencyName) sectionFieldIds.agency.push("agencyName");
  if (fieldErrors.agency.address) sectionFieldIds.agency.push("address");
  if (fieldErrors.agency.agencyState) sectionFieldIds.agency.push("agencyState");
  if (fieldErrors.agency.gstin) sectionFieldIds.totals.push("gstin");

  if (fieldErrors.client.clientName) sectionFieldIds.client.push("clientName");
  if (fieldErrors.client.clientAddress) sectionFieldIds.client.push("clientAddress");
  if (fieldErrors.client.clientState) sectionFieldIds.client.push("clientState");
  if (fieldErrors.client.clientCountry) sectionFieldIds.client.push("clientCountry");

  if (fieldErrors.meta.paymentTerms) sectionFieldIds.payment.push("paymentTerms");
  if (fieldErrors.meta.invoiceNumber) sectionFieldIds.meta.push("invoiceNumber");
  if (fieldErrors.meta.invoiceDate) sectionFieldIds.meta.push("invoiceDate");
  if (fieldErrors.meta.dueDate) sectionFieldIds.meta.push("dueDate");

  if (fieldErrors.payment.accountName) sectionFieldIds.payment.push("accountName");
  if (fieldErrors.payment.bankName) sectionFieldIds.payment.push("bankName");
  if (fieldErrors.payment.accountNumber) sectionFieldIds.payment.push("accountNumber");
  if (fieldErrors.payment.ifscCode) sectionFieldIds.payment.push("ifscCode");
  if (fieldErrors.payment.bankAddress) sectionFieldIds.payment.push("bankAddress");
  if (fieldErrors.payment.swiftBicCode) sectionFieldIds.payment.push("swiftBicCode");
  if (fieldErrors.payment.licenseDuration) {
    sectionFieldIds.payment.push("licenseDuration");
  }

  for (const [lineItemId, lineItemErrors] of Object.entries(fieldErrors.lineItems)) {
    if (lineItemErrors.description) {
      sectionFieldIds.deliverables.push(`description:${lineItemId}`);
    }

    if (lineItemErrors.qty) {
      sectionFieldIds.deliverables.push(`qty:${lineItemId}`);
    }

    if (lineItemErrors.rate) {
      sectionFieldIds.deliverables.push(`rate:${lineItemId}`);
    }
  }

  if (
    requiresExplicitExportTaxChoice(formData.agency, formData.client) &&
    !hasExplicitExportTaxChoice(formData.agency)
  ) {
    sectionFieldIds.totals.push("exportTaxHandling");
  }

  return sectionFieldIds;
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

function getOrderedStepperFields(root: ParentNode | null) {
  if (!root) return [];

  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-stepper-field-order]")
  )
    .filter((element) => {
      if (element.hasAttribute("disabled")) {
        return false;
      }

      return element.offsetParent !== null;
    })
    .sort((left, right) => {
      const leftOrder = Number(left.dataset.stepperFieldOrder ?? "0");
      const rightOrder = Number(right.dataset.stepperFieldOrder ?? "0");

      return leftOrder - rightOrder;
    });
}

function ErrorText({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key={message}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 text-xs font-medium leading-5 text-red-600"
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
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
  icon,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <MotionButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={getAppButtonClass({ variant })}
    >
      {icon}
      {children}
    </MotionButton>
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
  return (
    <div className={getAppPanelClass(tone)}>
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
  fieldOrder,
  onChange,
  children,
}: {
  value: string;
  hasError?: string;
  hasValue?: boolean;
  fieldOrder?: number;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-stepper-field-order={fieldOrder}
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

function ModalSegmentedControl<T extends string>({
  name,
  ariaLabel,
  value,
  options,
  columns = 2,
  fieldOrderStart,
  onChange,
}: {
  name: string;
  ariaLabel?: string;
  value: T | "";
  options: Array<{
    value: T;
    label: string;
    description?: string;
  }>;
  columns?: 1 | 2;
  fieldOrderStart?: number;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? name}
      className={cn(
        "grid gap-2 rounded-[20px] border border-slate-200 bg-slate-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        columns === 2 ? "sm:grid-cols-2" : ""
      )}
    >
      {options.map((option, index) => {
        const optionId = `${name}-${option.value}`;
        const descriptionId = option.description ? `${optionId}-description` : undefined;
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            aria-describedby={descriptionId}
            onClick={() => onChange(option.value)}
            data-stepper-field-order={
              fieldOrderStart !== undefined ? fieldOrderStart + index : undefined
            }
            className={cn(
              "min-h-[48px] rounded-2xl border px-4 py-2.5 text-left text-sm transition-all duration-150 focus:outline-none focus:ring-[3px] focus:ring-slate-950/12",
              selected
                ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                : "border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-900"
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="block font-medium">{option.label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  selected ? "bg-white" : "bg-slate-300"
                )}
              />
            </span>
            {option.description ? (
              <span
                id={descriptionId}
                className={cn(
                  "mt-1 block text-xs leading-5",
                  selected ? "text-white/80" : "text-slate-500"
                )}
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

function ModalChoiceCardGroup<T extends string>({
  name,
  ariaLabel,
  value,
  options,
  fieldOrderStart,
  onChange,
}: {
  name: string;
  ariaLabel?: string;
  value: T | "";
  options: Array<{
    value: T;
    label: string;
    description?: string;
  }>;
  fieldOrderStart?: number;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? name}
      className="grid gap-3 md:grid-cols-2"
    >
      {options.map((option, index) => {
        const optionId = `${name}-${option.value}`;
        const descriptionId = option.description ? `${optionId}-description` : undefined;
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            aria-describedby={descriptionId}
            onClick={() => onChange(option.value)}
            data-stepper-field-order={
              fieldOrderStart !== undefined ? fieldOrderStart + index : undefined
            }
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
                id={descriptionId}
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
          <span className={cn(getAppStatusPillClass("muted"), "px-2 py-0.5")}>
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
  trackedFieldIdsBySection,
  currentMissingFieldIdsBySection,
  onFormDataChange,
}: {
  formData: InvoiceFormData;
  fieldErrors: InvoiceFieldErrors;
  trackedFieldIdsBySection: MissingFieldIdsBySection;
  currentMissingFieldIdsBySection: MissingFieldIdsBySection;
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
  const activePanelRef = useRef<HTMLDivElement | null>(null);
  const defaultVisibleStepKey =
    MODAL_SECTION_KEYS.find(
      (sectionKey) => trackedFieldIdsBySection[sectionKey].length > 0
    ) ?? null;
  const defaultIncompleteStepKey =
    MODAL_SECTION_KEYS.find(
      (sectionKey) =>
        trackedFieldIdsBySection[sectionKey].length > 0 &&
        currentMissingFieldIdsBySection[sectionKey].length > 0
    ) ?? defaultVisibleStepKey;
  const [preferredActiveStepKey, setPreferredActiveStepKey] =
    useState<ModalSectionKey | null>(defaultIncompleteStepKey);
  const [advanceRequestedSectionKey, setAdvanceRequestedSectionKey] =
    useState<ModalSectionKey | null>(null);
  const agencyFieldIds = new Set(trackedFieldIdsBySection.agency);
  const clientFieldIds = new Set(trackedFieldIdsBySection.client);
  const deliverableFieldIds = new Set(trackedFieldIdsBySection.deliverables);
  const paymentFieldIds = new Set(trackedFieldIdsBySection.payment);
  const metaFieldIds = new Set(trackedFieldIdsBySection.meta);
  const complianceFieldIds = new Set(trackedFieldIdsBySection.totals);
  const showLicenseDuration =
    paymentFieldIds.has("licenseDuration") &&
    formData.payment.license.isLicenseIncluded &&
    (formData.payment.license.licenseType === "exclusive-license" ||
      formData.payment.license.licenseType === "non-exclusive-license");

  const updateLineItem = (
    lineItemId: string,
    updater: (
      current: InvoiceFormData["lineItems"][number]
    ) => InvoiceFormData["lineItems"][number]
  ) => {
    onFormDataChange((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === lineItemId ? updater(item) : item
      ),
    }));
  };

  const handleCompactFieldKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    sectionKey: ModalSectionKey
  ) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    event.preventDefault();

    const advanceFields = getOrderedStepperFields(activePanelRef.current);
    const currentIndex = advanceFields.indexOf(event.currentTarget);

    if (currentIndex >= 0 && currentIndex < advanceFields.length - 1) {
      advanceFields[currentIndex + 1]?.focus();
      return;
    }

    setAdvanceRequestedSectionKey(sectionKey);
  };

  const handleActivePanelBlurCapture = (sectionKey: ModalSectionKey) => {
    window.requestAnimationFrame(() => {
      const panel = activePanelRef.current;
      const activeElement = document.activeElement;

      if (panel && activeElement instanceof Node && panel.contains(activeElement)) {
        return;
      }

      const remainingFields = currentMissingFieldIdsBySection[sectionKey] ?? [];

      if (remainingFields.length === 0) {
        setAdvanceRequestedSectionKey(sectionKey);
      }
    });
  };

  const applySectionChange = (
    sectionKey: ModalSectionKey,
    updater: (prev: InvoiceFormData) => InvoiceFormData,
    options?: { advanceOnCommit?: boolean }
  ) => {
    onFormDataChange(updater);

    if (options?.advanceOnCommit) {
      setAdvanceRequestedSectionKey(sectionKey);
    }
  };

  const stepSections = [
    {
      key: "agency" as const,
      title: "Agency Details",
      subtitle: "Finish the remaining agency fields before previewing.",
      isVisible: trackedFieldIdsBySection.agency.length > 0,
      missingCount: currentMissingFieldIdsBySection.agency.length,
      content: (
        <div className={appGroupGapClass}>
          {agencyFieldIds.has("agencyName") ? (
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
                onKeyDown={(event) => handleCompactFieldKeyDown(event, "agency")}
                data-stepper-field-order={1}
                className={getFieldClass({
                  hasError: fieldErrors.agency.agencyName,
                  hasValue: Boolean(formData.agency.agencyName),
                })}
                placeholder="Your agency or freelance brand name"
              />
              <ErrorText message={fieldErrors.agency.agencyName} />
            </div>
          ) : null}

          {agencyFieldIds.has("address") ? (
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
                data-stepper-field-order={2}
                placeholder="Business address"
              />
              <ErrorText message={fieldErrors.agency.address} />
            </div>
          ) : null}

          <div className={appFieldGridWideStartClass}>
            {agencyFieldIds.has("agencyState") ? (
              <div>
                <FieldLabel required>Agency State</FieldLabel>
                <ModalSelect
                  value={formData.agency.agencyState}
                  onChange={(value) =>
                    applySectionChange(
                      "agency",
                      (prev) => ({
                        ...prev,
                        agency: {
                          ...prev.agency,
                          agencyState:
                            value as InvoiceFormData["agency"]["agencyState"],
                        },
                      }),
                      { advanceOnCommit: true }
                    )
                  }
                  fieldOrder={3}
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
          </div>
        </div>
      ),
    },
    {
      key: "client" as const,
      title: "Client Details",
      subtitle: "Only the client fields still required for billing are shown.",
      isVisible: trackedFieldIdsBySection.client.length > 0,
      missingCount: currentMissingFieldIdsBySection.client.length,
      content: (
        <div className={appGroupGapClass}>
          {clientFieldIds.has("clientName") ? (
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
                onKeyDown={(event) => handleCompactFieldKeyDown(event, "client")}
                data-stepper-field-order={1}
                className={getFieldClass({
                  hasError: fieldErrors.client.clientName,
                  hasValue: Boolean(formData.client.clientName),
                })}
                placeholder="Client or company name"
              />
              <ErrorText message={fieldErrors.client.clientName} />
            </div>
          ) : null}

          {clientFieldIds.has("clientAddress") ? (
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
                data-stepper-field-order={2}
                placeholder="Client billing address"
              />
              <ErrorText message={fieldErrors.client.clientAddress} />
            </div>
          ) : null}

          <div>
            <FieldLabel>Client Location</FieldLabel>
            <ModalSegmentedControl
              name="modal-client-location"
              ariaLabel="Client Location"
              columns={2}
              value={formData.client.clientLocation}
              options={[
                {
                  value: "domestic",
                  label: "Domestic (India)",
                  description: "Use Indian state-based billing and domestic payment fields.",
                },
                {
                  value: "international",
                  label: "International",
                  description:
                    "Use country and export-billing fields for a foreign client.",
                },
              ]}
              onChange={(value) =>
                applySectionChange(
                  "client",
                  (prev) => ({
                    ...prev,
                    client: {
                      ...prev.client,
                      clientLocation: value,
                      clientCountry:
                        value === "domestic" ? "" : prev.client.clientCountry,
                      clientState:
                        value === "international" ? "" : prev.client.clientState,
                    },
                  }),
                  { advanceOnCommit: true }
                )
              }
              fieldOrderStart={3}
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              This decides which billing, tax, and payment fields the invoice needs next.
            </p>
          </div>

          {showInternationalClientFields &&
          (clientFieldIds.has("clientCountry") || Boolean(formData.client.clientCurrency)) ? (
            <div className={appFieldGridClass}>
              <div>
                <FieldLabel required>Country</FieldLabel>
                <ModalSelect
                  value={formData.client.clientCountry}
                  onChange={(value) =>
                    applySectionChange(
                      "client",
                      (prev) => ({
                        ...prev,
                        client: {
                          ...prev.client,
                          clientCountry:
                            value as InvoiceFormData["client"]["clientCountry"],
                        },
                      }),
                      { advanceOnCommit: true }
                    )
                  }
                  fieldOrder={5}
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
                    applySectionChange("client", (prev) => ({
                      ...prev,
                      client: {
                        ...prev.client,
                        clientCurrency:
                          value as InvoiceFormData["client"]["clientCurrency"],
                      },
                    }))
                  }
                  fieldOrder={6}
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
            </div>
          ) : null}

          {!showInternationalClientFields && clientFieldIds.has("clientState") ? (
            <div>
              <FieldLabel required>Client State</FieldLabel>
              <ModalSelect
                value={formData.client.clientState}
                onChange={(value) =>
                  applySectionChange(
                    "client",
                    (prev) => ({
                      ...prev,
                      client: {
                        ...prev.client,
                        clientState:
                          value as InvoiceFormData["client"]["clientState"],
                      },
                    }),
                    { advanceOnCommit: true }
                  )
                }
                fieldOrder={5}
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
        </div>
      ),
    },
    {
      key: "deliverables" as const,
      title: "Deliverables",
      subtitle: "Only the line-item fields still failing validation are shown.",
      isVisible: trackedFieldIdsBySection.deliverables.length > 0,
      missingCount: currentMissingFieldIdsBySection.deliverables.length,
      content: (
        <div className="space-y-4">
          {formData.lineItems.map((item, index) => {
            const itemErrors = fieldErrors.lineItems[item.id];
            const showDescription = deliverableFieldIds.has(`description:${item.id}`);
            const showQty = deliverableFieldIds.has(`qty:${item.id}`);
            const showRate = deliverableFieldIds.has(`rate:${item.id}`);

            if (!showDescription && !showQty && !showRate) {
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
                  {showDescription ? (
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
                        onKeyDown={(event) =>
                          handleCompactFieldKeyDown(event, "deliverables")
                        }
                        data-stepper-field-order={index * 10 + 1}
                        className={getFieldClass({
                          hasError: itemErrors?.description,
                          hasValue: Boolean(item.description),
                        })}
                        placeholder="Describe the deliverable"
                      />
                      <ErrorText message={itemErrors?.description} />
                    </div>
                  ) : null}

                  {showQty ? (
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
                        onKeyDown={(event) =>
                          handleCompactFieldKeyDown(event, "deliverables")
                        }
                        data-stepper-field-order={index * 10 + 2}
                        className={getFieldClass({
                          hasError: itemErrors?.qty,
                          hasValue: item.qty > 0,
                        })}
                      />
                      <ErrorText message={itemErrors?.qty} />
                    </div>
                  ) : null}

                  {showRate ? (
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
                        onKeyDown={(event) =>
                          handleCompactFieldKeyDown(event, "deliverables")
                        }
                        data-stepper-field-order={index * 10 + 3}
                        className={getFieldClass({
                          hasError: itemErrors?.rate,
                          hasValue: item.rate > 0,
                        })}
                      />
                      <ErrorText message={itemErrors?.rate} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      key: "payment" as const,
      title: "Payment & Terms",
      subtitle:
        "Only the payment fields still needed for the active payment mode are shown.",
      isVisible: trackedFieldIdsBySection.payment.length > 0,
      missingCount: currentMissingFieldIdsBySection.payment.length,
      content: (
        <div className={appGroupGapClass}>
          {paymentFieldIds.has("paymentTerms") ? (
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
                onKeyDown={(event) => handleCompactFieldKeyDown(event, "payment")}
                data-stepper-field-order={1}
                className={getFieldClass({
                  hasError: fieldErrors.meta.paymentTerms,
                  hasValue: Boolean(formData.meta.paymentTerms),
                })}
                placeholder="Net 15, Due on receipt, or similar"
              />
              <ErrorText message={fieldErrors.meta.paymentTerms} />
            </div>
          ) : null}

          <div className={appFieldGridClass}>
            {showInternationalClientFields && paymentFieldIds.has("accountName") ? (
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
                  onKeyDown={(event) => handleCompactFieldKeyDown(event, "payment")}
                  data-stepper-field-order={2}
                  className={getFieldClass({
                    hasError: fieldErrors.payment.accountName,
                    hasValue: Boolean(formData.payment.accountName),
                  })}
                />
                <ErrorText message={fieldErrors.payment.accountName} />
              </div>
            ) : null}

            {paymentFieldIds.has("bankName") ? (
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
                  onKeyDown={(event) => handleCompactFieldKeyDown(event, "payment")}
                  data-stepper-field-order={3}
                  className={getFieldClass({
                    hasError: fieldErrors.payment.bankName,
                    hasValue: Boolean(formData.payment.bankName),
                  })}
                />
                <ErrorText message={fieldErrors.payment.bankName} />
              </div>
            ) : null}

            {paymentFieldIds.has("accountNumber") ? (
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
                  onKeyDown={(event) => handleCompactFieldKeyDown(event, "payment")}
                  data-stepper-field-order={4}
                  className={getFieldClass({
                    hasError: fieldErrors.payment.accountNumber,
                    hasValue: Boolean(formData.payment.accountNumber),
                  })}
                />
                <ErrorText message={fieldErrors.payment.accountNumber} />
              </div>
            ) : null}

            {!showInternationalClientFields && paymentFieldIds.has("ifscCode") ? (
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
                  onKeyDown={(event) => handleCompactFieldKeyDown(event, "payment")}
                  data-stepper-field-order={5}
                  className={getFieldClass({
                    hasError: fieldErrors.payment.ifscCode,
                    hasValue: Boolean(formData.payment.ifscCode),
                  })}
                />
                <ErrorText message={fieldErrors.payment.ifscCode} />
              </div>
            ) : null}

            {showInternationalClientFields && paymentFieldIds.has("swiftBicCode") ? (
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
                  onKeyDown={(event) => handleCompactFieldKeyDown(event, "payment")}
                  data-stepper-field-order={5}
                  className={getFieldClass({
                    hasError: fieldErrors.payment.swiftBicCode,
                    hasValue: Boolean(formData.payment.swiftBicCode),
                  })}
                />
                <ErrorText message={fieldErrors.payment.swiftBicCode} />
              </div>
            ) : null}

            {showInternationalClientFields && paymentFieldIds.has("bankAddress") ? (
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
                  data-stepper-field-order={6}
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
                  onKeyDown={(event) => handleCompactFieldKeyDown(event, "payment")}
                  data-stepper-field-order={7}
                  className={getFieldClass({
                    hasError: fieldErrors.payment.licenseDuration,
                    hasValue: Boolean(formData.payment.license.licenseDuration),
                  })}
                />
                <ErrorText message={fieldErrors.payment.licenseDuration} />
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "meta" as const,
      title: "Invoice Meta",
      subtitle: "Only the missing document reference and date fields are shown.",
      isVisible: trackedFieldIdsBySection.meta.length > 0,
      missingCount: currentMissingFieldIdsBySection.meta.length,
      content: (
        <div className={appMetaGridClass}>
          {metaFieldIds.has("invoiceNumber") ? (
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
                onKeyDown={(event) => handleCompactFieldKeyDown(event, "meta")}
                data-stepper-field-order={1}
                className={getFieldClass({
                  hasError: fieldErrors.meta.invoiceNumber,
                  hasValue: Boolean(formData.meta.invoiceNumber),
                })}
                placeholder="INV-2026-001"
              />
              <ErrorText message={fieldErrors.meta.invoiceNumber} />
            </div>
          ) : null}

          {metaFieldIds.has("invoiceDate") ? (
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
                onKeyDown={(event) => handleCompactFieldKeyDown(event, "meta")}
                data-stepper-field-order={2}
                className={getFieldClass({
                  hasError: fieldErrors.meta.invoiceDate,
                  hasValue: Boolean(formData.meta.invoiceDate),
                })}
              />
              <ErrorText message={fieldErrors.meta.invoiceDate} />
            </div>
          ) : null}

          {metaFieldIds.has("dueDate") ? (
            <div
              className={
                fieldErrors.meta.invoiceNumber || fieldErrors.meta.invoiceDate
                  ? ""
                  : "md:col-span-2 md:max-w-xs"
              }
            >
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
                onKeyDown={(event) => handleCompactFieldKeyDown(event, "meta")}
                data-stepper-field-order={3}
                className={getFieldClass({
                  hasError: fieldErrors.meta.dueDate,
                  hasValue: Boolean(formData.meta.dueDate),
                })}
              />
              <ErrorText message={fieldErrors.meta.dueDate} />
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "totals" as const,
      title: "Compliance",
      subtitle:
        "These controls affect GST, LUT, and export-tax readiness for the current invoice.",
      isVisible: trackedFieldIdsBySection.totals.length > 0,
      missingCount: currentMissingFieldIdsBySection.totals.length,
      content: (
        <div className={appGroupGapClass}>
          <div>
            <FieldLabel>GST Registration</FieldLabel>
            <ModalSegmentedControl
              name="modal-gst-registration"
              ariaLabel="GST Registration"
              columns={2}
              value={formData.agency.gstRegistrationStatus}
              options={[
                {
                  value: "registered",
                  label: "Registered",
                  description: "GSTIN becomes mandatory and domestic tax can apply.",
                },
                {
                  value: "not-registered",
                  label: "Not Registered",
                  description: "Keep the invoice out of GST registration flow.",
                },
              ]}
              onChange={(value) =>
                applySectionChange(
                  "totals",
                  (prev) => ({
                    ...prev,
                    agency: {
                      ...prev.agency,
                      gstRegistrationStatus: value,
                    },
                  }),
                  { advanceOnCommit: true }
                )
              }
              fieldOrderStart={1}
            />
          </div>

          {formData.agency.gstRegistrationStatus === "registered" &&
          complianceFieldIds.has("gstin") ? (
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
                      gstin: event.target.value.toUpperCase().replace(/\s+/g, ""),
                    },
                  }))
                }
                onKeyDown={(event) => handleCompactFieldKeyDown(event, "totals")}
                data-stepper-field-order={3}
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
                  ariaLabel="Valid LUT for current financial year"
                  columns={2}
                  value={formData.agency.lutAvailability}
                  options={[
                    {
                      value: "yes",
                      label: "Yes",
                      description: "Use zero-rated export flow for this international invoice.",
                    },
                    {
                      value: "no",
                      label: "No",
                      description: "You’ll need to choose how to handle export IGST.",
                    },
                  ]}
                  onChange={(value) =>
                    applySectionChange(
                      "totals",
                      (prev) => ({
                        ...prev,
                        agency: {
                          ...prev.agency,
                          lutAvailability: value,
                        },
                      }),
                      { advanceOnCommit: true }
                    )
                  }
                  fieldOrderStart={4}
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
                    onKeyDown={(event) => handleCompactFieldKeyDown(event, "totals")}
                    data-stepper-field-order={6}
                    className={getFieldClass({
                      hasValue: Boolean(formData.agency.lutNumber),
                    })}
                    placeholder="Optional but recommended"
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {needsExportChoice && complianceFieldIds.has("exportTaxHandling") ? (
            <div>
              <FieldLabel required>Export tax handling</FieldLabel>
              <ModalChoiceCardGroup
                name="modal-export-tax-choice"
                ariaLabel="Export tax handling"
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
                  applySectionChange(
                    "totals",
                    (prev) => ({
                      ...prev,
                      agency: {
                        ...prev.agency,
                        noLutTaxHandling: value,
                      },
                    }),
                    { advanceOnCommit: true }
                  )
                }
                fieldOrderStart={7}
              />
            </div>
          ) : null}
        </div>
      ),
    },
  ].filter((section) => section.isVisible);

  const activeByDefaultSectionKey =
    stepSections.find((section) => section.missingCount > 0)?.key ??
    stepSections[0]?.key ??
    null;
  const activeStepKey =
    preferredActiveStepKey &&
    stepSections.some((section) => section.key === preferredActiveStepKey)
      ? preferredActiveStepKey
      : activeByDefaultSectionKey;

  useEffect(() => {
    if (!activeByDefaultSectionKey) {
      return;
    }

    if (
      preferredActiveStepKey &&
      !stepSections.some((section) => section.key === preferredActiveStepKey)
    ) {
      const frameId = window.requestAnimationFrame(() => {
        setPreferredActiveStepKey(activeByDefaultSectionKey);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, [activeByDefaultSectionKey, preferredActiveStepKey, stepSections]);

  useEffect(() => {
    if (!advanceRequestedSectionKey) return;

    const activeSectionIndex = stepSections.findIndex(
      (section) => section.key === advanceRequestedSectionKey
    );
    const activeSection = stepSections[activeSectionIndex];

    if (!activeSection) {
      const frameId = window.requestAnimationFrame(() => {
        setAdvanceRequestedSectionKey(null);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (activeSection.missingCount > 0) {
      return;
    }

    const nextIncompleteSection =
      stepSections
        .slice(activeSectionIndex + 1)
        .find((section) => section.missingCount > 0) ??
      stepSections.find((section) => section.missingCount > 0) ??
      null;

    const nextStepKey = nextIncompleteSection?.key ?? null;

    const frameId = window.requestAnimationFrame(() => {
      setAdvanceRequestedSectionKey(null);
      setPreferredActiveStepKey(nextStepKey);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [advanceRequestedSectionKey, stepSections]);

  useEffect(() => {
    if (!activeStepKey) return;

    const frameId = window.requestAnimationFrame(() => {
      const firstFocusable = getOrderedStepperFields(activePanelRef.current)[0];

      if (firstFocusable && document.activeElement !== firstFocusable) {
        firstFocusable.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeStepKey]);

  const stepLayoutTransition = {
    type: "spring" as const,
    stiffness: 360,
    damping: 32,
    mass: 0.78,
  };

  return (
    <div className="space-y-4">
      {stepSections.map((section, index) => {
        const isActive = section.key === activeStepKey;
        const isComplete = section.missingCount === 0;
        const isLast = index === stepSections.length - 1;

        return (
          <motion.div
            key={section.key}
            layout
            transition={stepLayoutTransition}
            className="relative pl-14"
          >
            {!isLast ? (
              <div
                className={cn(
                  "absolute left-[19px] top-11 w-px",
                  isActive ? "bottom-0 bg-slate-300" : "bottom-[-16px] bg-slate-200"
                )}
              />
            ) : null}

              <MotionButton
                type="button"
                hoverScale={1.02}
                tapScale={0.98}
                onClick={() => {
                  setAdvanceRequestedSectionKey(null);
                  setPreferredActiveStepKey(section.key);
                }}
                className={cn(
                "app-focus-ring absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200 focus:outline-none",
                isComplete
                  ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                  : isActive
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                  : "border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800"
              )}
              aria-pressed={isActive}
            >
              {isComplete ? <CheckIcon className="h-4 w-4" /> : index + 1}
            </MotionButton>

            <AnimatePresence initial={false} mode="popLayout">
              {isActive ? (
                <motion.div
                  key={`${section.key}-active`}
                  layout
                  ref={activePanelRef}
                  onBlurCapture={() => handleActivePanelBlurCapture(section.key)}
                  initial={{ opacity: 0, y: 12, scale: 0.992 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.995 }}
                  transition={stepLayoutTransition}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.07)]"
                >
                  <div className="mb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-slate-950">
                          {section.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {section.subtitle}
                        </p>
                      </div>
                      <span className={getAppStatusPillClass("default")}>
                        {section.missingCount} remaining
                      </span>
                    </div>
                  </div>
                  {section.content}
                </motion.div>
              ) : (
                <motion.div
                  key={`${section.key}-collapsed`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={stepLayoutTransition}
                >
                  <MotionButton
                    type="button"
                    hoverScale={1.01}
                    tapScale={0.985}
                    onClick={() => {
                      setAdvanceRequestedSectionKey(null);
                      setPreferredActiveStepKey(section.key);
                    }}
                    className={cn(
                      "app-focus-ring app-interactive-surface w-full rounded-[24px] border px-5 py-4 text-left transition-all duration-200 focus:outline-none",
                      isComplete
                        ? cn(
                            "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300",
                            appMotionClasses.success
                          )
                        : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold tracking-tight">
                          {section.title}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-sm leading-6",
                            isComplete ? "text-emerald-900/80" : "text-slate-500"
                          )}
                        >
                          {isComplete
                            ? "Complete. Click to review this step again."
                            : `${section.missingCount} required field${
                                section.missingCount === 1 ? "" : "s"
                              } still need attention.`}
                        </p>
                      </div>
                      <span
                        className={getAppStatusPillClass(
                          isComplete ? "success" : "default"
                        )}
                      >
                        {isComplete ? "Done" : "Next"}
                      </span>
                    </div>
                  </MotionButton>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
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
  const currentMissingFieldIdsBySection = useMemo(
    () => buildMissingFieldIdsBySection({ formData, fieldErrors }),
    [formData, fieldErrors]
  );
  const [stickyFieldIdsBySection, setStickyFieldIdsBySection] =
    useState<MissingFieldIdsBySection>(createEmptyMissingFieldIdsBySection);
  const isSummaryMode = !isInlineFormOpen;
  const trackedFieldIdsBySection = useMemo(() => {
    const merged = createEmptyMissingFieldIdsBySection();

    for (const sectionKey of MODAL_SECTION_KEYS) {
      merged[sectionKey] = uniqFieldIds([
        ...stickyFieldIdsBySection[sectionKey],
        ...currentMissingFieldIdsBySection[sectionKey],
      ]);
    }

    return merged;
  }, [stickyFieldIdsBySection, currentMissingFieldIdsBySection]);
  const hasTrackedSections = useMemo(
    () =>
      MODAL_SECTION_KEYS.some(
        (sectionKey) => trackedFieldIdsBySection[sectionKey].length > 0
      ),
    [trackedFieldIdsBySection]
  );

  useEffect(() => {
    if (isInlineFormOpen) {
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isInlineFormOpen]);

  const resetInlineCompletionState = () => {
    setStickyFieldIdsBySection(createEmptyMissingFieldIdsBySection());
  };

  const snapshotCurrentMissingFields = () => {
    setStickyFieldIdsBySection((previous) =>
      mergeMissingFieldIdsBySection(previous, currentMissingFieldIdsBySection)
    );
  };

  const handleOpenFillMissing = () => {
    snapshotCurrentMissingFields();
    onOpenFillMissing();
  };

  const handleMiniFormChange = (
    updater: (prev: InvoiceFormData) => InvoiceFormData
  ) => {
    snapshotCurrentMissingFields();
    onFormDataChange(updater);
  };

  const handleBackToSummary = () => {
    resetInlineCompletionState();
    onBackToSummary();
  };

  const handleClose = () => {
    resetInlineCompletionState();
    onClose();
  };

  const handleManualCheck = () => {
    resetInlineCompletionState();
    onManualCheck();
  };

  const handlePreview = () => {
    resetInlineCompletionState();
    onPreview();
  };

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]",
        appModalPaddingClass
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="autofill-summary-title"
        initial={{ opacity: 0, y: 18, scale: 0.982 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.988 }}
        transition={{
          type: "spring",
          stiffness: 360,
          damping: 30,
          mass: 0.82,
        }}
        className={cn(
          "flex max-h-[min(92vh,960px)] flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]",
          appModalWidthClass
        )}
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-6 lg:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                <SparklesIcon className="h-4 w-4" />
                Autofill Summary
              </p>
              <h2
                id="autofill-summary-title"
                className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
              >
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

            <ModalButton variant="secondary" onClick={handleClose}>
              Close
            </ModalButton>
          </div>
        </div>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto bg-slate-50/90 px-5 py-5 sm:px-6 lg:px-7"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isSummaryMode ? (
              <MotionStagger
                key="summary-mode"
                className="space-y-4 transition-opacity duration-150"
              >
              <SummaryCard title="Needs confirmation">
                {clarificationSuggestions.length > 0 ? (
                  <MotionStagger className="mt-3 space-y-3">
                    {clarificationSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="app-interactive-surface rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
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
                              className={cn(
                                getAppButtonClass({
                                  variant: "secondary",
                                  size: "lg",
                                  fullWidth: true,
                                }),
                                "min-h-[72px] items-start justify-start px-4 py-3 text-left"
                              )}
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
                  </MotionStagger>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    No high-value confirmation questions are blocking the current
                    autofill result.
                  </p>
                )}
              </SummaryCard>

              <div className={appSummaryGridClass}>
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
              </MotionStagger>
            ) : (
              <MotionStagger
                key="fill-mode"
                className="space-y-5 transition-opacity duration-150"
              >
              <SummaryCard title="Fill Missing Details">
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Finish the required invoice fields here. This form updates the
                  same invoice state live, and the preview action will appear as
                  soon as everything validates cleanly.
                </p>
              </SummaryCard>

              {hasTrackedSections ? (
                <MiniForm
                  formData={formData}
                  fieldErrors={fieldErrors}
                  trackedFieldIdsBySection={trackedFieldIdsBySection}
                  currentMissingFieldIdsBySection={
                    currentMissingFieldIdsBySection
                  }
                  onFormDataChange={handleMiniFormChange}
                />
              ) : (
                <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  All currently required fields are complete. You can preview
                  the invoice now or switch to a manual check if you want one
                  more pass in the full editor.
                </div>
              )}
              </MotionStagger>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6 lg:px-7">
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
                <ModalButton
                  variant="secondary"
                  onClick={handleOpenFillMissing}
                  icon={<ClipboardCheckIcon className="h-4 w-4" />}
                >
                  Fill Missing Details
                </ModalButton>
              ) : null}

              {!isSummaryMode ? (
                <ModalButton
                  variant="ghost"
                  onClick={handleBackToSummary}
                  icon={<ChevronLeftIcon className="h-4 w-4" />}
                >
                  Back to Summary
                </ModalButton>
              ) : null}

              <ModalButton
                variant="secondary"
                onClick={handleManualCheck}
                icon={<ArrowRightIcon className="h-4 w-4" />}
              >
                Manual Check
              </ModalButton>

              {isPreviewReady ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: [1, 1.018, 1] }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
                    scale: {
                      duration: 1.2,
                      repeat: 1,
                      repeatDelay: 1.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                >
                  <ModalButton
                    variant="primary"
                    onClick={handlePreview}
                    icon={<DownloadIcon className="h-4 w-4" />}
                  >
                  Preview & Download
                  </ModalButton>
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
