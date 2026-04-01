import type { IndiaStateOption } from "@/lib/india-state-options";

type SezEntry = {
  name: string;
  state: IndiaStateOption;
  aliases: string[];
};

export type SezSuggestion = {
  name: string;
  state: IndiaStateOption;
  confidence: "high" | "medium";
};

const SEZ_STARTER_LOOKUP: SezEntry[] = [
  { name: "Kandla SEZ", state: "Gujarat", aliases: ["kandla sez", "gandhidham sez"] },
  { name: "SEEPZ SEZ", state: "Maharashtra", aliases: ["seepz", "seepz sez", "andheri east sez"] },
  { name: "Noida SEZ", state: "Uttar Pradesh", aliases: ["noida sez"] },
  { name: "Madras SEZ / MEPZ", state: "Tamil Nadu", aliases: ["madras sez", "mepz"] },
  { name: "Cochin SEZ / CSEZ", state: "Kerala", aliases: ["cochin sez", "csez", "kakkanad sez"] },
  { name: "Falta SEZ", state: "West Bengal", aliases: ["falta sez"] },
  { name: "Visakhapatnam SEZ / VSEZ", state: "Andhra Pradesh", aliases: ["visakhapatnam sez", "vsez"] },
  { name: "Manyata Embassy Business Park", state: "Karnataka", aliases: ["manyata embassy business park", "manyata tech park"] },
  { name: "Bagmane Developers SEZ", state: "Karnataka", aliases: ["bagmane sez", "bagmane developers sez"] },
  { name: "Biocon SEZ", state: "Karnataka", aliases: ["biocon sez", "bommasandra sez"] },
  { name: "Global Village SEZ", state: "Karnataka", aliases: ["global village sez", "kengeri sez"] },
  { name: "Infosys SEZ, Electronics City", state: "Karnataka", aliases: ["infosys sez electronics city", "electronics city sez"] },
  { name: "Infosys SEZ, Sarjapur", state: "Karnataka", aliases: ["infosys sez sarjapur", "sarjapur sez"] },
  { name: "Magarpatta City SEZ", state: "Maharashtra", aliases: ["magarpatta sez", "magarpatta city sez"] },
  { name: "MIHAN SEZ", state: "Maharashtra", aliases: ["mihan sez"] },
  { name: "Gigaplex IT SEZ", state: "Maharashtra", aliases: ["gigaplex sez", "airoli sez"] },
  { name: "GIFT City", state: "Gujarat", aliases: ["gift city", "gift city sez"] },
  { name: "Mundra SEZ", state: "Gujarat", aliases: ["mundra sez"] },
  { name: "Reliance Jamnagar SEZ", state: "Gujarat", aliases: ["jamnagar sez", "reliance jamnagar sez"] },
  { name: "HITEC City SEZ clusters", state: "Telangana", aliases: ["hitec city sez", "hitech city sez"] },
  { name: "GMR Aerospace SEZ", state: "Telangana", aliases: ["gmr aerospace sez"] },
  { name: "DLF IT SEZ, Porur", state: "Tamil Nadu", aliases: ["dlf it sez porur", "porur sez"] },
  { name: "ELCOT SEZ, Sholinganallur", state: "Tamil Nadu", aliases: ["elcot sez sholinganallur", "sholinganallur sez"] },
  { name: "ELCOT SEZ, Hosur", state: "Tamil Nadu", aliases: ["elcot sez hosur", "hosur sez"] },
];

function normalizeText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function suggestSezCampus(text?: string | null): SezSuggestion | null {
  const normalized = normalizeText(text);

  if (!normalized) {
    return null;
  }

  for (const entry of SEZ_STARTER_LOOKUP) {
    const matchedAlias = entry.aliases.find((alias) =>
      normalized.includes(normalizeText(alias))
    );

    if (!matchedAlias) {
      continue;
    }

    return {
      name: entry.name,
      state: entry.state,
      confidence:
        normalizeText(entry.name) === normalizeText(matchedAlias) ? "high" : "medium",
    };
  }

  return null;
}
