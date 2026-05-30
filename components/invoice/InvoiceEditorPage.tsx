"use client";
import { AppTooltip } from "@/components/ui/AppTooltip";

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
import {
  Building2,
  Users,
  Settings2,
  ListChecks,
  ShieldCheck,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import {
  AnimatePresence,
  MotionReveal,
  motion,
} from "@/components/ui/motion-primitives";
import { Marker } from "@/components/ui/Marker";
import type { AiBriefExtraction } from "@/lib/ai-brief-extractor";
import { addDays } from "@/lib/date-math";
import AgencyDetailsSection from "@/components/invoice/AgencyDetailsSection";
import BriefIntakeCard from "@/components/invoice/BriefIntakeCard";
import ClientDetailsSection from "@/components/invoice/ClientDetailsSection";
import InvoiceMetaSection from "@/components/invoice/InvoiceMetaSection";
import DeliverablesSection from "@/components/invoice/DeliverablesSection";
import TotalsTaxesSection from "@/components/invoice/TotalsTaxesSection";
import TermsPaymentSection from "@/components/invoice/TermsPaymentSection";
import BriefSummaryModal from "@/components/invoice/BriefSummaryModal";
import AppSwitch from "@/components/ui/AppSwitch";
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
import {
  getCurrentUserId,
  saveInvoice,
  loadInvoice,
  reissueNegotiatedInvoice,
  getCurrentUserEmail,
} from "@/lib/supabase/invoices";
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
  type UserProfile,
} from "@/lib/supabase/profiles";
import {
  listClients,
  savedClientToClientDetails,
  type SavedClient,
} from "@/lib/supabase/clients";
import {
  getInvoiceFieldErrors,
  isInvoiceStepValid,
  getOptionalFieldEmptyCounts,
} from "@/lib/invoice-validation";
import { syncMsaToInvoice } from "@/lib/msa-sync-utils";
import { getInvoiceLockState } from "@/lib/invoice-lock-state";
import { announceInvoiceDataChanged } from "@/lib/invoice-events";
import {
  appContainerCenteredClass,
  appContainerFullClass,
  appEditorGridClass,
  appPageSectionClass,
  appPageShellClass,
  appSectionGapClass,
  appStickyTopClass,
  appPageContainerClass,
  appGridClass,
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

import {
  VALIDATION_STEPS,
  orderedSteps,
  PREVIEW_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  ANONYMOUS_DRAFT_KEY,
  type StoredDraft,
  clampNewInvoiceStartStep,
  clearPersistedInvoiceDrafts,
  getTodayDateString,
  getSuggestedDueDate,
  getDraftPlaceholderNumber,
  getDemoData,
  formatCurrency,
  getFreshInvoiceData,
  isFormTouched,
  getStepShortLabel,
  getLockStateLabel,
  getStepDescription,
  getStepKind,
  getNextStep,
  stepVariants,
} from "@/lib/invoice-editor-utils";
import {
  getFirstInvalidStep,
  getMissingFieldLabels,
  withProjectRequirement,
  isStepValidWithProject,
  getFirstInvalidStepWithProject,
  isInvoiceReadyForPreview,
} from "@/lib/invoice-validation-utils";
import { ExitConfirmModal } from "@/components/invoice/editor/ExitConfirmModal";
import { useInvoiceAutofill } from "@/components/invoice/editor/useInvoiceAutofill";
import { useInvoicePersistence } from "@/components/invoice/editor/useInvoicePersistence";
import { InlineStepSection } from "@/components/invoice/editor/InlineStepSection";
import { WorkbenchReadinessPanel } from "@/components/invoice/editor/WorkbenchReadinessPanel";
import { useToast } from "@/components/ui/AppToast";

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
  const invoiceId = searchParams.get("id");

  const [formData, setFormData] = useState<InvoiceFormData>(() =>
    mergeInvoiceFormData(defaultInvoiceFormData),
  );
  const [currentStep, setCurrentStep] = useState<InvoiceStepperStep>(() => {
    const queryStep = searchParams.get("step") as InvoiceStepperStep | null;
    if (!queryStep || !orderedSteps.includes(queryStep)) return "agency";
    return searchParams.get("id") ? queryStep : clampNewInvoiceStartStep(queryStep);
  });
  const [direction, setDirection] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isXl, setIsXl] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  useEffect(() => {
    const checkXl = () => setIsXl(window.innerWidth >= 1280);
    checkXl();
    window.addEventListener("resize", checkXl);
    return () => window.removeEventListener("resize", checkXl);
  }, []);

  const [showExitModal, setShowExitModal] = useState(false);
  const { push } = useToast();
  
  const [briefIntakeResetKey, setBriefIntakeResetKey] = useState(0);
  const [showAdvancedTax, setShowAdvancedTax] = useState(false);
  const [isBriefIntakeCollapsed, setIsBriefIntakeCollapsed] = useState(true);
  const [isBriefRetry, setIsBriefRetry] = useState(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [parserDocumentId, setParserDocumentId] = useState<string | null>(null);
  const [clientMsaNote, setClientMsaNote] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const [msaStatus, setMsaStatus] = useState<string | null>(null);
  const [sharedToEmail, setSharedToEmail] = useState<string | null>(null);
  const [projectMsaAcceptedAt, setProjectMsaAcceptedAt] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [profileLogoUrl, setProfileLogoUrl] = useState<string>("");
  const [profileQrUrl, setProfileQrUrl] = useState<string>("");
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null);
  const [focusRequestNonce, setFocusRequestNonce] = useState(0);
  const [showAllValidationErrors, setShowAllValidationErrors] = useState(false);
  const [isProcessingAutofill, setIsProcessingAutofill] = useState(false);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedClientMsa, setSelectedClientMsa] =
    useState<SavedClient | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Autofill hook
  const {
    briefSummaryData,
    setBriefSummaryData,
    postSubmitActionModal,
    setPostSubmitActionModal,
    extractProgress,
    setExtractProgress,
    autoFilledFields,
    setAutoFilledFields,
    markFieldsAutoFilled,
    markFieldManual,
  } = useInvoiceAutofill();

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

  

  const triggerToast = (message: string) => {
    push({ kind: "info", ttl: message });
  };

  const lockState = useMemo(() => {
    return getInvoiceLockState({
      status: invoiceStatus,
      msaStatus: msaStatus,
      sharedToEmail: sharedToEmail,
      clientMsaNote: clientMsaNote,
      projectMsaAcceptedAt: projectMsaAcceptedAt,
      projectStatus: projectStatus,
    });
  }, [invoiceStatus, msaStatus, sharedToEmail, clientMsaNote, projectMsaAcceptedAt, projectStatus]);

  const isReadOnlyMode = useMemo(() => {
    if (!parserDocumentId) return false;
    return lockState.isReadOnly;
  }, [parserDocumentId, lockState]);

  const readOnlyReason = useMemo(() => {
    return lockState.reason;
  }, [lockState]);
  const readOnlyStateLabel = useMemo(() => {
    return getLockStateLabel(lockState.state);
  }, [lockState.state]);

  useEffect(() => {
    if (!isBootstrapped || !formData) return;
    if (isReadOnlyMode) return;
    localStorage.setItem(ANONYMOUS_DRAFT_KEY, JSON.stringify(formData));
    try {
      localStorage.setItem("lance_draft_invoice", JSON.stringify(formData));
      localStorage.setItem("lance_draft_timestamp", new Date().toISOString());
    } catch (e) {
      // localStorage might be full or unavailable
    }
  }, [formData, isBootstrapped, isReadOnlyMode]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isReadOnlyMode) return;

      // Only warn if there is unsaved data
      if (formData && (formData.agency?.agencyName || formData.client?.clientName || formData.lineItems?.length > 0)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, isReadOnlyMode]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    let frameId = 0;
    let nextFormData: InvoiceFormData | null = null;
    let nextStep: InvoiceStepperStep = "agency";
    let nextDocumentId: string | null = null;
    let nextMsaNote: string | null = null;
    let nextProjectId: string | null = null;
    let shouldShowRestoreToast = false;
    let shouldShowFallbackToast = false;
    const initialInvoiceId = searchParams.get("id");
    const isFresh = searchParams.get("fresh") === "1";
    const isRestore = searchParams.get("restore") === "1";
    const shouldStartFresh = !initialInvoiceId && (isFresh || !isRestore);

    if (shouldStartFresh) {
      clearPersistedInvoiceDrafts();
      nextStep = "agency";
      nextDocumentId = null;
      nextMsaNote = null;
      nextProjectId = null;
      setProjectName("");
    }

    // Restore draft from localStorage if available
    try {
      const savedDraft = localStorage.getItem("lance_draft_invoice");
      const savedTimestamp = localStorage.getItem("lance_draft_timestamp");
      if (savedDraft && savedTimestamp && !initialInvoiceId && !shouldStartFresh) {
        const draftAge = Date.now() - new Date(savedTimestamp).getTime();
        const ONE_HOUR = 60 * 60 * 1000;
        // Only restore if draft is less than 1 hour old
        if (draftAge < ONE_HOUR) {
          const parsed = JSON.parse(savedDraft);
          nextFormData = mergeInvoiceFormData(parsed);
          shouldShowRestoreToast = true;
        } else {
          // Draft too old, clear it
          localStorage.removeItem("lance_draft_invoice");
          localStorage.removeItem("lance_draft_timestamp");
        }
      }
    } catch (e) {
      // Parsing failed, ignore
    }

    async function loadCloudInvoice(invoiceId: string) {
      setIsLoadingInvoice(true);
      const { data, error } = await loadInvoice(invoiceId);
      setIsLoadingInvoice(false);

      if (error || !data) {
        console.error("Failed to load cloud invoice:", error);
        push({ kind: "info", ttl: "Could not load invoice from cloud. Starting fresh." });
        initializeFresh();
        return;
      }

      const hydratedData = mergeInvoiceFormData(data.form_data as any);
      const loadedProjectArray = Array.isArray(data.project) ? data.project[0] : data.project;
      const loadedProject = loadedProjectArray as { name?: string; msa_accepted_at?: string; status?: string } | null | undefined;
      const projName =
        loadedProject?.name ??
        (data.form_data as any)?.projectName ??
        (data.form_data as any)?.meta?.projectName ??
        "";
      hydratedData.meta.projectName = projName;
      setFormData(hydratedData);
      setParserDocumentId(data.id);
      setInvoiceStatus(data.status ?? null);
      setMsaStatus(data.msa_status ?? null);
      setSharedToEmail(data.shared_to_email ?? null);
      setProjectMsaAcceptedAt(loadedProject?.msa_accepted_at ?? null);
      setProjectStatus(loadedProject?.status ?? null);
      setProjectId(data.project_id ?? null);
      setProjectName(projName);
      
      if (data.client_msa_note) {
        setClientMsaNote(data.client_msa_note);
      }

      setIsBootstrapped(true);
      hasInitializedRef.current = true;
      push({ kind: "info", ttl: "Invoice hydrated from cloud ☁" });
    }

    function initializeFresh() {
      const freshData = getFreshInvoiceData();
      setFormData(freshData);
      setInvoiceStatus(null);
      setMsaStatus(null);
      setSharedToEmail(null);
      setProjectMsaAcceptedAt(null);
      setProjectStatus(null);
      setProjectId(null);
      setProjectName("");
      setIsBootstrapped(true);
      hasInitializedRef.current = true;
    }

    try {
      if (initialInvoiceId) {
        void loadCloudInvoice(initialInvoiceId);
        return;
      }

      const anonymousRaw = localStorage.getItem(ANONYMOUS_DRAFT_KEY);

      if (!shouldStartFresh) {
        try {
          const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
          if (rawDraft) {
            const parsedDraft = JSON.parse(rawDraft) as StoredDraft | null;
            if (
              parsedDraft?.currentStep &&
              orderedSteps.includes(parsedDraft.currentStep)
            ) {
              nextStep = clampNewInvoiceStartStep(parsedDraft.currentStep);
              nextDocumentId = parsedDraft.documentId ?? null;
              nextMsaNote = parsedDraft.clientMsaNote ?? null;
            }
            nextProjectId = parsedDraft?.projectId ?? null;
            const draftedProjName = parsedDraft?.projectName ?? "";
            setProjectName(draftedProjName);
            if (!nextFormData && parsedDraft?.formData) {
              nextFormData = mergeInvoiceFormData(parsedDraft.formData);
              nextFormData.meta.projectName = draftedProjName;
              shouldShowRestoreToast = true;
            }
          }
        } catch (error) {
          console.error("Failed to restore draft:", error);
        }
      }
      
      if (!nextFormData && anonymousRaw && !shouldStartFresh) {
        try {
          const parsed = JSON.parse(anonymousRaw);
          if (parsed && typeof parsed === "object") {
            nextFormData = mergeInvoiceFormData(parsed);
            shouldShowRestoreToast = true;
          }
        } catch (e) {
          console.error("Failed to parse anonymous draft", e);
        }
      }

      if (!nextFormData) {
        nextFormData = getFreshInvoiceData();
      }

      const suggestedDueDate = getSuggestedDueDate(
        nextFormData.meta.paymentTerms,
        nextFormData.meta.invoiceDate,
      );

      dueDateAutoManagedRef.current =
        !nextFormData.meta.dueDate ||
        nextFormData.meta.dueDate === suggestedDueDate;
      lastAutoDueDateRef.current = suggestedDueDate;

      setFormData(nextFormData);
      setCurrentStep(nextStep);
      setParserDocumentId(nextDocumentId);
      setClientMsaNote(nextMsaNote);
      setProjectId(nextProjectId);

      void getCurrentUserEmail().then((email) => setUserEmail(email));
    } catch (error) {
      console.error("Failed to initialize invoice editor:", error);

      const fallbackFormData = mergeInvoiceFormData(defaultInvoiceFormData);
      const fallbackSuggestedDueDate = getSuggestedDueDate(
        fallbackFormData.meta.paymentTerms,
        fallbackFormData.meta.invoiceDate,
      );

      dueDateAutoManagedRef.current =
        !fallbackFormData.meta.dueDate ||
        fallbackFormData.meta.dueDate === fallbackSuggestedDueDate;
      lastAutoDueDateRef.current = fallbackSuggestedDueDate;

      setFormData(fallbackFormData);
      setCurrentStep("agency");
      setClientMsaNote(null);
      setProjectId(null);
      setInvoiceStatus(null);
      setMsaStatus(null);
      setSharedToEmail(null);
      shouldShowFallbackToast = true;
    } finally {
      hasInitializedRef.current = true;
      setIsBootstrapped(true);
    }

    if (shouldShowRestoreToast || shouldShowFallbackToast) {
      frameId = window.requestAnimationFrame(() => {
        push({ kind: "info", ttl: 
          shouldShowRestoreToast
            ? "Draft restored"
            : "Could not restore saved invoice state. Starting fresh.",
         });
      });
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (isReadOnlyMode) return;
    if (searchParams.get("restore") !== "1") return;

    async function autoCloudSave() {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await saveInvoice({
        formData,
        status: "draft" as InvoiceStatus,
        existingId: undefined,
        projectId,
        projectName: projectName.trim() || undefined,
      });

      if (!error) {
        await syncProfileFromInvoice(formData);
        push({ kind: "info", ttl: "Draft saved to cloud ☁ Welcome back!" });
        playInteractionCue("saveSuccess");
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
        announceInvoiceDataChanged({
          invoiceId: data?.id,
          action: "cloud_save_restore",
        });
      }
    }

    void autoCloudSave();
  }, [isBootstrapped, isReadOnlyMode]);

  useEffect(() => {
    if (!isReadOnlyMode) return;
    setIsEditingMeta(false);
  }, [isReadOnlyMode]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (isReadOnlyMode) return;
    if (invoiceId) return;

    let cancelled = false;

    async function applyProfile() {
      // Wait for auth session — retry up to 3 times with 500ms delay
      let session = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          session = data.session;
          break;
        }
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (cancelled || !session) return;

      const { data: profile } = await loadProfile();
      if (cancelled || !profile) return;

      setSavedProfile(profile);
    }

    applyProfile();
    return () => {
      cancelled = true;
    };
  }, [isBootstrapped, isReadOnlyMode, invoiceId]);

  useEffect(() => {
    async function checkAuth() {
      const userId = await getCurrentUserId();
      setIsGuestMode(!userId);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (isReadOnlyMode) return;

    let cancelled = false;
    async function fetchClients() {
      // Wait for auth session — retry up to 3 times with 500ms delay
      let session = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          session = data.session;
          break;
        }
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (cancelled || !session) return;

      const { data: clients } = await listClients();
      if (cancelled) return;

      setSavedClients(clients || []);

      const isFresh = searchParams.get("fresh") === "1";
      if (
        clients.length === 1 &&
        !isFresh &&
        searchParams.get("restore") === "1" &&
        !formData.client.clientName.trim()
      ) {
        const clientDetails = savedClientToClientDetails(clients[0]);
        setFormData((prev) => ({
          ...prev,
          client: clientDetails,
        }));
        setSelectedClientMsa(clients[0]);
      }
    }

    void fetchClients();
    return () => {
      cancelled = true;
    };
  }, [isBootstrapped, isReadOnlyMode]);

  useEffect(() => {
    if (!isBootstrapped) return;

    let cancelled = false;
    async function checkAssets() {
      // Wait for auth session — retry up to 3 times with 500ms delay
      let session = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          session = data.session;
          break;
        }
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (cancelled || !session) return;

      const { data: profile } = await loadProfile();
      if (cancelled) return;

      if (profile) {
        const hasAssets = Boolean(
          profile.logo_url && profile.qr_code_url && profile.signature_url,
        );
        const isDismissed = localStorage.getItem("profile_banner_dismissed") === "true";
        setShowProfilePrompt(!hasAssets && !isDismissed);
      }
    }
    void checkAssets();
    return () => {
      cancelled = true;
    };
  }, [isBootstrapped]);

  useEffect(() => {
    if (!isBootstrapped || savedClients.length === 0) return;
    const client = savedClients.find(
      (c) => c.client_name.trim().toLowerCase() === formData.client.clientName.trim().toLowerCase()
    );
    if (client && (!selectedClientMsa || selectedClientMsa.id !== client.id)) {
      setSelectedClientMsa(client);
    } else if (!client && selectedClientMsa) {
      setSelectedClientMsa(null);
    }
  }, [isBootstrapped, savedClients, formData.client.clientName, selectedClientMsa]);

  useEffect(() => {
    let needsUpdate = false;
    const updates: any = {};
    
    if (!formData.meta?.invoiceNumber || formData.meta?.invoiceNumber.endsWith('-000')) {
      updates.invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      needsUpdate = true;
    }
    if (!formData.meta?.invoiceDate) {
      updates.invoiceDate = new Date().toISOString().split('T')[0];
      needsUpdate = true;
    }
    if (!formData.meta?.dueDate) {
      const due = new Date();
      due.setDate(due.getDate() + 15);
      updates.dueDate = due.toISOString().split('T')[0];
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      setFormData((prev) => ({
        ...prev,
        meta: { ...prev.meta, ...updates },
      }));
    }
  }, []); // Run once on mount

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (isReadOnlyMode) return;

    const suggestedDueDate = getSuggestedDueDate(
      formData.meta.paymentTerms,
      formData.meta.invoiceDate,
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
  }, [
    formData.meta.paymentTerms,
    formData.meta.invoiceDate,
    formData.meta.dueDate,
    isReadOnlyMode,
  ]);

  useEffect(() => {
    if (!focusRequestNonce) return;

    const frameId = window.requestAnimationFrame(() => {
      const activeStepRoot = stepRefs.current[currentStep];
      if (!activeStepRoot) return;

      const focusTarget = activeStepRoot.querySelector<HTMLElement>(
        'input:not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[role="radio"]:not([disabled])',
      );

      focusTarget?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentStep, focusRequestNonce]);

  const fieldErrors = useMemo(
    () => getInvoiceFieldErrors(formData),
    [formData],
  );

  const clientIsInternational =
    formData.client.clientLocation === "international";
  const agencyIsGstRegistered =
    formData.agency.gstRegistrationStatus === "registered";
  const effectiveExportTaxDecision = getEffectiveExportTaxHandling(
    formData.agency,
  );
  const displayCurrency = useMemo(
    () =>
      getInvoiceDisplayCurrency({
        clientLocation: formData.client.clientLocation,
        clientCurrency: formData.client.clientCurrency,
      }),
    [formData.client.clientLocation, formData.client.clientCurrency],
  );

  const computedTotals = useMemo(
    () =>
      calculateInvoiceTotals({
        lineItems: formData.milestones.flatMap((m) => m.lineItems),
        milestones: formData.milestones,
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
      formData.milestones,
      formData.agency.agencyState,
      clientIsInternational,
      formData.client,
      agencyIsGstRegistered,
      formData.agency.lutAvailability,
      effectiveExportTaxDecision,
      formData.tax.taxRate,
      formData.tax.isRcmEnabled,
    ],
  );

  const hasItems = useMemo(() => {
    return (formData.milestones && formData.milestones.length > 0 && formData.milestones.some(m => m.lineItems.length > 0)) || (formData.lineItems && formData.lineItems.length > 0);
  }, [formData.milestones, formData.lineItems]);

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
        return [
          `International export without LUT: IGST ${formData.tax.taxRate}% applies.`,
          settlementWarning,
        ]
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

    // If agency is not GST registered, TotalsTaxesSection already shows
    // "Tax: 0% — agency not GST registered" inline — don't add a second message
    if (!agencyIsGstRegistered) {
      return "";
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


  const hasNamedProject = Boolean(projectName.trim());
  const missingFieldGroups = useMemo(
    () => withProjectRequirement(getMissingFieldLabels(formData), hasNamedProject),
    [formData, hasNamedProject],
  );
  const stepValidityByStep = useMemo(
    () =>
      VALIDATION_STEPS.reduce<Record<InvoiceStepperStep, boolean>>(
        (result, step) => {
          result[step] = isStepValidWithProject(formData, step, hasNamedProject);
          return result;
        },
        {
          agency: false,
          client: false,
          deliverables: false,
          payment: false,
          meta: false,
          totals: false,
        },
      ),
    [formData, hasNamedProject],
  );

  const showSummaryInline = !isXl && 
    stepValidityByStep['agency'] && 
    stepValidityByStep['client'] && 
    stepValidityByStep['deliverables'];
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
        },
      ),
    [missingFieldGroups],
  );
  const missingOptionalCountByStep = useMemo(
    () => getOptionalFieldEmptyCounts(formData),
    [formData]
  );
  const firstInvalidStep = useMemo(
    () => getFirstInvalidStepWithProject(formData, hasNamedProject),
    [formData, hasNamedProject],
  );

  const invoiceReadyForPreview = useMemo(
    () => isInvoiceReadyForPreview(formData, hasNamedProject),
    [formData, hasNamedProject],
  );
  const displayStepValidityByStep = useMemo(
    () => ({
      ...stepValidityByStep,
      totals: invoiceReadyForPreview,
    }),
    [stepValidityByStep, invoiceReadyForPreview],
  );
  const completedStepCount = useMemo(
    () => orderedSteps.filter((step) => displayStepValidityByStep[step]).length,
    [displayStepValidityByStep],
  );
  const completedValidationStepCount = useMemo(
    () => VALIDATION_STEPS.filter((step) => displayStepValidityByStep[step]).length,
    [displayStepValidityByStep],
  );
  const totalRequiredIssueCount = useMemo(
    () => missingFieldGroups.reduce((sum, group) => sum + group.fields.length, 0),
    [missingFieldGroups],
  );
  const nextBlockingGroup = missingFieldGroups[0] ?? null;
  const nextBlockingFields = nextBlockingGroup?.fields ?? [];
  const guideToSection = (
    step: InvoiceStepperStep,
    options?: { focus?: boolean },
  ) => {
    const currentIndex = orderedSteps.indexOf(currentStep);
    const nextIndex = orderedSteps.indexOf(step);
    setDirection(nextIndex > currentIndex ? 1 : -1);

    setCurrentStep(step);

    if (options?.focus) {
      setFocusRequestNonce((prev) => prev + 1);
    }
  };

  const handleSectionKeyDownCapture = (
    step: InvoiceStepperStep,
    event: ReactKeyboardEvent<HTMLDivElement>,
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

    // Only handle Enter on text-like inputs — let textareas keep newline behaviour
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const inputType = event.target.type.toLowerCase();
    if (["checkbox", "radio", "file", "submit", "button"].includes(inputType)) {
      return;
    }

    event.preventDefault();

    const activeStepRoot = stepRefs.current[step];
    if (!activeStepRoot) return;

    const focusableFields = Array.from(
      activeStepRoot.querySelectorAll<HTMLElement>(
        'input:not([type="file"]):not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ),
    ).filter((el) => el.offsetParent !== null);

    const currentIndex = focusableFields.indexOf(event.target);
    if (currentIndex < 0) return;

    // Helper: check if a field is empty
    const isFieldEmpty = (el: HTMLElement): boolean => {
      if (el instanceof HTMLInputElement) {
        if (["checkbox", "radio", "file", "hidden"].includes(el.type)) return false;
        return !el.value.trim();
      }
      if (el instanceof HTMLSelectElement) {
        return !el.value || el.selectedIndex === 0;
      }
      if (el instanceof HTMLTextAreaElement) {
        return !el.value.trim();
      }
      return false;
    };

    // 1. Find next empty field AFTER current position
    const nextEmptyField = focusableFields.slice(currentIndex + 1).find(isFieldEmpty);

    if (nextEmptyField) {
      nextEmptyField.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        nextEmptyField.focus({ preventScroll: true });
      }, 300);
      return;
    }

    // 2. No empty fields below — if step is valid, auto-advance
    if (stepValidityByStep[currentStep]) {
      const nextStep = getNextStep(currentStep);
      if (nextStep) {
        guideToSection(nextStep, { focus: true });
      }
      return;
    }

    // 3. Step not valid — wrap around to first empty field in step
    const firstEmptyInStep = focusableFields.find(isFieldEmpty);

    if (firstEmptyInStep) {
      firstEmptyInStep.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        firstEmptyInStep.focus({ preventScroll: true });
      }, 300);
    }
  };

