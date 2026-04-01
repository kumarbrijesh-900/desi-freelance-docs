"use client";

import ChoiceCards from "@/components/ui/ChoiceCards";
import { getAppPanelClass } from "@/lib/ui-foundation";
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
    <div className={getAppPanelClass()}>
      <h3 className="text-xl font-semibold text-black">Choose Project Type</h3>
      <p className="mt-2 text-sm text-gray-600">
        Select the kind of freelance work you are creating documents for.
      </p>

      <div className="mt-4">
        <ChoiceCards
          name="project-preset"
          value={value}
          onChange={(nextValue) => onChange(nextValue as ProjectPreset)}
          variant="cards"
          columns={2}
          options={options}
        />
      </div>
    </div>
  );
}
