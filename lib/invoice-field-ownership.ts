export type InvoiceEntityOwner = "agency" | "client";
export type InvoiceFieldKind =
  | "name"
  | "email"
  | "gstin"
  | "pan"
  | "tax-id"
  | "address"
  | "payment"
  | "general";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const placeholderPattern =
  /\b(?:unknown|unclear|not sure|to be confirmed|tbc|tbd|n\/a|na|none|null|not provided|sample|example|dummy|placeholder)\b/i;
const ambiguityPattern =
  /\b(?:ambiguous|clarify|confirm|which one|not enough|can't determine|cannot determine|unsure)\b/i;
const teamAliasPattern =
  /\b(?:finance|billing|accounts?|payables?|ap|procurement|admin)\s+(?:team|dept|department|desk|office)\b/i;
const weakNameFragmentPattern =
  /^(?:not|yes|no|gst registered|registered under gst|not registered|gst|pan|finance team|billing team|accounts team)$/i;

function clean(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function isPan(value?: string | null) {
  return PAN_PATTERN.test(clean(value).toUpperCase());
}

export function isGstin(value?: string | null) {
  return GSTIN_PATTERN.test(clean(value).toUpperCase());
}

export function isPlaceholderLikeValue(value?: string | null) {
  const cleaned = clean(value);

  if (!cleaned) {
    return true;
  }

  if (cleaned.length <= 2) {
    return true;
  }

  if (placeholderPattern.test(cleaned) || ambiguityPattern.test(cleaned)) {
    return true;
  }

  if (/^[\s._-]+$/.test(cleaned)) {
    return true;
  }

  if (/example\.(?:com|org|net|in|ae|co)$/i.test(cleaned)) {
    return true;
  }

  if (/^[^@\s]+@(?:example|test|invalid|localhost)\./i.test(cleaned)) {
    return true;
  }

  if (/^(?:billing|finance|accounts?|hello|test|client)@client\./i.test(cleaned)) {
    return true;
  }

  return false;
}

export function isUnsafeEntityName(value?: string | null) {
  const cleaned = clean(value);

  if (isPlaceholderLikeValue(cleaned)) {
    return true;
  }

  if (weakNameFragmentPattern.test(cleaned)) {
    return true;
  }

  if (teamAliasPattern.test(cleaned)) {
    return true;
  }

  if (
    /\b(?:gstin|gst registered|pan|lut|payment terms?|invoice date|due date)\b/i.test(
      cleaned
    )
  ) {
    return true;
  }

  // Reject hallucinated conversational sentences (e.g. "doing a total of dedh lakh...")
  if (
    cleaned.length > 30 &&
    /\b(?:we are|they are|doing|total of|lakh|rupees|dollars|send it out|usually they|for the|redesign of|project|client is|agency is)\b/i.test(
      cleaned
    )
  ) {
    return true;
  }

  // Absolute fallback: no legitimate business name is an 80+ character paragraph
  if (cleaned.length > 80) {
    return true;
  }

  return false;
}

export function sanitizeHydrationString(params: {
  value?: string | null;
  kind?: InvoiceFieldKind;
}) {
  const value = clean(params.value);

  if (!value) {
    return "";
  }

  if (isPlaceholderLikeValue(value)) {
    return "";
  }

  if (params.kind === "name" && isUnsafeEntityName(value)) {
    return "";
  }

  if (params.kind === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
  }

  return value;
}

export function sanitizeOwnedIdentifier(params: {
  value?: string | null;
  owner: InvoiceEntityOwner;
  kind: InvoiceFieldKind;
  agencyGstin?: string | null;
  agencyPan?: string | null;
  clientGstinOrTaxId?: string | null;
  clientLocation?: "domestic" | "international" | null;
}) {
  const value = clean(params.value).toUpperCase();

  if (!value || isPlaceholderLikeValue(value)) {
    return "";
  }

  if (params.owner === "client") {
    if (isPan(value)) {
      return "";
    }

    if (params.agencyGstin && value === clean(params.agencyGstin).toUpperCase()) {
      return "";
    }

    if (params.agencyPan && value === clean(params.agencyPan).toUpperCase()) {
      return "";
    }

    if (params.clientLocation === "domestic") {
      return isGstin(value) ? value : "";
    }

    return value;
  }

  if (params.kind === "gstin") {
    if (params.clientGstinOrTaxId && value === clean(params.clientGstinOrTaxId).toUpperCase()) {
      return "";
    }

    return isGstin(value) ? value : "";
  }

  if (params.kind === "pan") {
    return isPan(value) ? value : "";
  }

  return value;
}
