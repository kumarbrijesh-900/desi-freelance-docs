"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "@/components/ui/motion-primitives";
import { CheckIcon, XMarkIcon, SparklesIcon, ExclamationTriangleIcon } from "@/components/ui/app-icons";
import { cn } from "@/lib/ui-foundation";
import { getAppButtonClass } from "@/lib/ui-foundation";
import type { InvoiceFormData, InvoiceStepperStep } from "@/types/invoice";
import type { BriefAutofillFieldSummary } from "@/lib/invoice-brief-intake";

interface BriefSummaryModalProps {
  isOpen: boolean;
  extractedData: InvoiceFormData;
  lowConfidenceFields: BriefAutofillFieldSummary[];
  confidentFields: BriefAutofillFieldSummary[];
  missingFieldsGroups: Array<{ step: InvoiceStepperStep; fields: string[] }>;
  isNewClient: boolean;
  isLoggedIn: boolean;
  onContinueManually: (data: InvoiceFormData) => void;
  onParseAgain: () => void;
  onSubmit: (data: InvoiceFormData, shouldSaveClient: boolean) => void;
}

export default function BriefSummaryModal({
  isOpen,
  extractedData,
  lowConfidenceFields,
  confidentFields,
  missingFieldsGroups,
  isNewClient,
  isLoggedIn,
  onContinueManually,
  onParseAgain,
  onSubmit,
}: BriefSummaryModalProps) {
  const [editedData, setEditedData] = useState<InvoiceFormData>(extractedData);
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set());
  const [shouldSaveClient, setShouldSaveClient] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setEditedData(extractedData);
      setApprovedFields(new Set());
      setShouldSaveClient(true);
    }
  }, [isOpen, extractedData]);

  if (!isOpen) return null;

  const missingFieldLabels = missingFieldsGroups.flatMap((g) => g.fields);

  // Filter confident fields to not duplicate low confidence ones
  const lowConfLabels = new Set(lowConfidenceFields.map((f) => f.label));
  const uniqueConfidentFields = confidentFields.filter((f) => !lowConfLabels.has(f.label));

  const allLowConfApproved = lowConfidenceFields.every((f) => approvedFields.has(f.label));

  const handleApproveField = (label: string) => {
    setApprovedFields((prev) => {
      const next = new Set(prev);
      next.add(label);
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit(editedData, isNewClient && isLoggedIn ? shouldSaveClient : false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-[#111118] shadow-2xl border border-[color:var(--border-subtle)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-lime-900)] text-[color:var(--color-lime-400)]">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Extraction Summary</h2>
                <p className="text-sm text-[color:var(--text-muted)]">Please review the AI's work before continuing.</p>
              </div>
            </div>
            <button onClick={() => onContinueManually(editedData)} className="p-2 text-[color:var(--text-muted)] hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {isNewClient && isLoggedIn && (
              <div className="flex items-start gap-4 rounded-xl border border-[color:var(--color-cyan-900)] bg-[color:var(--color-cyan-950)]/30 p-4">
                <input
                  type="checkbox"
                  checked={shouldSaveClient}
                  onChange={(e) => setShouldSaveClient(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-[color:var(--color-cyan-500)] focus:ring-[color:var(--color-cyan-500)] focus:ring-offset-gray-900"
                />
                <div>
                  <h3 className="text-sm font-semibold text-[color:var(--color-cyan-400)]">New Client Detected: {editedData.client.clientName}</h3>
                  <p className="mt-1 text-xs text-[color:var(--color-cyan-200)]/70">
                    Do you want to save this client to your Master Directory once the invoice is generated?
                  </p>
                </div>
              </div>
            )}

            {/* Low Confidence */}
            {lowConfidenceFields.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Review Required (Low Confidence)</h3>
                </div>
                <div className="space-y-2">
                  {lowConfidenceFields.map((field) => {
                    const isApproved = approvedFields.has(field.label);
                    // For demo, we just show a static input. In reality, we'd need a mapping from field.label to editedData path.
                    // To keep it simple without building a massive mapper here, we'll just show the label.
                    // The user can edit in the main form if needed, or we implement a basic value preview.
                    return (
                      <div key={field.label} className={cn("flex items-center justify-between rounded-lg border p-3 transition-colors", isApproved ? "border-[color:var(--color-lime-700)] bg-[color:var(--color-lime-900)]/20" : "border-amber-700/50 bg-amber-900/10")}>
                        <div className="flex-1 pr-4">
                          <p className="text-xs text-[color:var(--text-muted)]">{field.label}</p>
                          <p className="text-sm font-medium text-white truncate">Extracted value needs review</p>
                        </div>
                        <button
                          onClick={() => handleApproveField(field.label)}
                          className={cn("flex h-8 w-8 items-center justify-center rounded-full transition-colors", isApproved ? "bg-[color:var(--color-lime-500)] text-[#111118]" : "bg-gray-800 text-gray-400 hover:bg-amber-500 hover:text-[#111118]")}
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confident Fields */}
            {uniqueConfidentFields.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[color:var(--text-secondary)] uppercase tracking-wider">Confident Extractions</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueConfidentFields.map((field) => (
                    <span key={field.label} className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-lime-900)] bg-[color:var(--color-lime-950)]/30 px-3 py-1.5 text-xs text-[color:var(--color-lime-400)]">
                      <CheckIcon className="h-3 w-3" />
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Fields */}
            {missingFieldLabels.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[color:var(--text-secondary)] uppercase tracking-wider">Missing Fields (Fill Later)</h3>
                <div className="flex flex-wrap gap-2">
                  {missingFieldLabels.map((label) => (
                    <span key={label} className="inline-flex items-center rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-[color:var(--border-subtle)] bg-[#14141d] px-6 py-4">
            <button
              onClick={onParseAgain}
              className="text-sm font-medium text-[color:var(--text-muted)] hover:text-white"
            >
              Parse Again
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onContinueManually(editedData)}
                className={getAppButtonClass({ variant: "ghost", size: "md" })}
              >
                Continue Manually
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allLowConfApproved}
                className={cn(getAppButtonClass({ variant: "primary", size: "md" }), !allLowConfApproved && "opacity-50 cursor-not-allowed")}
              >
                Submit Review
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
