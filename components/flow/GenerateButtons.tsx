"use client";

interface GenerateButtonsProps {
  onGenerateInvoice: () => void;
  onGenerateScope: () => void;
}

export default function GenerateButtons({
  onGenerateInvoice,
  onGenerateScope,
}: GenerateButtonsProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-black">Generate Documents</h3>
      <p className="mt-2 text-sm text-gray-600">
        Create your document outputs from the details above.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onGenerateInvoice}
          className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
        >
          Generate Invoice
        </button>

        <button
          type="button"
          onClick={onGenerateScope}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-black hover:border-black"
        >
          Generate Scope
        </button>
      </div>
    </div>
  );
}