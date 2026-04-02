"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import UploadToast from "@/components/ui/UploadToast";
import {
  MotionReveal,
  motion,
} from "@/components/ui/motion-primitives";
import type { AiBriefExtraction } from "@/lib/ai-brief-extractor";
import AgencyDetailsSection from "@/components/invoice/AgencyDetailsSection";
import BriefIntakeCard from "@/components/invoice/BriefIntakeCard";
import ClientDetailsSection from "@/components/invoice/ClientDetailsSection";
import InvoiceMetaSection from "@/components/invoice/InvoiceMetaSection";
import DeliverablesSection from "@/components/invoice/DeliverablesSection";
import TotalsTaxesSection from "@/components/invoice/TotalsTaxesSection";
import TermsPaymentSection from "@/components/invoice/TermsPaymentSection";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import {
  getEffectiveExportTaxHandling,
  getLutDeclarationText,
  getSettlementComplianceWarning,
  hasExplicitExportTaxChoice,
  isDomesticSezClient,
  requiresExplicitExportTaxChoice,
} from "@/lib/invoice-compliance";
import { extractTextFromImage } from "@/lib/ocr-extractor";
import {
  runBriefAutofill,
  type BriefIntakeInput,
} from "@/lib/invoice-brief-intake";
import {
  convertInrToApproximateUsd,
  getInvoiceDisplayCurrency,
} from "@/lib/international-billing-options";
import { playInteractionCue } from "@/lib/interaction-feedback";
import {
  getInvoiceFieldErrors,
  isInvoiceStepValid,
} from "@/lib/invoice-validation";
import {
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
  appSectionGapClass,
} from "@/lib/layout-foundation";
import {
  defaultInvoiceFormData,
  mergeInvoiceFormData,
  type InvoiceFormData,
  type InvoiceStepperStep,
} from "@/types/invoice";
import {
  cn,
  getAppButtonClass,
  getAppPanelClass,
  getAppStatusPillClass,
  getAppSubtlePanelClass,
} from "@/lib/ui-foundation";
import { DownloadIcon, SaveIcon } from "@/components/ui/app-icons";

const orderedSteps: InvoiceStepperStep[] = [
  "agency",
  "client",
  "deliverables",
  "payment",
  "meta",
  "totals",
];

const PREVIEW_STORAGE_KEY = "invoice-preview-data";
const DRAFT_STORAGE_KEY = "invoice-editor-draft";
const INVOICE_SEQUENCE_KEY = "invoice-sequence-by-year";

type StoredDraft = {
  formData: InvoiceFormData;
  currentStep: InvoiceStepperStep;
  savedAt: string;
};

type InvoiceSequenceMap = Record<string, number>;

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSuggestedDueDate(paymentTerms: string, invoiceDate: string) {
  const normalized = paymentTerms.trim().toLowerCase();

  if (!invoiceDate) return "";

  if (normalized.includes("due on receipt")) {
    return invoiceDate;
  }

  const netMatch = normalized.match(/net[\s-]?(\d+)/i);
  if (netMatch) {
    const days = Number(netMatch[1]);
    if (!Number.isNaN(days)) {
      return addDays(invoiceDate, days);
    }
  }

  return "";
}

function getInvoiceSequenceMap(): InvoiceSequenceMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(INVOICE_SEQUENCE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as InvoiceSequenceMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setInvoiceSequenceMap(sequenceMap: InvoiceSequenceMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    INVOICE_SEQUENCE_KEY,
    JSON.stringify(sequenceMap)
  );
}

function getNextInvoiceNumber() {
  const year = String(new Date().getFullYear());
  const sequenceMap = getInvoiceSequenceMap();
  const nextSequence = (sequenceMap[year] ?? 0) + 1;

  sequenceMap[year] = nextSequence;
  setInvoiceSequenceMap(sequenceMap);

  return `INV-${year}-${String(nextSequence).padStart(3, "0")}`;
}

function getDemoData(invoiceNumber: string): InvoiceFormData {
  const today = getTodayDateString();

  return {
    agency: {
      agencyName: "DesiFreelanceDocs Studio",
      address: "2nd Floor, 14 Residency Road, Bengaluru, Karnataka 560025",
      addressLine1: "2nd Floor, 14 Residency Road",
      addressLine2: "",
      city: "Bengaluru",
      pinCode: "560025",
      agencyState: "Karnataka",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      logoUrl: "/dummy-logo.svg",
      gstRegistrationStatus: "registered",
      lutAvailability: "",
      lutNumber: "",
      noLutTaxHandling: "",
    },
    client: {
      clientName: "Metro Shoes Pvt. Ltd.",
      clientAddress:
        "Phoenix Marketcity, Whitefield Main Road, Bengaluru 560048",
      clientAddressLine1: "Phoenix Marketcity, Whitefield Main Road",
      clientAddressLine2: "",
      clientCity: "Bengaluru",
      clientPinCode: "560048",
      clientPostalCode: "",
      clientEmail: "",
      clientState: "Karnataka",
      clientCountry: "",
      clientCurrency: "",
      clientGstin: "29AAACM8899L1Z2",
      clientLocation: "domestic" as const,
      isClientSezUnit: "no" as const,
    },
    meta: {
      invoiceNumber,
      invoiceDate: today,
      dueDate: addDays(today, 15),
      paymentTerms: "Net 15",
    },
    lineItems: [
      {
        id: "demo-line-1",
        type: "UI/UX" as const,
        description: "Landing Page UI Design",
        qty: 3,
        rate: 12000,
        rateUnit: "per-screen" as const,
      },
      {
        id: "demo-line-2",
        type: "Illustration" as const,
        description: "Editorial Illustration",
        qty: 2,
        rate: 8000,
        rateUnit: "per-item" as const,
      },
    ],
    tax: {
      taxMode: "gst" as const,
      taxRate: 18,
    },
    payment: {
      license: {
        isLicenseIncluded: true,
        licenseType: "exclusive-license" as const,
        licenseDuration: "3 years",
      },
      notes:
        "50% advance received. Remaining balance due within 15 days. Final editable files and exports will be delivered after full payment.",
      paymentSettlementType: "",
      accountName: "DesiFreelanceDocs Studio",
      bankName: "HDFC Bank",
      bankAddress: "",
      accountNumber: "50200044321098",
      ifscCode: "HDFC0001122",
      swiftBicCode: "",
      ibanRoutingCode: "",
      qrCodeUrl: "/dummy-qr.svg",
    },
  };
}

