"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import UploadToast from "@/components/ui/UploadToast";
import AgencyDetailsSection from "@/components/invoice/AgencyDetailsSection";
import ClientDetailsSection from "@/components/invoice/ClientDetailsSection";
import InvoiceMetaSection from "@/components/invoice/InvoiceMetaSection";
import DeliverablesSection from "@/components/invoice/DeliverablesSection";
import TotalsTaxesSection from "@/components/invoice/TotalsTaxesSection";
import TermsPaymentSection from "@/components/invoice/TermsPaymentSection";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import {
  getInvoiceFieldErrors,
  getInvoiceStepError,
  isInvoiceStepValid,
} from "@/lib/invoice-validation";
import {
  defaultInvoiceFormData,
  type InvoiceFormData,
  type InvoiceStepperStep,
} from "@/types/invoice";

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

function getDemoData(invoiceNumber: string) {
  const today = getTodayDateString();

  return {
    agency: {
      agencyName: "DesiFreelanceDocs Studio",
      address: "2nd Floor, 14 Residency Road, Bengaluru, Karnataka 560025",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      logoUrl: "/dummy-logo.svg",
    },
    client: {
      clientName: "Metro Shoes Pvt. Ltd.",
      clientAddress:
        "Phoenix Marketcity, Whitefield Main Road, Bengaluru 560048",
      clientGstin: "29AAACM8899L1Z2",
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
      accountName: "DesiFreelanceDocs Studio",
      accountNumber: "50200044321098",
      ifscCode: "HDFC0001122",
      qrCodeUrl: "/dummy-qr.svg",
    },
  };
}

