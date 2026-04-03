/*
 * LEGACY TYPE NOTICE
 * ------------------
 * This document schema supports the legacy `/create` wizard only.
 * The canonical product domain is invoice-first and lives in `types/invoice.ts`.
 */

export type ProjectPreset =
  | "logo-design"
  | "social-media-design"
  | "ui-ux-design"
  | "illustration"
  | "photography"
  | "video-editing";

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

export interface ExtractedDocumentData {
  clientName: string;
  projectType: ProjectPreset | "";
  deliverables: string[];
  timeline: string;
  revisions: string;
  fee: string;
  gstApplicable: boolean;
  notes: string;
  exclusions: string[];
}

export interface DocumentFormState {
  projectPreset: ProjectPreset | "";
  rawBrief: string;
  extractedData: ExtractedDocumentData;
  licensing: LicensingData;
}
