export type CommercialPricingMode =
  | "fixed-fee"
  | "per-unit"
  | "bundled-project-fee"
  | "monthly-retainer"
  | "budget-only"
  | "unknown";

export type InferredCommercialTerms = {
  pricingMode: CommercialPricingMode;
  paymentTerms: string;
  dueDays: number | null;
  dueDate: string;
  advancePercent: number | null;
  balanceCondition: string;
  confidence: "high" | "medium" | "low";
  unresolved: string[];
};

function clean(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseIsoDate(value?: string | null) {
  const cleaned = clean(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return null;
  }

  const parsed = new Date(`${cleaned}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addDaysToIsoDate(value: string, days: number) {
  const parsed = parseIsoDate(value);

  if (!parsed) {
    return "";
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function inferCommercialTermsFromText(
  text: string,
  options: { invoiceDate?: string | null } = {}
): InferredCommercialTerms {
  const normalized = clean(text);
  const netMatch = normalized.match(/\bnet[\s-]?(\d{1,3})\b/i);
  const remainingWithinMatch = normalized.match(
    /\b(?:remaining|balance)[^.\n]{0,40}\bwithin\s+(\d{1,3})\s+days?\s+of\s+invoice\b/i
  );
  const advanceMatch = normalized.match(/\b(\d{1,3})\s*%\s+advance\b/i);
  const balanceBeforeFinal = /\bbalance\b[^.\n]{0,60}\bbefore\s+(?:final|handover|delivery|files?)\b/i.test(
    normalized
  );
  const retainer = /\bmonthly\s+retainer\b|\bretainer\b/i.test(normalized);
  const fixedFee = /\b(?:fixed fee|project fee|total project fee|lump sum|flat fee)\b/i.test(
    normalized
  );
  const budgetOnly = /\bbudget\b/i.test(normalized) && !/\b(?:at|@|rate|fee)\b/i.test(normalized);
  const perUnit = /\bper\s+(?:screen|page|deliverable|item|post|video|image|hour|day|revision|concept)\b/i.test(
    normalized
  );

  const dueDays = netMatch
    ? Number(netMatch[1])
    : remainingWithinMatch
    ? Number(remainingWithinMatch[1])
    : null;
  const dueDate =
    dueDays && options.invoiceDate
      ? addDaysToIsoDate(options.invoiceDate, dueDays)
      : "";

  const paymentParts: string[] = [];

  if (netMatch) {
    paymentParts.push(`Net ${Number(netMatch[1])}`);
  } else if (/due on receipt/i.test(normalized)) {
    paymentParts.push("Due on receipt");
  }

  if (advanceMatch) {
    paymentParts.push(`${Number(advanceMatch[1])}% advance`);
  }

  if (balanceBeforeFinal) {
    paymentParts.push("balance before final delivery");
  } else if (remainingWithinMatch) {
    paymentParts.push(`balance within ${Number(remainingWithinMatch[1])} days of invoice`);
  }

  const pricingMode: CommercialPricingMode = retainer
    ? "monthly-retainer"
    : budgetOnly
    ? "budget-only"
    : fixedFee
    ? "bundled-project-fee"
    : perUnit
    ? "per-unit"
    : "unknown";

  return {
    pricingMode,
    paymentTerms: paymentParts.join(", "),
    dueDays,
    dueDate,
    advancePercent: advanceMatch ? Number(advanceMatch[1]) : null,
    balanceCondition: balanceBeforeFinal
      ? "before final delivery"
      : remainingWithinMatch
      ? `within ${Number(remainingWithinMatch[1])} days of invoice`
      : "",
    confidence: paymentParts.length > 0 || pricingMode !== "unknown" ? "medium" : "low",
    unresolved: budgetOnly ? ["pricing.budgetOnly"] : [],
  };
}
