"use client";

import type { ProjectPreset } from "@/types/document";

interface ProjectPresetStepProps {
  value: ProjectPreset | "";
  onChange: (value: ProjectPreset) => void;
}

const options: { label: string; value: ProjectPreset }[] = [
  { label: "Logo Design", value: "logo-design" },
  { label: "Social Media", value: "social-media-design" },
  { label: "UI/UX", value: "ui-ux-design" },
  { label: "Illustration", value: "illustration" },
  { label: "Photography", value: "photography" },
  { label: "Video Editing", value: "video-editing" },
];

export default function ProjectPresetStep({
  value,
  onChange,
}: ProjectPresetStepProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-black">Choose Project Type</h3>
      <p className="mt-2 text-sm text-gray-600">
        Select the kind of freelance work you are creating documents for.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isSelected
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-black hover:border-black"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}