const shouldConfirmExit = !isReadOnlyMode && isFormTouched(formData);

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
  const container = document.querySelector(".invoice-editor-scroll-area");
  if (container) {
    container.scrollTo({ top: 0, behavior: "instant" });
  } else {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}, [currentStep]);

useEffect(() => {
  const activePill = document.querySelector("[data-mobile-step-active]");
  activePill?.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
}, [currentStep]);

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

const scrollToStep = (
  step: InvoiceStepperStep,
  options?: { focus?: boolean },
) => {
  if (step === "meta") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (options?.focus) {
      setTimeout(() => {
        const firstInput = document.querySelector('input[type="text"], input[type="date"]');
        (firstInput as HTMLElement)?.focus();
      }, 300);
    }
    return;
  }

  if (step === "totals") {
    const footer = document.getElementById("live-totals-footer");
    footer?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  guideToSection(step);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  setTimeout(() => {
    const scrollContainer = document.querySelector(".invoice-editor-scroll-area");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, 50);

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

const handlePreviewInvoice = async () => {
  if (!invoiceReadyForPreview) {
    setShowAllValidationErrors(true);
    if (firstInvalidStep) {
      scrollToStep(firstInvalidStep, { focus: true });
      push({ kind: "info", ttl: "Complete the highlighted section before previewing." });
    }
    return;
  }

  try {
    let invoiceNumberForPreview = formData.meta.invoiceNumber;
    if (!isReadOnlyMode && invoiceNumberForPreview?.endsWith("-000")) {
      const userId = await getCurrentUserId();
      if (userId) {
        const { generateNextInvoiceNumber } = await import("@/lib/supabase/invoices");
        const realNumber = await generateNextInvoiceNumber();
        if (realNumber) {
          invoiceNumberForPreview = realNumber;
          setFormData((prev) => ({
            ...prev,
            meta: { ...prev.meta, invoiceNumber: realNumber },
          }));
        }
      }
    }

    const previewFormData = {
      ...formData,
      meta: { ...formData.meta, invoiceNumber: invoiceNumberForPreview },
      tax: derivedTaxConfig,
    };

    const userId = await getCurrentUserId();
    let currentId = parserDocumentId;

    if (userId && !isReadOnlyMode) {
      let result;
      result = await saveInvoice({
        formData: previewFormData,
        status: "draft" as InvoiceStatus,
        existingId: parserDocumentId ?? undefined,
        projectId,
        projectName: projectName.trim() || undefined,
      });
      if (!result.error && result.data) {
        setParserDocumentId(result.data.id);
        currentId = result.data.id;
        // Sync profile details
        await syncProfileFromInvoice(previewFormData);
      }

      if (result?.error) {
        console.error("Failed to cloud-save invoice on preview:", result.error);
        push({ kind: "info", ttl: "Cloud save failed. Previewing local changes only." });
      }
    }

    window.localStorage.setItem(
      PREVIEW_STORAGE_KEY,
      JSON.stringify({
        formData: previewFormData,
        projectId,
        projectName,
        cloudInvoiceId: currentId,
      }),
    );

    if (!isReadOnlyMode) {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData,
          currentStep: "totals",
          savedAt: new Date().toISOString(),
          documentId: currentId,
          clientMsaNote,
          projectId,
          projectName,
        } satisfies StoredDraft),
      );
    }
    push({ kind: "info", ttl: "Preview ready" });
    playInteractionCue("previewReady");
    const previewUrl = currentId 
      ? `/invoice/preview?id=${currentId}`
      : "/invoice/preview";
    router.push(previewUrl);
  } catch (error) {
    console.error("Failed to save preview data:", error);
    push({ kind: "info", ttl: "Could not open preview. Please try again." });
  }
};

