export type InferredNameConfidence = "high" | "medium" | "low";
export type InferredEntityKind = "person" | "company" | "unknown";
export type InferredRole = "agency" | "client";

export type InferredRoleName = {
  value: string;
  confidence: InferredNameConfidence;
  role: InferredRole;
  entityKind: InferredEntityKind;
  reason: string;
};

export type InferredNameRoles = {
  agency?: InferredRoleName;
  client?: InferredRoleName;
  agencyContext: string;
  clientContext: string;
};

const roleLabels = {
  agency: [
    "agency name",
    "freelancer name",
    "studio name",
    "business name",
    "issued by",
    "my name",
    "from",
  ],
  client: [
    "client name",
    "bill to",
    "customer name",
    "recipient",
    "to",
  ],
} as const;

const companySuffixPattern =
  /\b(?:studio|agency|design|creative|media|labs|works?|collective|co\.?|company|llc|inc\.?|ltd\.?|pvt\.?\s*ltd\.?|private limited|corp\.?|corporation|limited)\b/i;

function cleanValue(value?: string | null) {
  return (value ?? "")
    .replace(/^[\s\-*•]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "")
    .trim();
}

function looksLikeFieldLabelLine(line: string) {
  return /^[a-z][a-z0-9/&.' -]{1,40}:/i.test(line);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFirstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  return "";
}

function extractLabeledValue(
  text: string,
  labels: readonly string[]
) {
  const patterns = labels.map(
    (label) =>
      new RegExp(
        `(?:^|\\n)\\s*${escapeRegExp(label)}(?:\\s*(?:[:\\-])|\\s+is)?\\s*(.+)$`,
        "im"
      )
  );

  return findFirstMatch(text, patterns);
}

function normalizeContextLine(line: string) {
  return cleanValue(line)
    .replace(
      /\s+(?:address|country|state|currency|gstin|gst|bank|ifsc|swift|iban|routing|payment|terms?|rate|qty|quantity|invoice|project|due date)\b.*$/i,
      ""
    )
    .trim();
}

function looksLikeNameCandidate(value: string) {
  const cleaned = normalizeContextLine(value);

  if (!cleaned || cleaned.length < 2) {
    return false;
  }

  return !/\b(?:address|country|state|currency|gstin|bank|payment|terms?|rate|qty|quantity|invoice|project|description)\b/i.test(
    cleaned
  );
}

function inferEntityKind(name: string): InferredEntityKind {
  const cleaned = cleanValue(name);

  if (!cleaned) {
    return "unknown";
  }

  if (companySuffixPattern.test(cleaned)) {
    return "company";
  }

  const personPattern =
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(cleaned) ||
    /^[a-z]+(?:\s+[a-z]+){0,2}$/i.test(cleaned);

  return personPattern ? "person" : "unknown";
}

function buildRoleContext(text: string, role: InferredRole) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const markers =
    role === "agency"
      ? [
          /\bagency name\b/i,
          /\bfreelancer name\b/i,
          /\bstudio name\b/i,
          /\bbusiness name\b/i,
          /\bissued by\b/i,
          /\bmy name\b/i,
          /\bmy gstin\b/i,
          /\bmy bank\b/i,
          /\bwe(?:'re| are)\b/i,
          /\bwe at\b/i,
          /\bour (?:studio|agency)\b/i,
          /\bi(?:'m| am)\b/i,
          /\bfrom\b/i,
          /\bdelivered by\b/i,
          /\bprovided by\b/i,
          /\bregards\b/i,
          /\bthanks\b/i,
          /\bbest\b/i,
        ]
      : [
          /\bclient name\b/i,
          /\bbill to\b/i,
          /\bcustomer name\b/i,
          /\brecipient\b/i,
          /\bto\b/i,
          /\bclient\b/i,
          /\bfor\b/i,
          /\byour brand\b/i,
          /\brecipient\b/i,
        ];

  const collected: string[] = [];

  lines.forEach((line, index) => {
    if (!markers.some((pattern) => pattern.test(line))) {
      return;
    }

    collected.push(line);

    const nextLine = lines[index + 1];

    if (
      nextLine &&
      !looksLikeFieldLabelLine(nextLine) &&
      nextLine.length <= 140
    ) {
      collected.push(nextLine);
    }
  });

  return Array.from(new Set(collected)).join("\n");
}

function buildRoleCandidate(
  value: string,
  role: InferredRole,
  confidence: InferredNameConfidence,
  reason: string
): InferredRoleName | undefined {
  const cleaned = normalizeContextLine(value);

  if (!looksLikeNameCandidate(cleaned)) {
    return undefined;
  }

  return {
    value: cleaned,
    confidence,
    role,
    entityKind: inferEntityKind(cleaned),
    reason,
  };
}

function inferAgencyName(text: string): InferredRoleName | undefined {
  const labeled = extractLabeledValue(text, roleLabels.agency);

  if (labeled) {
    return buildRoleCandidate(labeled, "agency", "high", "explicit label");
  }

  const inferred = findFirstMatch(text, [
    /\b(?:issued by|my name is|from)\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:gstin|bank|address|invoice|project|based\b|from\b|at\b)|$)/i,
    /\bwe(?:'re| are)\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:gstin|bank|address|invoice|project|based\b|from\b|at\b)|$)/i,
    /\bwe at\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:gstin|bank|address|invoice|project|based\b|from\b|at\b)|$)/i,
    /\bour (?:studio|agency)(?: is)?\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:gstin|bank|address|invoice|project|based\b|from\b|at\b)|$)/i,
    /\b(?:i(?:'m| am)|this is)\s+([a-z][a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:gstin|bank|address|invoice|project|based\b|from\b|at\b)|$)/i,
    /(?:^|\n)\s*(?:regards|thanks|best),?\s*\n\s*([a-z0-9&.' -]{2,80})(?=\n|$)/i,
  ]);

  return inferred
    ? buildRoleCandidate(inferred, "agency", "medium", "role context")
    : undefined;
}

function inferClientName(text: string): InferredRoleName | undefined {
  const labeled = extractLabeledValue(text, roleLabels.client);

  if (labeled) {
    return buildRoleCandidate(labeled, "client", "high", "explicit label");
  }

  const inferred = findFirstMatch(text, [
    /\bbill to\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|country|state|invoice|project|work|rate|currency|payment|bank)\b|$)/i,
    /\binvoice\s+(?:for|to)\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|country|state|invoice|project|work|rate|currency|payment|bank)\b|$)/i,
    /\bfor\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|country|state|invoice|project|work|landing|homepage|logo|illustration|screens?|banners?|rate|currency|payment|bank)\b|$)/i,
    /\b(?:client|recipient)\s+(?:is\s+)?([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|country|state|invoice|project|work|rate|currency|payment|bank)\b|$)/i,
    /\byour brand\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|$)/i,
  ]);

  return inferred
    ? buildRoleCandidate(inferred, "client", "medium", "role context")
    : undefined;
}

export function collectRoleContextFromText(text: string, role: InferredRole) {
  return buildRoleContext(text, role);
}

export function inferNameRolesFromText(text: string): InferredNameRoles {
  return {
    agency: inferAgencyName(text),
    client: inferClientName(text),
    agencyContext: buildRoleContext(text, "agency"),
    clientContext: buildRoleContext(text, "client"),
  };
}
