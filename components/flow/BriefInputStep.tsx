"use client";

import VoiceInputButton from "@/components/flow/VoiceInputButton";

interface BriefInputStepProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BriefInputStep({
  value,
  onChange,
}: BriefInputStepProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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
        className="mt-4 min-h-[160px] w-full rounded-xl border border-gray-300 p-4 text-sm text-black outline-none focus:border-black"
      />
    </div>
  );
}