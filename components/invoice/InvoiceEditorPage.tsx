"use client";

import {
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
  AnimatePresence,
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
  getInvoiceStepError,
  isInvoiceStepValid,
} from "@/lib/invoice-validation";
import {
  appGridClass,
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
  appReadableContentClass,
  appSectionGapClass,
} from "@/lib/layout-foundation";
import {
  defaultInvoiceFormData,
  mergeInvoiceFormData,
  type InvoiceFormData,
  type InvoiceStepperStep,
} from "@/types/invoice";
import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";
import { ChevronLeftIcon, DownloadIcon, SaveIcon } from "@/components/ui/app-icons";

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
      return "Your business identity, structured address, and GST setup.";
    case "client":
      return "Recipient details, billing location, and SEZ/export routing.";
    case "deliverables":
      return "Line items, quantities, rates, and billing units.";
    case "payment":
      return "Payment terms, bank details, and licensing information.";
    case "meta":
      return "Invoice number and dates before final review.";
    case "totals":
      return "Tax outcome, compliance notes, and preview readiness.";
    default:
      return "";
  }
}

function InlineStepSection({
  step,
  index,
  isActive,
  isCompleted,
  isLocked,
  issueCount,
  onActivate,
  children,
}: {
  step: InvoiceStepperStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  issueCount: number;
  onActivate: () => void;
  children: ReactNode;
}) {
  const stepLabel = getStepShortLabel(step);
  const statusLabel = isCompleted
    ? "Complete"
    : isActive
    ? issueCount > 0
      ? `${issueCount} field${issueCount === 1 ? "" : "s"} still needed`
      : "Ready to continue"
    : isLocked
    ? "Locked until the step above is complete"
    : "Available";

  return (
    <motion.section
      layout
      data-step-section={step}
      data-step-state={
        isActive ? "active" : isCompleted ? "completed" : isLocked ? "locked" : "available"
      }
      className="app-soft-step-surface relative rounded-[16px]"
    >
      {index < orderedSteps.length - 1 ? (
        <span
          aria-hidden="true"
          className="absolute bottom-[-20px] left-[26px] top-[76px] w-px bg-slate-300/70"
        />
      ) : null}

      <button
        type="button"
        onClick={onActivate}
        disabled={isLocked}
        aria-expanded={isActive}
        className="flex w-full items-start gap-4 px-5 py-5 text-left transition-colors duration-[var(--app-duration-fast)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span
          className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-[var(--app-duration-fast)] ${
            isCompleted
              ? "border-emerald-300 bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.22)]"
              : isActive
              ? "border-indigo-300 bg-white text-indigo-900 shadow-[var(--app-soft-shadow-raised)]"
              : isLocked
              ? "border-slate-200 bg-slate-100/90 text-slate-400"
              : "border-slate-300 bg-white/92 text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.12)]"
          }`}
        >
          {isCompleted ? "✓" : index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold tracking-tight text-slate-950">
                {stepLabel}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {getStepDescription(step)}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                isCompleted
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_1px_0_rgba(255,255,255,0.76)]"
                  : isActive
                  ? "border-indigo-200 bg-indigo-50/90 text-indigo-700 shadow-[0_1px_0_rgba(255,255,255,0.76)]"
                  : isLocked
                  ? "border-slate-200 bg-white/68 text-slate-500 shadow-[0_1px_0_rgba(255,255,255,0.76)]"
                  : "border-slate-200 bg-white/82 text-slate-600 shadow-[0_1px_0_rgba(255,255,255,0.76)]"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isActive ? (
          <motion.div
            key={`${step}-content`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="border-t border-[color:var(--app-soft-border)] px-5 pb-5 pt-4"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

export default function InvoiceEditorPage() {
  const router = useRouter();

  const [formData, setFormData] =
    useState<InvoiceFormData>(defaultInvoiceFormData);
  const [currentStep, setCurrentStep] =
    useState<InvoiceStepperStep>("agency");
  const [showExitModal, setShowExitModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [briefIntakeResetKey, setBriefIntakeResetKey] = useState(0);
  const [isBriefIntakeCollapsed, setIsBriefIntakeCollapsed] = useState(false);
  const [focusRequestNonce, setFocusRequestNonce] = useState(0);

  const hasInitializedRef = useRef(false);
  const dueDateAutoManagedRef = useRef(true);
  const lastAutoDueDateRef = useRef("");
  const stepRefs = useRef<Record<InvoiceStepperStep, HTMLDivElement | null>>({
    agency: null,
    client: null,
    deliverables: null,
    payment: null,
    meta: null,
    totals: null,
  });

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
    if (hasInitializedRef.current) return;

    const today = getTodayDateString();
    let frameId = 0;

    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);

      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft) as StoredDraft | null;

        if (
          parsedDraft &&
          parsedDraft.formData &&
          parsedDraft.currentStep &&
          orderedSteps.includes(parsedDraft.currentStep)
        ) {
          const restoredFormData = mergeInvoiceFormData(parsedDraft.formData);
          const restoredSuggestedDueDate = getSuggestedDueDate(
            restoredFormData.meta.paymentTerms,
            restoredFormData.meta.invoiceDate
          );

          dueDateAutoManagedRef.current =
            !restoredFormData.meta.dueDate ||
            restoredFormData.meta.dueDate === restoredSuggestedDueDate;

          lastAutoDueDateRef.current = restoredSuggestedDueDate;

          frameId = window.requestAnimationFrame(() => {
            hasInitializedRef.current = true;
            setFormData(restoredFormData);
            setCurrentStep(parsedDraft.currentStep);
            triggerToast("Draft restored");
          });

          return () => window.cancelAnimationFrame(frameId);
        }
      }
    } catch (error) {
      console.error("Failed to restore draft:", error);
    }

    frameId = window.requestAnimationFrame(() => {
      setFormData((prev) => {
        const nextInvoiceNumber = prev.meta.invoiceNumber.trim()
          ? prev.meta.invoiceNumber
          : getNextInvoiceNumber();

        const nextInvoiceDate = prev.meta.invoiceDate || today;
        const suggestedDueDate = getSuggestedDueDate(
          prev.meta.paymentTerms,
          nextInvoiceDate
        );

        let nextDueDate = prev.meta.dueDate;
        if (!nextDueDate && suggestedDueDate) {
          nextDueDate = suggestedDueDate;
        }

        lastAutoDueDateRef.current = suggestedDueDate;
        dueDateAutoManagedRef.current =
          !prev.meta.dueDate || prev.meta.dueDate === suggestedDueDate;
        hasInitializedRef.current = true;

        return {
          ...prev,
          meta: {
            ...prev.meta,
            invoiceNumber: nextInvoiceNumber,
            invoiceDate: nextInvoiceDate,
            dueDate: nextDueDate,
          },
        };
      });
    });

    return () => window.cancelAnimationFrame(frameId);
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
    const frameId = window.requestAnimationFrame(() => {
      const activeStepRoot = stepRefs.current[currentStep];
      if (!activeStepRoot) return;

      activeStepRoot.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentStep]);

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
  const highestUnlockedIndex = firstInvalidStep
    ? orderedSteps.indexOf(firstInvalidStep)
    : orderedSteps.length - 1;

  const currentStepIndex = orderedSteps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === orderedSteps.length - 1;

  const stepTitle = useMemo(() => {
    switch (currentStep) {
      case "agency":
        return "My Agency Details";
      case "client":
        return "Client Details";
      case "deliverables":
        return "Deliverables";
      case "payment":
        return "Payment & Terms";
      case "meta":
        return "Invoice Meta Data";
      case "totals":
        return "Totals & Taxes";
      default:
        return "Invoice";
    }
  }, [currentStep]);

  const currentStepValid = isInvoiceStepValid(formData, currentStep);
  const currentStepError = getInvoiceStepError(formData, currentStep);
  const invoiceReadyForPreview = useMemo(
    () => isInvoiceReadyForPreview(formData),
    [formData]
  );

  const handleActiveStepKeyDownCapture = (
    step: InvoiceStepperStep,
    event: ReactKeyboardEvent<HTMLDivElement>
  ) => {
    if (
      step !== currentStep ||
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

    if (currentStepValid && !isLastStep) {
      goNext();
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

  const goNext = () => {
    if (!currentStepValid || isLastStep) return;
    setCurrentStep(orderedSteps[currentStepIndex + 1]);
    setFocusRequestNonce((prev) => prev + 1);
  };

  const goBack = () => {
    if (!isFirstStep) {
      setCurrentStep(orderedSteps[currentStepIndex - 1]);
      setFocusRequestNonce((prev) => prev + 1);
    }
  };

  const goToStep = (step: InvoiceStepperStep) => {
    const targetIndex = orderedSteps.indexOf(step);
    if (targetIndex < 0 || targetIndex > highestUnlockedIndex) return;
    setCurrentStep(step);
    setFocusRequestNonce((prev) => prev + 1);
  };

  const handlePreviewInvoice = () => {
    if (!invoiceReadyForPreview) return;

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
    const demoInvoiceNumber = getNextInvoiceNumber();
    const demo = getDemoData(demoInvoiceNumber);

    const demoSuggestedDueDate = getSuggestedDueDate(
      demo.meta.paymentTerms,
      demo.meta.invoiceDate
    );

    dueDateAutoManagedRef.current = demo.meta.dueDate === demoSuggestedDueDate;
    lastAutoDueDateRef.current = demoSuggestedDueDate;

    setFormData(mergeInvoiceFormData(demo));
    setCurrentStep("agency");
    setIsBriefIntakeCollapsed(true);
    setFocusRequestNonce((prev) => prev + 1);

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
    setCurrentStep("agency");
    setShowExitModal(false);
    setIsBriefIntakeCollapsed(false);
    setBriefIntakeResetKey((prev) => prev + 1);
    setFocusRequestNonce((prev) => prev + 1);
    triggerToast("Demo data cleared");
  };

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
    setCurrentStep(recommendedStep);
    setFocusRequestNonce((prev) => prev + 1);

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

      <AppHeader
        leftSlot={
          <button
            type="button"
            onClick={handleBackToHome}
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            ← Back to Home
          </button>
        }
        rightSlot={<LogoutButton />}
      />

      <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
        <div className={appGridClass}>
        <MotionReveal
          preset="fade-up"
          className={`${appReadableContentClass} app-soft-shell ${appSectionGapClass} overflow-visible rounded-[18px] border p-5 sm:p-6`}
        >
          <header className="mb-6 border-b border-[color:var(--app-soft-border)] pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  New Invoice
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  Create Invoice
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  One guided flow from intake to preview. Autofill now lands directly inside the form.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadDemoData}
                  className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                >
                  Load Demo Data
                </button>

                <button
                  type="button"
                  onClick={handleClearDemoData}
                  className={getAppButtonClass({
                    variant: "destructive-lite",
                    size: "sm",
                  })}
                >
                  Clear Demo Data
                </button>
              </div>
            </div>

            <div className="app-soft-choice-track mt-4 flex items-center justify-between gap-3 rounded-[14px] px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Active Step
                </p>
                <p className="mt-1 text-sm font-semibold tracking-tight text-slate-950">
                  {stepTitle}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Progress
                </p>
                <p className="mt-1 text-sm font-semibold tracking-tight text-slate-950">
                  {currentStepIndex + 1} / {orderedSteps.length}
                </p>
              </div>
            </div>
          </header>

          <BriefIntakeCard
            key={briefIntakeResetKey}
            onExtract={handleBriefAutofill}
            onPlaceholderAction={triggerToast}
            isCollapsed={isBriefIntakeCollapsed}
            onCollapsedChange={setIsBriefIntakeCollapsed}
          />

          <div className="space-y-4 overflow-visible" data-testid="invoice-vertical-stepper">
            {orderedSteps.map((step, index) => {
              const isActive = currentStep === step;
              const isCompleted = !isActive && index < highestUnlockedIndex;
              const isLocked = !isActive && index > highestUnlockedIndex;

              return (
                <div
                  key={step}
                  ref={(node) => {
                    stepRefs.current[step] = node;
                  }}
                >
                  <InlineStepSection
                    step={step}
                    index={index}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    isLocked={isLocked}
                    issueCount={missingFieldCountByStep[step]}
                    onActivate={() => goToStep(step)}
                  >
                    <div onKeyDownCapture={(event) => handleActiveStepKeyDownCapture(step, event)}>
                      {renderStepContent(step)}
                    </div>
                  </InlineStepSection>
                </div>
              );
            })}
          </div>

          {!currentStepValid && (
            <div className="mt-4 rounded-[12px] border border-red-200 bg-red-50/92 px-4 py-3 text-sm text-red-700 shadow-[0_1px_0_rgba(255,255,255,0.72)]">
              {currentStepError}
            </div>
          )}

          <footer
            className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--app-soft-border)] pt-4"
            data-testid="editor-footer-actions"
          >
            {!isLastStep ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isFirstStep}
                  className={getAppButtonClass({ variant: "secondary", size: "lg" })}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!currentStepValid}
                  className={getAppButtonClass({ variant: "primary", size: "lg" })}
                >
                  Continue
                </button>
              </div>
            ) : (
              <div />
            )}

            {isLastStep && (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleBackToHome}
                  className={getAppButtonClass({ variant: "ghost", size: "sm" })}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChevronLeftIcon className="h-4 w-4" />
                    Close
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className={getAppButtonClass({ variant: "secondary", size: "lg" })}
                >
                  <span className="inline-flex items-center gap-2">
                    <SaveIcon className="h-4 w-4" />
                    Save Draft
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePreviewInvoice}
                  disabled={!currentStepValid}
                  className={getAppButtonClass({ variant: "primary", size: "lg" })}
                >
                  <span className="inline-flex items-center gap-2">
                    <DownloadIcon className="h-4 w-4" />
                    Preview & Download
                  </span>
                </button>
              </div>
            )}
          </footer>
        </MotionReveal>
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
