"use client";

import type { ProjectPreset } from "@/types/document";

interface ProjectPresetStepProps {
  value: ProjectPreset | "";
  onChange: (value: ProjectPreset) => void;
}

const presets: { label: string; value: ProjectPreset }[] = [
  { label: "Logo Design", value: "logo-design" },
  { label: "Social Media Design", value: "social-media-design" },
  { label: "UI/UX Design", value: "ui-ux-design" },
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
        Pick the type of work you are creating documents for.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {presets.map((preset) => {
          const isSelected = value === preset.value;

          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black hover:border-gray-400"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}