"use client";

import type { InvoiceStepperStep } from "@/types/invoice";

interface AutofillSummaryModalProps {
  filledFields: string[];
  aiFilledFields: string[];
  reviewFields: string[];
  lowConfidenceFields: string[];
  missingFields: string[];
  recommendedStep: InvoiceStepperStep;
  onClose: () => void;
  onContinue: () => void;
  onJumpToMissing: () => void;
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
      return "Totals & Taxes";
    default:
      return "Invoice";
  }
}

export default function AutofillSummaryModal({
  filledFields,
  aiFilledFields,
  reviewFields,
  lowConfidenceFields,
  missingFields,
  recommendedStep,
  onClose,
  onContinue,
  onJumpToMissing,
}: AutofillSummaryModalProps) {
  const parserFilledFields = filledFields.filter(
    (field) => !aiFilledFields.includes(field)
  );

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
              Autofill Summary
            </p>
            <h2 className="mt-1 text-2xl font-bold text-black">
              Review extracted invoice details
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              We filled high- and medium-confidence matches from AI and the
              fallback parser, and held back low-confidence matches for review.
              Recommended next stop:{" "}
              <span className="font-medium text-black">
                {getStepLabel(recommendedStep)}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-black hover:border-black"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-950">
              Filled fields
            </p>
            {filledFields.length > 0 ? (
              <div className="mt-3 space-y-4 text-sm leading-6 text-emerald-950">
                {aiFilledFields.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900/80">
                      AI-filled
                    </p>
                    <ul className="mt-2 space-y-2">
                      {aiFilledFields.map((field) => (
                        <li key={`ai-${field}`}>{field}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {parserFilledFields.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900/80">
                      Parser-filled
                    </p>
                    <ul className="mt-2 space-y-2">
                      {parserFilledFields.map((field) => (
                        <li key={`parser-${field}`}>{field}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                No confident matches were autofilled from this brief yet.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Still missing
            </p>
            {missingFields.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-amber-900/80">
                No required fields are currently missing from validation.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-black">
              Review closely
            </p>
            {reviewFields.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                {reviewFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                No medium-confidence fields need extra attention right now.
              </p>
            )}

            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-black">
                Low-confidence matches
              </p>
              {lowConfidenceFields.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                  {lowConfidenceFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  No low-confidence fields were held back from autofill.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {missingFields.length > 0 ? (
            <button
              type="button"
              onClick={onJumpToMissing}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-black hover:border-black"
            >
              Jump to Missing Fields
            </button>
          ) : null}

          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white"
          >
            Review & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
