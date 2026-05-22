"use client";

import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TemplatePicker from "@/components/invoice/TemplatePicker";
import AppHeader from "@/components/AppHeader";
import TemplateRenderer from "@/lib/templates/renderer";
import { DEFAULT_TEMPLATE_ID, TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import Link from "next/link";
import {
  ChevronLeftIcon,
  DocumentSparkIcon,
  DownloadIcon,
  PrinterIcon,
  SaveIcon,
  ShareIcon,
} from "@/components/ui/app-icons";
import {
  MotionButton,
  MotionReveal,
  MotionStagger,
  SuccessPulse,
} from "@/components/ui/motion-primitives";
import {
  appCardClass,
  appGridClass,
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import {
  hasExplicitExportTaxChoice,
  requiresExplicitExportTaxChoice,
} from "@/lib/invoice-compliance";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
import { getAppButtonClass, cn } from "@/lib/ui-foundation";
import { playInteractionCue } from "@/lib/interaction-feedback";
import { supabase } from "@/lib/supabase/client";
import { saveInvoice, getCurrentUserId, loadInvoice } from "@/lib/supabase/invoices";
import { syncProfileFromInvoice, loadProfile } from "@/lib/supabase/profiles";
import UploadToast from "@/components/ui/UploadToast";
import type { InvoiceStatus, MsaResponse } from "@/lib/supabase/invoices";
import ShareLinkModal from "@/components/invoice/ShareLinkModal";
import ConversionModal from "@/components/invoice/ConversionModal";
import DownloadDecisionModal from "@/components/invoice/DownloadDecisionModal";
import { markInvoiceAsOffline } from "@/lib/supabase/invoices";
import { getInvoiceLockState } from "@/lib/invoice-lock-state";

const STORAGE_KEY = "invoice-preview-data";
const DRAFT_STORAGE_KEY = "invoice-editor-draft";

function getInvoiceTitle(invoiceNumber?: string) {
  return invoiceNumber?.trim()
    ? `${invoiceNumber.trim()} - Invoice Preview`
    : "Invoice Preview";
}

function getPdfTitle(invoiceNumber?: string) {
  return invoiceNumber?.trim() ? `${invoiceNumber.trim()}.pdf` : "invoice.pdf";
}

export default function InvoicePreviewPage() {
  return (
    <Suspense fallback={<div>Loading preview...</div>}>
      <PreviewContent />
    </Suspense>
  );
}

function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<InvoiceFormData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "cloud-saved" | "error"
  >("idle");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [cloudInvoiceId, setCloudInvoiceId] = useState<string | null>(null);

  const [sharedToEmail, setSharedToEmail] = useState<string | null>(null);
  const [clientMsaNote, setClientMsaNote] = useState<string | null>(null);
  const [invoiceStatusState, setInvoiceStatusState] = useState<string | null>(null);
  const [projectMsaAcceptedAt, setProjectMsaAcceptedAt] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_TEMPLATE_ID);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [isDownloadDecisionOpen, setIsDownloadDecisionOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharedAt, setSharedAt] = useState<string | null>(null);
  const [currentMsaId, setCurrentMsaId] = useState<string | null>(null);
  const [msaResponse, setMsaResponse] = useState<MsaResponse>("pending");
  const [isSavingAndSharing, setIsSavingAndSharing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const defaultTitleRef = useRef<string>("");
  const exportTitleRef = useRef<string | null>(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [scaleToFit, setScaleToFit] = useState(0.6);
  const [zoom, setZoom] = useState<number>(0.7); // Default to 70% scale
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const panStart = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const effectiveZoom = isMobile ? scaleToFit : zoom;

  useEffect(() => {
    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const containerHeight = previewContainerRef.current.clientHeight;
      const containerWidth = previewContainerRef.current.clientWidth;
      // A4 at 96dpi: ~794px wide, ~1123px tall
      const a4Height = 1123;
      const a4Width = 794;
      const verticalPadding = 64; // 24px * 2 (py-6) + extra buffer
      const horizontalPadding = 48; // 16px * 2 (px-4) + extra buffer
      const scaleH = (containerHeight - verticalPadding) / a4Height;
      const scaleW = (containerWidth - horizontalPadding) / a4Width;
      const scale = Math.min(scaleH, scaleW, 1); // never scale up, only down
      setScaleToFit(Math.max(scale, 0.2)); // minimum 0.2 to prevent too tiny
    };

    updateScale();
    const resizeObserver = new ResizeObserver(() => updateScale());
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const beforePrint = () => {
      const sheet = document.querySelector(".invoice-sheet") as HTMLElement;
      if (sheet) {
        sheet.dataset.savedTransform = sheet.style.transform;
        sheet.style.transform = "none";
        sheet.style.width = "210mm";
        sheet.style.minWidth = "210mm";
      }
    };
    const afterPrint = () => {
      const sheet = document.querySelector(".invoice-sheet") as HTMLElement;
      if (sheet && sheet.dataset.savedTransform) {
        sheet.style.transform = sheet.dataset.savedTransform;
        sheet.style.width = "210mm";
        sheet.style.minWidth = "";
      }
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(false);
    requestAnimationFrame(() => {
      setShowToast(true);
    });
  };

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    try {
      const isRestore = searchParams.get("restore") === "1";
      const idParam = searchParams.get("id");
      
      if (idParam) {
        setCloudInvoiceId(idParam);
      }

      const keyToUse = isRestore ? DRAFT_STORAGE_KEY : STORAGE_KEY;
      const raw = window.localStorage.getItem(keyToUse);

      if (raw) {
        const parsed = JSON.parse(raw);
        // DRAFT_STORAGE_KEY has a wrapper object { formData, ... }
        // STORAGE_KEY has the raw formData
        const formData = isRestore ? parsed.formData : parsed;

        if (formData) {
          setData(mergeInvoiceFormData(formData));
          // Restore template and cloud ID if present
          if (parsed.templateId) {
            setSelectedTemplate(parsed.templateId);
          }
          if (parsed.cloudInvoiceId && !idParam) {
            setCloudInvoiceId(parsed.cloudInvoiceId);
          }
        }
      }
    } catch (error) {
      console.error("Failed to read preview data:", error);
    } finally {
      setIsReady(true);
    }
  }, [searchParams]);

  // Load invoice and lock attributes from database if cloudInvoiceId exists
  useEffect(() => {
    if (!cloudInvoiceId) return;

    let active = true;
    async function fetchLockAttributes() {
      const { data: dbInvoice, error } = await loadInvoice(cloudInvoiceId as string);
      if (error) {
        console.error("Failed to load invoice from database:", error);
        return;
      }
      if (dbInvoice && active) {
        setSharedToEmail(dbInvoice.shared_to_email);
        setClientMsaNote(dbInvoice.client_msa_note);
        setInvoiceStatusState(dbInvoice.status);
        setMsaResponse(dbInvoice.msa_status);
        setSharedAt(dbInvoice.shared_at);
        setShareToken(dbInvoice.share_token);
        setCurrentMsaId(dbInvoice.msa_id);
        setProjectMsaAcceptedAt(dbInvoice.project?.msa_accepted_at ?? null);
        setProjectStatus(dbInvoice.project?.status ?? null);
        
        // Also hydrate raw invoice form data if it exists
        if (dbInvoice.form_data) {
          setData(mergeInvoiceFormData(dbInvoice.form_data));
        }
      }
    }
    void fetchLockAttributes();
    return () => {
      active = false;
    };
  }, [cloudInvoiceId]);

  const requiresExportChoice = data
    ? requiresExplicitExportTaxChoice(data.agency, data.client)
    : false;
  const hasResolvedExportChoice = data
    ? hasExplicitExportTaxChoice(data.agency)
    : false;

  const invoiceNumber = data?.meta?.invoiceNumber;
  const previewTitle = getInvoiceTitle(invoiceNumber);
  const pdfTitle = getPdfTitle(invoiceNumber);

  const lockState = useMemo(() => {
    return getInvoiceLockState({
      status: invoiceStatusState,
      msaStatus: msaResponse,
      sharedToEmail: sharedToEmail,
      clientMsaNote: clientMsaNote,
      projectMsaAcceptedAt: projectMsaAcceptedAt,
      projectStatus: projectStatus,
    });
  }, [invoiceStatusState, msaResponse, sharedToEmail, clientMsaNote, projectMsaAcceptedAt, projectStatus]);

  useEffect(() => {
    async function debugAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("PreviewContent: session on mount:", !!session);
      if (session?.user) {
        console.log("PreviewContent: user detected:", session.user.email);
      }
    }
    void debugAuth();
  }, []);

  useEffect(() => {
    defaultTitleRef.current = previewTitle;
    document.title = previewTitle;

    return () => {
      if (exportTitleRef.current === null) {
        document.title = previewTitle;
      }
    };
  }, [previewTitle]);

  useEffect(() => {
    const resetTitleAfterPrint = () => {
      exportTitleRef.current = null;
      setIsExportingPdf(false);
      document.title = defaultTitleRef.current || previewTitle;
    };

    window.addEventListener("afterprint", resetTitleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", resetTitleAfterPrint);
    };
  }, [previewTitle]);

  useEffect(() => {
    if (saveState !== "saved" && saveState !== "cloud-saved") return;

    const timer = window.setTimeout(() => {
      setSaveState("idle");
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [saveState]);

  /* ── Auto cloud-save after login redirect (restore=1) ── */
  useEffect(() => {
    if (!data || !isReady) return;
    if (searchParams.get("restore") !== "1") return;

    async function autoCloudSave() {
      const currentData = data;
      if (!currentData) return;

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { error, data: saved } = await saveInvoice({
        formData: currentData,
        status: "draft" as InvoiceStatus,
        existingId: undefined,
        templateId: selectedTemplate, // Pass the selected template!
      });

      if (error) {
        console.error("Restoration Save Failed:", error);
        triggerToast("Failed to save draft to cloud. Please try manual save.");
        return;
      }

      if (saved) {
        setCloudInvoiceId(saved.id);
        // Sync profile details from this restored draft
        await syncProfileFromInvoice(currentData);

        // Check if assets are missing to show prompt
        const { data: profile } = await loadProfile();
        if (profile) {
          const hasAssets = Boolean(
            profile.logo_url && profile.qr_code_url && profile.signature_url,
          );
          setShowProfilePrompt(!hasAssets);
        }

        triggerToast("Draft saved to cloud ☁ Welcome back!");
        playInteractionCue("saveSuccess");

        // Clean up URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
      }
    }

    void autoCloudSave();
  }, [data, isReady, searchParams, selectedTemplate]);

  const persistDraft = () => {
    if (!data) return false;

    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData: data,
          currentStep: "totals",
          savedAt: new Date().toISOString(),
          templateId: selectedTemplate,
          cloudInvoiceId: cloudInvoiceId, // Persist the cloud ID!
        }),
      );

      // Also sync to the preview key to keep them aligned
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      return true;
    } catch (error) {
      console.error("Failed to store editor draft from preview:", error);
      return false;
    }
  };

  const handlePrint = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      persistDraft();
      setShowConversionModal(true);
      return;
    }
    window.print();
  };

  const handleBackToEdit = () => {
    persistDraft();
  };

  const handleSaveDraft = async () => {
    console.log("handleSaveDraft: initiating cloud save...");
    if (!data) {
      console.warn("handleSaveDraft: No invoice data found to save.");
      return;
    }
    
    setSaveState("saving");

    try {
      // Always persist to localStorage as offline fallback
      persistDraft();

      // Attempt cloud save for authenticated users
      const userId = await getCurrentUserId();
      console.log("handleSaveDraft: userId detected:", userId);

      if (userId) {
        const { data: saved, error } = await saveInvoice({
          formData: data,
          status: "draft" as InvoiceStatus,
          templateId: selectedTemplate,
          existingId: cloudInvoiceId ?? undefined,
        });

        if (!error && saved) {
          console.log("handleSaveDraft: cloud save success, id:", saved.id);
          setCloudInvoiceId(saved.id);
          setSaveState("cloud-saved");

          // Sync profile details from this draft
          await syncProfileFromInvoice(data);

          // Update local storage with the new cloud ID
          persistDraft();

          playInteractionCue("saveSuccess");
          return;
        }
        
        // Fall through to local-only save on error
        console.warn("handleSaveDraft: cloud save failed:", error);
        setSaveState("error");
        triggerToast(
          `Sync Error: ${error || "Database connection failed"}. Invoice saved locally only.`,
        );
        return;
      } else {
        console.log("handleSaveDraft: No authenticated user found, performing local save only.");
      }

      // Success state for local-only save (guest mode)
      setSaveState("saved");
      playInteractionCue("saveSuccess");
    } catch (err) {
      console.error("handleSaveDraft: unexpected exception:", err);
      setSaveState("error");
      triggerToast("An unexpected error occurred while saving. Please try again.");
    }
  };

  const handleShareClick = async () => {
    if (!data) return;
    setIsSavingAndSharing(true);
    setSaveState("saving");

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        // Intercept guest users
        persistDraft();
        setShowConversionModal(true);
        return;
      }

      // Auto-save including selected template
      const { data: saved, error } = await saveInvoice({
        formData: data,
        status: "draft" as InvoiceStatus,
        templateId: selectedTemplate,
        existingId: cloudInvoiceId ?? undefined,
      });

      if (error || !saved) {
        setSaveState("error");
        triggerToast("Save failed. Cannot share.");
        return;
      }

      setCloudInvoiceId(saved.id);
      setShareToken(saved.share_token || null);
      setSharedAt(saved.shared_at || null);
      setCurrentMsaId(saved.msa_id || null);
      setSharedToEmail(saved.shared_to_email || (data?.client?.clientEmail ?? null));
      setInvoiceStatusState(saved.status);
      setMsaResponse(saved.msa_status);
      setSaveState("cloud-saved");

      // Brief delay for transition
      await new Promise((resolve) => setTimeout(resolve, 300));
      setShowShareModal(true);
    } catch (err) {
      console.error("SHARE_AUTOFLOW_ERROR:", err);
      setSaveState("error");
      triggerToast("An error occurred during save & share.");
    } finally {
      setIsSavingAndSharing(false);
    }
  };

  const handleDownloadPdf = async (options?: { markAsSent?: boolean }) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      persistDraft();
      setShowConversionModal(true);
      return;
    }

    setIsExportingPdf(true);
    exportTitleRef.current = pdfTitle;
    document.title = pdfTitle;

    // Finalize to Supabase for authenticated users.
    // Skip when called from the offline path (markAsSent === false),
    // because going offline should not flip the invoice to SENT.
    if (data && options?.markAsSent !== false) {
      const { data: saved } = await saveInvoice({
        formData: data,
        status: "SENT" as InvoiceStatus,
        templateId: selectedTemplate,
        existingId: cloudInvoiceId ?? undefined,
      });
      if (saved) {
        setCloudInvoiceId(saved.id);
      }
    }

    window.print();

    // Fallback for environments where `afterprint` is unreliable.
    window.setTimeout(() => {
      if (exportTitleRef.current !== null) {
        exportTitleRef.current = null;
        setIsExportingPdf(false);
        document.title = defaultTitleRef.current || previewTitle;
      }
    }, 500);
  };

  const handleCancelDownloadDecision = () => {
    setIsDownloadDecisionOpen(false);
  };

  const handleConfirmShareThenDownload = () => {
    setIsDownloadDecisionOpen(false);
    // Fire the existing PDF export first (opens browser print dialog),
    // then open the share modal so the user can finish the digital share.
    handleDownloadPdf();
    setShowShareModal(true);
  };

  const handleConfirmDownloadOffline = async () => {
    setIsDownloadDecisionOpen(false);
    const invoiceId = cloudInvoiceId;
    if (!invoiceId) {
      console.error("[DownloadOffline] No invoice id available; aborting offline mark.");
      handleDownloadPdf({ markAsSent: false });
      return;
    }
    try {
      await markInvoiceAsOffline(invoiceId);
    } catch (error) {
      console.error("[DownloadOffline] Failed to mark invoice offline:", error);
      // Continue with the download anyway so the user is not blocked.
    }
    handleDownloadPdf({ markAsSent: false });
  };

  const handleLoginClick = async () => {
    const nextPath = cloudInvoiceId 
      ? `/invoice/preview?id=${cloudInvoiceId}&restore=1`
      : "/invoice/preview?restore=1";
    const next = encodeURIComponent(nextPath);
    const redirectTo = `${window.location.origin}/signup?next=${next}`;
    // We already persisted the draft in handlePrint/Save/Download
    window.location.href = redirectTo;
  };

  if (!isReady) {
    return (
      <main className={appPageShellClass}>
        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className={appGridClass}>
            <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
              <MotionReveal className={`${appCardClass} p-8`} preset="fade-up">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] text-[color:var(--text-secondary)]">
                    <DocumentSparkIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      Preparing preview
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      Loading the invoice sheet and export actions.
                    </p>
                  </div>
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className={appPageShellClass}>
        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className={appGridClass}>
            <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
              <MotionReveal className={`${appCardClass} p-8`} preset="fade-up">
                <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                  Invoice Preview
                </h1>
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
                  No invoice data found. Go back to the editor and click Preview
                  Invoice again.
                </p>

                <div className="mt-6">
                  <Link
                    href="/invoice/new"
                    className={getAppButtonClass({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    ← Back to Editor
                  </Link>
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (requiresExportChoice && !hasResolvedExportChoice) {
    return (
      <main className={appPageShellClass}>
        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className={appGridClass}>
            <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
              <MotionReveal className={`${appCardClass} p-8`} preset="fade-up">
                <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                  Invoice Preview
                </h1>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
                  This international invoice still needs an explicit export tax
                  choice in Totals &amp; Taxes before preview or PDF export.
                </p>

                <div className="mt-6">
                  <Link
                    href="/invoice/new"
                    onClick={handleBackToEdit}
                    className={getAppButtonClass({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    ← Back to Editor
                  </Link>
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            background: white !important;
          }
          .invoice-sheet {
            transform: none !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            break-inside: avoid !important;
          }
          .invoice-sheet-wrapper {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            break-inside: auto;
          }
          .milestone-summary, header, section, footer {
            break-inside: avoid;
          }
        }
      `}</style>

      <main
        className={`${appPageShellClass} print:bg-white print:p-0 print:m-0 print:min-h-0 min-h-screen pb-32`}
      >
        <AppHeader />
        
        <section
          className={`${appPageContainerClass} py-5 sm:py-8 print:px-0 print:py-0 print:m-0 print:max-w-none`}
        >
          <div className="mx-auto w-full max-w-[1328px] print:m-0 print:max-w-none">
            {/* Minimal Header */}
            <MotionReveal className="mb-6 print:hidden" preset="fade-up">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center border-2 border-[#111118] bg-[#E0FFF7] text-[#006B52] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]">
                  Ready to export
                </span>
                <button
                  onClick={() => {
                    if (!invoiceNumber) return;
                    navigator.clipboard.writeText(invoiceNumber.trim());
                    setCopiedField('invoiceNumber');
                    setTimeout(() => setCopiedField(null), 1500);
                  }}
                  className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[color:var(--text-primary)] hover:text-[#4F46E5] transition-colors cursor-pointer group"
                  title="Click to copy"
                >
                  <span>{invoiceNumber?.trim() || "New Invoice"}</span>
                  {invoiceNumber && (
                    <span className="text-[14px] text-gray-300 group-hover:text-[#4F46E5] transition-colors">
                      {copiedField === 'invoiceNumber' ? '✓' : '⎘'}
                    </span>
                  )}
                </button>
              </div>
            </MotionReveal>

            {/* Profile Completion Prompt */}
            {showProfilePrompt && (
              <MotionReveal preset="fade-up" className="mb-8 print:hidden">
                <div className="flex flex-col items-center justify-between gap-4 border border-[color:var(--color-lime-300)] bg-[color:var(--color-lime-50)] p-4 sm:flex-row sm:p-5">
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--interactive-primary)] text-xl">
                      ✨
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[color:var(--text-primary)]">
                        Complete your professional profile
                      </h3>
                      <p className="text-[13px] text-[color:var(--text-secondary)]">
                        Upload your agency logo, signature, and payment QR for
                        faster, more compliant invoices.
                      </p>
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
                      className={getAppButtonClass({
                        variant: "primary",
                        size: "sm",
                      })}
                    >
                      Finish Profile
                    </Link>
                  </div>
                </div>
              </MotionReveal>
            )}

            {/* Neo-Brutalist Locked Invoice Status Banner */}
            {lockState.isReadOnly && (
              <MotionReveal preset="fade-up" className="mb-8 print:hidden">
                <div className="flex flex-col items-center justify-between gap-4 border-2 border-black bg-[#FFE5E5] p-4 sm:flex-row sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-red-400 text-xl font-bold">
                      🔒
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-black">
                        Invoice is Locked
                      </h3>
                      <p className="text-[13px] text-gray-800">
                        {lockState.reason}
                      </p>
                    </div>
                  </div>
                  {lockState.alternativeAction && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700 bg-white border border-gray-300 px-2 py-1 uppercase tracking-wider">
                        Suggested: {lockState.alternativeAction.label}
                      </span>
                    </div>
                  )}
                </div>
              </MotionReveal>
            )}

            {/* Main Layout: Invoice Hero + Slim Right Template Bar */}
            <div 
              className="flex flex-col xl:flex-row gap-0 print:block print:h-auto print:overflow-visible" 
              style={{ height: "calc(100vh - 200px)" }}
            >
              {/* Left: Invoice area (Hero) */}
              <div className="flex-1 relative flex flex-col min-w-0 print:block print:w-full print:max-w-none print:overflow-visible">
                {/* Zoom Toolbar - Truly Sticky */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 hidden sm:flex items-center gap-1 bg-white border border-[color:var(--border-subtle)] shadow-md px-2 py-1 print:hidden">
                  <button
                    onClick={() => {
                      const newZoom = Math.max(zoom - 0.1, 0.2);
                      setZoom(newZoom);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="h-7 w-7 flex items-center justify-center rounded text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-muted)] text-sm font-bold"
                    title="Zoom out"
                  >
                    −
                  </button>
                  <button
                    onClick={() => {
                      setZoom(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="h-7 px-2 flex items-center justify-center rounded text-[11px] font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--bg-surface-muted)]"
                    title="Reset to 100%"
                  >
                    {Math.round(effectiveZoom * 100)}%
                  </button>
                  <button
                    onClick={() => {
                      const newZoom = Math.min(zoom + 0.1, 1.5);
                      setZoom(newZoom);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="h-7 w-7 flex items-center justify-center rounded text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-muted)] text-sm font-bold"
                    title="Zoom in"
                  >
                    +
                  </button>
                </div>

                <div 
                  ref={previewContainerRef} 
                  onWheel={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.05 : 0.05;
                      setZoom(Math.max(0.2, Math.min(1.5, zoom + delta)));
                    }
                  }}
                  onMouseDown={(e) => {
                    if (effectiveZoom > scaleToFit) {
                      setIsPanning(true);
                      panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
                    }
                  }}
                  onMouseMove={(e) => {
                    if (isPanning) {
                      setPanOffset({
                        x: e.clientX - panStart.current.x,
                        y: e.clientY - panStart.current.y,
                      });
                    }
                  }}
                  onMouseUp={() => setIsPanning(false)}
                  onMouseLeave={() => setIsPanning(false)}
                  className={cn(
                    "flex-1 flex items-center justify-center py-10 px-6 bg-[color:var(--bg-surface-soft)]/30 rounded-t-2xl xl:rounded-l-2xl xl:rounded-tr-none border border-[color:var(--border-subtle)] border-b-0 xl:border-r-0 xl:border-b transition-all print:block print:w-full print:max-w-none print:overflow-visible print:p-0 print:border-0 relative",
                    "overflow-auto cursor-grab active:cursor-grabbing scrollbar-hide"
                  )}
                  style={{ cursor: effectiveZoom > scaleToFit ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
                >
                  <div
                    className="invoice-sheet-wrapper relative print:overflow-visible flex justify-center"
                    style={{
                      width: `${794 * effectiveZoom}px`,
                      height: `${1123 * effectiveZoom}px`,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      className="invoice-sheet relative mx-auto rounded-sm border border-[color:var(--border-default)] bg-white shadow-[var(--app-floating-shadow)] transition-all duration-300 print:static print:transform-none print:border-0 print:shadow-none"
                      style={{
                        width: "794px",
                        height: "1123px",
                        transform: `scale(${effectiveZoom}) translate(${panOffset.x / effectiveZoom}px, ${panOffset.y / effectiveZoom}px)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <TemplateRenderer
                        formData={data}
                        templateId={selectedTemplate}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Slim Template Picker Bar */}
              <aside className="w-full xl:w-[220px] shrink-0 border border-[color:var(--border-subtle)] bg-white overflow-y-auto rounded-b-2xl xl:rounded-r-2xl xl:rounded-bl-none print:hidden scrollbar-hide">
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)] mb-4">
                    Choose Template
                  </p>
                  <div className="space-y-3">
                    {TEMPLATE_REGISTRY.sort((a, b) => a.order - b.order).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          "w-full border p-2.5 text-left transition-all",
                          selectedTemplate === template.id
                            ? "border-[#4F46E5] bg-[#4F46E5]/5 shadow-sm ring-1 ring-[#4F46E5]/20"
                            : "border-transparent hover:border-[color:var(--border-default)] hover:bg-[color:var(--bg-surface-soft)]"
                        )}
                      >
                        {/* Color swatches */}
                        <div className="flex gap-1.5 mb-2">
                          <div
                            className="h-5 flex-1"
                            style={{ backgroundColor: template.palette.primary }}
                          />
                          <div
                            className="h-5 flex-1 border border-[color:var(--border-subtle)]"
                            style={{ backgroundColor: template.palette.secondary }}
                          />
                          <div
                            className="h-5 w-5"
                            style={{ backgroundColor: template.palette.text }}
                          />
                        </div>
                        {/* Template metadata */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[color:var(--text-primary)]">
                            {template.name}
                          </span>
                          {selectedTemplate === template.id && (
                            <div className="h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ─── Sticky Bottom Action Bar ─── */}
        <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[color:var(--border-subtle)] bg-white/80 px-4 py-4 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-[1328px] flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href={cloudInvoiceId ? `/invoice/new?id=${cloudInvoiceId}` : "/invoice/new"}
                onClick={handleBackToEdit}
                className={getAppButtonClass({ variant: "ghost", size: "sm" })}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Edit Invoice
              </Link>
              <div className="h-4 w-px bg-[color:var(--border-subtle)]" />
              {saveState === "saving" ? (
                <span className="text-xs font-medium text-[color:var(--text-muted)]">
                  Saving…
                </span>
              ) : saveState === "cloud-saved" || saveState === "saved" ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--state-success-text)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--state-success-text)]" />
                  All changes saved
                </span>
              ) : saveState === "error" ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#FF5C00]">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Cloud Save Failed (Saved Locally)
                </span>
              ) : null}
            </div>


            <div className="flex items-center gap-3">
              <MotionButton
                type="button"
                onClick={handlePrint}
                className={getAppButtonClass({
                  variant: "ghost",
                  size: "md",
                })}
              >
                <PrinterIcon className="h-4 w-4" />
                Print
              </MotionButton>

              <span className="hidden sm:inline text-[10px] text-[color:var(--text-muted)] mr-2">
                Tip: Uncheck "Headers and footers" in print dialog
              </span>

              <MotionButton
                type="button"
                onClick={() => setIsDownloadDecisionOpen(true)}
                className={getAppButtonClass({
                  variant: "secondary",
                  size: "md",
                })}
              >
                <DownloadIcon className="h-4 w-4" />
                {isExportingPdf ? "Exporting..." : "Export PDF"}
              </MotionButton>

              <MotionButton
                type="button"
                disabled={isSavingAndSharing || !lockState.canShare}
                onClick={handleShareClick}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-[var(--app-radius-button)] font-bold tracking-[-0.01em] text-[13px] h-10 px-6 transition-all duration-100 active:scale-[0.97]",
                  isSavingAndSharing || !lockState.canShare
                    ? "bg-[color:var(--bg-surface-muted)] text-[color:var(--text-muted)] cursor-not-allowed opacity-80 border border-[color:var(--border-subtle)]"
                    : "bg-[#bfff00] text-black cursor-pointer hover:bg-[#bfff00]/90 shadow-sm border border-[#bfff00] active:bg-[#9acc00]"
                )}
                title={!lockState.canShare ? lockState.reason : undefined}
              >
                {isSavingAndSharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShareIcon className="h-4 w-4" />
                )}
                {isSavingAndSharing ? "Saving..." : "Share Invoice"}
              </MotionButton>
            </div>
          </div>
        </div>
      </main>

      {showShareModal && cloudInvoiceId && (
        <ShareLinkModal
          invoiceId={cloudInvoiceId}
          existingToken={shareToken}
          clientEmail={data?.client?.clientEmail || ""}
          currentMsaId={currentMsaId}
          msaResponse={msaResponse}
          invoiceData={data}
          sharedAt={sharedAt}
          onClose={() => setShowShareModal(false)}
          onShared={(token) => setShareToken(token)}
        />
      )}

      <DownloadDecisionModal
        isOpen={isDownloadDecisionOpen}
        invoiceNumber={invoiceNumber ?? ""}
        milestoneCount={data?.milestones?.length ?? 0}
        onChooseShareAndDownload={handleConfirmShareThenDownload}
        onChooseDownloadOffline={handleConfirmDownloadOffline}
        onCancel={handleCancelDownloadDecision}
      />

      <ConversionModal
        isOpen={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        onLoginClick={handleLoginClick}
      />

      <UploadToast message={toastMessage} visible={showToast} />
    </>
  );
}
