/**
 * Types-only husk. The legacy heuristic extraction pipeline that lived here
 * (runBriefAutofill + ~4,800 lines of parsers and inference) was retired on
 * 2026-07-06 and archived at _archived/legacy-extraction/invoice-brief-intake.ts.
 *
 * Live extraction is the Supabase `parse-brief` edge function, consumed via
 * lib/brief-parser-gateway.ts + lib/invoice-parsed-extraction-hydration.ts.
 */
import type { InvoiceStepperStep } from "@/types/invoice";

export type BriefExtractionConfidence = "high" | "medium" | "low";

export type BriefExtractionSource =
  | "label"
  | "regex"
  | "pattern"
  | "inference"
  | "ai";

export type BriefAutofillFieldSummary = {
  label: string;
  fieldPath?: string;
  step: InvoiceStepperStep;
  confidence: BriefExtractionConfidence;
  source: BriefExtractionSource;
  origin: "ai" | "parser";
};

export type BriefIntakeInput = {
  text: string;
  ocrText?: string;
  imageFiles?: File[];
  voiceTranscript?: string;
};
