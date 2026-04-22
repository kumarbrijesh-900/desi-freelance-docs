"use client";

import VoiceInputButton from "@/components/flow/VoiceInputButton";
import { getAppFieldClass, getAppPanelClass } from "@/lib/ui-foundation";

interface BriefInputStepProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BriefInputStep({
  value,
  onChange,
}: BriefInputStepProps) {
  return (
    <div className={getAppPanelClass()}>
      <h3 className="text-xl font-semibold text-black">Add Client Brief</h3>
      <p className="mt-2 text-sm text-gray-600">
        Paste, type, or speak the raw client brief below.
      </p>

      <div className="mt-4">
        <VoiceInputButton onTranscript={(text) => onChange(text)} />
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Need a logo for client named Metro Shoes, 2 revisions, delivery in 7 days, budget ₹15,000"
        className={`mt-4 ${getAppFieldClass({
          multiline: true,
          hasValue: Boolean(value),
        })} min-h-[160px]`}
      />
    </div>
  );
}