function isFormTouched(formData: InvoiceFormData) {
  const hasAgencyData = Boolean(
    formData.agency.agencyName ||
      formData.agency.address ||
      formData.agency.gstin ||
      formData.agency.pan ||
      formData.agency.logoUrl
  );

  const hasClientData = Boolean(
    formData.client.clientName ||
      formData.client.clientAddress ||
      formData.client.clientGstin
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
      formData.payment.accountName ||
      formData.payment.accountNumber ||
      formData.payment.ifscCode ||
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-black">Leave invoice editor?</h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          You have unsaved progress. Choose{" "}
          <span className="font-medium text-black">Save Draft</span> to keep
          your work, or <span className="font-medium text-black">Skip</span> to
          leave without saving.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:border-black"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
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

function CompactJourneyStepper({
  steps,
  currentStep,
}: {
  steps: InvoiceStepperStep[];
  currentStep: InvoiceStepperStep;
}) {
  const currentIndex = steps.indexOf(currentStep);
  const progressPercent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="mt-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[700px] items-start gap-4">
          <div className="flex min-w-0 flex-1 items-start">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isActive = index === currentIndex;
              const isLast = index === steps.length - 1;

              return (
                <div
                  key={step}
                  className="flex min-w-0 flex-1"
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center">
                      <span
                        className={`relative z-10 flex shrink-0 items-center justify-center rounded-full transition-all ${
                          isCompleted
                            ? "h-4 w-4 border border-black bg-black text-white"
                            : isActive
                            ? "h-4.5 w-4.5 border border-black bg-white"
                            : "h-3.5 w-3.5 border border-gray-300 bg-white"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="text-[8px] font-semibold leading-none">✓</span>
                        ) : isActive ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-black" />
                        ) : (
                          <span className="h-1 w-1 rounded-full bg-gray-300" />
                        )}
                      </span>

                      {!isLast ? (
                        <div className="relative ml-2 h-px flex-1 bg-gray-200">
                          <div
                            className={`absolute left-0 top-0 h-px bg-black transition-all duration-300 ${
                              isCompleted
                                ? "w-full"
                                : isActive
                                ? "w-1/2"
                                : "w-0"
                            }`}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-2 pr-3">
                      <span
                        className={`block truncate text-[11px] font-medium leading-4 transition ${
                          isCompleted
                            ? "text-black"
                            : isActive
                            ? "text-black"
                            : "text-gray-500"
                        }`}
                      >
                        {getStepShortLabel(step)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400">
              Progress
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tight text-black">
              {Math.round(progressPercent)}%
            </p>
          </div>
        </div>
      </div>
    </div>
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

  const hasInitializedRef = useRef(false);
  const dueDateAutoManagedRef = useRef(true);
  const lastAutoDueDateRef = useRef("");

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
        const parsedDraft = JSON.parse(rawDraft) as StoredDraft;

        if (
          parsedDraft &&
          parsedDraft.formData &&
          parsedDraft.currentStep &&
          orderedSteps.includes(parsedDraft.currentStep)
        ) {
          const restoredSuggestedDueDate = getSuggestedDueDate(
            parsedDraft.formData.meta.paymentTerms,
            parsedDraft.formData.meta.invoiceDate
          );

          dueDateAutoManagedRef.current =
            !parsedDraft.formData.meta.dueDate ||
            parsedDraft.formData.meta.dueDate === restoredSuggestedDueDate;

          lastAutoDueDateRef.current = restoredSuggestedDueDate;

          frameId = window.requestAnimationFrame(() => {
            hasInitializedRef.current = true;
            setFormData(parsedDraft.formData);
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

  const fieldErrors = useMemo(
    () => getInvoiceFieldErrors(formData),
    [formData]
  );

  const computedTotals = calculateInvoiceTotals(formData.lineItems, formData.tax);

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
  };

  const goBack = () => {
    if (!isFirstStep) {
      setCurrentStep(orderedSteps[currentStepIndex - 1]);
    }
  };

  const handlePreviewInvoice = () => {
    try {
      window.localStorage.setItem(
        PREVIEW_STORAGE_KEY,
        JSON.stringify(formData)
      );
      triggerToast("Preview ready");
      window.open("/invoice/preview", "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to save preview data:", error);
      alert("Could not open preview. Please try again.");
    }
  };

  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData,
          currentStep,
          savedAt: new Date().toISOString(),
        } satisfies StoredDraft)
      );
      setShowExitModal(false);
      triggerToast("Draft saved");

      window.setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error("Failed to save draft:", error);
      alert("Could not save draft. Please try again.");
    }
  };

  const handleDownloadPdf = () => {
    alert("Download PDF will be connected after preview layout is ready.");
  };

  const handleCancel = () => {
    router.push("/");
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

    setFormData((prev) => ({
      ...prev,
      agency: demo.agency,
      client: demo.client,
      meta: demo.meta,
      lineItems: demo.lineItems,
      tax: demo.tax,
      payment: demo.payment,
    }));

    triggerToast("Demo data loaded");
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

  return (
    <main className="min-h-screen bg-gray-50">
      <UploadToast message={toastMessage} visible={showToast} />

      <AppHeader
        leftSlot={
          <button
            type="button"
            onClick={handleBackToHome}
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
          >
            ← Back to Home
          </button>
        }
        rightSlot={<LogoutButton />}
      />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="overflow-visible rounded-2xl border-2 border-gray-300 bg-white p-6 shadow-sm">
          <header className="mb-6 border-b border-gray-200 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  New Invoice
                </p>
                <h1 className="mt-1 text-2xl font-bold text-black">
                  {stepTitle}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Step {currentStepIndex + 1} of {orderedSteps.length}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadDemoData}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
              >
                Load Demo Data
              </button>
            </div>

            <div className="mt-4">
              <CompactJourneyStepper
                steps={orderedSteps}
                currentStep={currentStep}
              />
            </div>
          </header>

          <div className="overflow-visible">
            {currentStep === "agency" && (
              <AgencyDetailsSection
                value={formData.agency}
                onChange={(agency) =>
                  setFormData((prev) => ({
                    ...prev,
                    agency,
                  }))
                }
                errors={fieldErrors.agency}
              />
            )}

            {currentStep === "client" && (
              <ClientDetailsSection
                value={formData.client}
                onChange={(client) =>
                  setFormData((prev) => ({
                    ...prev,
                    client,
                  }))
                }
                errors={fieldErrors.client}
              />
            )}

            {currentStep === "deliverables" && (
              <DeliverablesSection
                value={formData.lineItems}
                onChange={(lineItems) =>
                  setFormData((prev) => ({
                    ...prev,
                    lineItems,
                  }))
                }
                errors={fieldErrors.lineItems}
              />
            )}

            {currentStep === "payment" && (
              <TermsPaymentSection
                value={formData.payment}
                meta={formData.meta}
                onChange={(payment) =>
                  setFormData((prev) => ({
                    ...prev,
                    payment,
                  }))
                }
                onMetaChange={handleMetaChange}
                paymentTermsError={fieldErrors.meta.paymentTerms}
                errors={fieldErrors.payment}
              />
            )}

            {currentStep === "meta" && (
              <InvoiceMetaSection
                value={formData.meta}
                onChange={handleMetaChange}
                errors={{
                  invoiceNumber: fieldErrors.meta.invoiceNumber,
                  invoiceDate: fieldErrors.meta.invoiceDate,
                  dueDate: fieldErrors.meta.dueDate,
                }}
              />
            )}

            {currentStep === "totals" && (
              <TotalsTaxesSection
                value={formData.tax}
                computed={computedTotals}
                onChange={(tax) =>
                  setFormData((prev) => ({
                    ...prev,
                    tax,
                  }))
                }
              />
            )}
          </div>

          {!currentStepValid && !isLastStep && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {currentStepError}
            </div>
          )}

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={isFirstStep}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {!isLastStep && (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!currentStepValid}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              )}
            </div>

            {isLastStep && (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handlePreviewInvoice}
                  className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white"
                >
                  PREVIEW INVOICE
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="rounded-xl border border-black px-6 py-3 text-sm font-bold text-black"
                >
                  DOWNLOAD PDF
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-bold text-black"
                >
                  SAVE DRAFT
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-sm font-medium text-gray-500 hover:text-black"
                >
                  Cancel
                </button>
              </div>
            )}
          </footer>
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
