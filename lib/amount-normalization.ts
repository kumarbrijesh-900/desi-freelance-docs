import type { InternationalCurrencyCode } from "@/lib/international-billing-options";

export type SupportedAmountCurrency = InternationalCurrencyCode | "INR";

const currencyMarkers: Array<{
  code: SupportedAmountCurrency;
  patterns: RegExp[];
}> = [
  {
    code: "INR",
    patterns: [/\b(?:inr|rs\.?|rupees?)\b/i, /₹/],
  },
  {
    code: "USD",
    patterns: [/\b(?:usd|us dollars?)\b/i, /(?:^|[\s(])US\$/i, /\$(?=\s*\d)/],
  },
  {
    code: "EUR",
    patterns: [/\b(?:eur|euro)\b/i, /€/],
  },
  {
    code: "GBP",
    patterns: [/\b(?:gbp|pounds?|british pound)\b/i, /£/],
  },
  {
    code: "AED",
    patterns: [/\b(?:aed|dirham|uae dirham)\b/i],
  },
  {
    code: "AUD",
    patterns: [/\b(?:aud|australian dollars?)\b/i, /A\$/],
  },
  {
    code: "CAD",
    patterns: [/\b(?:cad|canadian dollars?)\b/i, /C\$/],
  },
  {
    code: "SGD",
    patterns: [/\b(?:sgd|singapore dollars?)\b/i, /S\$/],
  },
];

function convertAmountBySuffix(baseAmount: number, suffix: string) {
  switch (suffix.toLowerCase()) {
    case "k":
      return baseAmount * 1_000;
    case "m":
      return baseAmount * 1_000_000;
    case "lakh":
    case "lac":
      return baseAmount * 100_000;
    default:
      return baseAmount;
  }
}

export function parseFlexibleAmount(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[,\s]+/g, "")
    .replace(/(?:₹|rs\.?|inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd|us\$|a\$|c\$|s\$|\$|€|£)/g, "");

  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)(k|m|lakh|lac)?\b/i);

  if (!amountMatch) {
    return 0;
  }

  const parsed = Number(amountMatch[1]);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return convertAmountBySuffix(parsed, amountMatch[2] ?? "");
}

export function detectCurrencyFromText(
  text: string
): SupportedAmountCurrency | "" {
  const matches = currencyMarkers.filter((entry) =>
    entry.patterns.some((pattern) => pattern.test(text))
  );

  return matches.length === 1 ? matches[0].code : "";
}

export function expandAmountShorthandInText(text: string) {
  return text.replace(
    /(?<![A-Za-z0-9])((?:₹|rs\.?|inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd|US\$|A\$|C\$|S\$|\$|€|£)\s*)?(\d+(?:\.\d+)?)\s*(k|m|lakh|lac)\b/gi,
    (fullMatch, currencyPrefix, amountText, suffix) => {
      const parsed = convertAmountBySuffix(Number(amountText), suffix);

      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fullMatch;
      }

      const prefix = `${currencyPrefix ?? ""}`.trim();
      return prefix ? `${prefix} ${Math.round(parsed)}` : `${Math.round(parsed)}`;
    }
  );
}
