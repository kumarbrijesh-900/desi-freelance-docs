"use client";

import { getAppFieldClass, getAppPanelClass } from "@/lib/ui-foundation";
import type { ExtractedDocumentData } from "@/types/document";

interface ReviewStepProps {
  value: ExtractedDocumentData;
  onChange: (value: ExtractedDocumentData) => void;
}

export default function ReviewStep({
  value,
  onChange,
}: ReviewStepProps) {
  const updateField = <K extends keyof ExtractedDocumentData>(
    key: K,
    fieldValue: ExtractedDocumentData[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  return (
    <div className={getAppPanelClass()}>
      <h3 className="text-xl font-semibold text-black">Review Extracted Details</h3>
      <p className="mt-2 text-sm text-gray-600">
        Check and edit the extracted information before generating documents.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Client name
          </label>
          <input
            type="text"
            value={value.clientName}
            onChange={(e) => updateField("clientName", e.target.value)}
            className={getAppFieldClass({ hasValue: Boolean(value.clientName) })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Timeline
          </label>
          <input
            type="text"
            value={value.timeline}
            onChange={(e) => updateField("timeline", e.target.value)}
            className={getAppFieldClass({ hasValue: Boolean(value.timeline) })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Revisions
          </label>
          <input
            type="text"
            value={value.revisions}
            onChange={(e) => updateField("revisions", e.target.value)}
            className={getAppFieldClass({ hasValue: Boolean(value.revisions) })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Fee
          </label>
          <input
            type="text"
            value={value.fee}
            onChange={(e) => updateField("fee", e.target.value)}
            className={getAppFieldClass({ hasValue: Boolean(value.fee) })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Notes
          </label>
          <textarea
            value={value.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className={`min-h-[120px] ${getAppFieldClass({
              multiline: true,
              hasValue: Boolean(value.notes),
            })}`}
          />
        </div>
      </div>
    </div>
  );
}
