/**
 * Signed-in hydration probe — offline replay, no network.
 *
 * The live probe hydrates onto a BLANK form (guest). Signed-in users start with
 * profile-prefilled payment fields, and applyStringField() discards any incoming
 * candidate whose target is already non-blank (-> preservedFields). This replays
 * the same captured parser responses onto a profile-shaped base to measure which
 * brief-stated values are lost.
 *
 * Run: npx tsx tests/extraction/run-signed-in-hydration-probe.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BriefParserResponse } from "@/lib/brief-parser-gateway";
import { hydrateInvoiceFormFromParsedExtraction } from "@/lib/invoice-parsed-extraction-hydration";
import { mergeInvoiceFormData } from "@/types/invoice";
import type { InvoiceFormData } from "@/types/invoice";

const CAPTURE = join(
  process.cwd(),
  "tests/extraction/live-engine-capture-2026-07-19.json",
);

/** A saved profile as profileToPaymentDefaults() would prefill it. */
function buildSignedInBase(): InvoiceFormData {
  const base = mergeInvoiceFormData();
  return mergeInvoiceFormData({
    ...base,
    payment: {
      ...base.payment,
      accountName: "Ruhnika Kapoor",
      bankName: "HDFC Bank",
      accountNumber: "99998888777766",
      ifscCode: "HDFC0000123",
    },
  });
}

type Assertion = {
  scenario: string;
  name: string;
  fn: (f: InvoiceFormData) => boolean;
};

/**
 * Only unambiguous cases. A stale beneficiary or IFSC on a live invoice is a
 * payment failure — the brief must win over a profile default.
 */
const ASSERTIONS: Assertion[] = [
  {
    scenario: "D1",
    name: "brief VPA beats profile account name",
    fn: (f) => f.payment.accountName === "ruhnika@okhdfcbank",
  },
  {
    scenario: "D2",
    name: "brief IFSC beats profile IFSC",
    fn: (f) => f.payment.ifscCode === "HDFC0001234",
  },
  {
    scenario: "D2",
    name: "brief account number beats profile account number",
    fn: (f) => f.payment.accountNumber === "50200045671234",
  },
  {
    scenario: "F1",
    name: "CONTROL — SWIFT hydrates (profile leaves it blank)",
    fn: (f) => f.payment.swiftBicCode === "ICICINBBXXX",
  },
];

function main() {
  let captures: Record<string, BriefParserResponse>;
  try {
    captures = JSON.parse(readFileSync(CAPTURE, "utf8"));
  } catch {
    console.error(
      "ABORT: capture not found. Run run-live-engine-probe.ts first.",
    );
    process.exit(1);
  }

  const rows: string[] = [];
  const detail: string[] = [];
  let pass = 0;
  let total = 0;

  for (const key of Object.keys(captures)) {
    const resp = captures[key];

    const guest = hydrateInvoiceFormFromParsedExtraction({
      currentFormData: mergeInvoiceFormData(),
      parserResponse: resp,
    });
    const signedIn = hydrateInvoiceFormFromParsedExtraction({
      currentFormData: buildSignedInBase(),
      parserResponse: resp,
    });

    // Fields the brief supplied that the guest run wrote but the signed-in run refused.
    const guestPaths = new Set(guest.hydratedFields.map((h) => h.path));
    const lost = signedIn.preservedFields.filter((p) => guestPaths.has(p.path));

    rows.push(
      `| ${key} | ${guest.hydratedFields.length} | ${signedIn.hydratedFields.length} | ${signedIn.preservedFields.length} | ${lost.length} |`,
    );
    if (lost.length) {
      detail.push(
        `### ${key} — ${lost.length} brief value(s) discarded`,
        ...lost.map(
          (l) =>
            `- \`${l.path}\` (${l.label}) — guest wrote it; signed-in kept the profile value`,
        ),
        "",
      );
    }

    for (const a of ASSERTIONS.filter((x) => x.scenario === key)) {
      total += 1;
      let ok = false;
      try {
        ok = a.fn(signedIn.nextFormData);
      } catch {
        ok = false;
      }
      if (ok) pass += 1;
      console.log(`${key} :: ${a.name} — ${ok ? "PASS" : "FAIL"}`);
    }
  }

  const report = [
    "# Signed-in Hydration Report",
    "",
    "Offline replay of `live-engine-capture-2026-07-19.json` onto a profile-shaped",
    "base form (payment prefilled as profileToPaymentDefaults would). Measures what",
    "the signed-in path discards versus the guest path the live battery covers.",
    "",
    "| Scenario | Guest hydrated | Signed-in hydrated | Signed-in preserved | Brief values LOST |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    `## ASSERTIONS: ${pass}/${total} passed`,
    "",
    ...(detail.length ? detail : ["No brief values were discarded.", ""]),
  ].join("\n");

  writeFileSync(
    join(process.cwd(), "tests/extraction/SIGNED_IN_HYDRATION_REPORT.md"),
    report,
  );
  console.log(`\nASSERTIONS: ${pass}/${total} — report written.`);
}

main();
