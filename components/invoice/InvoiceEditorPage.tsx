"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import BriefSummaryModal from "@/components/invoice/BriefSummaryModal";
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
  hydrateInvoiceFormFromParsedExtraction,
  type ParsedInvoiceHydrationResult,
} from "@/lib/invoice-parsed-extraction-hydration";
import type { BriefParserResponse } from "@/lib/brief-parser-gateway";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId, saveInvoice, reissueNegotiatedInvoice } from "@/lib/supabase/invoices";
import type { InvoiceStatus } from "@/lib/supabase/invoices";
import {
  convertInrToApproximateUsd,
  getInvoiceDisplayCurrency,
} from "@/lib/international-billing-options";
import { playInteractionCue } from "@/lib/interaction-feedback";
import {
  loadProfile,
  profileToAgencyDetails,
  profileToPaymentDefaults,
  syncProfileFromInvoice,
} from "@/lib/supabase/profiles";
import {
  listClients,
  savedClientToClientDetails,
  type SavedClient,
} from "@/lib/supabase/clients";
import {
  getInvoiceFieldErrors,
  isInvoiceStepValid,
} from "@/lib/invoice-validation";
import { syncMsaToInvoice } from "@/lib/msa-sync-utils";
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
import { EyeIcon, SaveIcon } from "@/components/ui/app-icons";

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
  documentId?: string | null;
  clientMsaNote?: string | null;
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
      agencyName: "Ashok Creative Studio",
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
      lutValidity: "",
      noLutTaxHandling: "",
      signatureUrl: "",
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
      isRcmEnabled: false,
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
      accountName: "Ashok Creative Studio",
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[color:var(--bg-overlay)] px-4 backdrop-blur-sm">
      <div className={`w-full max-w-md ${getAppPanelClass()}`}>
        <h2 className="text-xl font-semibold tracking-tight text-[color:var(--text-primary)]">
          Leave invoice editor?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
          You have unsaved progress. Choose{" "}
          <span className="font-medium text-[color:var(--text-primary)]">Save Draft</span> to keep
          your work, or <span className="font-medium text-[color:var(--text-primary)]">Skip</span>{" "}
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
    if (lineItemErrors.sacCode) addField("deliverables", "SAC code");
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
      return "Issuer details, address, and tax registration.";
    case "client":
      return "Bill-to details and billing jurisdiction.";
    case "deliverables":
      return "Deliverables, quantities, and commercial rates.";
    case "payment":
      return "Settlement details and supporting payment terms.";
    case "meta":
      return "Invoice number, issue date, and due date.";
    case "totals":
      return "Final tax outcome and payable amount.";
    default:
      return "";
  }
}

function getStepKind(step: InvoiceStepperStep) {
  switch (step) {
    case "payment":
    case "meta":
      return "support";
    case "totals":
      return "final";
    default:
      return "entry";
  }
}

function getNextStep(step: InvoiceStepperStep) {
  const currentIndex = orderedSteps.indexOf(step);

  if (currentIndex === -1 || currentIndex === orderedSteps.length - 1) {
    return null;
  }

  return orderedSteps[currentIndex + 1];
}

