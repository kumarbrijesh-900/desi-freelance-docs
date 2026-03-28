import type { LicensingData } from "@/types/document";

export function getLicensingSummary(licensing: LicensingData): string {
  if (!licensing.licenseType) {
    return "No licensing terms selected yet.";
  }

  const licenseLabelMap: Record<string, string> = {
    "full-assignment": "a full assignment",
    "exclusive-license": "an exclusive license",
    "non-exclusive-license": "a non-exclusive license",
  };

  const licenseLabel = licenseLabelMap[licensing.licenseType] ?? "a license";

  const duration = licensing.duration || "an unspecified duration";
  const territory = licensing.territory || "an unspecified territory";
  const usageMedium = licensing.usageMedium || "general usage";

  const sourceFilesText =
    licensing.sourceFilesIncluded === "yes"
      ? "Source files are included."
      : licensing.sourceFilesIncluded === "no"
      ? "Source files are not included."
      : "Source files inclusion is not specified.";

  const portfolioText =
    licensing.portfolioRightsRetained === "yes"
      ? "The freelancer retains the right to showcase the final work in their portfolio."
      : licensing.portfolioRightsRetained === "no"
      ? "The freelancer does not retain portfolio showcase rights."
      : "Portfolio showcase rights are not specified.";

  return `Client receives ${licenseLabel} for ${usageMedium} in ${territory} for ${duration}. ${sourceFilesText} ${portfolioText}`;
}