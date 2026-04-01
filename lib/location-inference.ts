import { INDIA_STATE_OPTIONS, type IndiaStateOption } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  type InternationalCountryOption,
} from "@/lib/international-billing-options";

type IndianCityAlias = {
  city: string;
  state: IndiaStateOption;
  aliases: string[];
};

type ForeignCityAlias = {
  city: string;
  country: InternationalCountryOption;
  aliases: string[];
};

export type LocationInferenceResult = {
  normalizedText: string;
  matchedIndianCity: string;
  matchedForeignCity: string;
  state: IndiaStateOption | "";
  country: InternationalCountryOption | "";
  locationType: "domestic" | "international" | "";
  confidence: "high" | "medium" | "low" | "";
};

const indianCityStateAliases: IndianCityAlias[] = [
  { city: "Bengaluru", state: "Karnataka", aliases: ["bengaluru", "bangalore"] },
  { city: "Mumbai", state: "Maharashtra", aliases: ["mumbai"] },
  { city: "Pune", state: "Maharashtra", aliases: ["pune"] },
  { city: "Chennai", state: "Tamil Nadu", aliases: ["chennai"] },
  { city: "Hyderabad", state: "Telangana", aliases: ["hyderabad"] },
  { city: "Kolkata", state: "West Bengal", aliases: ["kolkata", "calcutta"] },
  { city: "Bhubaneswar", state: "Odisha", aliases: ["bhubaneswar"] },
  { city: "Cuttack", state: "Odisha", aliases: ["cuttack"] },
  { city: "Delhi", state: "Delhi", aliases: ["delhi", "new delhi"] },
  { city: "Ahmedabad", state: "Gujarat", aliases: ["ahmedabad"] },
  { city: "Jaipur", state: "Rajasthan", aliases: ["jaipur"] },
  { city: "Kochi", state: "Kerala", aliases: ["kochi", "cochin"] },
  { city: "Gurugram", state: "Haryana", aliases: ["gurugram", "gurgaon"] },
  { city: "Noida", state: "Uttar Pradesh", aliases: ["noida"] },
];

const foreignCityCountryAliases: ForeignCityAlias[] = [
  {
    city: "London",
    country: "United Kingdom",
    aliases: ["london", "uk", "u.k.", "united kingdom"],
  },
  {
    city: "New York",
    country: "United States",
    aliases: [
      "new york",
      "san francisco",
      "los angeles",
      "usa",
      "u.s.a",
      "united states",
      "us",
    ],
  },
  {
    city: "Toronto",
    country: "Canada",
    aliases: ["toronto", "vancouver", "canada"],
  },
  {
    city: "Dubai",
    country: "United Arab Emirates",
    aliases: ["dubai", "uae", "abu dhabi", "united arab emirates"],
  },
  {
    city: "Singapore",
    country: "Singapore",
    aliases: ["singapore"],
  },
  {
    city: "Sydney",
    country: "Australia",
    aliases: ["sydney", "melbourne", "australia"],
  },
];

function normalizeLocationAlias(alias: string) {
  return alias.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeLocationText(text: string) {
  const normalized = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

  const canonicalized = [
    ["bangalore", "bengaluru"],
    ["new delhi", "delhi"],
    ["cochin", "kochi"],
    ["gurgaon", "gurugram"],
    ["u.k.", "uk"],
    ["u.s.a", "usa"],
  ].reduce((currentText, [from, to]) => {
    return currentText.replace(
      new RegExp(`\\b${escapeRegExp(from)}\\b`, "gi"),
      to
    );
  }, normalized);

  return normalizeLocationAlias(canonicalized);
}

function matchIndianCity(text: string) {
  return indianCityStateAliases.find((entry) =>
    entry.aliases.some((alias) =>
      new RegExp(`\\b${escapeRegExp(normalizeLocationAlias(alias))}\\b`, "i").test(text)
    )
  );
}

function matchForeignCity(text: string) {
  return foreignCityCountryAliases.find((entry) =>
    entry.aliases.some((alias) =>
      new RegExp(`\\b${escapeRegExp(normalizeLocationAlias(alias))}\\b`, "i").test(text)
    )
  );
}

export function inferLocationDetailsFromText(text: string): LocationInferenceResult {
  const normalizedText = normalizeLocationText(text);
  const directState =
    INDIA_STATE_OPTIONS.find((stateName) =>
      normalizedText.includes(stateName.toLowerCase())
    ) ?? "";
  const directCountry =
    INTERNATIONAL_COUNTRY_OPTIONS.find((countryName) =>
      normalizedText.includes(countryName.toLowerCase())
    ) ?? "";
  const matchedIndianCity = matchIndianCity(normalizedText);
  const matchedForeignCity = matchForeignCity(normalizedText);

  if (matchedForeignCity || directCountry) {
    return {
      normalizedText,
      matchedIndianCity: "",
      matchedForeignCity: matchedForeignCity?.city ?? "",
      state: "",
      country: matchedForeignCity?.country ?? directCountry,
      locationType: "international",
      confidence: directCountry ? "high" : "medium",
    };
  }

  if (matchedIndianCity || directState) {
    return {
      normalizedText,
      matchedIndianCity: matchedIndianCity?.city ?? "",
      matchedForeignCity: "",
      state: matchedIndianCity?.state ?? directState,
      country: "",
      locationType: "domestic",
      confidence: directState ? "high" : "medium",
    };
  }

  if (
    /\b(?:international|foreign client|overseas|outside india|export of services)\b/i.test(
      normalizedText
    )
  ) {
    return {
      normalizedText,
      matchedIndianCity: "",
      matchedForeignCity: "",
      state: "",
      country: "",
      locationType: "international",
      confidence: "medium",
    };
  }

  if (
    /\b(?:domestic|within india|same state|inter state|inter-state|igst|cgst|sgst)\b/i.test(
      normalizedText
    )
  ) {
    return {
      normalizedText,
      matchedIndianCity: "",
      matchedForeignCity: "",
      state: "",
      country: "",
      locationType: "domestic",
      confidence: "medium",
    };
  }

  return {
    normalizedText,
    matchedIndianCity: "",
    matchedForeignCity: "",
    state: "",
    country: "",
    locationType: "",
    confidence: "",
  };
}

export function inferStateFromText(text: string): IndiaStateOption | "" {
  return inferLocationDetailsFromText(text).state;
}

export function inferCountryFromText(
  text: string
): InternationalCountryOption | "" {
  return inferLocationDetailsFromText(text).country;
}

export function hasForeignCityHint(text: string) {
  return Boolean(inferLocationDetailsFromText(text).matchedForeignCity);
}

export function hasIndianLocationHint(text: string) {
  return Boolean(inferLocationDetailsFromText(text).state);
}

export function inferLocationTypeFromText(
  text: string
): "domestic" | "international" | "" {
  return inferLocationDetailsFromText(text).locationType;
}
