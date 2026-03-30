"use client";

import type { InvoiceStepperStep } from "@/types/invoice";

interface InvoiceStepperProps {
  currentStep: InvoiceStepperStep;
  onStepChange: (step: InvoiceStepperStep) => void;
}

const steps: { key: InvoiceStepperStep; label: string; short: string }[] = [
  { key: "agency", label: "Agency", short: "1" },
  { key: "client", label: "Client", short: "2" },
  { key: "deliverables", label: "Items", short: "3" },
  { key: "payment", label: "Payment", short: "4" },
  { key: "meta", label: "Meta", short: "5" },
  { key: "totals", label: "Totals", short: "6" },
];

export default function InvoiceStepper({
  currentStep,
  onStepChange,
}: InvoiceStepperProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-start">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = index < currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <div key={step.key} className="flex items-start">
                <button
                  type="button"
                  onClick={() => onStepChange(step.key)}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                      isCompleted
                        ? "border-black bg-black text-white"
                        : isActive
                        ? "border-black bg-white text-black shadow-sm"
                        : "border-gray-300 bg-white text-gray-500"
                    }`}
                  >
                    {isCompleted ? "✓" : step.short}
                  </div>

                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCompleted || isActive
                        ? "text-black"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {index < steps.length - 1 && (
                  <div className="mx-3 mt-5 h-[2px] w-14 rounded-full bg-gray-200">
                    <div
                      className={`h-[2px] rounded-full ${
                        isCompleted ? "w-full bg-black" : "w-0 bg-black"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Step <span className="font-semibold text-black">{currentIndex + 1}</span> of{" "}
        <span className="font-semibold text-black">{steps.length}</span>
      </div>
    </div>
  );
}