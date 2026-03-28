export type LicenseType =
  | "full-assignment"
  | "exclusive-license"
  | "non-exclusive-license";

export type YesNo = "yes" | "no";

export interface LicensingData {
  licenseType: LicenseType | "";
  duration: string;
  territory: string;
  usageMedium: string;
  sourceFilesIncluded: YesNo | "";
  portfolioRightsRetained: YesNo | "";
}