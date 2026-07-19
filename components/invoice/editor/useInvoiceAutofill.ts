import { useState } from "react";
import type { InvoiceFormData } from "@/types/invoice";
import type { BriefAutofillFieldSummary } from "@/lib/invoice-brief-intake";
import type {
  NormalizedBriefMilestone,
  BriefParserProvider,
} from "@/lib/brief-parser-gateway";

export function useInvoiceAutofill() {
  const [briefSummaryData, setBriefSummaryData] = useState<{
    nextFormData: InvoiceFormData;
    lowConfidence: BriefAutofillFieldSummary[];
    confident: BriefAutofillFieldSummary[];
    isNewClient: boolean;
    parsedMilestones: NormalizedBriefMilestone[];
    providerUsed: BriefParserProvider | null;
  } | null>(null);

  const [postSubmitActionModal, setPostSubmitActionModal] = useState<{
    isOpen: boolean;
    isReady: boolean;
  } | null>(null);

  const [extractProgress, setExtractProgress] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const markFieldsAutoFilled = (fieldPaths: string[]) => {
    setAutoFilledFields(prev => {
      const next = new Set(prev);
      fieldPaths.forEach(f => next.add(f));
      return next;
    });
  };

  const markFieldManual = (fieldPath: string) => {
    setAutoFilledFields(prev => {
      if (!prev.has(fieldPath)) return prev;
      const next = new Set(prev);
      next.delete(fieldPath);
      return next;
    });
  };

  return {
    briefSummaryData,
    setBriefSummaryData,
    postSubmitActionModal,
    setPostSubmitActionModal,
    extractProgress,
    setExtractProgress,
    autoFilledFields,
    setAutoFilledFields,
    markFieldsAutoFilled,
    markFieldManual,
  };
}