function getFreshInvoiceData(): InvoiceFormData {
  const today = getTodayDateString();
  const fresh = mergeInvoiceFormData();

  return {
    ...fresh,
    meta: {
      ...fresh.meta,
      invoiceNumber: getNextInvoiceNumber(),
      invoiceDate: today,
      dueDate: "",
    },
  };
}

function isFormTouched(formData: InvoiceFormData) {
  const hasAgencyData = Boolean(
      formData.agency.agencyName ||
      formData.agency.address ||
      formData.agency.addressLine1 ||
      formData.agency.addressLine2 ||
      formData.agency.city ||
      formData.agency.pinCode ||
      formData.agency.agencyState ||
      formData.agency.gstin ||
      formData.agency.pan ||
      formData.agency.logoUrl ||
      formData.agency.gstRegistrationStatus ||
      formData.agency.lutAvailability ||
      formData.agency.lutNumber ||
      formData.agency.noLutTaxHandling
  );

  const hasClientData = Boolean(
    formData.client.clientName ||
      formData.client.clientAddress ||
      formData.client.clientAddressLine1 ||
      formData.client.clientAddressLine2 ||
      formData.client.clientCity ||
      formData.client.clientPinCode ||
      formData.client.clientPostalCode ||
      formData.client.clientEmail ||
      formData.client.clientState ||
      formData.client.clientCountry ||
      formData.client.clientCurrency ||
      formData.client.clientGstin ||
      formData.client.clientLocation === "international" ||
      formData.client.isClientSezUnit
  );

  const hasMetaData = Boolean(
    formData.meta.paymentTerms || formData.meta.dueDate
  );

  const hasLineItemData = formData.lineItems.some((item) =>
    Boolean(
      item.description ||
        item.rate > 0 ||
        item.qty !== 1 ||
        item.type !== "Other" ||
        item.rateUnit !== "per-deliverable"
    )
  );

  const hasPaymentData = Boolean(
      formData.payment.notes ||
      formData.payment.paymentSettlementType ||
      formData.payment.accountName ||
      formData.payment.bankName ||
      formData.payment.bankAddress ||
      formData.payment.accountNumber ||
      formData.payment.ifscCode ||
      formData.payment.swiftBicCode ||
      formData.payment.ibanRoutingCode ||
      formData.payment.qrCodeUrl ||
      formData.payment.license.isLicenseIncluded
  );

  return (
    hasAgencyData ||
    hasClientData ||
    hasMetaData ||
    hasLineItemData ||
    hasPaymentData
  );
}