function InlineStepSection({
  step,
  isActive,
  isCompleted,
  issueCount,
  onActivate,
  children,
  footer,
}: {
  step: InvoiceStepperStep;
  isActive: boolean;
  isCompleted: boolean;
  issueCount: number;
  onActivate: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const stepNumber = orderedSteps.indexOf(step) + 1;
  const stepLabel = getStepShortLabel(step);
  const detailCopy = getStepDescription(step);
  const stepKind = getStepKind(step);
  const statusLabel =
    !isCompleted && isMounted && issueCount > 0
      ? `${issueCount} required`
      : isCompleted
      ? "Ready"
      : isActive
      ? "In progress"
      : "Pending";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <motion.section
      layout
      data-step-section={step}
      data-step-state={isActive ? "active" : isCompleted ? "completed" : "incomplete"}
      data-step-kind={stepKind}
      className={cn(
        "invoice-step-card relative scroll-mt-32 overflow-hidden rounded-[18px] px-[18px] py-4 transition-[background-color,border-color,box-shadow] duration-[var(--app-duration-medium)] sm:px-5"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <button
            type="button"
            onClick={onActivate}
            data-step-activator={step}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "invoice-step-dot mt-[9px] inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                    isCompleted
                      ? "bg-[color:var(--interactive-secondary)]"
                      : isActive
                      ? "bg-[color:var(--interactive-primary)]"
                      : "bg-[color:var(--border-strong)]"
                  )}
                />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Step {stepNumber}
                </p>
                <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.024em] text-[color:var(--text-primary)]">
                  {stepLabel}
                </h2>
                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[color:var(--text-muted)]">
                  {detailCopy}
                </p>
              </div>
            </div>
          </button>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={getAppStatusPillClass(
                isCompleted ? "success" : isActive ? "default" : "muted"
              )}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <motion.div
          layout
          initial={false}
          className="invoice-step-divider pt-2"
        >
          <div className="space-y-4">
            {children}
            {footer}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

export default function InvoiceEditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<InvoiceFormData>(() =>
    mergeInvoiceFormData(defaultInvoiceFormData)
  );
  const [currentStep, setCurrentStep] = useState<InvoiceStepperStep>("agency");
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [briefIntakeResetKey, setBriefIntakeResetKey] = useState(0);
  const [isBriefIntakeCollapsed, setIsBriefIntakeCollapsed] = useState(true);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [parserDocumentId, setParserDocumentId] = useState<string | null>(null);
  const [clientMsaNote, setClientMsaNote] = useState<string | null>(null);
  const [profileLogoUrl, setProfileLogoUrl] = useState<string>("");
  const [profileQrUrl, setProfileQrUrl] = useState<string>("");
  const [focusRequestNonce, setFocusRequestNonce] = useState(0);
  const [showAllValidationErrors, setShowAllValidationErrors] = useState(false);
  const [isProcessingAutofill, setIsProcessingAutofill] = useState(false);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);

  // Modal States
  const [briefSummaryData, setBriefSummaryData] = useState<{
    nextFormData: InvoiceFormData;
    lowConfidence: import("@/lib/invoice-brief-intake").BriefAutofillFieldSummary[];
    confident: import("@/lib/invoice-brief-intake").BriefAutofillFieldSummary[];
    isNewClient: boolean;
  } | null>(null);
  const [shouldSaveNewClientMaster, setShouldSaveNewClientMaster] = useState(false);
  const [postSubmitActionModal, setPostSubmitActionModal] = useState<{ isOpen: boolean; isReady: boolean } | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);

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
    if (hasInitializedRef.current) {
      return;
    }

    let frameId = 0;
    let nextFormData: InvoiceFormData | null = null;
    let nextStep: InvoiceStepperStep = "agency";
    let nextDocumentId: string | null = null;
    let nextMsaNote: string | null = null;
    let shouldShowRestoreToast = false;
    let shouldShowFallbackToast = false;

    const isGuest = searchParams.get("guest") === "1";
    setIsGuestMode(isGuest);

    try {
      try {
        const isFresh = window.location.search.includes("fresh=1");
        const rawDraft = !isFresh ? window.localStorage.getItem(DRAFT_STORAGE_KEY) : null;
        
        if (rawDraft) {
          const parsedDraft = JSON.parse(rawDraft) as StoredDraft | null;
          if (
            parsedDraft?.formData &&
            parsedDraft.currentStep &&
            orderedSteps.includes(parsedDraft.currentStep)
          ) {
            nextFormData = mergeInvoiceFormData(parsedDraft.formData);
            nextStep = parsedDraft.currentStep;
            nextDocumentId = parsedDraft.documentId ?? null;
            nextMsaNote = parsedDraft.clientMsaNote ?? null;
            shouldShowRestoreToast = true;
          }
        }
      } catch (error) {
        console.error("Failed to restore draft:", error);
      }

      if (!nextFormData) {
        nextFormData = getFreshInvoiceData();
      }

      const suggestedDueDate = getSuggestedDueDate(
        nextFormData.meta.paymentTerms,
        nextFormData.meta.invoiceDate
      );

      dueDateAutoManagedRef.current =
        !nextFormData.meta.dueDate ||
        nextFormData.meta.dueDate === suggestedDueDate;
      lastAutoDueDateRef.current = suggestedDueDate;

      setFormData(nextFormData);
      setCurrentStep(nextStep);
      setParserDocumentId(nextDocumentId);
      setClientMsaNote(nextMsaNote);
    } catch (error) {
      console.error("Failed to initialize invoice editor:", error);

      // Logic gap: the page used to return null until this bootstrap finished.
      // If refresh-time localStorage or invoice-sequence setup failed, the
      // editor stayed blank. Fall back to a safe empty form instead.
      const fallbackFormData = mergeInvoiceFormData(defaultInvoiceFormData);
      const fallbackSuggestedDueDate = getSuggestedDueDate(
        fallbackFormData.meta.paymentTerms,
        fallbackFormData.meta.invoiceDate
      );

      dueDateAutoManagedRef.current =
        !fallbackFormData.meta.dueDate ||
        fallbackFormData.meta.dueDate === fallbackSuggestedDueDate;
      lastAutoDueDateRef.current = fallbackSuggestedDueDate;

      setFormData(fallbackFormData);
      setCurrentStep("agency");
      setClientMsaNote(null);
      shouldShowFallbackToast = true;
    } finally {
      hasInitializedRef.current = true;
      setIsBootstrapped(true);
    }

    if (shouldShowRestoreToast || shouldShowFallbackToast) {
      frameId = window.requestAnimationFrame(() => {
        triggerToast(
          shouldShowRestoreToast
            ? "Draft restored"
            : "Could not restore saved invoice state. Starting fresh."
        );
      });
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  /* ── Auto cloud-save after login redirect (restore=1) ── */
  useEffect(() => {
    if (!isBootstrapped) return;
    if (searchParams.get("restore") !== "1") return;

    async function autoCloudSave() {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { error } = await saveInvoice({
        formData,
        status: "draft" as InvoiceStatus,
        existingId: undefined,
      });

      if (!error) {
        // NEW: Sync profile details from this restored draft
        await syncProfileFromInvoice(formData);
        
        triggerToast("Draft saved to cloud ☁ Welcome back!");
        playInteractionCue("saveSuccess");
        // Clean up URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
      }
    }

    void autoCloudSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapped]);

  /* ── Profile auto-fill: load saved agency when starting fresh ── */
  useEffect(() => {
    if (!isBootstrapped) return;
    const isFresh = searchParams.get("fresh") === "1";
    // Only auto-fill if agency name is empty (fresh form, not a restored draft) OR if explicitly fresh
    if (formData.agency.agencyName.trim() && !isFresh) return;

    let cancelled = false;
    async function applyProfile() {
      const { data: profile } = await loadProfile();
      if (cancelled || !profile) return;

      if (profile.logo_url) setProfileLogoUrl(profile.logo_url);
      if (profile.qr_code_url) setProfileQrUrl(profile.qr_code_url);

      if (!profile.agency_name.trim()) return;

      setFormData((prev) => {
        // Double-check the form is still blank (user might have typed)
        if (prev.agency.agencyName.trim()) return prev;

        const agencyFromProfile = profileToAgencyDetails(profile);
        const paymentFromProfile = profileToPaymentDefaults(profile);

        return {
          ...prev,
          agency: { ...prev.agency, ...agencyFromProfile },
          payment: { ...prev.payment, ...paymentFromProfile },
        };
      });
    }
    applyProfile();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapped]);

  /* ── Client auto-fill: load saved clients and handle single-client case ── */
  useEffect(() => {
    if (!isBootstrapped) return;
    
    let cancelled = false;
    async function fetchClients() {
      const { data: clients } = await listClients();
      if (cancelled) return;
      
      console.log("CLIENT_LOAD: Found", clients?.length || 0, "saved clients");
      setSavedClients(clients || []);

      // Rule: If exactly one client exists and the current form is blank (fresh), auto-fill it
      const isFresh = searchParams.get("fresh") === "1";
      if (clients.length === 1 && (!formData.client.clientName.trim() || isFresh)) {
        const clientDetails = savedClientToClientDetails(clients[0]);
        setFormData(prev => ({
          ...prev,
          client: clientDetails
        }));
        console.log("CLIENT_AUTOFILL: Applied unique client", clients[0].client_name);
      }
    }

    void fetchClients();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapped]);

  /* ── Check for missing profile assets (Logo, QR, Signature) ── */
  useEffect(() => {
    if (!isBootstrapped) return;
    
    async function checkAssets() {
      const { data: profile } = await loadProfile();
      if (profile) {
        const hasAssets = Boolean(
          profile.logo_url && 
          profile.qr_code_url && 
          profile.signature_url
        );
        setShowProfilePrompt(!hasAssets);
      }
    }
    void checkAssets();
  }, [isBootstrapped]);

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
        taxRate: formData.tax.taxRate,
        isRcmEnabled: formData.tax.isRcmEnabled,
      }),
    [
      formData.lineItems,
      formData.agency.agencyState,
      clientIsInternational,
      formData.client,
      agencyIsGstRegistered,
      formData.agency.lutAvailability,
      effectiveExportTaxDecision,
      formData.tax.taxRate,
      formData.tax.isRcmEnabled,
    ]
  );

  const derivedTaxConfig = useMemo(() => {
    const currentRate = formData.tax.taxRate ?? 18;
    const isRcmEnabled = formData.tax.isRcmEnabled ?? false;
    switch (computedTotals.taxType) {
      case "CGST_SGST":
        return {
          taxMode: "gst" as const,
          taxRate: currentRate,
          isRcmEnabled,
        };
      case "IGST":
        return {
          taxMode: "igst" as const,
          taxRate: currentRate,
          isRcmEnabled,
        };
      default:
        return {
          taxMode: "none" as const,
          taxRate: 0,
          isRcmEnabled,
        };
    }
  }, [computedTotals.taxType, formData.tax.taxRate, formData.tax.isRcmEnabled]);

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
        return [`International export without LUT: IGST ${formData.tax.taxRate}% applies.`, settlementWarning]
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

      return `Domestic SEZ supply without LUT: IGST ${formData.tax.taxRate}% applies even if the client is in the same state.`;
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
      const halfRate = (formData.tax.taxRate ?? 18) / 2;
      return `Domestic same-state billing: tax is split into CGST ${halfRate}% and SGST ${halfRate}%.`;
    }

    if (computedTotals.taxType === "IGST") {
      return `Domestic interstate billing: IGST ${formData.tax.taxRate}% applies to this invoice.`;
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

  const invoiceReadyForPreview = useMemo(
    () => isInvoiceReadyForPreview(formData),
    [formData]
  );
  const displayStepValidityByStep = useMemo(
    () => ({
      ...stepValidityByStep,
      totals: invoiceReadyForPreview,
    }),
    [stepValidityByStep, invoiceReadyForPreview]
  );
  const completedStepCount = useMemo(
    () => orderedSteps.filter((step) => displayStepValidityByStep[step]).length,
    [displayStepValidityByStep]
  );
  const guideToSection = (
    step: InvoiceStepperStep,
    options?: { focus?: boolean }
  ) => {
    setCurrentStep(step);

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

  };

  const shouldConfirmExit = isFormTouched(formData);

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
    guideToSection(step, { focus: options?.focus });
  };

  const scrollToStep = (
    step: InvoiceStepperStep,
    options?: { focus?: boolean }
  ) => {
    guideToSection(step);

    const stepNode = stepRefs.current[step];
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (stepNode) {
      stepNode.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }

    if (options?.focus) {
      const requestFocus = () => {
        setFocusRequestNonce((prev) => prev + 1);
      };

      if (prefersReducedMotion) {
        requestAnimationFrame(requestFocus);
      } else {
        window.setTimeout(requestFocus, 220);
      }
    }
  };

  const handlePreviewInvoice = () => {
    if (!invoiceReadyForPreview) {
      setShowAllValidationErrors(true);
      if (firstInvalidStep) {
        scrollToStep(firstInvalidStep, { focus: true });
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

      // Save Client to Master if checked (only for registered users)
      if (shouldSaveNewClientMaster && !isGuestMode) {
        import("@/lib/supabase/clients").then(({ upsertClient }) => {
          upsertClient(formData.client).catch(console.error);
        });
      }

       window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData,
          currentStep: "totals",
          savedAt: new Date().toISOString(),
          documentId: parserDocumentId,
          clientMsaNote,
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
        documentId: parserDocumentId,
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

  const handleSaveDraft = async () => {
    // Always persist locally first — survives login redirect
    persistDraft();

    const userId = await getCurrentUserId();

    if (!userId) {
      // Not logged in — send to login with restore flag
      const returnUrl = `/invoice/new?restore=1`;
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Logged in — cloud-save as draft
    try {
      let result;
      if (clientMsaNote && parserDocumentId) {
        // Re-issuing after negotiation
        result = await reissueNegotiatedInvoice(parserDocumentId, formData);
        if (!result.error) {
          setClientMsaNote(null); // Clear local note state
        }
      } else {
        // Regular save
        result = await saveInvoice({
          formData,
          status: "draft" as InvoiceStatus,
          existingId: parserDocumentId ?? undefined,
        });
        if (!result.error && result.data) {
          setParserDocumentId(result.data.id);
        }
      }

      if (!result.error) {
        triggerToast(clientMsaNote ? "Reissued & saved to cloud ☁" : "Draft saved to cloud ☁");
        playInteractionCue("saveSuccess");
      } else {
        triggerToast("Saved locally (cloud save failed)");
        playInteractionCue("saveSuccess");
      }
    } catch {
      triggerToast("Saved locally");
    }
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
    setShowAllValidationErrors(false);
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
    setShowAllValidationErrors(false);
    guideToSection("agency", { focus: true });
    setParserDocumentId(null);
    setShowExitModal(false);
    setIsBriefIntakeCollapsed(false);
    setBriefIntakeResetKey((prev) => prev + 1);
    triggerToast("Demo data cleared");
  };
  void handleLoadDemoData;
  void handleClearDemoData;

  const handleBriefAutofill = async (input: BriefIntakeInput) => {
    // 1. Wipe state immediately to prevent hybrid merge between subsequent extractions
    setFormData(mergeInvoiceFormData(defaultInvoiceFormData));
    setIsProcessingAutofill(true);
    setExtractProgress(0);

    const progressInterval = setInterval(() => {
      setExtractProgress((prev) => (prev >= 95 ? 95 : prev + Math.floor(Math.random() * 5) + 1));
    }, 300);

    try {
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
        ocrText,
      };

      let aiExtraction: AiBriefExtraction | null = null;
      let parserResponse: BriefParserResponse | null = null;

      if (
        normalizedInput.text.trim() ||
        normalizedInput.ocrText.trim() ||
        normalizedInput.voiceTranscript?.trim()
      ) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const response = await fetch("/api/brief-extract", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {}),
            },
            body: JSON.stringify({
              briefText: normalizedInput.text,
              ocrText: normalizedInput.ocrText,
              voiceTranscript: normalizedInput.voiceTranscript ?? "",
              documentId: parserDocumentId,
              sourceMetadata: {
                attachmentNames: input.imageFiles?.map((file) => file.name),
                attachmentTypes: input.imageFiles?.map((file) => file.type),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            }),
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              extraction?: AiBriefExtraction | null;
              parser?: BriefParserResponse | null;
            };
            aiExtraction = payload.extraction ?? null;
            parserResponse = payload.parser ?? null;
            if (payload.parser?.documentId) {
              setParserDocumentId(payload.parser.documentId);
            }
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
      let parserHydration: ParsedInvoiceHydrationResult | null = null;

      if (!result.normalizedText.trim()) {
        triggerToast(
          input.imageFiles?.length
            ? "Could not extract text clearly. Try uploading a clearer image or paste text."
            : "Add a text brief first to extract invoice details."
        );
        return false;
      }

      if (parserResponse) {
        parserHydration = hydrateInvoiceFormFromParsedExtraction({
          currentFormData: formData,
          baseFormData: result.nextFormData,
          parserResponse,
        });
        console.log("=== PARSER HYDRATION SUCCESS ===", parserHydration.nextFormData.lineItems[0]);
      } else {
        console.log("=== PARSER RESPONSE IS NULL ===");
      }

      const hydratedFormData = parserHydration?.nextFormData ?? result.nextFormData;
      console.log("=== HYDRATED FORM DATA MERGE ===", hydratedFormData.lineItems[0]);

      const totalFilledFields = [
        ...result.filledFields,
        ...(parserHydration?.hydratedFields.map((field) => field.label) ?? []),
      ];

      const nextSuggestedDueDate = getSuggestedDueDate(
        hydratedFormData.meta.paymentTerms,
        hydratedFormData.meta.invoiceDate
      );

      const nextFormData =
        !hydratedFormData.meta.dueDate && nextSuggestedDueDate
          ? {
              ...hydratedFormData,
              meta: {
                ...hydratedFormData.meta,
                dueDate: nextSuggestedDueDate,
              },
            }
          : hydratedFormData;

      const mergedToSet = mergeInvoiceFormData(nextFormData);

      // Check if Client is New
      const clientName = mergedToSet.client.clientName.trim();
      const isNewClient = Boolean(clientName && !savedClients.some(c => c.client_name.toLowerCase() === clientName.toLowerCase()));

      setExtractProgress(100);
      
      // Open Summary Modal instead of instantly populating
      setBriefSummaryData({
        nextFormData: mergedToSet,
        lowConfidence: result.lowConfidenceFieldSummaries,
        confident: result.confidentFieldSummaries,
        isNewClient,
      });

      return true;
    } finally {
      clearInterval(progressInterval);
      setIsProcessingAutofill(false);
    }
  };

  const handleModalSubmit = (finalData: InvoiceFormData, saveClient: boolean) => {
    setShouldSaveNewClientMaster(saveClient);
    setFormData(finalData);

    const readyForPreview = isInvoiceReadyForPreview(finalData);
    setBriefSummaryData(null);
    setPostSubmitActionModal({ isOpen: true, isReady: readyForPreview });

    setBriefIntakeResetKey(Date.now());
    setIsBriefIntakeCollapsed(true);
    setShowAllValidationErrors(true);

    const missingStep = getFirstInvalidStep(finalData);
    const recommendedStep = missingStep ?? "totals";
    guideToSection(recommendedStep, { focus: true });
  };

  const handleParseAgain = () => {
    setBriefSummaryData(null);
    triggerToast("Let's try that again. You can edit the brief or add more details.");
    setIsBriefIntakeCollapsed(false);
  };

  const handleContinueManually = (finalData: InvoiceFormData) => {
    setFormData(finalData);
    setBriefSummaryData(null);
    setBriefIntakeResetKey(Date.now());
    setIsBriefIntakeCollapsed(true);
    setShowAllValidationErrors(true);
  };

  const handleBackToHome = () => {
    if (shouldConfirmExit) {
      setShowExitModal(true);
      return;
    }
    handleDiscardChanges();
  };

  const handleDiscardChanges = () => {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch (e) {
      console.error("Could not clear specific draft keys:", e);
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

  const updateFormSection = <K extends keyof InvoiceFormData>(
    section: K,
    data: InvoiceFormData[K]
  ) => {
    setFormData((prev) =>
      mergeInvoiceFormData({
        ...prev,
        [section]: data,
      })
    );
  };
  
  const handleClientSelect = (client: SavedClient) => {
    const syncedData = syncMsaToInvoice(formData, client);
    setFormData(syncedData);
    playInteractionCue("stepComplete");
  };

  const renderStepContent = (step: InvoiceStepperStep) => {
    switch (step) {
      case "agency":
        return (
          <AgencyDetailsSection
            embedded
            value={{ ...formData.agency, profileLogoUrl }}
            onChange={(agency) => updateFormSection("agency", agency)}
            errors={fieldErrors.agency}
            showAllErrors={showAllValidationErrors}
          />
        );
      case "client":
        return (
          <ClientDetailsSection
            value={formData.client}
            onChange={(client) => updateFormSection("client", client)}
            onClientSelect={handleClientSelect}
            errors={fieldErrors.client}
            showAllErrors={showAllValidationErrors}
            savedClients={savedClients}
            agency={formData.agency}
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
            showAllErrors={showAllValidationErrors}
          />
        );
      case "payment":
        return (
          <TermsPaymentSection
            embedded
            value={{ ...formData.payment, profileQrUrl }}
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
            showAllErrors={showAllValidationErrors}
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
            showAllErrors={showAllValidationErrors}
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
            settlementSummary={`Payment Terms: ${formData.meta.paymentTerms || "Due on Receipt"}${formData.payment.bankName ? ` | Bank: ${formData.payment.bankName}` : ""}`}
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

  console.log("=== FINAL RENDER FORM DATA ===", {
    agencyName: formData.agency.agencyName,
    clientState: formData.client.clientState,
    lineItemsRate: formData.lineItems[0]?.rate,
    computedSubtotal: computedTotals.subtotal,
  });

  return (
    <main suppressHydrationWarning className={appPageShellClass}>
      <AnimatePresence>
        {isProcessingAutofill && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--bg-canvas)]/60"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-[color:var(--interactive-primary)] opacity-20 duration-1000"></div>
                <div className="absolute inset-2 animate-pulse rounded-full bg-[color:var(--interactive-secondary)] opacity-40 duration-700"></div>
                <div className="relative h-12 w-12 rounded-full border-4 border-[color:var(--interactive-primary)] border-t-transparent animate-spin"></div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)]">Scanning & Translating {extractProgress}%</h2>
                <p className="max-w-xs text-center text-sm text-[color:var(--text-muted)] animate-pulse">
                  Lance is scanning your brief to structure the invoice...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <UploadToast message={toastMessage} visible={showToast} />

      {/* Editor Background Aesthetic Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(190,255,0,0.03)_0%,transparent_70%)] rounded-full blur-3xl"></div>
        <div className="absolute top-[20%] left-[-10%] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(0,212,160,0.03)_0%,transparent_70%)] rounded-full blur-2xl"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(190,255,0,0.02)_0%,transparent_70%)] rounded-full blur-3xl"></div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", backgroundSize: "48px 48px" }}></div>
      </div>

      <AppHeader rightSlot={<LogoutButton />} />
      
      <section className={`${appPageContainerClass} ${appPageSectionClass} relative z-10`}>
        <div className="mx-auto w-full max-w-[1328px]">
          {/* Profile Completion Prompt */}
          {showProfilePrompt && (
            <MotionReveal preset="fade-up" className="mb-6">
              <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[color:var(--color-lime-300)] bg-[color:var(--color-lime-50)] p-4 sm:flex-row sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--interactive-primary)] text-xl">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Complete your professional profile</h3>
                    <p className="text-[13px] text-[color:var(--text-secondary)]">Upload your agency logo, signature, and payment QR for faster, more compliant invoices.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowProfilePrompt(false)}
                    className="text-xs font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] px-3 py-2"
                  >
                    Later
                  </button>
                  <Link 
                    href="/profile"
                    className={getAppButtonClass({ variant: "primary", size: "sm" })}
                  >
                    Finish Profile
                  </Link>
                </div>
              </div>
            </MotionReveal>
          )}
        </div>
        <div className="mx-auto grid w-full max-w-[1328px] grid-cols-1 gap-5 lg:grid-cols-[158px_minmax(0,1fr)] lg:items-start lg:justify-center lg:gap-6 xl:max-w-[1392px] xl:grid-cols-[166px_minmax(0,1fr)] xl:gap-8">
          <div className={`w-full max-w-[1060px] pb-32 lg:col-start-2 lg:justify-self-start ${appSectionGapClass}`}>
            <div className="space-y-4">
              {clientMsaNote && (
                <MotionReveal preset="fade-up" className="mb-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                          Client Negotiation Note
                        </h4>
                        <p className="mt-1 text-sm leading-relaxed text-amber-900 font-medium">
                          &quot;{clientMsaNote}&quot;
                        </p>
                        <p className="mt-2 text-[11px] text-amber-700">
                          Please update the invoice details based on the client&apos;s request above.
                        </p>
                      </div>
                    </div>
                  </div>
                </MotionReveal>
              )}

              <div className="opacity-80 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100">
                <BriefIntakeCard
                  key={briefIntakeResetKey}
                  onExtract={handleBriefAutofill}
                  onPlaceholderAction={triggerToast}
                  isCollapsed={isBriefIntakeCollapsed}
                  onCollapsedChange={setIsBriefIntakeCollapsed}
                />
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
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Progress
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">
                      {completedStepCount} of {orderedSteps.length} sections ready
                    </p>
                  </div>
                  <span className={getAppStatusPillClass(firstInvalidStep ? "default" : "success")}>
                    {firstInvalidStep
                      ? `Next: ${getStepShortLabel(firstInvalidStep)}`
                      : "Ready for preview"}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[color:var(--border-subtle)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--interactive-secondary)] transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        (completedStepCount / orderedSteps.length) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4 overflow-visible" data-testid="invoice-vertical-stepper">
                {orderedSteps.map((step) => {
                  const isActive = currentStep === step;
                  const isCompleted = displayStepValidityByStep[step];

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
                      style={{ display: isActive ? 'block' : 'none' }}
                    >
                      <InlineStepSection
                        step={step}
                        isActive={isActive}
                        isCompleted={isCompleted}
                        issueCount={missingFieldCountByStep[step]}
                        onActivate={() => guideToSection(step)}
                        footer={
                          getNextStep(step) ? (
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                data-testid={`continue-${step}-to-${getNextStep(step)}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() =>
                                  guideToSection(getNextStep(step)!, { focus: true })
                                }
                                className={cn(
                                  getAppButtonClass({
                                    variant: "primary",
                                    size: "md",
                                  }),
                                  "h-10 px-6 font-semibold"
                                )}
                              >
                                Continue to {getStepShortLabel(getNextStep(step)!)}
                              </button>
                            </div>
                          ) : null
                        }
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
          </div>

          <aside className="hidden w-full lg:col-start-1 lg:row-start-1 lg:block lg:w-[158px] lg:self-start lg:sticky lg:top-[88px] xl:w-[166px]" data-testid="desktop-support-rail">
            <div className="space-y-3">
              <MotionReveal
                preset="fade-up"
                delay={40}
                className={cn(
                  getAppSubtlePanelClass("muted"),
                  "invoice-step-rail rounded-[16px] px-3 py-3"
                )}
              >
                <div className="space-y-3" data-testid="support-rail-section-list">
                  <div className="border-b border-[color:var(--border-subtle)] px-1 pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Editor progress
                    </p>
                    <p className="mt-1 text-[13px] font-semibold tracking-[-0.018em] text-[color:var(--text-primary)]">
                      {completedStepCount} of {orderedSteps.length} ready
                    </p>
                  </div>

                  <div className="invoice-step-rail-track relative space-y-1 pl-3">
                    {orderedSteps.map((step, index) => {
                      const isActive = currentStep === step;
                      const isCompleted = displayStepValidityByStep[step] && !isActive;
                      const isIncomplete = !displayStepValidityByStep[step];
                      const stepState = isActive
                        ? "active"
                        : isCompleted
                        ? "completed"
                        : "pending";
                      const railStatus =
                        step === "totals" && !invoiceReadyForPreview
                          ? "Pending"
                          : isActive
                          ? missingFieldCountByStep[step] > 0
                            ? `${missingFieldCountByStep[step]} required`
                            : "In progress"
                          : isCompleted
                          ? "Ready"
                          : isIncomplete && missingFieldCountByStep[step] > 0
                          ? `${missingFieldCountByStep[step]} required`
                          : firstInvalidStep === step
                          ? "Up next"
                          : "Pending";

                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={() => scrollToStep(step)}
                          data-rail-state={stepState}
                          className="invoice-step-rail-item group flex w-full items-start gap-3 rounded-[14px] px-3 py-3 text-left text-[color:var(--text-secondary)] transition duration-[var(--app-duration-fast)]"
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <span className="invoice-step-rail-index mt-0.5 inline-flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                              {isCompleted ? "✓" : index + 1}
                            </span>
                            <div className="min-w-0 space-y-1">
                              <p className="text-[12px] font-semibold leading-4 tracking-[0.005em] text-[color:var(--text-primary)]">
                                {getStepShortLabel(step)}
                              </p>
                              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                                {railStatus}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </MotionReveal>
            </div>
          </aside>
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-4 left-3 right-3 z-30 sm:bottom-auto sm:left-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2 sm:w-auto">
          <div
            className={cn(
              "invoice-action-dock pointer-events-auto flex w-full items-center justify-end gap-1.5 border px-2 py-2 sm:w-auto sm:flex-col sm:gap-2 sm:px-1.5 sm:py-3"
            )}
            data-testid="floating-editor-actions"
          >
            <button
              type="button"
              onClick={handleBackToHome}
              className={cn(
                getAppButtonClass({ variant: "ghost", size: "sm" }),
                "h-9 px-2.5 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] sm:h-auto sm:w-12 sm:flex-col sm:gap-0.5 sm:px-1 sm:py-2 sm:text-[10px]"
              )}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className={cn(
                getAppButtonClass({ variant: "secondary", size: "sm" }),
                "h-9 px-3 sm:h-auto sm:w-12 sm:flex-col sm:gap-0.5 sm:px-1 sm:py-2 sm:text-[10px]"
              )}
            >
              <SaveIcon className="h-4 w-4" />
              Draft
            </button>
            <button
              type="button"
              onClick={handlePreviewInvoice}
              disabled={false}
              aria-label={
                invoiceReadyForPreview
                  ? "Preview and download your invoice"
                  : firstInvalidStep
                  ? `Complete ${getStepShortLabel(firstInvalidStep)} section first`
                  : "Complete all sections to preview"
              }
              className={cn(
                getAppButtonClass({ variant: "secondary", size: "sm" }),
                "h-9 px-3.5 sm:h-auto sm:w-12 sm:flex-col sm:gap-0.5 sm:px-1 sm:py-2 sm:text-[10px]"
              )}
            >
              <EyeIcon className="h-4 w-4" />
              Preview
            </button>
          </div>
      </div>

      {showExitModal && (
        <ExitConfirmModal
          onClose={() => setShowExitModal(false)}
          onSkip={handleDiscardChanges}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {briefSummaryData && (
        <BriefSummaryModal
          isOpen={true}
          extractedData={briefSummaryData.nextFormData}
          lowConfidenceFields={briefSummaryData.lowConfidence}
          confidentFields={briefSummaryData.confident}
          missingFieldsGroups={missingFieldGroups}
          isNewClient={briefSummaryData.isNewClient}
          isLoggedIn={!isGuestMode}
          onContinueManually={handleContinueManually}
          onParseAgain={handleParseAgain}
          onSubmit={handleModalSubmit}
        />
      )}

      {postSubmitActionModal?.isOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="flex w-full max-w-sm flex-col overflow-hidden rounded-[20px] bg-[#111118] border border-[color:var(--border-subtle)] p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">
                {postSubmitActionModal.isReady ? "All set!" : "Almost there!"}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)] mb-6">
                {postSubmitActionModal.isReady 
                  ? "Your invoice is ready. What would you like to do next?"
                  : "We need a few more details to generate the preview. Let's review the form."}
              </p>
              <div className="flex flex-col gap-3">
                {postSubmitActionModal.isReady && (
                  <button
                    onClick={() => {
                      setPostSubmitActionModal(null);
                      handlePreviewInvoice();
                    }}
                    className={getAppButtonClass({ variant: "primary", size: "md" })}
                  >
                    Check Preview
                  </button>
                )}
                <button
                  onClick={() => setPostSubmitActionModal(null)}
                  className={getAppButtonClass({ variant: postSubmitActionModal.isReady ? "ghost" : "primary", size: "md" })}
                >
                  Review Invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </main>
  );
}
