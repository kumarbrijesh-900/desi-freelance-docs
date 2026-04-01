import type { IndiaStateOption } from "@/lib/india-state-options";

type PinLookupEntry = {
  prefix: string;
  city: string;
  state: IndiaStateOption;
};

export type PinCodeInferenceResult = {
  city: string;
  state: IndiaStateOption | "";
  confidence: "high" | "medium" | "";
};

const PIN_PREFIX_LOOKUP: PinLookupEntry[] = [
  { prefix: "560", city: "Bengaluru", state: "Karnataka" },
  { prefix: "400", city: "Mumbai", state: "Maharashtra" },
  { prefix: "411", city: "Pune", state: "Maharashtra" },
  { prefix: "600", city: "Chennai", state: "Tamil Nadu" },
  { prefix: "500", city: "Hyderabad", state: "Telangana" },
  { prefix: "700", city: "Kolkata", state: "West Bengal" },
  { prefix: "751", city: "Bhubaneswar", state: "Odisha" },
  { prefix: "753", city: "Cuttack", state: "Odisha" },
  { prefix: "110", city: "Delhi", state: "Delhi" },
  { prefix: "380", city: "Ahmedabad", state: "Gujarat" },
  { prefix: "302", city: "Jaipur", state: "Rajasthan" },
  { prefix: "682", city: "Kochi", state: "Kerala" },
  { prefix: "201", city: "Noida", state: "Uttar Pradesh" },
];

function normalizePinCode(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 6);
}

export function inferIndianLocationFromPinCode(
  value?: string | null
): PinCodeInferenceResult {
  const normalized = normalizePinCode(value);

  if (!/^[1-9][0-9]{5}$/.test(normalized)) {
    return {
      city: "",
      state: "",
      confidence: "",
    };
  }

  const matchedEntry = PIN_PREFIX_LOOKUP.find((entry) =>
    normalized.startsWith(entry.prefix)
  );

  if (!matchedEntry) {
    return {
      city: "",
      state: "",
      confidence: "",
    };
  }

  return {
    city: matchedEntry.city,
    state: matchedEntry.state,
    confidence: "medium",
  };
}
