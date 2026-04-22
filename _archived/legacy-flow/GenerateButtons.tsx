"use client";

import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";

interface GenerateButtonsProps {
  onGenerateInvoice: () => void;
  onGenerateScope: () => void;
}

export default function GenerateButtons({
  onGenerateInvoice,
  onGenerateScope,
}: GenerateButtonsProps) {
  return (
    <div className={getAppPanelClass()}>
      <h3 className="text-xl font-semibold text-black">Generate Documents</h3>
      <p className="mt-2 text-sm text-gray-600">
        Create your document outputs from the details above.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onGenerateInvoice}
          className={getAppButtonClass({
            variant: "primary",
            size: "lg",
          })}
        >
          Generate Invoice
        </button>

        <button
          type="button"
          onClick={onGenerateScope}
          className={getAppButtonClass({
            variant: "secondary",
            size: "lg",
          })}
        >
          Generate Scope
        </button>
      </div>
    </div>
  );
}
