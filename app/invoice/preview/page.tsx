"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TemplatePicker from "@/components/invoice/TemplatePicker";
import AppHeader from "@/components/AppHeader";
import { DEFAULT_TEMPLATE_ID } from "@/lib/templates/registry";
import TemplateRenderer from "@/lib/templates/renderer";
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
import { saveInvoice, getCurrentUserId } from "@/lib/supabase/invoices";
import { syncProfileFromInvoice, loadProfile } from "@/lib/supabase/profiles";
import UploadToast from "@/components/ui/UploadToast";
import type { InvoiceStatus, MsaResponse } from "@/lib/supabase/invoices";
import ShareLinkModal from "@/components/invoice/ShareLinkModal";
import ConversionModal from "@/components/invoice/ConversionModal";

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
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_TEMPLATE_ID);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [currentMsaId, setCurrentMsaId] = useState<string | null>(null);
  const [msaResponse, setMsaResponse] = useState<MsaResponse>("PENDING");
  const [isSavingAndSharing, setIsSavingAndSharing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const defaultTitleRef = useRef<string>("");
  const exportTitleRef = useRef<string | null>(null);

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
          if (parsed.cloudInvoiceId) {
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

  const requiresExportChoice = data
    ? requiresExplicitExportTaxChoice(data.agency, data.client)
    : false;
  const hasResolvedExportChoice = data
    ? hasExplicitExportTaxChoice(data.agency)
    : false;

  const invoiceNumber = data?.meta?.invoiceNumber;
  const previewTitle = getInvoiceTitle(invoiceNumber);
  const pdfTitle = getPdfTitle(invoiceNumber);

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
      setCurrentMsaId(saved.msa_id || null);
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

  const handleDownloadPdf = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      persistDraft();
      setShowConversionModal(true);
      return;
    }

    setIsExportingPdf(true);
    exportTitleRef.current = pdfTitle;
    document.title = pdfTitle;

    // Finalize to Supabase for authenticated users
    if (data) {
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

  const handleLoginClick = async () => {
    const nextPath = cloudInvoiceId 
      ? `/invoice/preview?id=${cloudInvoiceId}&restore=1`
      : "/invoice/preview?restore=1";
    const next = encodeURIComponent(nextPath);
    const redirectTo = `${window.location.origin}/login?next=${next}`;
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
                <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
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
                <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
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
            margin: 10mm;
          }
          html, body {
            background: white !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Reset design system tokens to clean print values */
          :root {
            --text-primary: #111118;
            --text-secondary: #27272F;
            --text-muted: #6E6E7A;
            --border-subtle: #E2E2EA;
          }
        }

        .invoice-sheet {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .invoice-table thead {
          display: table-header-group;
        }

        .invoice-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      `}</style>

      <main
        className={`${appPageShellClass} print:bg-white print:p-0 min-h-screen pb-32`}
      >
        <AppHeader />
        
        <section
          className={`${appPageContainerClass} py-5 sm:py-8 print:px-0 print:py-0`}
        >
          <div className="mx-auto w-full max-w-[1328px]">
            {/* Minimal Header */}
            <MotionReveal className="mb-8 print:hidden" preset="fade-up">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--state-info-border)] bg-[color:var(--state-info-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-info-text)]">
                      <DocumentSparkIcon className="h-4 w-4" />
                      Preview Mode
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-success-text)]">
                      Ready to export
                    </span>
                  </div>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--text-primary)]">
                    {invoiceNumber?.trim() || "New Invoice"}
                  </h1>
                </div>
              </div>
            </MotionReveal>

            {/* Profile Completion Prompt */}
            {showProfilePrompt && (
              <MotionReveal preset="fade-up" className="mb-8 print:hidden">
                <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[color:var(--color-lime-300)] bg-[color:var(--color-lime-50)] p-4 sm:flex-row sm:p-5">
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

            {/* Main Layout Grid: Invoice (Left) + Templates (Right) */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] print:block">
              {/* ─── Invoice Sheet (Left) ─── */}
              <div className="min-w-0">
                <MotionReveal
                  className="invoice-sheet w-full rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5 shadow-[var(--app-floating-shadow)] sm:px-7 sm:py-6 print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none"
                  preset="scale-in"
                  delay={10}
                >
                  <TemplateRenderer
                    formData={data}
                    templateId={selectedTemplate}
                  />
                </MotionReveal>
              </div>

              {/* ─── Vertical Template Picker (Right Sidebar) ─── */}
              <aside className="print:hidden">
                <div className="sticky top-24 h-[calc(100vh-160px)] overflow-y-auto pr-2 scrollbar-hide">
                  <MotionReveal preset="fade-up" delay={20}>
                    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-[var(--app-floating-shadow)]">
                      <TemplatePicker
                        selectedId={selectedTemplate}
                        onSelect={setSelectedTemplate}
                        userTier="free"
                        layout="vertical"
                      />
                    </div>
                  </MotionReveal>

                  <div className="mt-4 rounded-xl bg-[color:var(--bg-surface-muted)] p-4 text-center">
                    <p className="text-[11px] leading-relaxed text-[color:var(--text-muted)]">
                      Pro templates come with premium layout options and zero
                      branding.
                    </p>
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
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Cloud Save Failed (Saved Locally)
                </span>
              ) : (
                <span className="text-xs text-[color:var(--text-muted)]">
                  Draft unsaved
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className={getAppButtonClass({
                  variant: "secondary",
                  size: "md",
                })}
              >
                <SaveIcon className="h-4 w-4" />
                Save Draft
              </button>
              {cloudInvoiceId && (
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-green-600 uppercase tracking-tight">Sync Active</span>
                  <span className="text-[8px] font-mono text-[color:var(--text-muted)]">
                    {cloudInvoiceId.slice(0, 8)}
                  </span>
                </div>
              )}

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

              <MotionButton
                type="button"
                onClick={handleDownloadPdf}
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
                disabled={isSavingAndSharing}
                onClick={handleShareClick}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-[var(--app-radius-button)] font-bold tracking-[-0.01em] text-[13px] h-10 px-6 transition-all duration-100 active:scale-[0.97]",
                  isSavingAndSharing
                    ? "bg-[color:var(--bg-surface-muted)] text-[color:var(--text-muted)] cursor-not-allowed opacity-80 border border-[color:var(--border-subtle)]"
                    : "bg-[#bfff00] text-black cursor-pointer hover:bg-[#bfff00]/90 shadow-sm border border-[#bfff00] active:bg-[#9acc00]"
                )}
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
          onClose={() => setShowShareModal(false)}
          onShared={(token) => setShareToken(token)}
        />
      )}

      <ConversionModal
        isOpen={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        onLoginClick={handleLoginClick}
      />

      <UploadToast message={toastMessage} visible={showToast} />
    </>
  );
}
