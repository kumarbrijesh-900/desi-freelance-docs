import { inferLocationDetailsFromText } from "@/lib/location-inference";
import { inferIndianLocationFromPinCode } from "@/lib/pin-code-inference";

type StructuredIndianAddressInput = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
};

type StructuredInternationalAddressInput = {
  fullAddress?: string;
  postalCode?: string;
  country?: string;
};

type HydrateIndianAddressInput = StructuredIndianAddressInput & {
  legacyAddress?: string;
};

export type StateSignalResult = {
  gstinState: string;
  cityState: string;
  pinState: string;
  strongestState: string;
  warning: string;
};

function cleanValue(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function cleanPinCode(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 6);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeMatchedPart(source: string, value: string) {
  if (!value) {
    return source;
  }

  return source
    .replace(new RegExp(`\\b${escapeRegExp(value)}\\b`, "ig"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .trim()
    .replace(/(^,|,$)/g, "")
    .trim();
}

export function composeIndianAddress({
  addressLine1,
  addressLine2,
  city,
  state,
  pinCode,
}: StructuredIndianAddressInput) {
  const primaryLine = cleanValue(addressLine1);
  const secondaryLine = cleanValue(addressLine2);

  if (!primaryLine && !secondaryLine) {
    return "";
  }

  return [
    primaryLine,
    secondaryLine,
    [cleanValue(city), cleanValue(state), cleanPinCode(pinCode)]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(", ");
}

export function composeInternationalAddress({
  fullAddress,
  postalCode,
  country,
}: StructuredInternationalAddressInput) {
  const primaryAddress = cleanValue(fullAddress);

  if (!primaryAddress) {
    return "";
  }

  return [primaryAddress, cleanValue(postalCode), cleanValue(country)]
    .filter(Boolean)
    .join(", ");
}

export function hydrateIndianAddressFields({
  addressLine1,
  addressLine2,
  city,
  state,
  pinCode,
  legacyAddress,
}: HydrateIndianAddressInput) {
  const nextLine1 = cleanValue(addressLine1);
  const nextLine2 = cleanValue(addressLine2);
  const nextCity = cleanValue(city);
  const nextPinCode = cleanPinCode(pinCode);
  const normalizedLegacyAddress = cleanValue(legacyAddress);

  if (nextLine1 || nextLine2 || nextCity || nextPinCode || !normalizedLegacyAddress) {
    return {
      addressLine1: nextLine1,
      addressLine2: nextLine2,
      city: nextCity,
      pinCode: nextPinCode,
    };
  }

  const pinMatch = normalizedLegacyAddress.match(/\b([1-9][0-9]{5})\b/);
  const inferredPinCode = pinMatch?.[1] ?? "";
  const locationDetails = inferLocationDetailsFromText(normalizedLegacyAddress);
  const inferredCity = locationDetails.matchedIndianCity || "";
  const inferredState = cleanValue(state) || locationDetails.state || "";
  const withoutPin = inferredPinCode
    ? normalizedLegacyAddress.replace(inferredPinCode, "").replace(/\s{2,}/g, " ").trim()
    : normalizedLegacyAddress;
  const strippedState = removeMatchedPart(withoutPin, inferredState);
  const strippedCity = removeMatchedPart(strippedState, inferredCity);
  const parts = strippedCity
    .split(",")
    .map((part) => cleanValue(part))
    .filter(Boolean);

  return {
    addressLine1: parts[0] ?? normalizedLegacyAddress,
    addressLine2: parts.slice(1).join(", "),
    city: inferredCity,
    pinCode: inferredPinCode,
  };
}

export function evaluateStateSignals(params: {
  manualState?: string;
  city?: string;
  pinCode?: string;
  gstinState?: string;
  label?: string;
}) {
  const manualState = cleanValue(params.manualState);
  const cityState = params.city
    ? inferLocationDetailsFromText(params.city).state
    : "";
  const pinState = inferIndianLocationFromPinCode(params.pinCode).state;
  const gstinState = cleanValue(params.gstinState);
  const strongestState = gstinState || pinState || cityState || manualState;
  const label = cleanValue(params.label) || "state";

  const deterministicSources = [
    gstinState
      ? {
          source: "GSTIN",
          state: gstinState,
        }
      : null,
    pinState
      ? {
          source: "PIN code",
          state: pinState,
        }
      : null,
    cityState
      ? {
          source: "city",
          state: cityState,
        }
      : null,
    manualState
      ? {
          source: "selected state",
          state: manualState,
        }
      : null,
  ].filter(Boolean) as Array<{ source: string; state: string }>;

  const uniqueStates = Array.from(
    new Set(deterministicSources.map((entry) => entry.state))
  );

  const warning =
    uniqueStates.length > 1
      ? `${label} signals conflict: ${deterministicSources
          .map((entry) => `${entry.source} says ${entry.state}`)
          .join(", ")}. Review this before previewing the invoice.`
      : "";

  return {
    gstinState,
    cityState,
    pinState,
    strongestState,
    warning,
  } satisfies StateSignalResult;
}
