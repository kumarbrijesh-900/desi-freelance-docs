export type IdentifierKind =
  | "gstin"
  | "pan"
  | "ifsc"
  | "swift-bic"
  | "bank-account-number"
  | "pin-code"
  | "phone-number"
  | "unknown-alphanumeric-code";

export type IdentifierConfidence = "high" | "medium" | "low";
export type IdentifierSource = "label" | "regex" | "heuristic";

export type IdentifierClassification = {
  kind: IdentifierKind;
  rawValue: string;
  normalizedValue: string;
  confidence: IdentifierConfidence;
  source: IdentifierSource;
  contextText: string;
  matchedLabels: string[];
};

type FindBestIdentifierOptions = {
  labels?: string[];
  preferredContext?: RegExp[];
  rejectContext?: RegExp[];
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/i;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
const SWIFT_REGEX = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;
const PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;
const UNKNOWN_ALPHANUMERIC_REGEX = /^[A-Z0-9][A-Z0-9/-]{5,24}$/i;

const contextLabelPatterns: Record<IdentifierKind, RegExp[]> = {
  gstin: [/\bgst(?:in)?\b/i],
  pan: [/\bpan\b/i],
  ifsc: [/\bifsc\b/i],
  "swift-bic": [/\bswift\b/i, /\bbic\b/i],
  "bank-account-number": [
    /\bbank account\b/i,
    /\baccount\b/i,
    /\ba\/c\b/i,
    /\bacct\b/i,
  ],
  "pin-code": [/\bpin\b/i, /\bpincode\b/i, /\bzip\b/i, /\bpostal\b/i],
  "phone-number": [/\bphone\b/i, /\bmobile\b/i, /\bcontact\b/i],
  "unknown-alphanumeric-code": [/\bcode\b/i, /\bid\b/i, /\bno\b/i, /\bnumber\b/i],
};

const scanPatterns: Array<{ kind: IdentifierKind; pattern: RegExp }> = [
  {
    kind: "gstin",
    pattern: /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/gi,
  },
  {
    kind: "pan",
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/gi,
  },
  {
    kind: "ifsc",
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi,
  },
  {
    kind: "swift-bic",
    pattern: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/gi,
  },
  {
    kind: "phone-number",
    pattern: /\b(?:\+91[\s-]?)?[6-9][0-9\s-]{9,12}\b/g,
  },
  {
    kind: "pin-code",
    pattern: /\b[1-9][0-9]{5}\b/g,
  },
  {
    kind: "bank-account-number",
    pattern: /\b\d[\d\s-]{8,20}\d\b/g,
  },
  {
    kind: "unknown-alphanumeric-code",
    pattern: /\b[A-Z0-9][A-Z0-9/-]{5,24}\b/gi,
  },
];

function cleanValue(value?: string | null) {
  return (value ?? "")
    .replace(/^[\s\-*•]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getConfidenceFromScore(score: number): IdentifierConfidence {
  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function getMatchedLabels(
  contextText: string,
  kind: IdentifierKind
) {
  return contextLabelPatterns[kind]
    .filter((pattern) => pattern.test(contextText))
    .map((pattern) => pattern.source);
}

function getLineContext(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = text.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;

  return cleanValue(text.slice(lineStart, lineEnd));
}

function normalizeAlphanumericValue(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function normalizeDigitsValue(value: string) {
  return value.replace(/\D/g, "");
}

function isIndianMobile(value: string) {
  const digits = normalizeDigitsValue(value);

  if (/^[6-9]\d{9}$/.test(digits)) {
    return true;
  }

  return /^91[6-9]\d{9}$/.test(digits);
}

function normalizePhoneValue(value: string) {
  const digits = normalizeDigitsValue(value);

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  return digits;
}

function classifyBySpecificRegex(
  kind: IdentifierKind,
  normalizedValue: string,
  contextText: string
): IdentifierClassification | undefined {
  const matchedLabels = getMatchedLabels(contextText, kind);
  const contextBoost = matchedLabels.length > 0 ? 2 : 0;
  const source: IdentifierSource = matchedLabels.length > 0 ? "label" : "regex";
  let baseScore = 0;

  if (kind === "gstin" && GSTIN_REGEX.test(normalizedValue)) {
    baseScore = 2;
  } else if (kind === "pan" && PAN_REGEX.test(normalizedValue)) {
    baseScore = 2;
  } else if (kind === "ifsc" && IFSC_REGEX.test(normalizedValue)) {
    baseScore = 2;
  } else if (kind === "swift-bic" && SWIFT_REGEX.test(normalizedValue)) {
    baseScore = 2;
  } else {
    return undefined;
  }

  return {
    kind,
    rawValue: normalizedValue,
    normalizedValue,
    confidence: getConfidenceFromScore(baseScore + contextBoost),
    source,
    contextText,
    matchedLabels,
  };
}

export function classifyIdentifier(
  rawValue: string,
  contextText = ""
): IdentifierClassification | undefined {
  const cleaned = cleanValue(rawValue);
  const cleanedContext = cleanValue(contextText);

  if (!cleaned) {
    return undefined;
  }

  const normalizedAlphanumeric = normalizeAlphanumericValue(cleaned);
  const normalizedDigits = normalizeDigitsValue(cleaned);

  const specificKinds: IdentifierKind[] = ["gstin", "pan", "ifsc", "swift-bic"];

  for (const kind of specificKinds) {
    const classified = classifyBySpecificRegex(
      kind,
      normalizedAlphanumeric,
      cleanedContext
    );

    if (classified) {
      return classified;
    }
  }

  const phoneLabels = getMatchedLabels(cleanedContext, "phone-number");
  if (isIndianMobile(cleaned)) {
    return {
      kind: "phone-number",
      rawValue: cleaned,
      normalizedValue: normalizePhoneValue(cleaned),
      confidence: phoneLabels.length > 0 ? "high" : "medium",
      source: phoneLabels.length > 0 ? "label" : "heuristic",
      contextText: cleanedContext,
      matchedLabels: phoneLabels,
    };
  }

  const pinLabels = getMatchedLabels(cleanedContext, "pin-code");
  if (PIN_CODE_REGEX.test(normalizedDigits)) {
    return {
      kind: "pin-code",
      rawValue: cleaned,
      normalizedValue: normalizedDigits,
      confidence: pinLabels.length > 0 ? "high" : "medium",
      source: pinLabels.length > 0 ? "label" : "regex",
      contextText: cleanedContext,
      matchedLabels: pinLabels,
    };
  }

  const accountLabels = getMatchedLabels(cleanedContext, "bank-account-number");
  if (
    /^\d{9,18}$/.test(normalizedDigits) &&
    !isIndianMobile(cleaned) &&
    !PIN_CODE_REGEX.test(normalizedDigits)
  ) {
    return {
      kind: "bank-account-number",
      rawValue: cleaned,
      normalizedValue: normalizedDigits,
      confidence: accountLabels.length > 0 ? "high" : "low",
      source: accountLabels.length > 0 ? "label" : "heuristic",
      contextText: cleanedContext,
      matchedLabels: accountLabels,
    };
  }

  const unknownLabels = getMatchedLabels(cleanedContext, "unknown-alphanumeric-code");
  if (
    UNKNOWN_ALPHANUMERIC_REGEX.test(normalizedAlphanumeric) &&
    !/^\d+$/.test(normalizedAlphanumeric)
  ) {
    return {
      kind: "unknown-alphanumeric-code",
      rawValue: cleaned,
      normalizedValue: cleaned.toUpperCase().replace(/\s+/g, ""),
      confidence: unknownLabels.length > 0 ? "medium" : "low",
      source: unknownLabels.length > 0 ? "label" : "heuristic",
      contextText: cleanedContext,
      matchedLabels: unknownLabels,
    };
  }

  return undefined;
}

export function findIdentifiersInText(text: string): IdentifierClassification[] {
  const collected = new Map<string, IdentifierClassification>();
  const occupiedRanges: Array<{ start: number; end: number }> = [];

  for (const { pattern } of scanPatterns) {
    pattern.lastIndex = 0;
  }

  for (const { pattern } of scanPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      const start = match.index ?? -1;

      if (!value || start < 0) {
        continue;
      }

      const end = start + value.length;
      const overlapsExisting = occupiedRanges.some(
        (range) => start < range.end && end > range.start
      );

      if (overlapsExisting) {
        continue;
      }

      const contextText = getLineContext(text, start, end);
      const classified = classifyIdentifier(value, contextText);

      if (!classified) {
        continue;
      }

      occupiedRanges.push({ start, end });

      const key = `${classified.kind}:${classified.normalizedValue}`;
      const existing = collected.get(key);

      if (!existing) {
        collected.set(key, classified);
        continue;
      }

      const confidenceRank = { low: 0, medium: 1, high: 2 };
      if (
        confidenceRank[classified.confidence] >
        confidenceRank[existing.confidence]
      ) {
        collected.set(key, classified);
      }
    }
  }

  return Array.from(collected.values());
}

function extractLabeledIdentifierCandidates(
  text: string,
  labels: string[]
): IdentifierClassification[] {
  const candidates: IdentifierClassification[] = [];

  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${escapeRegExp(label)}(?:\\b|$)(?:\\s*(?:[:\\-])|\\s+is)?\\s*(.+)$`,
      "im"
    );
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const contextText = `${label}: ${cleanValue(match[1])}`;
    const classified = classifyIdentifier(match[1], contextText);

    if (classified) {
      candidates.push(classified);
    }
  }

  return candidates;
}

export function findBestIdentifier(
  text: string,
  kinds: IdentifierKind[],
  options: FindBestIdentifierOptions = {}
): IdentifierClassification | undefined {
  const candidates = [
    ...extractLabeledIdentifierCandidates(text, options.labels ?? []),
    ...findIdentifiersInText(text),
  ].filter((candidate) => kinds.includes(candidate.kind));

  if (!candidates.length) {
    return undefined;
  }

  const confidenceScore = { high: 3, medium: 2, low: 1 };

  const ranked = candidates
    .map((candidate) => {
      const preferredHits =
        options.preferredContext?.filter((pattern) =>
          pattern.test(candidate.contextText)
        ).length ?? 0;
      const rejectHits =
        options.rejectContext?.filter((pattern) =>
          pattern.test(candidate.contextText)
        ).length ?? 0;
      const score =
        confidenceScore[candidate.confidence] * 10 +
        preferredHits * 3 -
        rejectHits * 5 +
        (candidate.source === "label" ? 6 : 0);

      return { candidate, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.candidate;
}