const handleLockedPreviewRoute = () => {
  const previewUrl = parserDocumentId
    ? `/invoice/preview?id=${parserDocumentId}`
    : "/invoice/preview";
  router.push(previewUrl);
};

const handleLockedAlternativeAction = async () => {
  const action = lockState.alternativeAction;
  const previewUrl = parserDocumentId
    ? `/invoice/preview?id=${parserDocumentId}`
    : "/invoice/preview";

  switch (action?.intent ?? "preview") {
    case "download":
      router.push(parserDocumentId ? `${previewUrl}&autoDownload=1` : previewUrl);
      return;
    case "resend": {
      if (!parserDocumentId || !sharedToEmail) {
        push({ kind: "info", ttl: "Missing saved invoice email for resend." });
        return;
      }
      try {
        const response = await fetch("/api/share-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: parserDocumentId,
            clientEmail: sharedToEmail,
            tone: "polite",
          }),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          push({ kind: "info", ttl: error?.error || "Could not resend invoice email." });
          return;
        }
        push({ kind: "info", ttl: `Resent invoice to ${sharedToEmail}.` });
      } catch (error) {
        console.error("LOCKED_RESEND_FAILED:", error);
        push({ kind: "info", ttl: "Could not resend invoice email." });
      }
      return;
    }
    case "duplicate":
      push({ kind: "info", ttl: "Duplicate flow is not available yet. Opening preview." });
      handleLockedPreviewRoute();
      return;
    case "reactivate": {
      if (!parserDocumentId) {
        handleLockedPreviewRoute();
        return;
      }
      const { error } = await supabase
        .from("invoices")
        .update({ status: "DRAFT" })
        .eq("id", parserDocumentId);
      if (error) {
        console.error("LOCKED_REACTIVATE_FAILED:", error);
        push({ kind: "info", ttl: "Could not reactivate invoice." });
        return;
      }
      setInvoiceStatus("DRAFT");
      push({ kind: "info", ttl: "Invoice reactivated as draft." });
      router.push(`/invoice/new?id=${parserDocumentId}&restore=1`);
      return;
    }
    case "preview":
    default:
      handleLockedPreviewRoute();
  }
};

