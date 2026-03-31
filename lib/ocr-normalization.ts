import { expandAmountShorthandInText } from "@/lib/amount-normalization";

function normalizeCommonOcrLabels(text: string) {
  return text
    .replace(/\baddre55\b/gi, "address")
    .replace(/\bn4me\b/gi, "name")
    .replace(/\bbill t0\b/gi, "bill to")
    .replace(/\bclient n4me\b/gi, "client name")
    .replace(/\bagency n4me\b/gi, "agency name")
    .replace(/\breg15tered\b/gi, "registered")
    .replace(/\bterm5\b/gi, "terms")
    .replace(/\bg5tin\b/gi, "gstin")
    .replace(/\bl u t\b/gi, "lut");
}

function normalizeWordLevelOcrNoise(text: string) {
  return text.replace(/\b[a-zA-Z][a-zA-Z0-9]{2,}\b/g, (token) => {
    const digitCount = (token.match(/[0-9]/g) ?? []).length;

    if (
      !/[A-Za-z]/.test(token) ||
      !/[05]/.test(token) ||
      digitCount > 1 ||
      token === token.toUpperCase()
    ) {
      return token;
    }

    return token.replace(/0/g, "o").replace(/5/g, "s");
  });
}

function reconnectSplitWords(text: string) {
  return text
    .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1$2")
    .replace(/([A-Za-z]{2,})\s*\n\s*([a-z]{2,})/g, "$1 $2");
}

function removeOcrJunkLines(text: string) {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return true;
      }

      const alphaNumericCount = (trimmed.match(/[A-Za-z0-9]/g) ?? []).length;
      const symbolCount = (trimmed.match(/[^A-Za-z0-9\s]/g) ?? []).length;

      return !(alphaNumericCount < 2 && symbolCount > 3);
    })
    .join("\n");
}

export function normalizeOcrText(text: string) {
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n[ ]+/g, "\n")
    .trim();

  return expandAmountShorthandInText(
    normalizeWordLevelOcrNoise(
      normalizeCommonOcrLabels(
        removeOcrJunkLines(reconnectSplitWords(normalized))
      )
    )
  );
}
