import type { ExtractedDocumentData, ProjectPreset } from "@/types/document";

interface ExtractApiResponse {
  clientName: string;
  projectType: string;
  deliverables: string[];
  timeline: string;
  revisions: string;
  fee: string;
  gstApplicable: boolean;
  notes: string;
  exclusions: string[];
}

export async function extractDocumentData(
  rawBrief: string,
  projectPreset: ProjectPreset | ""
): Promise<ExtractedDocumentData> {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rawBrief,
      projectPreset,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to extract document data.");
  }

  const data: ExtractApiResponse = await response.json();

  return {
    clientName: data.clientName ?? "",
    projectType: (data.projectType as ProjectPreset | "") ?? "",
    deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
    timeline: data.timeline ?? "",
    revisions: data.revisions ?? "",
    fee: data.fee ?? "",
    gstApplicable: Boolean(data.gstApplicable),
    notes: data.notes ?? "",
    exclusions: Array.isArray(data.exclusions) ? data.exclusions : [],
  };
}