function ExitConfirmModal({
  onSkip,
  onSaveDraft,
  onClose,
}: {
  onSkip: () => void;
  onSaveDraft: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-md ${getAppPanelClass()}`}>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
          Leave invoice editor?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You have unsaved progress. Choose{" "}
          <span className="font-medium text-slate-950">Save Draft</span> to keep
          your work, or <span className="font-medium text-slate-950">Skip</span>{" "}
          to leave without saving.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={getAppButtonClass({ variant: "ghost", size: "sm" })}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSkip}
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            Skip
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className={getAppButtonClass({ variant: "primary", size: "sm" })}
          >
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}

function getStepShortLabel(step: InvoiceStepperStep) {
  switch (step) {
    case "agency":
      return "Agency";
    case "client":
      return "Client";
    case "deliverables":
      return "Items";
    case "payment":
      return "Payment";
    case "meta":
      return "Meta";
    case "totals":
      return "Totals";
    default:
      return "Step";
  }
}

function getFirstInvalidStep(formData: InvoiceFormData) {
  return (
    orderedSteps.find((step) => !isInvoiceStepValid(formData, step)) ?? null
  );
}

function getMissingFieldLabels(formData: InvoiceFormData) {
  const errors = getInvoiceFieldErrors(formData);
  const groups = new Map<InvoiceStepperStep, Set<string>>();
  const addField = (step: InvoiceStepperStep, label: string) => {
    if (!groups.has(step)) {
      groups.set(step, new Set());
    }

    groups.get(step)?.add(label);
  };

  if (errors.agency.agencyName) addField("agency", "Business / trade name");
  if (errors.agency.address) addField("agency", "Address line 1");
  if (errors.agency.agencyState) addField("agency", "Agency state");
  if (errors.agency.gstin) addField("agency", "Agency GSTIN");

  if (errors.client.clientName) addField("client", "Client name");
  if (errors.client.clientAddress) {
    addField(
      "client",
      formData.client.clientLocation === "international"
        ? "Full address"
        : "Address line 1"
    );
  }
  if (errors.client.clientState) addField("client", "Client state");
  if (errors.client.clientCountry) addField("client", "Client country");

  if (errors.meta.paymentTerms) addField("payment", "Payment terms");
  if (errors.meta.invoiceNumber) addField("meta", "Invoice number");
  if (errors.meta.invoiceDate) addField("meta", "Invoice date");
  if (errors.meta.dueDate) addField("meta", "Due date");

  if (errors.payment.accountName) {
    addField(
      "payment",
      formData.client.clientLocation === "international"
        ? "Beneficiary / Account Name"
        : "Account name"
    );
  }
  if (errors.payment.bankName) addField("payment", "Bank name");
  if (errors.payment.accountNumber) addField("payment", "Account number");
  if (errors.payment.ifscCode) addField("payment", "IFSC code");
  if (errors.payment.bankAddress) addField("payment", "Bank full address");
  if (errors.payment.swiftBicCode) addField("payment", "SWIFT / BIC code");
  if (errors.payment.licenseDuration) addField("payment", "License duration");

  Object.values(errors.lineItems).forEach((lineItemErrors) => {
    if (lineItemErrors.description) {
      addField("deliverables", "Deliverable description");
    }
    if (lineItemErrors.qty) addField("deliverables", "Deliverable quantity");
    if (lineItemErrors.rate) addField("deliverables", "Deliverable rate");
  });

  if (
    requiresExplicitExportTaxChoice(formData.agency, formData.client) &&
    !hasExplicitExportTaxChoice(formData.agency)
  ) {
    addField("totals", "Export tax handling choice");
  }

  return orderedSteps
    .map((step) => ({
      step,
      fields: Array.from(groups.get(step) ?? []),
    }))
    .filter((group) => group.fields.length > 0);
}

function isInvoiceReadyForPreview(formData: InvoiceFormData) {
  return orderedSteps.every((step) => isInvoiceStepValid(formData, step));
}

function getStepDescription(step: InvoiceStepperStep) {
  switch (step) {
    case "agency":
      return "Business identity, address, and GST setup.";
    case "client":
      return "Recipient details and billing location.";
    case "deliverables":
      return "Billable line items and pricing.";
    case "payment":
      return "Payment terms, bank details, and optional licensing.";
    case "meta":
      return "Invoice number and dates.";
    case "totals":
      return "Final review before preview.";
    default:
      return "";
  }
}

function formatSummaryCurrency(
  amount: number,
  currency: ReturnType<typeof getInvoiceDisplayCurrency> = "INR"
) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}

function InlineStepSection({
  step,
  isActive,
  isCompleted,
  issueCount,
  onActivate,
  summary,
  children,
}: {
  step: InvoiceStepperStep;
  isActive: boolean;
  isCompleted: boolean;
  issueCount: number;
  onActivate: () => void;
  summary?: string;
  children: ReactNode;
}) {
  const stepLabel = getStepShortLabel(step);
  const statusLabel = isCompleted
    ? "Completed"
    : isActive
    ? "Recommended"
    : "Incomplete";
  const detailCopy = isCompleted
    ? "Completed and still editable."
    : isActive
    ? `Recommended next. ${getStepDescription(step)}`
    : getStepDescription(step);

  return (
    <motion.section
      layout
      data-step-section={step}
      data-step-state={isActive ? "active" : isCompleted ? "completed" : "incomplete"}
      className={cn(
        "relative scroll-mt-32 overflow-hidden rounded-[18px] px-6 py-5 transition-[background-color,border-color,box-shadow] duration-[var(--app-duration-medium)]",
        isActive
          ? "border border-slate-200/75 bg-white/92 shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
          : isCompleted
          ? "border border-slate-200/55 bg-white/68 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          : "border border-slate-200/45 bg-white/48 shadow-[0_6px_16px_rgba(15,23,42,0.03)]"
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <button
            type="button"
            onClick={onActivate}
            data-step-activator={step}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                  isCompleted
                    ? "bg-emerald-500"
                    : isActive
                    ? "bg-indigo-500"
                    : "bg-slate-300"
                )}
              />
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                {statusLabel}
              </span>
            </div>
            <h2 className="mt-2.5 text-[22px] font-semibold tracking-tight text-slate-950">
              {stepLabel}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              {detailCopy}
            </p>
          </button>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={getAppStatusPillClass(
                isCompleted ? "success" : isActive ? "default" : "muted"
              )}
            >
              {!isCompleted && issueCount > 0
                ? `${issueCount} required`
                : isCompleted
                ? "Ready"
                : "Needs review"}
            </span>
          </div>
        </div>

        <motion.div
          layout
          initial={false}
          inert={!isActive && !isCompleted ? true : undefined}
          className={cn(
            isActive
              ? "border-t border-slate-200/60 pt-5"
              : isCompleted
              ? "pt-1"
              : "h-0 overflow-hidden opacity-0 pointer-events-none"
          )}
        >
          {isCompleted ? (
            <p className="text-sm text-slate-500 pt-1">
              {summary}
            </p>
          ) : null}
          <div
            inert={!isActive ? true : undefined}
            className={cn(
              isActive
                ? ""
                : "h-0 overflow-hidden opacity-0 pointer-events-none"
            )}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

export default function InvoiceEditorPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<InvoiceFormData>(() => {
    if (typeof window === "undefined") return defaultInvoiceFormData;

    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as StoredDraft | null;
        if (
          parsed?.formData &&
          parsed?.currentStep &&
          orderedSteps.includes(parsed.currentStep)
        ) {
          return mergeInvoiceFormData(parsed.formData);
        }
      }
    } catch {}

    const today = getTodayDateString();
    const fresh = mergeInvoiceFormData();
    return {
      ...fresh,
      meta: {
        ...fresh.meta,
        invoiceNumber: getNextInvoiceNumber(),
        invoiceDate: today,
        dueDate: "",
      },
    };
  });
  const [currentStep, setCurrentStep] = useState<InvoiceStepperStep>(() => {
    if (typeof window === "undefined") return "agency";

    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as StoredDraft | null;
        if (
          parsed?.currentStep &&
          orderedSteps.includes(parsed.currentStep)
        ) {
          return parsed.currentStep;
        }
      }
    } catch {}

    return "agency";
  });
  const [showExitModal, setShowExitModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [briefIntakeResetKey, setBriefIntakeResetKey] = useState(0);
  const [isBriefIntakeCollapsed, setIsBriefIntakeCollapsed] = useState(false);
  const [focusRequestNonce, setFocusRequestNonce] = useState(0);
  const [scrollRequestNonce, setScrollRequestNonce] = useState(0);

  const hasInitializedRef = useRef(false);
  const dueDateAutoManagedRef = useRef(true);
  const lastAutoDueDateRef = useRef("");
  const previousValidityRef = useRef<Record<InvoiceStepperStep, boolean> | null>(
    null
  );
  const stepRefs = useRef<Record<InvoiceStepperStep, HTMLDivElement | null>>({
    agency: null,
    client: null,
    deliverables: null,
    payment: null,
    meta: null,
    totals: null,
  });

  useEffect(() => {
    hasInitializedRef.current = true;
  }, []);

  useEffect(() => {
    if (!showToast) return;

    const timer = window.setTimeout(() => {
      setShowToast(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [showToast]);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(false);

    requestAnimationFrame(() => {
      setShowToast(true);
    });
  };

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft) as StoredDraft | null;
        if (
          parsedDraft?.formData &&
          parsedDraft.currentStep &&
          orderedSteps.includes(parsedDraft.currentStep)
        ) {
          const frameId = window.requestAnimationFrame(() => {
            triggerToast("Draft restored");
          });

          return () => window.cancelAnimationFrame(frameId);
        }
      }
    } catch (error) {
      console.error("Failed to restore draft:", error);
    }
  }, []);

  useEffect(() => {
    if (currentStep === "agency") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsBriefIntakeCollapsed(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentStep]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;

    const suggestedDueDate = getSuggestedDueDate(
      formData.meta.paymentTerms,
      formData.meta.invoiceDate
    );

    const currentDueDate = formData.meta.dueDate;
    const previousAutoDueDate = lastAutoDueDateRef.current;

    const isStillAutoManaged =
      dueDateAutoManagedRef.current ||
      !currentDueDate ||
      currentDueDate === previousAutoDueDate;

    if (isStillAutoManaged) {
      dueDateAutoManagedRef.current = true;
      lastAutoDueDateRef.current = suggestedDueDate;

      if (suggestedDueDate && currentDueDate !== suggestedDueDate) {
        const frameId = window.requestAnimationFrame(() => {
          setFormData((prev) => ({
            ...prev,
            meta: {
              ...prev.meta,
              dueDate: suggestedDueDate,
            },
          }));
        });

        return () => window.cancelAnimationFrame(frameId);
      }

      if (!suggestedDueDate && currentDueDate === previousAutoDueDate) {
        const frameId = window.requestAnimationFrame(() => {
          setFormData((prev) => ({
            ...prev,
            meta: {
              ...prev.meta,
              dueDate: "",
            },
          }));
        });

        return () => window.cancelAnimationFrame(frameId);
      }

      return;
    }

    dueDateAutoManagedRef.current = false;
    lastAutoDueDateRef.current = suggestedDueDate;
  }, [formData.meta.paymentTerms, formData.meta.invoiceDate, formData.meta.dueDate]);

  useEffect(() => {
    if (!scrollRequestNonce) return;

    const frameId = window.requestAnimationFrame(() => {
      const activeStepRoot = stepRefs.current[currentStep];
      if (!activeStepRoot) return;

      activeStepRoot.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentStep, scrollRequestNonce]);

  useEffect(() => {
    if (!focusRequestNonce) return;

    const frameId = window.requestAnimationFrame(() => {
      const activeStepRoot = stepRefs.current[currentStep];
      if (!activeStepRoot) return;

      const focusTarget =
        activeStepRoot.querySelector<HTMLElement>(
          'input:not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[role="radio"]:not([disabled])'
        );

      focusTarget?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentStep, focusRequestNonce]);

  const fieldErrors = useMemo(
    () => getInvoiceFieldErrors(formData),
    [formData]
  );

  const clientIsInternational = formData.client.clientLocation === "international";
  const agencyIsGstRegistered =
    formData.agency.gstRegistrationStatus === "registered";
  const effectiveExportTaxDecision = getEffectiveExportTaxHandling(
    formData.agency
  );
  const displayCurrency = useMemo(
    () =>
      getInvoiceDisplayCurrency({
        clientLocation: formData.client.clientLocation,
        clientCurrency: formData.client.clientCurrency,
      }),
    [formData.client.clientLocation, formData.client.clientCurrency]
  );

  const computedTotals = useMemo(
    () =>
      calculateInvoiceTotals({
        lineItems: formData.lineItems,
        agencyState: formData.agency.agencyState,
        clientState: formData.client.clientState,
        isInternational: clientIsInternational,
        isClientSezUnit: isDomesticSezClient(formData.client),
        gstRegistered: agencyIsGstRegistered,
        lutAvailability: formData.agency.lutAvailability,
        noLutTaxHandling: effectiveExportTaxDecision,
      }),
    [
      formData.lineItems,
      formData.agency.agencyState,
      clientIsInternational,
      formData.client,
      agencyIsGstRegistered,
      formData.agency.lutAvailability,
      effectiveExportTaxDecision,
    ]
  );

  const derivedTaxConfig = useMemo(() => {
    switch (computedTotals.taxType) {
      case "CGST_SGST":
        return {
          taxMode: "gst" as const,
          taxRate: 18,
        };
      case "IGST":
        return {
          taxMode: "igst" as const,
          taxRate: 18,
        };
      default:
        return {
          taxMode: "none" as const,
          taxRate: 0,
        };
    }
  }, [computedTotals.taxType]);

  const totalsComplianceMessage = useMemo(() => {
    const settlementWarning = getSettlementComplianceWarning({
      client: formData.client,
      payment: formData.payment,
    });

    if (clientIsInternational && agencyIsGstRegistered) {
      if (formData.agency.lutAvailability === "yes") {
        return [getLutDeclarationText(formData.agency), settlementWarning]
          .filter(Boolean)
          .join(" ");
      }

      if (effectiveExportTaxDecision === "add-igst") {
        return ["International export without LUT: IGST 18% applies.", settlementWarning]
          .filter(Boolean)
          .join(" ");
      }

      return settlementWarning;
    }

    if (isDomesticSezClient(formData.client) && agencyIsGstRegistered) {
      if (formData.agency.lutAvailability === "yes") {
        return formData.agency.lutNumber.trim()
          ? `Domestic SEZ supply under LUT ${formData.agency.lutNumber.trim()}: no IGST is added on the invoice.`
          : "Domestic SEZ supply under LUT: no IGST is added on the invoice.";
      }

      return "Domestic SEZ supply without LUT: IGST 18% applies even if the client is in the same state.";
    }

    if (clientIsInternational && !agencyIsGstRegistered) {
      return [
        "No GST applied because agency is marked as not registered under GST.",
        settlementWarning,
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (computedTotals.taxType === "CGST_SGST") {
      return "Domestic same-state billing: tax is split into CGST 9% and SGST 9%.";
    }

    if (computedTotals.taxType === "IGST") {
      return "Domestic interstate billing: IGST 18% applies to this invoice.";
    }

    if (!agencyIsGstRegistered) {
      return "Tax is set to 0% because the agency is marked as not registered under GST.";
    }

    if (!formData.agency.agencyState || !formData.client.clientState) {
      return "Select both agency and client state to determine whether GST should be split as CGST + SGST or applied as IGST.";
    }

    return "";
  }, [
    computedTotals.taxType,
    clientIsInternational,
    agencyIsGstRegistered,
    formData.agency,
    formData.client,
    formData.payment,
    effectiveExportTaxDecision,
  ]);

  const totalsComplianceVariant = useMemo(() => {
    if (
      getSettlementComplianceWarning({
        client: formData.client,
        payment: formData.payment,
      })
    ) {
      return "warning";
    }

    if (isDomesticSezClient(formData.client) && agencyIsGstRegistered) {
      return formData.agency.lutAvailability === "yes" ? "info" : "warning";
    }

    if (clientIsInternational && agencyIsGstRegistered) {
      return formData.agency.lutAvailability === "yes" ? "info" : "neutral";
    }

    return "neutral";
  }, [
    clientIsInternational,
    agencyIsGstRegistered,
    formData.client,
    formData.payment,
    formData.agency.lutAvailability,
  ]);

  const showInternationalExportDecision =
    clientIsInternational &&
    agencyIsGstRegistered &&
    formData.agency.lutAvailability !== "yes";

  const exportTaxHelperNote =
    showInternationalExportDecision &&
    effectiveExportTaxDecision === "keep-zero-tax"
      ? "You chose to handle the IGST liability separately."
      : "";
  const estimatedIgstLiability =
    showInternationalExportDecision &&
    effectiveExportTaxDecision === "keep-zero-tax"
      ? computedTotals.subtotal * 0.18
      : undefined;
  const showApproximateUsdReference =
    clientIsInternational && !formData.client.clientCurrency;
  const approximateUsdGrandTotal = showApproximateUsdReference
    ? convertInrToApproximateUsd(computedTotals.grandTotal)
    : undefined;
  const missingFieldGroups = useMemo(
    () => getMissingFieldLabels(formData),
    [formData]
  );
  const stepValidityByStep = useMemo(
    () =>
      orderedSteps.reduce<Record<InvoiceStepperStep, boolean>>((result, step) => {
        result[step] = isInvoiceStepValid(formData, step);
        return result;
      }, {
        agency: false,
        client: false,
        deliverables: false,
        payment: false,
        meta: false,
        totals: false,
      }),
    [formData]
  );
  const missingFieldCountByStep = useMemo(
    () =>
      missingFieldGroups.reduce<Record<InvoiceStepperStep, number>>(
        (counts, group) => {
          counts[group.step] = group.fields.length;
          return counts;
        },
        {
          agency: 0,
          client: 0,
          deliverables: 0,
          payment: 0,
          meta: 0,
          totals: 0,
        }
      ),
    [missingFieldGroups]
  );
  const firstInvalidStep = useMemo(
    () => getFirstInvalidStep(formData),
    [formData]
  );
  const currentStepIndex = orderedSteps.indexOf(currentStep);
  const completedStepCount = useMemo(
    () => orderedSteps.filter((step) => stepValidityByStep[step]).length,
    [stepValidityByStep]
  );

  const invoiceReadyForPreview = useMemo(
    () => isInvoiceReadyForPreview(formData),
    [formData]
  );
  const summaryByStep: Record<InvoiceStepperStep, string> = {
    agency: formData.agency.agencyName || "Not filled",
    client: formData.client.clientName || "Not filled",
    deliverables: `${formData.lineItems.length} item${
      formData.lineItems.length !== 1 ? "s" : ""
    }`,
    payment: formData.payment.bankName || "Not filled",
    meta: formData.meta.invoiceNumber || "Not filled",
    totals: formatSummaryCurrency(computedTotals.grandTotal, displayCurrency),
  };

  const getNextIncompleteStepAfter = useCallback(
    (step: InvoiceStepperStep) => {
      const startingIndex = orderedSteps.indexOf(step);
      if (startingIndex < 0) return null;

      return (
        orderedSteps
          .slice(startingIndex + 1)
          .find((candidate) => !stepValidityByStep[candidate]) ?? null
      );
    },
    [stepValidityByStep]
  );

  const guideToSection = (
    step: InvoiceStepperStep,
    options?: { focus?: boolean; scroll?: boolean }
  ) => {
    setCurrentStep(step);

    if (options?.scroll !== false) {
      setScrollRequestNonce((prev) => prev + 1);
    }

    if (options?.focus) {
      setFocusRequestNonce((prev) => prev + 1);
    }
  };

  const handleSectionKeyDownCapture = (
    step: InvoiceStepperStep,
    event: ReactKeyboardEvent<HTMLDivElement>
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

    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const inputType = event.target.type.toLowerCase();
    if (
      ["checkbox", "radio", "file", "submit", "button"].includes(inputType)
    ) {
      return;
    }

    event.preventDefault();

    const activeStepRoot = stepRefs.current[step];
    if (!activeStepRoot) return;

    const focusableFields = Array.from(
      activeStepRoot.querySelectorAll<HTMLElement>(
        'input:not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[role="radio"]:not([disabled])'
      )
    ).filter((element) => element.offsetParent !== null);

    const currentIndex = focusableFields.indexOf(event.target);

    if (currentIndex >= 0 && currentIndex < focusableFields.length - 1) {
      focusableFields[currentIndex + 1]?.focus();
      return;
    }

    if (stepValidityByStep[step]) {
      const nextStep = getNextIncompleteStepAfter(step);
      if (nextStep) {
        guideToSection(nextStep, { focus: true });
      }
    }
  };

  const shouldConfirmExit = currentStepIndex > 0 || isFormTouched(formData);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldConfirmExit) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldConfirmExit]);

  useEffect(() => {
    const handlePopState = () => {
      if (!shouldConfirmExit) return;

      history.pushState(null, "", window.location.href);
      setShowExitModal(true);
    };

    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldConfirmExit]);

  const goToStep = (step: InvoiceStepperStep, options?: { focus?: boolean }) => {
    guideToSection(step, { focus: options?.focus, scroll: true });
  };

  useEffect(() => {
    if (!hasInitializedRef.current) {
      previousValidityRef.current = stepValidityByStep;
      return;
    }

    let frameId = 0;

    const previousValidity = previousValidityRef.current;
    const activeStepBecameValid =
      previousValidity &&
      previousValidity[currentStep] === false &&
      stepValidityByStep[currentStep] === true;

    previousValidityRef.current = stepValidityByStep;

    if (activeStepBecameValid) {
      const nextStep = getNextIncompleteStepAfter(currentStep);
      if (!nextStep) return;

      playInteractionCue("stepComplete");
      frameId = window.requestAnimationFrame(() => {
        guideToSection(nextStep, { focus: true });
      });
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [
    currentStep,
    getNextIncompleteStepAfter,
    stepValidityByStep,
  ]);

  const handlePreviewInvoice = () => {
    if (!invoiceReadyForPreview) {
      if (firstInvalidStep) {
        guideToSection(firstInvalidStep, { focus: true });
        triggerToast("Complete the highlighted section before previewing.");
      }
      return;
    }

    try {
      const previewFormData = {
        ...formData,
        tax: derivedTaxConfig,
      };

      window.localStorage.setItem(
        PREVIEW_STORAGE_KEY,
        JSON.stringify(previewFormData)
      );
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData,
          currentStep: "totals",
          savedAt: new Date().toISOString(),
        } satisfies StoredDraft)
      );
      triggerToast("Preview ready");
      playInteractionCue("previewReady");
      router.push("/invoice/preview");
    } catch (error) {
      console.error("Failed to save preview data:", error);
      alert("Could not open preview. Please try again.");
    }
  };

  const persistDraft = () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        formData,
        currentStep,
        savedAt: new Date().toISOString(),
      } satisfies StoredDraft)
    );
  };

  const performSaveDraft = (options?: {
    stayOnPage?: boolean;
  }) => {
    try {
      persistDraft();
      setShowExitModal(false);
      triggerToast("Draft saved");
      playInteractionCue("saveSuccess");

      if (!options?.stayOnPage) {
        window.setTimeout(() => {
          router.push("/");
        }, 500);
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
      alert("Could not save draft. Please try again.");
    }
  };

  const handleSaveDraft = () => {
    performSaveDraft();
  };

  const handleLoadDemoData = () => {
    const demoInvoiceNumber =
      formData.meta.invoiceNumber?.startsWith("INV-")
        ? formData.meta.invoiceNumber
        : getNextInvoiceNumber();
    const demo = getDemoData(demoInvoiceNumber);

    const demoSuggestedDueDate = getSuggestedDueDate(
      demo.meta.paymentTerms,
      demo.meta.invoiceDate
    );

    dueDateAutoManagedRef.current = demo.meta.dueDate === demoSuggestedDueDate;
    lastAutoDueDateRef.current = demoSuggestedDueDate;

    setFormData(mergeInvoiceFormData(demo));
    guideToSection("totals", { focus: true });
    setIsBriefIntakeCollapsed(true);

    triggerToast("Demo data loaded");
  };

  const handleClearDemoData = () => {
    const freshInvoiceData = getFreshInvoiceData();
    const suggestedDueDate = getSuggestedDueDate(
      freshInvoiceData.meta.paymentTerms,
      freshInvoiceData.meta.invoiceDate
    );

    dueDateAutoManagedRef.current = true;
    lastAutoDueDateRef.current = suggestedDueDate;

    try {
      window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear local invoice state:", error);
    }

    setFormData(mergeInvoiceFormData(freshInvoiceData));
    guideToSection("agency", { focus: true });
    setShowExitModal(false);
    setIsBriefIntakeCollapsed(false);
    setBriefIntakeResetKey((prev) => prev + 1);
    triggerToast("Demo data cleared");
  };
  void handleLoadDemoData;
  void handleClearDemoData;

  const handleBriefAutofill = async (input: BriefIntakeInput) => {
    let ocrText = "";

    if (input.imageFiles?.length) {
      const extractedChunks: string[] = [];

      for (const file of input.imageFiles) {
        try {
          const extractedText = await extractTextFromImage(file);

          if (extractedText.trim()) {
            console.log(
              `[Brief Intake OCR] Extracted text from ${file.name}:`,
              extractedText
            );
            extractedChunks.push(extractedText.trim());
          }
        } catch (error) {
          console.error(`Failed OCR for ${file.name}:`, error);
        }
      }

      ocrText = extractedChunks.join("\n\n");
    }

    const normalizedInput = {
      ...input,
      text: [input.text.trim(), ocrText].filter(Boolean).join("\n\n"),
    };

    let aiExtraction: AiBriefExtraction | null = null;

    if (normalizedInput.text.trim()) {
      try {
        const response = await fetch("/api/brief-extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: normalizedInput.text,
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            extraction?: AiBriefExtraction | null;
          };
          aiExtraction = payload.extraction ?? null;
        }
      } catch (error) {
        console.error("AI brief extraction request failed:", error);
      }
    }

    const result = runBriefAutofill({
      currentFormData: formData,
      input: normalizedInput,
      aiExtraction,
    });

    if (!result.normalizedText.trim()) {
      triggerToast(
        input.imageFiles?.length
          ? "Could not extract text clearly. Try uploading a clearer image or paste text."
          : "Add a text brief first to extract invoice details."
      );
      return false;
    }

    const nextSuggestedDueDate = getSuggestedDueDate(
      result.nextFormData.meta.paymentTerms,
      result.nextFormData.meta.invoiceDate
    );

    const nextFormData =
      !result.nextFormData.meta.dueDate && nextSuggestedDueDate
        ? {
            ...result.nextFormData,
            meta: {
              ...result.nextFormData.meta,
              dueDate: nextSuggestedDueDate,
            },
          }
        : result.nextFormData;

    lastAutoDueDateRef.current = nextSuggestedDueDate;
    dueDateAutoManagedRef.current =
      !nextFormData.meta.dueDate ||
      nextFormData.meta.dueDate === nextSuggestedDueDate;

    const missingStep = getFirstInvalidStep(nextFormData);
    const recommendedStep = missingStep ?? "totals";

    setFormData(mergeInvoiceFormData(nextFormData));
    guideToSection(recommendedStep, { focus: true });

    triggerToast(
      result.filledFields.length > 0
        ? `Autofilled ${result.filledFields.length} field${
            result.filledFields.length === 1 ? "" : "s"
          }. Review the highlighted step inline.`
        : result.lowConfidenceFieldSummaries.length > 0
        ? "Autofill landed in the form. Review the highlighted section and finish the missing fields inline."
        : "Autofill landed in the form. Review the highlighted section and continue."
    );

    setIsBriefIntakeCollapsed(true);
    return true;
  };

  const handleBackToHome = () => {
    if (shouldConfirmExit) {
      setShowExitModal(true);
      return;
    }
    router.push("/");
  };

  const handleMetaChange = (meta: InvoiceFormData["meta"]) => {
    const previousDueDate = formData.meta.dueDate;
    const nextSuggestedDueDate = getSuggestedDueDate(
      meta.paymentTerms,
      meta.invoiceDate
    );

    if (meta.dueDate !== previousDueDate) {
      const wasPreviousAutoDueDate =
        !previousDueDate || previousDueDate === lastAutoDueDateRef.current;

      dueDateAutoManagedRef.current =
        wasPreviousAutoDueDate && meta.dueDate === nextSuggestedDueDate;

      if (!dueDateAutoManagedRef.current) {
        dueDateAutoManagedRef.current = false;
      }
    }

    setFormData((prev) => ({
      ...prev,
      meta,
    }));
  };

  const renderStepContent = (step: InvoiceStepperStep) => {
    switch (step) {
      case "agency":
        return (
          <AgencyDetailsSection
            embedded
            value={formData.agency}
            onChange={(agency) =>
              setFormData((prev) =>
                mergeInvoiceFormData({
                  ...prev,
                  agency,
                })
              )
            }
            errors={fieldErrors.agency}
          />
        );
      case "client":
        return (
          <ClientDetailsSection
            embedded
            value={formData.client}
            onChange={(client) =>
              setFormData((prev) =>
                mergeInvoiceFormData({
                  ...prev,
                  client,
                })
              )
            }
            errors={fieldErrors.client}
          />
        );
      case "deliverables":
        return (
          <DeliverablesSection
            embedded
            value={formData.lineItems}
            currency={displayCurrency}
            onChange={(lineItems) =>
              setFormData((prev) => ({
                ...prev,
                lineItems,
              }))
            }
            errors={fieldErrors.lineItems}
          />
        );
      case "payment":
        return (
          <TermsPaymentSection
            embedded
            value={formData.payment}
            meta={formData.meta}
            clientLocation={formData.client.clientLocation}
            onChange={(payment) =>
              setFormData((prev) =>
                mergeInvoiceFormData({
                  ...prev,
                  payment,
                })
              )
            }
            onMetaChange={handleMetaChange}
            paymentTermsError={fieldErrors.meta.paymentTerms}
            errors={fieldErrors.payment}
          />
        );
      case "meta":
        return (
          <InvoiceMetaSection
            embedded
            value={formData.meta}
            onChange={handleMetaChange}
            errors={{
              invoiceNumber: fieldErrors.meta.invoiceNumber,
              invoiceDate: fieldErrors.meta.invoiceDate,
              dueDate: fieldErrors.meta.dueDate,
            }}
          />
        );
      case "totals":
        return (
          <TotalsTaxesSection
            embedded
            value={derivedTaxConfig}
            computed={computedTotals}
            currency={displayCurrency}
            isLocked
            modeLabel="Tax Type"
            rateLabel="Total Tax %"
            gstOptionLabel="CGST + SGST"
            complianceMessage={totalsComplianceMessage}
            complianceVariant={totalsComplianceVariant}
            exportTaxDecision={effectiveExportTaxDecision}
            exportTaxHelperNote={exportTaxHelperNote}
            estimatedIgstLiability={estimatedIgstLiability}
            grandTotalReferenceLabel={
              showApproximateUsdReference
                ? "Approx. USD total (reference only)"
                : ""
            }
            grandTotalReferenceAmount={approximateUsdGrandTotal}
            onExportTaxDecisionChange={
              showInternationalExportDecision
                ? (noLutTaxHandling) =>
                    setFormData((prev) => ({
                      ...prev,
                      agency: {
                        ...prev.agency,
                        noLutTaxHandling,
                      },
                    }))
                : undefined
            }
            onChange={(tax) =>
              setFormData((prev) => ({
                ...prev,
                tax,
              }))
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className={appPageShellClass}>
      <UploadToast message={toastMessage} visible={showToast} />

      <AppHeader rightSlot={<LogoutButton />} />

      <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,720px)_216px] lg:items-start lg:justify-center lg:gap-16">
          <div className={`w-full max-w-[720px] ${appSectionGapClass}`}>
            <header className="space-y-3">
              <MotionReveal preset="fade-up">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    New Invoice
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Create Invoice
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-slate-500">
                    Fill each section top to bottom.
                  </p>
                </div>
              </MotionReveal>

              <div
                className="sticky top-4 z-20 mb-6 flex justify-end gap-2"
                data-testid="floating-editor-actions"
              >
                <button
                  type="button"
                  onClick={handleBackToHome}
                  className={getAppButtonClass({ variant: "ghost", size: "sm" })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                >
                  <SaveIcon className="h-4 w-4" />
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={handlePreviewInvoice}
                  disabled={!invoiceReadyForPreview}
                  aria-label={
                    invoiceReadyForPreview
                      ? "Preview and download your invoice"
                      : firstInvalidStep
                      ? `Complete ${getStepShortLabel(firstInvalidStep)} section first`
                      : "Complete all sections to preview"
                  }
                  className={getAppButtonClass({ variant: "primary", size: "sm" })}
                >
                  <DownloadIcon className="h-4 w-4" />
                  Preview & download
                </button>
              </div>

              <div
                className={cn(
                  getAppSubtlePanelClass("muted"),
                  "px-4 py-3 lg:hidden"
                )}
                data-testid="compact-progress-summary"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        Progress
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {completedStepCount} of {orderedSteps.length} sections ready
                    </p>
                  </div>
                  <span className={getAppStatusPillClass(firstInvalidStep ? "default" : "success")}>
                    {firstInvalidStep
                      ? `Next: ${getStepShortLabel(firstInvalidStep)}`
                      : "Ready for preview"}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        (completedStepCount / orderedSteps.length) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </header>

            <div className="opacity-80 transition-opacity duration-200 hover:opacity-100">
              <BriefIntakeCard
                key={briefIntakeResetKey}
                onExtract={handleBriefAutofill}
                onPlaceholderAction={triggerToast}
                isCollapsed={isBriefIntakeCollapsed}
                onCollapsedChange={setIsBriefIntakeCollapsed}
              />
            </div>

            <div className="space-y-5 overflow-visible" data-testid="invoice-vertical-stepper">
              {orderedSteps.map((step) => {
                const isActive = currentStep === step;
                const isCompleted = stepValidityByStep[step] && !isActive;

                return (
                  <div
                    key={step}
                    ref={(node) => {
                      stepRefs.current[step] = node;
                    }}
                    onFocusCapture={() => {
                      if (currentStep !== step) {
                        setCurrentStep(step);
                      }
                    }}
                  >
                    <InlineStepSection
                      step={step}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      issueCount={missingFieldCountByStep[step]}
                      onActivate={() => goToStep(step)}
                      summary={summaryByStep[step]}
                    >
                      <div onKeyDownCapture={(event) => handleSectionKeyDownCapture(step, event)}>
                        {renderStepContent(step)}
                      </div>
                    </InlineStepSection>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="hidden w-full lg:block lg:w-[216px] lg:justify-self-end" data-testid="desktop-support-rail">
            <div className="space-y-3 lg:sticky lg:top-[88px]">
              <MotionReveal
                preset="fade-up"
                delay={40}
                className={cn(getAppSubtlePanelClass("muted"), "px-3 py-3")}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Progress
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {completedStepCount} of {orderedSteps.length} sections ready
                    </p>
                  </div>

                  <div className="space-y-2">
                    {orderedSteps.map((step, index) => {
                      const isActive = currentStep === step;
                      const isCompleted = stepValidityByStep[step] && !isActive;
                      const isIncomplete = !stepValidityByStep[step];

                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={() => goToStep(step)}
                          className={`app-interactive-surface flex w-full items-center justify-between gap-2 rounded-[12px] px-2.5 py-2 text-left transition duration-[var(--app-duration-fast)] ${
                            isActive
                              ? "app-soft-choice-option-active"
                              : isCompleted
                              ? "bg-emerald-50/38 text-slate-700 ring-1 ring-inset ring-emerald-100/62"
                              : "bg-white/28 text-slate-700 ring-1 ring-inset ring-slate-200/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] font-semibold ${
                                isActive
                                  ? "bg-indigo-500 text-white"
                                  : isCompleted
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isCompleted ? "✓" : index + 1}
                            </span>
                            <div>
                              <p className="text-[13px] font-medium text-slate-950">
                                {getStepShortLabel(step)}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {isCompleted
                                  ? "Completed"
                                  : isActive
                                  ? "Active now"
                                  : "Incomplete"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {isIncomplete && missingFieldCountByStep[step] > 0
                              ? `${missingFieldCountByStep[step]} left`
                              : isCompleted
                              ? "Ready"
                              : "Review"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </MotionReveal>

              <MotionReveal
                preset="fade-up"
                delay={80}
                className={cn(getAppSubtlePanelClass("muted"), "px-3 py-3")}
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Ready state
                    </p>
                    <p className="text-sm font-semibold tracking-tight text-slate-950">
                      {invoiceReadyForPreview
                        ? "Ready for preview"
                        : firstInvalidStep
                        ? `${getStepShortLabel(firstInvalidStep)} needs attention`
                        : "Keep completing the form"}
                    </p>
                  </div>

                  <div className="space-y-2 text-[11px] leading-5 text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>Invoice</span>
                      <span className="font-medium text-slate-900">
                        {formData.meta.invoiceNumber || "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Client</span>
                      <span className="truncate font-medium text-slate-900">
                        {formData.client.clientName || "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Total</span>
                      <span className="font-semibold text-slate-950">
                        {formatSummaryCurrency(computedTotals.grandTotal, displayCurrency)}
                      </span>
                    </div>
                  </div>

                  {missingFieldGroups.length > 0 ? (
                    <ul className="space-y-1.5 border-t border-slate-200/70 pt-3 text-[11px] leading-5 text-slate-600">
                      {missingFieldGroups.slice(0, 3).map((group) => (
                        <li key={group.step}>
                          <span className="font-medium text-slate-900">
                            {getStepShortLabel(group.step)}:
                          </span>{" "}
                          {group.fields.join(", ")}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </MotionReveal>

              {totalsComplianceMessage ? (
                <MotionReveal
                preset="fade-up"
                delay={110}
                className={cn(
                  getAppSubtlePanelClass(
                    totalsComplianceVariant === "warning" ? "warning" : "muted"
                  ),
                    "px-3.5 py-3.5"
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Compliance note
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {totalsComplianceMessage}
                  </p>
                </MotionReveal>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      {showExitModal && (
        <ExitConfirmModal
          onClose={() => setShowExitModal(false)}
          onSkip={() => router.push("/")}
          onSaveDraft={handleSaveDraft}
        />
      )}
    </main>
  );
}