const handleReviewBlockingStep = () => {
  if (!nextBlockingGroup) {
    void handlePreviewInvoice();
    return;
  }

  setShowAllValidationErrors(true);
  scrollToStep(nextBlockingGroup.step, { focus: true });
  push({ kind: "info", ttl: `Review ${getStepShortLabel(nextBlockingGroup.step)} details.` });
};

const persistDraft = () => {
  if (isReadOnlyMode) return;

  window.localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({
      formData,
      currentStep,
      savedAt: new Date().toISOString(),
      documentId: parserDocumentId,
      projectId,
      projectName,
    } satisfies StoredDraft),
  );
};

const performSaveDraft = (options?: { stayOnPage?: boolean }) => {
  if (isReadOnlyMode) {
    push({ kind: "info", ttl: "This invoice is in read-only mode." });
    return;
  }

  try {
    persistDraft();
    setShowExitModal(false);
    push({ kind: "info", ttl: "Draft saved" });
    playInteractionCue("saveSuccess");

    if (!options?.stayOnPage) {
      window.setTimeout(() => {
        router.push("/");
      }, 500);
    }
  } catch (error) {
    console.error("Failed to save draft:", error);
    push({ kind: "info", ttl: "Could not save draft. Please try again." });
  }
};

const handleSaveDraft = async () => {
  if (isReadOnlyMode) {
    push({ kind: "info", ttl: "This invoice is in read-only mode." });
    return;
  }

  persistDraft();

  const userId = await getCurrentUserId();

  if (!userId) {
    const returnUrl = parserDocumentId 
      ? `/invoice/new?id=${parserDocumentId}&restore=1`
      : "/invoice/new?restore=1";
    router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
    return;
  }

  try {
    let result;
    let formDataForSave = formData;
    if (formData.meta.invoiceNumber?.endsWith("-000")) {
      const { generateNextInvoiceNumber } = await import("@/lib/supabase/invoices");
      const realNumber = await generateNextInvoiceNumber();
      if (realNumber) {
        formDataForSave = {
          ...formData,
          meta: { ...formData.meta, invoiceNumber: realNumber },
        };
        setFormData(formDataForSave);
      }
    }

    result = await saveInvoice({
      formData: formDataForSave,
      status: "draft" as InvoiceStatus,
      existingId: parserDocumentId ?? undefined,
      projectId,
      projectName: projectName.trim() || undefined,
    });
    if (!result.error && result.data) {
      setParserDocumentId(result.data.id);
      const newUrl = `/invoice/new?id=${result.data.id}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    }

    if (!result.error) {
      const createdClient =
        (result as any).data?.created_client ?? (result as any).createdClient;
      const clientPersistenceError =
        (result as any).data?.client_persistence_error ??
        (result as any).clientPersistenceError;
      const projectPersistenceError =
        (result as any).data?.project_persistence_error ??
        (result as any).projectPersistenceError;

      try {
        localStorage.removeItem("lance_draft_invoice");
        localStorage.removeItem("lance_draft_timestamp");
      } catch (e) {}

      if (createdClient) {
        setSavedClients((prev) =>
          prev.some((client) => client.id === createdClient.id)
            ? prev
            : [createdClient, ...prev],
        );
        setSelectedClientMsa(createdClient);
      }

      if (projectPersistenceError) {
        push({ kind: "info", ttl: 
          `Invoice saved, but project '${projectName.trim()}' could not be linked. ${projectPersistenceError}`
        });
      } else if (createdClient) {
        push({ kind: "info", ttl: `New client '${createdClient.client_name}' added to your client list.` });
      } else if (clientPersistenceError) {
        push({ kind: "info", ttl: `Invoice saved, but client was not added: ${clientPersistenceError}` });
      } else {
        push({ kind: "info", ttl: 
          clientMsaNote
            ? "Reissued & saved to cloud ☁"
            : "Draft saved to cloud ☁",
         });
      }
      playInteractionCue("saveSuccess");
      announceInvoiceDataChanged({
        invoiceId: (result as any).data?.id ?? parserDocumentId ?? undefined,
        action: clientMsaNote ? "invoice_reissued" : "invoice_saved",
      });
    } else {
      push({ kind: "info", ttl: "Saved locally (cloud save failed)" });
      playInteractionCue("saveSuccess");
    }
  } catch {
    push({ kind: "info", ttl: "Saved locally" });
  }
};

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't intercept if user is typing in an input, textarea, or select
    const target = e.target as HTMLElement;
    if (target) {
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return; // Let the input handle the keystroke
      }
    }

    // Ctrl+S or Cmd+S = Save Draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveDraft();
    }
    // Ctrl+Enter = Continue to next step
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (stepValidityByStep[currentStep] && getNextStep(currentStep)) {
        scrollToStep(getNextStep(currentStep)!, { focus: true });
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleSaveDraft, currentStep, stepValidityByStep]);

  // Autosave based on time is removed as per user request.
  // Drafts are now explicitly saved via "Save Draft" or "Exit" workflow.

const handleLoadDemoData = () => {
  if (isReadOnlyMode) {
    push({ kind: "info", ttl: "This invoice is in read-only mode." });
    return;
  }

  const demoInvoiceNumber = formData.meta.invoiceNumber?.startsWith("INV-")
    ? formData.meta.invoiceNumber
    : getDraftPlaceholderNumber();
  const demo = getDemoData(demoInvoiceNumber);

  const demoSuggestedDueDate = getSuggestedDueDate(
    demo.meta.paymentTerms,
    demo.meta.invoiceDate,
  );

  dueDateAutoManagedRef.current = demo.meta.dueDate === demoSuggestedDueDate;
  lastAutoDueDateRef.current = demoSuggestedDueDate;

  setFormData(mergeInvoiceFormData(demo));
  setShowAllValidationErrors(false);
  guideToSection("totals", { focus: true });
  setIsBriefIntakeCollapsed(true);

  push({ kind: "info", ttl: "Demo data loaded" });
};

const handleClearDemoData = () => {
  if (isReadOnlyMode) {
    push({ kind: "info", ttl: "This invoice is in read-only mode." });
    return;
  }

  const freshInvoiceData = getFreshInvoiceData();
  const suggestedDueDate = getSuggestedDueDate(
    freshInvoiceData.meta.paymentTerms,
    freshInvoiceData.meta.invoiceDate,
  );

  dueDateAutoManagedRef.current = true;
  lastAutoDueDateRef.current = suggestedDueDate;

  try {
    window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    window.localStorage.removeItem("lance_draft_invoice");
    window.localStorage.removeItem("lance_draft_timestamp");
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
  push({ kind: "info", ttl: "Demo data cleared" });
};

const handleBriefAutofill = async (input: BriefIntakeInput) => {
  if (isReadOnlyMode) {
    push({ kind: "info", ttl: "This invoice is in read-only mode." });
    return false;
  }

  setFormData(mergeInvoiceFormData(defaultInvoiceFormData));
  setIsProcessingAutofill(true);
  setExtractProgress(0);

  const progressInterval = setInterval(() => {
    setExtractProgress((prev) =>
      prev >= 95 ? 95 : prev + Math.floor(Math.random() * 5) + 1,
    );
  }, 300);

  try {
    let ocrText = "";

    if (input.imageFiles?.length) {
      const extractedChunks: string[] = [];

      for (const file of input.imageFiles) {
        try {
          const extractedText = await extractTextFromImage(file);

          if (extractedText.trim()) {
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
            raw_input: [
              normalizedInput.text,
              normalizedInput.ocrText,
              normalizedInput.voiceTranscript ?? "",
            ]
              .filter(Boolean)
              .join("\n\n"),
            agency_context: {
              businessName: formData.agency.agencyName,
              full_name: "",
              city: formData.agency.city,
              state: formData.agency.agencyState,
              gstin: formData.agency.gstin,
            },
            client_context: selectedClientMsa
              ? {
                id: selectedClientMsa.id,
                name: selectedClientMsa.client_name,
                email: selectedClientMsa.client_email,
                location:
                  selectedClientMsa.country || selectedClientMsa.state,
                gstinOrTaxId: selectedClientMsa.gstin,
                msa: {
                  payment_terms: selectedClientMsa.msa_payment_terms_days,
                  late_fee: selectedClientMsa.msa_late_fee_rate,
                  ip_trigger: selectedClientMsa.msa_ip_trigger_type,
                  jurisdiction: selectedClientMsa.msa_jurisdiction_city,
                },
              }
              : null,
            documentId: parserDocumentId,
            isRetry: isBriefRetry,
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
      push({ kind: "info", ttl: 
        input.imageFiles?.length
          ? "Could not extract text clearly. Try uploading a clearer image or paste text."
          : "Add a text brief first to extract invoice details.",
       });
      return false;
    }

    const hydratedFormData = result.nextFormData;

    const nextSuggestedDueDate = getSuggestedDueDate(
      hydratedFormData.meta.paymentTerms,
      hydratedFormData.meta.invoiceDate,
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

    const clientName = mergedToSet.client.clientName.trim();
    const isNewClient = Boolean(
      clientName &&
      !savedClients.some(
        (c) => c.client_name.toLowerCase() === clientName.toLowerCase(),
      ),
    );

    setExtractProgress(100);

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

const handleModalSubmit = (
  finalData: InvoiceFormData,
  saveClient: boolean,
) => {
  if (isReadOnlyMode) {
    push({ kind: "info", ttl: "This invoice is in read-only mode." });
    return;
  }

  void saveClient;

  // FIX 3: If extraction filled GSTIN, auto-toggle GST registered
  if (
    finalData.agency.gstin &&
    finalData.agency.gstin.trim().length > 0 &&
    finalData.agency.gstRegistrationStatus !== "registered"
  ) {
    finalData = {
      ...finalData,
      agency: { ...finalData.agency, gstRegistrationStatus: "registered" },
    };
  }

  setFormData(finalData);

  const readyForPreview = isInvoiceReadyForPreview(finalData, hasNamedProject);
  setBriefSummaryData(null);
  setPostSubmitActionModal({ isOpen: true, isReady: readyForPreview });

  setBriefIntakeResetKey(Date.now());
  setIsBriefIntakeCollapsed(true);
  setShowAllValidationErrors(true);

  const missingStep = getFirstInvalidStepWithProject(finalData, hasNamedProject);
  const recommendedStep = clampNewInvoiceStartStep(missingStep ?? "totals");

  // FIX 4: Mark ALL extracted fields as auto-filled (confident + client)
  const autoFilledPaths: string[] = [];

  if (briefSummaryData?.confident) {
    autoFilledPaths.push(
      ...(briefSummaryData.confident.map((f) => f.fieldPath).filter(Boolean) as string[]),
    );
  }
  if (briefSummaryData?.lowConfidence) {
    autoFilledPaths.push(
      ...(briefSummaryData.lowConfidence.map((f) => f.fieldPath).filter(Boolean) as string[]),
    );
  }

  // Also mark client fields that were populated by extraction
  if (finalData.client.clientName) autoFilledPaths.push("client.clientName");
  if (finalData.client.clientEmail) autoFilledPaths.push("client.clientEmail");
  if (finalData.client.clientState) autoFilledPaths.push("client.clientState");
  if (finalData.client.clientGstin) autoFilledPaths.push("client.clientGstin");
  if (finalData.client.clientAddressLine1) autoFilledPaths.push("client.clientAddressLine1");
  if (finalData.client.clientCity) autoFilledPaths.push("client.clientCity");

  if (autoFilledPaths.length > 0) {
    markFieldsAutoFilled([...new Set(autoFilledPaths)]);
  }

  guideToSection(recommendedStep, { focus: true });
};

const handleParseAgain = () => {
  setBriefSummaryData(null);
  setIsBriefRetry(true);
  push({ kind: "info", ttl: 
    "Let's try that again. You can edit the brief or add more details.",
   });
  setIsBriefIntakeCollapsed(false);
};

const handleContinueManually = (finalData: InvoiceFormData) => {
  if (isReadOnlyMode) {
    push({ kind: "info", ttl: "This invoice is in read-only mode." });
    return;
  }

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
  if (isReadOnlyMode) return;

  const previousDueDate = formData.meta.dueDate;
  const nextSuggestedDueDate = getSuggestedDueDate(
    meta.paymentTerms,
    meta.invoiceDate,
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
  data: InvoiceFormData[K],
) => {
  if (isReadOnlyMode) return;

  setFormData((prev) => {
    let next = mergeInvoiceFormData({
      ...prev,
      [section]: data,
    });

    if (section === "client") {
      const client = data as InvoiceFormData["client"];
      next.payment.terms = client.msaNotesBoilerplate || "";
    }

    return next;
  });
};

const handleSelectProfile = (profile: UserProfile) => {
  if (isReadOnlyMode) return;
  const agencyFromProfile = profileToAgencyDetails(profile);
  const paymentFromProfile = profileToPaymentDefaults(profile);

  markFieldsAutoFilled([
    "agency.agencyName",
    "agency.address",
    "agency.addressLine1",
    "agency.addressLine2",
    "agency.city",
    "agency.pinCode",
    "agency.agencyState",
    "agency.gstin",
    "agency.pan",
    "agency.gstRegistrationStatus",
    "agency.lutAvailability",
    "agency.lutNumber",
    "agency.lutValidity",
    "agency.noLutTaxHandling",
    "payment.bankName",
    "payment.accountName",
    "payment.accountNumber",
    "payment.ifscCode",
    "payment.bankAddress",
    "payment.swiftBicCode",
    "payment.ibanRoutingCode",
  ]);

  if (profile.logo_url) setProfileLogoUrl(profile.logo_url);
  if (profile.qr_code_url) setProfileQrUrl(profile.qr_code_url);

  setFormData((prev) => ({
    ...prev,
    agency: { ...prev.agency, ...agencyFromProfile },
    payment: { ...prev.payment, ...paymentFromProfile },
  }));
};

const handleClientSelect = (client: SavedClient) => {
  if (isReadOnlyMode) return;

  const syncedData = syncMsaToInvoice(formData, client);
  setFormData(syncedData);
  setSelectedClientMsa(client);

  markFieldsAutoFilled([
    "client.clientName",
    "client.clientEmail",
    "client.clientState",
    "client.clientCity",
    "client.clientGstin",
    "client.clientAddressLine1",
  ]);

  playInteractionCue("stepComplete");
};

const renderStepContent = (step: InvoiceStepperStep) => {
  const msaSource = formData.meta.hasAddendum 
    ? "project" 
    : selectedClientMsa 
      ? "client" 
      : (formData.agency.msaPaymentTermsDays || formData.agency.msaNotesBoilerplate)
        ? "global" 
        : "default";

  switch (step) {
    case "agency":
      return (
        <AgencyDetailsSection
          key={isBootstrapped ? "hydrated" : "loading"}
          embedded
          isGuestMode={isGuestMode}
          isReadOnly={isReadOnlyMode}
          value={{ ...formData.agency, profileLogoUrl }}
          onChange={(agency) => updateFormSection("agency", agency)}
          errors={fieldErrors.agency}
          showAllErrors={showAllValidationErrors}
          autoFilledFields={autoFilledFields}
          onFieldManualEdit={markFieldManual}
          savedProfile={savedProfile}
          onSelectProfile={handleSelectProfile}
        />
      );
    case "client":
      return (
        <ClientDetailsSection
          key={isBootstrapped ? "hydrated" : "loading"}
          value={formData.client}
          isReadOnly={isReadOnlyMode}
          onChange={(client) => updateFormSection("client", client)}
          onClientSelect={handleClientSelect}
          errors={fieldErrors.client}
          showAllErrors={showAllValidationErrors}
          savedClients={savedClients}
          agency={formData.agency}
          isNew={!parserDocumentId}
          autoFilledFields={autoFilledFields}
          onFieldManualEdit={markFieldManual}
        />
      );
    case "deliverables":
      return (
        <DeliverablesSection
          key={isBootstrapped ? "hydrated" : "loading"}
          embedded
          isReadOnly={isReadOnlyMode}
          milestones={formData.milestones}
          currency={displayCurrency}
          projectName={projectName}
          onProjectNameChange={(nextProjectName) => {
            if (isReadOnlyMode) return;
            setProjectName(nextProjectName);
            setFormData(prev => ({ ...prev, meta: { ...prev.meta, projectName: nextProjectName } }));
            setProjectId(null);
          }}
          onChange={(milestones) => {
            if (isReadOnlyMode) return;
            setFormData((prev) => ({
              ...prev,
              milestones,
            }));
          }}
          errors={fieldErrors.lineItems}
          showAllErrors={showAllValidationErrors}
          autoFilledFields={autoFilledFields}
          onFieldManualEdit={markFieldManual}
          isGuestMode={isGuestMode}
          freeRevisionRounds={formData.client.freeRevisionRounds}
          extraRevisionFeePercent={formData.client.extraRevisionFeePercent}
        />
      );
    case "payment":
      return (
        <TermsPaymentSection
          key={isBootstrapped ? "hydrated" : "loading"}
          embedded
          isReadOnly={isReadOnlyMode}
          value={{ ...formData.payment, profileQrUrl }}
          meta={formData.meta}
          client={formData.client}
          agency={formData.agency}
          clientLocation={formData.client.clientLocation}
          onChange={(payment) => updateFormSection("payment", payment)}
          onMetaChange={handleMetaChange}
          onClientChange={(client) => updateFormSection("client", client)}
          selectedClientMsa={selectedClientMsa}
          msaSource={msaSource as any}
          errors={{
            licenseDuration: fieldErrors.payment.licenseDuration,
            accountName: fieldErrors.payment.accountName,
            bankName: fieldErrors.payment.bankName,
            accountNumber: fieldErrors.payment.accountNumber,
            ifscCode: fieldErrors.payment.ifscCode,
            bankAddress: fieldErrors.payment.bankAddress,
            swiftBicCode: fieldErrors.payment.swiftBicCode,
          }}
          showAllErrors={showAllValidationErrors}
          autoFilledFields={autoFilledFields}
          onFieldManualEdit={markFieldManual}
        />
      );
    case "meta": {
      return (
        <InvoiceMetaSection
          key={isBootstrapped ? "hydrated" : "loading"}
          embedded
          isReadOnly={isReadOnlyMode}
          value={formData.meta}
          msaSource={msaSource}
          onChange={handleMetaChange}
          errors={{
            invoiceNumber: fieldErrors.meta.invoiceNumber,
            invoiceDate: fieldErrors.meta.invoiceDate,
            dueDate: fieldErrors.meta.dueDate,
          }}
          showAllErrors={showAllValidationErrors}
          autoFilledFields={autoFilledFields}
          onFieldManualEdit={markFieldManual}
        />
      );
    }
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
          paymentTerms={
            formData.meta.paymentTerms 
              ? `Net ${formData.meta.paymentTerms} days` 
              : formData.client?.msaPaymentTermsDays 
                ? `Net ${formData.client.msaPaymentTermsDays} days` 
                : ""
          }
          bankName={formData.payment.bankName}
          onExportTaxDecisionChange={
            showInternationalExportDecision && !isReadOnlyMode
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
          onChange={(tax) => {
            if (isReadOnlyMode) return;
            setFormData((prev) => ({
              ...prev,
              tax,
            }));
          }}
        />
      );
    default:
      return null;
  }
};

const allowReadOnlyKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
  const key = event.key.toLowerCase();

  if ((event.metaKey || event.ctrlKey) && (key === "a" || key === "c")) {
    return true;
  }

  return [
    "alt",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "arrowup",
    "control",
    "meta",
    "shift",
    "tab",
  ].includes(key);
};


return (
  <main
    className="relative min-h-screen w-full wf paper-rose font-sans antialiased"
    data-mode={isReadOnlyMode ? "locked" : "editing"}
    suppressHydrationWarning
  >
    <AnimatePresence>
      {isProcessingAutofill && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-paper)]/60",
          )}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[color:var(--interactive-primary)] opacity-20 duration-1000" />
              <div className="absolute inset-2 animate-pulse rounded-full bg-[color:var(--interactive-secondary)] opacity-40 duration-700" />
              <div className="relative h-12 w-12 rounded-full border-4 border-[color:var(--interactive-primary)] border-t-transparent animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)]">
                Scanning & Translating {extractProgress}%
              </h2>
              <p className="max-w-xs text-center text-sm text-[color:var(--color-ink-2)] animate-pulse">
                Lance is scanning your brief to structure the invoice...
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    

    {/* Editor Background Aesthetic Elements (Aura) */}
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(190,255,0,0.03)_0%,transparent_70%)] rounded-full blur-3xl"></div>
      <div className="absolute top-[20%] left-[-10%] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(0,212,160,0.03)_0%,transparent_70%)] rounded-full blur-2xl"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(190,255,0,0.02)_0%,transparent_70%)] rounded-full blur-3xl"></div>
    </div>

    <AppHeader />


    <section
      className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[56px] pt-8 pb-32 relative z-10`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-7">
        <div className="mb-4 sm:mb-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] mb-2.5">
            STEP {orderedSteps.indexOf(currentStep) + 1} OF 4 · {formData.client?.clientName ? formData.client.clientName.toUpperCase() : "UNTITLED PROJECT"}
          </div>
          <h1 className="font-display text-[64px] leading-none font-black tracking-[-0.035em] m-0">
            {isReadOnlyMode ? (
              <>Locked <Marker tone="sky">invoice</Marker></>
            ) : invoiceId ? (
              <>Edit <Marker tone="sky">invoice</Marker></>
            ) : (
              <>New <Marker tone="sky">invoice</Marker></>
            )}
          </h1>
          <p className="mt-2 text-[14px] text-[color:var(--color-ink-2)] font-bold">
            {isReadOnlyMode
              ? `${formData.meta?.invoiceNumber || '...'} · ${readOnlyStateLabel}`
              : invoiceId
              ? `Editing reference ${formData.meta?.invoiceNumber || '...'}` 
              : "Create a GST-compliant invoice in minutes."
            }
          </p>
        </div>

      </div>
      {showProfilePrompt && (
        <div className="border-b border-[color:var(--color-soft)] bg-[color:var(--color-paper)]/50">
          <div className="mx-auto flex max-w-[1328px] items-center justify-between px-4 py-2 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">✨</span>
              <p className="text-[12px] font-normal text-[color:var(--color-ink)]">
                Complete your profile for faster invoicing.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="text-[12px] font-bold link-indigo hover:underline"
              >
                Finish Profile
              </Link>
              <button
                onClick={() => {
                  setShowProfilePrompt(false);
                  localStorage.setItem("profile_banner_dismissed", "true");
                }}
                className="text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)] transition-colors flex items-center justify-center h-6 w-6"
                aria-label="Dismiss"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={appEditorGridClass}>
        {/* ── COL 1: Desktop Stepper Rail ── */}
        <aside
          className={cn(
            "hidden lg:flex flex-col gap-4",
            appStickyTopClass,
          )}
          data-testid="desktop-support-rail"
        >
            <MotionReveal preset="fade-up" delay={40}>
              <div className="box" style={{padding: "18px 20px"}}>
                <div className="cap" style={{marginBottom: 4}}>{isReadOnlyMode ? "INVOICE STATE" : "EDITOR PROGRESS"}</div>
                <div className="display" style={{fontSize: 22, marginBottom: 12}}>
                   {isReadOnlyMode ? "LOCKED" : `${completedStepCount} of ${orderedSteps.length} ready`}
                </div>
                {!isReadOnlyMode && (
                  <div style={{height: 6, background: "var(--color-paper-2)", border:"1.5px solid var(--color-soft)"}}>
                    <div style={{width: `${(completedStepCount / orderedSteps.length) * 100}%`, height:"100%", background: "var(--color-acid)"}}/>
                  </div>
                )}
              </div>
            </MotionReveal>

            <MotionReveal preset="fade-up" delay={60}>
              <div className="flex flex-col gap-2">
                {orderedSteps.map((step, index) => {
                  const isActive = currentStep === step;
                  const isCompleted = displayStepValidityByStep[step] && !isActive;
                  const isIncomplete = !displayStepValidityByStep[step];
                  const stepState = isActive ? "active" : isCompleted ? "completed" : "pending";
                  const railStatus = isReadOnlyMode ? "view" : step === "totals" && !invoiceReadyForPreview ? "Pending" : isActive ? missingFieldCountByStep[step] > 0 ? `${missingFieldCountByStep[step]} mandatory` : missingOptionalCountByStep[step] > 0 ? "Ready" : "Complete ✓" : isCompleted ? missingOptionalCountByStep[step] > 0 ? "Ready" : "Complete ✓" : isIncomplete && missingFieldCountByStep[step] > 0 ? `${missingFieldCountByStep[step]} mandatory` : firstInvalidStep === step ? "Up next" : "Pending";
                  
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => scrollToStep(step)}
                      className="box flex gap-3 items-center"
                      style={{
                        padding: "14px 16px",
                        textAlign: "left",
                        background: isActive ? "var(--color-acid)" : "var(--color-paper)",
                        borderColor: isActive ? "var(--color-ink)" : "var(--color-soft)",
                        boxShadow: isActive ? "var(--shadow-chunk-sm)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div className="box flex items-center justify-center shrink-0" style={{width:24, height:24, fontWeight:700, fontSize:11, background: isActive?"var(--color-ink)":"var(--color-paper)", color: isActive?"var(--color-paper)":"var(--color-ink)", borderRadius: "var(--app-radius-button)"}}>
                         {isReadOnlyMode ? "👁" : isCompleted ? "✓" : index + 1}
                      </div>
                      <div style={{flex:1}}>
                        <div className="cap cap-strong" style={{fontSize:12}}>{getStepShortLabel(step)}</div>
                        <div className="cap" style={{color:"var(--color-ink-2)", marginTop:2}}>{railStatus}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </MotionReveal>
            
            <MotionReveal preset="fade-up" delay={80}>
              {nextBlockingGroup && !isReadOnlyMode ? (
                <div className="box" style={{padding:"14px 16px", background:"#f7d0bd", borderColor:"var(--color-coral)"}}>
                  <div className="cap cap-strong" style={{color:"var(--color-coral)", marginBottom: 4}}>⚠ NEXT BLOCKER</div>
                  <div style={{fontSize: 11, color:"#7a2a10", lineHeight:1.5}}>
                    {nextBlockingGroup.step === "deliverables" && nextBlockingFields.includes("Project")
                      ? "Name your project to continue."
                      : `${getStepShortLabel(nextBlockingGroup.step)} needs ${nextBlockingFields.slice(0, 3).join(", ")}${nextBlockingFields.length > 3 ? ` +${nextBlockingFields.length - 3} more` : ""}.`}
                  </div>
                </div>
              ) : null}
            </MotionReveal>
            
            {invoiceReadyForPreview && !isReadOnlyMode ? (
               <MotionReveal preset="fade-up" delay={80}>
                 <div className="box" style={{padding:"14px 16px"}}>
                    <div className="cap" style={{marginBottom: 6}}>STATUS</div>
                    <div className="display" style={{fontSize:22}}>Ready</div>
                    <div className="cap" style={{color:"var(--color-ink-3)", marginTop:2}}>100% complete</div>
                 </div>
               </MotionReveal>
            ) : null}
        </aside>

        {/* ── COL 2: Wizard Content ── */}
        <div
          className={cn(
            "w-full min-w-0 pb-20",
            appSectionGapClass,
          )}
        >
          {isGuestMode && (
            <div className="mb-6 print:hidden">
              <div className="border-2 border-[color:var(--color-lime-warm)] bg-[#FFFBE6] px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-[13px] text-[#111118]">
                  <span className="font-bold uppercase tracking-wider">Guest mode</span> — your invoice is saved locally. Sign in to enable cloud save, PDF export, and sharing.
                </p>
                <Link
                  href="/login"
                  className="shrink-0 text-[12px] font-bold text-[#111118] underline underline-offset-2 hover:text-[#8B5CF6]"
                >
                  Sign in →
                </Link>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {clientMsaNote && (
              <MotionReveal preset="fade-up" className="mb-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Client Negotiation Note
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-amber-900 font-normal">
                        &quot;{clientMsaNote}&quot;
                      </p>
                      <p className="mt-2 text-[11px] text-amber-700">
                        Please update the invoice details based on the
                        client&apos;s request above.
                      </p>
                    </div>
                  </div>
                </div>
              </MotionReveal>
            )}

            {isReadOnlyMode && (
              <MotionReveal preset="fade-up" className="mb-4">
                <div className="flex items-start gap-3 border-2 border-[#111118] bg-[#FFEBA4] p-4 shadow-[4px_4px_0px_0px_#111118]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111118] text-[color:var(--color-lime-warm)]">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                      Locked Archive / Read-only Invoice
                    </h4>
                    <p className="mt-1 text-sm font-normal leading-relaxed text-black/90">
                      {readOnlyReason}
                    </p>
                  </div>
                </div>
              </MotionReveal>
            )}

            {/* AI Brief Extraction hidden for now */}
            {/*
            <div className="opacity-80 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100">
              <BriefIntakeCard
                key={briefIntakeResetKey}
                onExtract={handleBriefAutofill}
                onPlaceholderAction={triggerToast}
                isCollapsed={isBriefIntakeCollapsed}
                onCollapsedChange={setIsBriefIntakeCollapsed}
                userEmail={userEmail}
              />
            </div>
            */}

            {/* ── Inline Meta Strip (hidden on xl+ where sidebar has it) ── */}
            {/* Mobile Meta Summary Strip (Rectified for UX) */}
            <div className={cn(
              "mx-4 mb-2 border border-[color:var(--color-soft)] px-4 py-3 transition-all duration-300 xl:hidden",
              isEditingMeta && !isReadOnlyMode ? "bg-white shadow-sm ring-1 ring-[color:var(--brand-indigo)]/20" : "bg-[color:var(--color-paper)]"
            )}>
              <div className="flex flex-col gap-3">
                {/* Row 1: Invoice Number & Edit Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">Invoice Reference</span>
                    {isEditingMeta && !isReadOnlyMode ? (
                      <input
                        type="text"
                        value={formData.meta.invoiceNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, invoiceNumber: e.target.value } }))}
                        className="mt-1 w-full border-none bg-white p-0 text-[14px] font-bold text-[color:var(--color-ink)] app-focus-ring"
                        placeholder="INV-000"
                      />
                    ) : (
                      <span className="text-[14px] font-bold tracking-tight text-[color:var(--color-ink)]">
                        {formData.meta?.invoiceNumber || '—'}
                      </span>
                    )}
                  </div>
                  {!isReadOnlyMode && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMeta(!isEditingMeta)}
                      className={cn(
                        "flex h-7 items-center gap-1.5 rounded-full px-3 text-[10px] font-bold transition-all",
                        isEditingMeta 
                          ? "bg-[color:var(--brand-indigo)] text-white" 
                          : "bg-white text-[color:var(--color-ink)] border border-[color:var(--color-soft)] shadow-sm"
                      )}
                    >
                      {isEditingMeta ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>

                <div className="h-[1px] w-full bg-[color:var(--color-paper-2)]" />

                {/* Row 2: Dates Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">Issued</span>
                    {isEditingMeta && !isReadOnlyMode ? (
                      <input
                        type="date"
                        value={formData.meta.invoiceDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, invoiceDate: e.target.value } }))}
                        className="mt-0.5 w-full border-none bg-transparent p-0 text-[12px] font-normal text-[color:var(--color-ink)] app-focus-ring"
                      />
                    ) : (
                      <span className="text-[12px] font-bold text-[color:var(--color-ink)]">
                        {formData.meta?.invoiceDate || '—'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">Due</span>
                    {isEditingMeta && !isReadOnlyMode ? (
                      <input
                        type="date"
                        value={formData.meta.dueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, dueDate: e.target.value } }))}
                        className="mt-0.5 w-full border-none bg-transparent p-0 text-[12px] font-normal text-[#FF5C00] app-focus-ring"
                      />
                    ) : (
                      <span className="text-[12px] font-bold text-[#FF5C00]">
                        {formData.meta?.dueDate || '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3 px-4 lg:hidden">
              <WorkbenchReadinessPanel
                compact
                ready={invoiceReadyForPreview}
                completedCount={completedValidationStepCount}
                totalCount={VALIDATION_STEPS.length}
                issueCount={totalRequiredIssueCount}
                activeStepLabel={getStepShortLabel(currentStep)}
                nextStepLabel={nextBlockingGroup ? getStepShortLabel(nextBlockingGroup.step) : undefined}
                nextFields={nextBlockingFields}
                total={computedTotals.grandTotal}
                currency={displayCurrency}
                dueDate={formData.meta.dueDate}
                clientName={formData.client.clientName}
                onReview={handleReviewBlockingStep}
                isReadOnly={isReadOnlyMode}
                readOnlyReason={readOnlyReason}
              />
            </div>

            {/* Mobile interactive step pills */}
            <div
              className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-4 lg:hidden flex-nowrap scrollbar-hide"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {orderedSteps.map((step, idx) => {
                const isActive = currentStep === step;
                const isCompleted = displayStepValidityByStep[step];
                const stepNumber = idx + 1;
                const label = getStepShortLabel(step);

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => scrollToStep(step)}
                    data-mobile-step-active={isActive ? "true" : undefined}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[12px] font-bold transition-all duration-200 active:scale-95",
                      isActive
                        ? "bg-gray-900 text-white shadow-md ring-2 ring-gray-900/10"
                        : isCompleted
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-[color:var(--color-paper-2)] text-[color:var(--color-ink-2)] border border-transparent hover:bg-gray-200"
                    )}
                  >
                    <span className="opacity-80">
                      {isCompleted && !isActive ? "✓" : stepNumber}
                    </span>
                    <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </div>

            <div
              className="overflow-visible h-auto"
              data-testid="invoice-vertical-stepper"
            >
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full h-auto"
                  ref={(node) => {
                    stepRefs.current[currentStep] = node;
                  }}
                >
                  <InlineStepSection
                    step={currentStep}
                    isActive={true}
                    isCompleted={displayStepValidityByStep[currentStep]}
                    issueCount={missingFieldCountByStep[currentStep]}
                    optionalIssueCount={missingOptionalCountByStep[currentStep]}
                    onActivate={() => scrollToStep(currentStep)}
                    isReadOnly={isReadOnlyMode}
                    footer={
                      !isReadOnlyMode && getNextStep(currentStep) ? (
                        <div className="mt-8 flex flex-col items-end gap-2">
                          {!stepValidityByStep[currentStep] && (
                            <p className="text-[12px] text-[color:var(--color-ink-2)]">
                              {(() => {
                                const group = missingFieldGroups.find(g => g.step === currentStep);
                                if (!group || group.fields.length === 0) {
                                  return "Complete all required fields to continue.";
                                }
                                if (group.step === "deliverables" && group.fields.includes("Project")) {
                                  return "Name your project to continue.";
                                }
                                if (group.fields.length === 1) {
                                  return `Fill in ${group.fields[0]} to continue.`;
                                }
                                if (group.fields.length <= 3) {
                                  return `Missing: ${group.fields.join(", ")}.`;
                                }
                                return `${group.fields.length} required fields remaining.`;
                              })()}
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={!stepValidityByStep[currentStep]}
                            data-testid={`continue-${currentStep}-to-${getNextStep(currentStep)}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                              scrollToStep(getNextStep(currentStep)!, {
                                focus: true,
                              })
                            }
                            className={cn(
                              "inline-flex items-center justify-center gap-2 font-bold tracking-[-0.01em] text-[13px] h-10 px-6 transition-all duration-200",
                              !stepValidityByStep[currentStep]
                                ? "bg-[color:var(--color-paper-2)] text-[color:var(--color-ink-2)] font-normal cursor-not-allowed"
                                : "bg-[#bfff00] text-black cursor-pointer hover:bg-[#bfff00]/90 shadow-sm active:scale-[0.97] transition-all",
                            )}
                          >
                            Continue to{" "}
                            {getStepShortLabel(getNextStep(currentStep)!)} →
                          </button>
                        </div>
                      ) : null
                    }
                  >
                    <div
                      onKeyDownCapture={(event) => {
                        if (isReadOnlyMode) {
                          if (!allowReadOnlyKey(event)) {
                            event.preventDefault();
                          }
                          return;
                        }

                        handleSectionKeyDownCapture(currentStep, event);
                      }}
                      onClickCapture={(event) => {
                        if (isReadOnlyMode) {
                          event.preventDefault();
                        }
                      }}
                      className={cn(isReadOnlyMode && "select-text opacity-95")}
                    >
                      <fieldset disabled={isReadOnlyMode}>
                        {renderStepContent(currentStep)}
                      </fieldset>
                    </div>
                  </InlineStepSection>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Live Totals / Summary Block (Mobile/Tablet) ── */}
            {!isXl && (
              <div className="mt-6 space-y-4">
                {showSummaryInline ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      {/* Inline Meta Card */}
                      <div className="border-2 border-[#111118] bg-[color:var(--color-paper-2)] px-4 py-4 shadow-[var(--brutal-shadow-sm)]">
                        <div className="border-b border-[color:var(--color-soft)] pb-2 mb-3 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-ink-2)]">
                            Invoice Details
                          </p>
                          {!isReadOnlyMode && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[color:var(--color-ink-2)]">Edit</span>
                              <AppSwitch className="rounded-none" checked={isEditingMeta} onChange={setIsEditingMeta} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          {/* Invoice Number */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)]">INV #</label>
                            {isEditingMeta && !isReadOnlyMode ? (
                              <input
                                type="text"
                                value={formData.meta.invoiceNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, invoiceNumber: e.target.value } }))}
                                className="w-full border-none bg-white px-3 py-2 text-[13px] font-bold text-[color:var(--color-ink)] shadow-sm ring-1 ring-inset ring-gray-200 )] transition-all app-focus-ring"
                                placeholder="INV-2026-000"
                              />
                            ) : (
                              <p className="text-[14px] font-bold text-[color:var(--color-ink)]">{formData.meta?.invoiceNumber || '—'}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Invoice Date */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)]">Issued</label>
                              {isEditingMeta && !isReadOnlyMode ? (
                                <input
                                  type="date"
                                  value={formData.meta.invoiceDate}
                                  onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, invoiceDate: e.target.value } }))}
                                  className="w-full border-none bg-white px-3 py-2 text-[12px] font-normal text-[color:var(--color-ink)] shadow-sm ring-1 ring-inset ring-gray-200 )] transition-all app-focus-ring"
                                />
                              ) : (
                                <p className="text-[13px] font-normal text-[color:var(--color-ink)]">{formData.meta?.invoiceDate || '—'}</p>
                              )}
                            </div>

                            {/* Due Date */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)]">Due</label>
                              {isEditingMeta && !isReadOnlyMode ? (
                                <input
                                  type="date"
                                  value={formData.meta.dueDate}
                                  onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, dueDate: e.target.value } }))}
                                  className="w-full border-none bg-white px-3 py-2 text-[12px] font-normal text-[#FF5C00] shadow-sm ring-1 ring-inset ring-gray-200 transition-all app-focus-ring"
                                />
                              ) : (
                                <p className="text-[13px] font-normal text-[#FF5C00]">{formData.meta?.dueDate || '—'}</p>
                              )}
                            </div>
                          </div>

                          {/* PO Number */}
                          <div className="space-y-1.5 min-w-0">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)] flex items-center gap-1">
                              PO #
                              <AppTooltip content={<>
                                Purchase Order Number. Required by some enterprise clients for accounts payable matching.
                              </>} />
                            </label>
                            {isEditingMeta && !isReadOnlyMode ? (
                              <input
                                type="text"
                                value={formData.meta.poNumber || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, poNumber: e.target.value } }))}
                                placeholder="Optional"
                                className="w-full min-w-0 border-none bg-white px-3 py-2 text-[12px] font-normal text-[color:var(--color-ink)] shadow-sm ring-1 ring-inset ring-gray-200 )] transition-all app-focus-ring"
                              />
                            ) : (
                              <p className="text-[13px] font-normal text-[color:var(--color-ink)] break-words">
                                {formData.meta?.poNumber || '—'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Totals Card */}
                      <div className="border-2 border-[#111118] bg-[color:var(--color-paper-2)] px-4 py-4 shadow-[var(--brutal-shadow-sm)]">
                        <div className="border-b border-[color:var(--color-soft)] pb-2 mb-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-ink-2)]">Totals</p>
                        </div>
                        <TotalsTaxesSection
                          embedded
                          value={derivedTaxConfig}
                          computed={computedTotals}
                          currency={displayCurrency}
                          hasItems={hasItems}
                          defaultExpanded={true}
                          isLocked={true}
                          onChange={(tax) => {
                            if (isReadOnlyMode) return;
                            setFormData((prev) => ({ ...prev, tax }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Fallback to simple footer strip if items not ready */
                  <div 
                    id="live-totals-footer" 
                    className={cn(
                      "border border-[color:var(--color-soft)] transition-all duration-300 bg-[color:var(--color-paper)] px-4 py-2.5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)]">Total</span>
                          <p className={`text-[18px] font-bold ${computedTotals.grandTotal > 0 ? 'text-[color:var(--brand-indigo-deep)]' : 'text-gray-300'}`}>
                            {formatCurrency(computedTotals.grandTotal, displayCurrency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile/Tablet Totals (visible below xl, after items are added) ── */}
          {computedTotals.subtotal > 0 && (
            <div className="xl:hidden mt-4">
              <div
                id="mobile-totals-footer"
                className="border-2 border-[#111118] bg-[color:var(--color-paper)] px-4 py-3 shadow-[var(--brutal-shadow-sm)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)]">Total</span>
                      <p className={`text-[18px] font-bold ${computedTotals.grandTotal > 0 ? 'text-[color:var(--brand-indigo-deep)]' : 'text-gray-300'}`}>
                        {formatCurrency(computedTotals.grandTotal, displayCurrency)}
                      </p>
                    </div>
                    {computedTotals.taxAmount > 0 && (
                      <>
                        <div className="h-6 w-px bg-gray-200" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)]">Tax</span>
                          <p className="text-[13px] font-normal text-[color:var(--color-ink)]">{formatCurrency(computedTotals.taxAmount, displayCurrency)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── COL 3: Right Sidebar – Meta + Totals (xl+) ── */}
        <aside
          className={cn(
            "hidden xl:flex flex-col gap-4",
            appStickyTopClass,
          )}
          data-testid="desktop-right-sidebar"
        >
          {/* ── Invoice Meta Card ── */}
          <MotionReveal preset="fade-up" delay={40}>
            <div className="box" style={{padding: "18px 20px"}}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="cap cap-strong">INVOICE DETAILS</div>
                {!isReadOnlyMode && (
                  <button onClick={() => setIsEditingMeta(!isEditingMeta)} className="cap flex items-center gap-1 hover:text-[color:var(--color-ink)] transition-colors" style={{color:"var(--color-ink-3)"}}>
                    EDIT <span className="text-[12px]">{isEditingMeta ? "☑" : "☐"}</span>
                  </button>
                )}
              </div>
              <div className="flex flex-col">
                {/* INV # */}
                <div className="flex items-center justify-between py-2 border-b border-dashed border-[color:var(--color-soft)]">
                  <div className="cap">INV #</div>
                  {isEditingMeta && !isReadOnlyMode ? (
                    <input
                      type="text"
                      value={formData.meta.invoiceNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, invoiceNumber: e.target.value } }))}
                      className="w-32 bg-transparent text-right text-[11px] font-bold text-[color:var(--color-ink)] border-b border-[color:var(--color-ink)] focus:outline-none"
                    />
                  ) : (
                    <div style={{fontSize:11, fontWeight:600}}>{formData.meta?.invoiceNumber || '—'}</div>
                  )}
                </div>
                {/* DATE */}
                <div className="flex items-center justify-between py-2 border-b border-dashed border-[color:var(--color-soft)]">
                  <div className="cap">DATE</div>
                  {isEditingMeta && !isReadOnlyMode ? (
                    <input
                      type="date"
                      value={formData.meta.invoiceDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, invoiceDate: e.target.value } }))}
                      className="w-32 bg-transparent text-right text-[11px] font-bold text-[color:var(--color-ink)] border-b border-[color:var(--color-ink)] focus:outline-none"
                    />
                  ) : (
                    <div style={{fontSize:11, fontWeight:600}}>{formData.meta?.invoiceDate || '—'}</div>
                  )}
                </div>
                {/* DUE */}
                <div className="flex items-center justify-between py-2 border-b border-dashed border-[color:var(--color-soft)]">
                  <div className="cap">DUE</div>
                  {isEditingMeta && !isReadOnlyMode ? (
                    <input
                      type="date"
                      value={formData.meta.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, dueDate: e.target.value } }))}
                      className="w-32 bg-transparent text-right text-[11px] font-bold text-[#FF5C00] border-b border-[color:var(--color-ink)] focus:outline-none"
                    />
                  ) : (
                    <div style={{fontSize:11, fontWeight:600, color: "#FF5C00"}}>{formData.meta?.dueDate || '—'}</div>
                  )}
                </div>
                {/* PO # */}
                <div className="flex items-center justify-between py-2 border-b border-dashed border-[color:var(--color-soft)]">
                  <div className="cap">PO #</div>
                  {isEditingMeta && !isReadOnlyMode ? (
                    <input
                      type="text"
                      value={formData.meta.poNumber || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta: { ...prev.meta, poNumber: e.target.value } }))}
                      placeholder="Optional"
                      className="w-32 bg-transparent text-right text-[11px] font-bold text-[color:var(--color-ink)] border-b border-[color:var(--color-ink)] focus:outline-none"
                    />
                  ) : (
                    <div style={{fontSize:11, fontWeight:600}}>{formData.meta?.poNumber || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          </MotionReveal>

          {/* Expanded Totals Card */}
          <MotionReveal preset="fade-up" delay={60}>
            <div className="box" style={{padding: "18px 20px"}}>
              <div className="cap cap-strong" style={{marginBottom: 12}}>TOTALS</div>
              <TotalsTaxesSection
                embedded
                value={derivedTaxConfig}
                computed={computedTotals}
                currency={displayCurrency}
                hasItems={hasItems}
                defaultExpanded={true}
                isLocked={true}
                onChange={(tax) => {
                  if (isReadOnlyMode) return;
                  setFormData((prev) => ({ ...prev, tax }));
                }}
              />
            </div>
          </MotionReveal>
          
          {showAdvancedTax && (
            <MotionReveal preset="fade-up" delay={80}>
              <div className="box dashed" style={{padding: "14px 16px"}}>
                <div className="cap cap-strong" style={{marginBottom:6}}>↗ ADVANCED TAX</div>
                <div style={{fontSize:11, color:"var(--color-ink-2)", lineHeight:1.5}}>
                  Switch to IGST · enable LUT · toggle RCM for B2B reverse charge.
                </div>
              </div>
            </MotionReveal>
          )}
        </aside>
      </div>
    </section>

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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="flex w-full max-w-sm flex-col overflow-hidden bg-[#111118] border border-[color:var(--color-soft)] p-6 shadow-[var(--brutal-shadow-lg)]"
          >
            <h3 className="text-lg font-bold text-white mb-2">
              {postSubmitActionModal.isReady ? "All set!" : "Almost there!"}
            </h3>
            <p className="text-sm text-[color:var(--color-ink-2)] mb-6">
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
                  className={getAppButtonClass({
                    variant: "primary",
                    size: "md",
                  })}
                >
                  Check Preview
                </button>
              )}
              <button
                onClick={() => setPostSubmitActionModal(null)}
                className={getAppButtonClass({
                  variant: postSubmitActionModal.isReady
                    ? "ghost"
                    : "primary",
                  size: "md",
                })}
              >
                Review Invoice
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )}

    {/* Fixed Bottom Action Bar */}
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[color:var(--color-soft)] bg-white/80 px-4 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1328px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-[13px] font-bold text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
          <div className="h-4 w-px bg-[color:var(--color-soft)]" />
          
          <div className="hidden sm:flex min-w-0 max-w-[520px] items-center gap-2 px-3 py-1.5 text-[11px] font-bold">
            {isReadOnlyMode ? (
              <span className="text-[#6B6660]">This invoice is locked — {readOnlyReason}</span>
            ) : invoiceReadyForPreview ? (
              <span className="text-[#007A63] flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.3} /> Ready for preview</span>
            ) : (
              <span className="text-[#8A4B00] flex items-center gap-1.5"><AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2.3} /> Missing details</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isReadOnlyMode && (
            <button
              type="button"
              onClick={handleSaveDraft}
              className={cn(
                getAppButtonClass({ variant: "ghost", size: "sm" }),
                "h-9 px-4 border border-[color:var(--color-soft)] text-[color:var(--color-ink)] sm:h-10 sm:px-5 active:scale-[0.97] transition-transform",
              )}
            >
              <SaveIcon className="mr-2 h-4 w-4" />
              Save Draft
            </button>
          )}
          {isReadOnlyMode ? (
            <>
              <button
                type="button"
                onClick={handleLockedAlternativeAction}
                className="inline-flex items-center justify-center gap-2 border-0 bg-[#111118] p-3 text-[11px] font-black uppercase text-[color:var(--color-lime-warm)] shadow-[4px_4px_0_#111118] transition-transform active:scale-[0.97] sm:p-4 sm:text-[12px]"
              >
                {lockState.alternativeAction?.label ?? "View preview"}
              </button>
              {lockState.alternativeAction && (
                <button
                  type="button"
                  onClick={handleLockedPreviewRoute}
                  className="inline-flex items-center justify-center gap-2 border-2 border-[#111118] bg-transparent p-3 text-[11px] font-bold text-[#111118] shadow-[4px_4px_0_#111118] transition-transform active:scale-[0.97] sm:p-4 sm:text-[12px]"
                >
                  View preview
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={invoiceReadyForPreview ? handlePreviewInvoice : handleReviewBlockingStep}
              className={cn(
                "inline-flex items-center gap-2 font-bold rounded-[var(--app-radius-button)] transition-all h-9 px-4 sm:h-10 sm:px-6",
                invoiceReadyForPreview
                  ? "bg-[#bfff00] text-black shadow-sm border border-[#bfff00] hover:brightness-105 active:scale-[0.97] transition-transform"
                  : "border-2 border-[#111118] bg-[#FFFBE6] text-[#111118] shadow-[var(--brutal-shadow-sm)] active:scale-[0.97] transition-transform"
              )}
            >
              <span className="hidden sm:inline">
                {invoiceReadyForPreview ? "Preview invoice" : "Review blocker"}
              </span>
              <span className="sm:hidden">
                {invoiceReadyForPreview ? "Preview" : "Review"}
              </span>
              {invoiceReadyForPreview ? (
                <ArrowRight className="ml-2 h-4 w-4" />
              ) : (
                <AlertCircle className="ml-2 h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  </main>
);
}
