"use client";

import AppSelectField from "@/components/ui/AppSelectField";
import ChoiceCards from "@/components/ui/ChoiceCards";
import { getLicensingSummary } from "@/lib/licensing-summary";
import { cn, getAppFieldClass, getAppPanelClass } from "@/lib/ui-foundation";
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

  const licensingSummary = getLicensingSummary(value);

  return (
    <div className={getAppPanelClass()}>
      <h3 className="text-xl font-semibold text-black">Licensing</h3>
      <p className="mt-2 text-sm text-gray-600">
        Set the usage rights for this project.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            License type
          </label>

          <ChoiceCards
            name="licensing-type"
            value={value.licenseType}
            onChange={(nextValue) => updateField("licenseType", nextValue as LicenseType)}
            variant="cards"
            columns={2}
            options={licenseOptions}
          />

          <div className={cn(getAppPanelClass("muted"), "mt-3 p-4")}>
            <p className="text-sm font-medium text-black">Licensing summary</p>
            <p className="mt-2 text-sm text-gray-600">{licensingSummary}</p>
          </div>
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
            className={getAppFieldClass({ hasValue: Boolean(value.duration) })}
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
            className={getAppFieldClass({ hasValue: Boolean(value.territory) })}
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
            className={getAppFieldClass({ hasValue: Boolean(value.usageMedium) })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Source files included
          </label>
          <AppSelectField
            value={value.sourceFilesIncluded}
            onChange={(e) =>
              updateField("sourceFilesIncluded", e.target.value as YesNo)
            }
            hasValue={Boolean(value.sourceFilesIncluded)}
          >
            <option value="">Select option</option>
            {yesNoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AppSelectField>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Portfolio rights retained
          </label>
          <AppSelectField
            value={value.portfolioRightsRetained}
            onChange={(e) =>
              updateField("portfolioRightsRetained", e.target.value as YesNo)
            }
            hasValue={Boolean(value.portfolioRightsRetained)}
          >
            <option value="">Select option</option>
            {yesNoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AppSelectField>
        </div>
      </div>
    </div>
  );
}
