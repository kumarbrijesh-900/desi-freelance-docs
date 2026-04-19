import { normalizeInvoiceLineItemType } from "@/lib/invoice-line-item-catalog";
import { resolveLineItemSacCode } from "@/lib/invoice-sac";
import type {
  InvoiceLineItemType,
  InvoiceRateUnit,
} from "@/types/invoice";

export type InferredDeliverableLine = {
  type: InvoiceLineItemType;
  description: string;
  quantity: number | null;
  rate: number | null;
  unit: InvoiceRateUnit;
  sacCode: string;
  confidence: "high" | "medium" | "low";
  pricingSignal: "rate" | "budget" | "none";
};

const amountPattern =
  String.raw`(?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£|usd|eur|gbp|aed|aud|cad|sgd)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?`;

const deliverablePatterns: Array<{
  pattern: RegExp;
  type: InvoiceLineItemType;
  unit: InvoiceRateUnit;
  description: string;
}> = [
  {
    pattern: /\b(\d+)\s+((?:landing page\s+|homepage\s+|mobile app\s+)?screens?)\b/gi,
    type: "UI/UX Design",
    unit: "per-screen",
    description: "UI screens",
  },
  {
    pattern: /\b(\d+)\s+((?:retouched\s+|edited\s+)?images?|photos?)\b/gi,
    type: "Photography",
    unit: "per-image",
    description: "Retouched images",
  },
  {
    pattern: /\b(\d+)\s+(reels?|shorts?)\b/gi,
    type: "Video Editing",
    unit: "per-video",
    description: "Short videos",
  },
  {
    pattern: /\b(\d+)\s+(banners?|ad creatives?)\b/gi,
    type: "Social Media Content",
    unit: "per-item",
    description: "Banners",
  },
  {
    pattern: /\b(\d+)\s+((?:editorial\s+|custom\s+)?illustrations?)\b/gi,
    type: "Illustration",
    unit: "per-item",
    description: "Illustrations",
  },
  {
    pattern: /\b(\d+)\s+(logos?|logo concepts?)\b/gi,
    type: "Logo Design",
    unit: "per-deliverable",
    description: "Logo design",
  },
  {
    pattern: /\b(\d+)\s+(posts?|carousels?)\b/gi,
    type: "Social Media Content",
    unit: "per-post",
    description: "Social media posts",
  },
  {
    pattern: /\b(\d+)\s+(brand films?|promo videos?|videos?)\b/gi,
    type: "Video Editing",
    unit: "per-video",
    description: "Brand film",
  },
  {
    pattern: /\b(\d+)\s+(decks?|presentations?|pitch decks?)\b/gi,
    type: "Infographics & Presentation Design",
    unit: "per-deliverable",
    description: "Presentation design",
  },
];

function parseAmount(value?: string | null) {
  const cleaned = (value ?? "")
    .toLowerCase()
    .replace(/(?:₹|rs\.?|inr|rupees?|us\$|a\$|c\$|s\$|\$|€|£|usd|eur|gbp|aed|aud|cad|sgd)/gi, "")
    .replace(/,/g, "")
    .trim();
  const match = cleaned.match(/(\d+(?:\.\d+)?)(?:\s*(k|m|lakh|lac))?/i);

  if (!match) {
    return null;
  }

  const base = Number(match[1]);
  if (!Number.isFinite(base)) {
    return null;
  }

  const multiplier =
    match[2] === "k"
      ? 1_000
      : match[2] === "m"
      ? 1_000_000
      : match[2] === "lakh" || match[2] === "lac"
      ? 100_000
      : 1;

  return Math.round(base * multiplier);
}

function isOptionalFutureContext(context: string) {
  return /\b(?:optional|maybe|later|future|phase\s*2|next month|not now|exclude|hold)\b/i.test(
    context
  );
}

function cleanDescription(value: string, fallback: string) {
  return (value || fallback)
    .replace(/\s+/g, " ")
    .replace(/^(?:and|plus|\+)\s+/i, "")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

function inferRateFromContext(context: string, unit: InvoiceRateUnit) {
  const unitLabel = unit.replace("per-", "");
  const directRate =
    context.match(new RegExp(`(?:at|@)\\s*(${amountPattern})\\s*(?:per\\s+${unitLabel}|each)?`, "i"))?.[1] ??
    context.match(new RegExp(`(${amountPattern})\\s+per\\s+${unitLabel}`, "i"))?.[1];

  if (directRate) {
    const parsed = parseAmount(directRate);
    return parsed && parsed > 0
      ? { rate: parsed, pricingSignal: "rate" as const }
      : { rate: null, pricingSignal: "none" as const };
  }

  const budgetOnly = context.match(
    new RegExp(`\\b(?:budget|total|project fee|fixed fee)\\b[^\\n.]{0,32}?(${amountPattern})`, "i")
  )?.[1];

  return budgetOnly
    ? { rate: null, pricingSignal: "budget" as const }
    : { rate: null, pricingSignal: "none" as const };
}

export function inferDeliverablesFromText(text: string): InferredDeliverableLine[] {
  const items: InferredDeliverableLine[] = [];

  for (const matcher of deliverablePatterns) {
    for (const match of text.matchAll(matcher.pattern)) {
      const index = match.index ?? 0;
      const context = text.slice(Math.max(0, index - 48), Math.min(text.length, index + 140));
      const precedingContext = text.slice(Math.max(0, index - 36), index);

      if (isOptionalFutureContext(precedingContext)) {
        continue;
      }

      const quantity = Number(match[1]);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      const normalizedType =
        normalizeInvoiceLineItemType(matcher.type) ?? matcher.type;
      const { rate, pricingSignal } = inferRateFromContext(context, matcher.unit);
      const description = cleanDescription(match[2] ?? "", matcher.description);

      items.push({
        type: normalizedType,
        description,
        quantity,
        rate,
        unit: matcher.unit,
        sacCode: resolveLineItemSacCode({ type: normalizedType, sacCode: "" }),
        confidence: "medium",
        pricingSignal,
      });
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.description.toLowerCase()}:${item.quantity ?? ""}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
