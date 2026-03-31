import { INDIA_STATE_OPTIONS, type IndiaStateOption } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  type InternationalCountryOption,
} from "@/lib/international-billing-options";

const indianCityStateAliases: Array<{
  state: IndiaStateOption;
  patterns: RegExp[];
}> = [
  { state: "Karnataka", patterns: [/\bbengaluru\b/i, /\bbangalore\b/i] },
  { state: "Maharashtra", patterns: [/\bmumbai\b/i, /\bpune\b/i] },
  { state: "Tamil Nadu", patterns: [/\bchennai\b/i] },
  { state: "Telangana", patterns: [/\bhyderabad\b/i] },
  { state: "Delhi", patterns: [/\bnew delhi\b/i, /\bdelhi\b/i] },
  { state: "West Bengal", patterns: [/\bkolkata\b/i, /\bcalcutta\b/i] },
  { state: "Odisha", patterns: [/\bbhubaneswar\b/i, /\bcuttack\b/i] },
  { state: "Gujarat", patterns: [/\bahmedabad\b/i] },
  { state: "Rajasthan", patterns: [/\bjaipur\b/i] },
  { state: "Kerala", patterns: [/\bkochi\b/i, /\bcochin\b/i] },
  { state: "Haryana", patterns: [/\bgurugram\b/i, /\bgurgaon\b/i] },
  { state: "Uttar Pradesh", patterns: [/\bnoida\b/i] },
];

const foreignCityCountryAliases: Array<{
  country: InternationalCountryOption;
  patterns: RegExp[];
}> = [
  { country: "United Kingdom", patterns: [/\blondon\b/i, /\buk\b/i, /\bu\.k\.\b/i] },
  {
    country: "United States",
    patterns: [
      /\bnew york\b/i,
      /\bsan francisco\b/i,
      /\blos angeles\b/i,
      /\busa\b/i,
      /\bu\.s\.a\b/i,
      /\bunited states\b/i,
    ],
  },
  {
    country: "United Arab Emirates",
    patterns: [/\bdubai\b/i, /\buae\b/i, /\bab[uú] dhabi\b/i],
  },
  { country: "Singapore", patterns: [/\bsingapore\b/i] },
  { country: "Canada", patterns: [/\btoronto\b/i, /\bvancouver\b/i, /\bcanada\b/i] },
  { country: "Australia", patterns: [/\bsydney\b/i, /\bmelbourne\b/i, /\baustralia\b/i] },
];

export function inferStateFromText(text: string): IndiaStateOption | "" {
  const normalized = text.toLowerCase();
  const directMatch =
    INDIA_STATE_OPTIONS.find((stateName) =>
      normalized.includes(stateName.toLowerCase())
    ) ?? "";

  if (directMatch) {
    return directMatch;
  }

  return (
    indianCityStateAliases.find((entry) =>
      entry.patterns.some((pattern) => pattern.test(text))
    )?.state ?? ""
  );
}

export function inferCountryFromText(
  text: string
): InternationalCountryOption | "" {
  const normalized = text.toLowerCase();
  const directMatch =
    INTERNATIONAL_COUNTRY_OPTIONS.find((countryName) =>
      normalized.includes(countryName.toLowerCase())
    ) ?? "";

  if (directMatch) {
    return directMatch;
  }

  return (
    foreignCityCountryAliases.find((entry) =>
      entry.patterns.some((pattern) => pattern.test(text))
    )?.country ?? ""
  );
}

export function hasForeignCityHint(text: string) {
  return foreignCityCountryAliases.some((entry) =>
    entry.patterns.some((pattern) => pattern.test(text))
  );
}

export function hasIndianLocationHint(text: string) {
  return Boolean(inferStateFromText(text));
}

export function inferLocationTypeFromText(
  text: string
): "domestic" | "international" | "" {
  if (
    /\b(?:international|foreign client|overseas|outside india|export of services)\b/i.test(
      text
    ) ||
    inferCountryFromText(text) ||
    hasForeignCityHint(text)
  ) {
    return "international";
  }

  if (
    /\b(?:domestic|within india|same state|inter-state|igst|cgst|sgst)\b/i.test(
      text
    ) ||
    hasIndianLocationHint(text)
  ) {
    return "domestic";
  }

  return "";
}
