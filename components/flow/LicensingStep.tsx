"use client";

import type { LicensingData, LicenseType, YesNo } from "@/types/document";

interface LicensingStepProps {
  value: LicensingData;
  onChange: (value: LicensingData) => void;
}

const licenseOptions: { label: string; value: LicenseType }[] = [
  { label: "Full assignment", value: "full-assignment" },
  { label: "Exclusive license", value: "exclusive-license" },
  { label: "Non-exclusive license", value: "non-exclusive-license" },
];

const yesNoOptions: { label: string; value: YesNo }[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

export default function LicensingStep({
  value,
  onChange,
}: LicensingStepProps) {
  const updateField = <K extends keyof LicensingData>(
    key: K,
    fieldValue: LicensingData[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-black">Licensing</h3>
      <p className="mt-2 text-sm text-gray-600">
        Set the usage rights for this project.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            License type
          </label>
          <select
            value={value.licenseType}
            onChange={(e) =>
              updateField("licenseType", e.target.value as LicenseType)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-3 pr-10 text-sm text-black outline-none focus:border-black"
          >
            <option value="">Select license type</option>
            {licenseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Duration
          </label>
          <input
            type="text"
            value={value.duration}
            onChange={(e) => updateField("duration", e.target.value)}
            placeholder="Example: 12 months"
            className="w-full rounded-xl border border-gray-300 p-3 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Territory
          </label>
          <input
            type="text"
            value={value.territory}
            onChange={(e) => updateField("territory", e.target.value)}
            placeholder="Example: India"
            className="w-full rounded-xl border border-gray-300 p-3 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Usage medium
          </label>
          <input
            type="text"
            value={value.usageMedium}
            onChange={(e) => updateField("usageMedium", e.target.value)}
            placeholder="Example: Social media and digital ads"
            className="w-full rounded-xl border border-gray-300 p-3 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Source files included
          </label>
          <select
            value={value.sourceFilesIncluded}
            onChange={(e) =>
              updateField("sourceFilesIncluded", e.target.value as YesNo)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-3 pr-10 text-sm text-black outline-none focus:border-black"
          >
            <option value="">Select option</option>
            {yesNoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Portfolio rights retained
          </label>
          <select
            value={value.portfolioRightsRetained}
            onChange={(e) =>
              updateField("portfolioRightsRetained", e.target.value as YesNo)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-3 pr-10 text-sm text-black outline-none focus:border-black"
          >
            <option value="">Select option</option>
            {yesNoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}