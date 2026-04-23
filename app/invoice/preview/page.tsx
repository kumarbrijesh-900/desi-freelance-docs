"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TemplatePicker from "@/components/invoice/TemplatePicker";
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
import {
  mergeInvoiceFormData,
  type InvoiceFormData,
} from "@/types/invoice";
import { getAppButtonClass } from "@/lib/ui-foundation";
import { playInteractionCue } from "@/lib/interaction-feedback";
import { saveInvoice, getCurrentUserId } from "@/lib/supabase/invoices";
import type { InvoiceStatus, MsaResponse } from "@/lib/supabase/invoices";
import ShareLinkModal from "@/components/invoice/ShareLinkModal";

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
  const router = useRouter();
  const [data, setData] = useState<InvoiceFormData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "cloud-saved">("idle");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [cloudInvoiceId, setCloudInvoiceId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_TEMPLATE_ID);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [currentMsaId, setCurrentMsaId] = useState<string | null>(null);
  const [msaResponse, setMsaResponse] = useState<MsaResponse>("pending");
  const defaultTitleRef = useRef<string>("");
  const exportTitleRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(mergeInvoiceFormData(JSON.parse(raw)));
      }
    } catch (error) {
      console.error("Failed to read preview data:", error);
    } finally {
      setIsReady(true);
    }
  }, []);

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

  const persistDraft = () => {
    if (!data) return false;

    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData: data,
          currentStep: "totals",
          savedAt: new Date().toISOString(),
        })
      );

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
      router.push(`/login?next=${encodeURIComponent("/invoice/preview?restore=1")}`);
      return;
    }
    window.print();
  };

  const handleBackToEdit = () => {
    persistDraft();
  };

  const handleSaveDraft = async () => {
    if (!data) return;
    setSaveState("saving");

    // Always persist to localStorage as offline fallback
    persistDraft();

    // Attempt cloud save for authenticated users
    const userId = await getCurrentUserId();
    if (userId) {
      const { data: saved, error } = await saveInvoice({
        formData: data,
        status: "draft" as InvoiceStatus,
        templateId: selectedTemplate,
        existingId: cloudInvoiceId ?? undefined,
      });

      if (!error && saved) {
        setCloudInvoiceId(saved.id);
        setSaveState("cloud-saved");
        playInteractionCue("saveSuccess");
        return;
      }
      // Fall through to local-only save on error
      console.warn("Cloud save failed, using local storage:", error);
    } else {
      // Redirect to login if not authenticated
      router.push(`/login?next=${encodeURIComponent("/invoice/preview?restore=1")}`);
      return;
    }

    setSaveState("saved");
    playInteractionCue("saveSuccess");
  };

  const handleDownloadPdf = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      persistDraft();
      router.push(`/login?next=${encodeURIComponent("/invoice/preview?restore=1")}`);
      return;
    }

    setIsExportingPdf(true);
    exportTitleRef.current = pdfTitle;
    document.title = pdfTitle;

    // Finalize to Supabase for authenticated users
    if (data) {
      const { data: saved } = await saveInvoice({
        formData: data,
        status: "finalized" as InvoiceStatus,
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
                <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Invoice Preview</h1>
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
                  No invoice data found. Go back to the editor and click Preview
                  Invoice again.
                </p>

                <div className="mt-6">
                  <Link
                    href="/invoice/new"
                    className={getAppButtonClass({ variant: "secondary", size: "sm" })}
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
                <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Invoice Preview</h1>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
                  This international invoice still needs an explicit export tax
                  choice in Totals &amp; Taxes before preview or PDF export.
                </p>

                <div className="mt-6">
                  <Link
                    href="/invoice/new"
                    onClick={handleBackToEdit}
                    className={getAppButtonClass({ variant: "secondary", size: "sm" })}
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

      <main className={`${appPageShellClass} print:bg-white print:p-0`}>
        <section className={`${appPageContainerClass} py-5 sm:py-8 print:px-0 print:py-0`}>
        <div className={`${appGridClass} print:block`}>
        <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
        <MotionReveal className="mb-5 print:hidden" preset="fade-up">
          <div
            data-testid="invoice-preview-toolbar"
            className={`${appCardClass} border-[color:var(--border-default)] px-5 py-3.5 sm:px-5`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--state-info-border)] bg-[color:var(--state-info-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-info-text)]">
                    <DocumentSparkIcon className="h-4 w-4" />
                    Preview & Download
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-success-text)]">
                    Ready to export
                  </span>
                  {saveState === "saving" ? (
                    <span className="inline-flex items-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Saving…
                    </span>
                  ) : saveState === "cloud-saved" ? (
                    <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-success-text)]">
                      ☁ Saved to cloud
                    </span>
                  ) : saveState === "saved" ? (
                    <span className="inline-flex items-center rounded-full border border-[color:var(--state-info-border)] bg-[color:var(--state-info-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-info-text)]">
                      Draft saved locally
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
                  {invoiceNumber?.trim() || "Invoice Preview"}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
                  Review, save a draft, or export a clean PDF for delivery.
                </p>
              </div>

              <MotionStagger className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
                <Link
                  href="/invoice/new"
                  onClick={handleBackToEdit}
                  className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChevronLeftIcon className="h-4 w-4" />
                    Back to Edit
                  </span>
                </Link>

                <MotionButton
                  type="button"
                  onClick={handleSaveDraft}
                  className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                >
                  <SaveIcon className="h-4 w-4" />
                  Save Draft
                </MotionButton>

                {/* Hiding Share for now as requested
                <MotionButton
                  type="button"
                  onClick={async () => {
                    const userId = await getCurrentUserId();
                    if (!userId) {
                      persistDraft();
                      router.push(`/login?next=${encodeURIComponent("/invoice/preview?restore=1")}`);
                      return;
                    }
                    setShowShareModal(true);
                  }}
                  className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                  title={!cloudInvoiceId ? "Save the invoice first to share" : "Share invoice link"}
                >
                  <ShareIcon className="h-4 w-4" />
                  Share
                </MotionButton>
                */}

                <MotionButton
                  type="button"
                  onClick={handlePrint}
                  className={getAppButtonClass({ variant: "tertiary", size: "sm" })}
                >
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </MotionButton>

                <SuccessPulse active={!isExportingPdf}>
                  <MotionButton
                    type="button"
                    onClick={handleDownloadPdf}
                    className={getAppButtonClass({ variant: "primary", size: "sm" })}
                  >
                    <DownloadIcon className="h-4 w-4" />
                    {isExportingPdf ? "Preparing PDF..." : "Export PDF"}
                  </MotionButton>
                </SuccessPulse>
              </MotionStagger>
            </div>
          </div>
        </MotionReveal>

        {/* ─── Template Picker — Inline above invoice ──── */}
        <MotionReveal className="mb-4 print:hidden" preset="fade-up" delay={15}>
          <div className="mx-auto w-full max-w-[210mm]">
            <div className="rounded-lg border border-[color:var(--border-default)] bg-white p-2.5 shadow-[var(--app-floating-shadow)]">
              <TemplatePicker
                selectedId={selectedTemplate}
                onSelect={setSelectedTemplate}
                userTier="free"
                layout="horizontal"
              />
            </div>
          </div>
        </MotionReveal>

        {/* ─── Invoice Sheet ──────────────────────────── */}
        <MotionReveal
          className="invoice-sheet mx-auto w-full max-w-[210mm] rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5 shadow-[var(--app-floating-shadow)] sm:px-7 sm:py-6 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none"
          preset="scale-in"
          delay={35}
        >
          <TemplateRenderer formData={data} templateId={selectedTemplate} />
        </MotionReveal>
        </div>
        </div>
        </section>
      </main>

      {showShareModal && cloudInvoiceId && (
        <ShareLinkModal
          invoiceId={cloudInvoiceId}
          existingToken={shareToken}
          clientEmail={data?.client?.clientEmail || ""}
          currentMsaId={currentMsaId}
          msaResponse={msaResponse}
          onClose={() => setShowShareModal(false)}
          onShared={(token) => setShareToken(token)}
        />
      )}
    </>
  );
}
