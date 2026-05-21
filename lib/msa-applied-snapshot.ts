import type { InvoiceFormData } from "@/types/invoice";

const UNIT_NORMALIZE: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

const FALLBACK = {
  payment_terms_days: 20,
  late_fee_rate: 1.5,
  late_fee_unit: "month",
};

export interface AppliedMsaSnapshot {
  applied_payment_terms: string;   // e.g. "Net 11 days" or "Due on Receipt"
  applied_late_fee_rate: number;   // e.g. 1.4
  applied_late_fee_unit: string;   // singular: "day" | "week" | "month"
}

export function computeAppliedMsaSnapshot(
  formData: InvoiceFormData
): AppliedMsaSnapshot {
  const hasAddendum = Boolean(formData?.meta?.hasAddendum);
  const client = formData?.client ?? {};
  const agency = formData?.agency ?? {};

  // Per-field priority chain (not all-or-nothing per source):
  // 1. client.msa* if hasAddendum AND the specific field is set
  // 2. agency.msa* if set
  // 3. hardcoded fallback
  const pickDays = (): number => {
    if (hasAddendum && Number(client.msaPaymentTermsDays) > 0) return Number(client.msaPaymentTermsDays);
    if (Number(agency.msaPaymentTermsDays) > 0) return Number(agency.msaPaymentTermsDays);
    return FALLBACK.payment_terms_days;
  };

  const pickRate = (): number => {
    if (hasAddendum && Number(client.msaLateFeeRate) > 0) return Number(client.msaLateFeeRate);
    if (Number(agency.msaLateFeeRate) > 0) return Number(agency.msaLateFeeRate);
    return FALLBACK.late_fee_rate;
  };

  const pickUnit = (): string => {
    const raw = (hasAddendum && client.msaLateFeeUnit) || agency.msaLateFeeUnit || FALLBACK.late_fee_unit;
    return UNIT_NORMALIZE[raw] ?? raw;
  };

  const days = pickDays();
  return {
    applied_payment_terms: days > 0 ? `Net ${days} days` : "Due on Receipt",
    applied_late_fee_rate: pickRate(),
    applied_late_fee_unit: pickUnit(),
  };
}
