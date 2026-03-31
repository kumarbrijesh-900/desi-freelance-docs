"use client";

import type {
  BriefClarificationAction,
  BriefAutofillFieldSummary,
  BriefClarificationSuggestion,
} from "@/lib/invoice-brief-intake";
import type { InvoiceStepperStep } from "@/types/invoice";

interface AutofillSummaryModalProps {
  confidentFields: BriefAutofillFieldSummary[];
  inferredFields: BriefAutofillFieldSummary[];
  lowConfidenceFields: BriefAutofillFieldSummary[];
  clarificationSuggestions: BriefClarificationSuggestion[];
  missingFieldGroups: Array<{
    step: InvoiceStepperStep;
    fields: string[];
  }>;
  recommendedStep: InvoiceStepperStep;
  onClarificationAnswer: (
    suggestionId: string,
    action: BriefClarificationAction
  ) => void;
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

function getOriginLabel(origin: BriefAutofillFieldSummary["origin"]) {
  return origin === "ai" ? "AI" : "Parser";
}

function FieldList({
  fields,
}: {
  fields: BriefAutofillFieldSummary[];
}) {
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-800">
      {fields.map((field) => (
        <li
          key={`${field.step}-${field.label}-${field.origin}-${field.confidence}`}
          className="flex items-start justify-between gap-3"
        >
          <span>{field.label}</span>
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
            {getOriginLabel(field.origin)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AutofillSummaryModal({
  confidentFields,
  inferredFields,
  lowConfidenceFields,
  clarificationSuggestions,
  missingFieldGroups,
  recommendedStep,
  onClarificationAnswer,
  onClose,
  onContinue,
  onJumpToMissing,
}: AutofillSummaryModalProps) {
  const missingFieldsCount = missingFieldGroups.reduce(
    (count, group) => count + group.fields.length,
    0
  );

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/35 px-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 border-b border-gray-200 p-6">
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
                fallback parser, and held back low-confidence matches for
                review. Recommended next stop:{" "}
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
              <p className="text-sm font-semibold text-black">
                Needs confirmation
              </p>
              {clarificationSuggestions.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {clarificationSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-black">
                            {suggestion.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-gray-700">
                            {suggestion.message}
                          </p>
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">
                            Review in {getStepLabel(suggestion.step)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {suggestion.options.map((option) => (
                          <button
                            key={`${suggestion.id}-${option.id}`}
                            type="button"
                            onClick={() =>
                              onClarificationAnswer(
                                suggestion.id,
                                option.action
                              )
                            }
                            className="rounded-full border border-gray-300 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-black transition hover:border-black hover:bg-white"
                          >
                            <span>{option.label}</span>
                            {option.helper ? (
                              <span className="mt-1 block text-xs font-normal leading-5 text-gray-600">
                                {option.helper}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  No extra clarification prompts are needed right now.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-950">
                Confidently filled
              </p>
              {confidentFields.length > 0 ? (
                <FieldList fields={confidentFields} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                  No confident matches were autofilled from this brief yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">
                Inferred and autofilled
              </p>
              {inferredFields.length > 0 ? (
                <FieldList fields={inferredFields} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-amber-900/80">
                  No medium-confidence inferred fields were applied.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-black">
                Low-confidence matches
              </p>
              {lowConfidenceFields.length > 0 ? (
                <FieldList fields={lowConfidenceFields} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  No low-confidence fields were held back from autofill.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">
                Missing required fields
              </p>
              {missingFieldGroups.length > 0 ? (
                <div className="mt-3 space-y-4">
                  {missingFieldGroups.map((group) => (
                    <div key={group.step}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {getStepLabel(group.step)}
                      </p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-900">
                        {group.fields.map((field) => (
                          <li key={`${group.step}-${field}`}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  No required fields are currently missing from validation.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-wrap justify-end gap-3">
            {missingFieldsCount > 0 ? (
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
    </div>
  );
}
