/**
 * Signed-in hydration probe — offline replay, no network.
 *
 * The live probe hydrates onto a BLANK form (guest). Signed-in users start with
 * profile-prefilled agency AND payment fields, and applyStringField() discards any
 * incoming candidate whose target is already non-blank (-> preservedFields).
 *
 * A preservation is recorded even when the two values are identical, so raw counts
 * overstate the damage. Each loss is therefore classified with the same normaliser
 * the "Differs from your saved profile" card uses:
 *   REAL   -> the card will show a row
 *   BENIGN -> suppressed, invisible to the user
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

/** Must match the suppression rule in BriefSummaryModal's conflict card. */
const normalizeForCompare = (value?: string) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** A saved profile as profileToAgencyDetails + profileToPaymentDefaults prefill it. */
function buildSignedInBase(): InvoiceFormData {
  const base = mergeInvoiceFormData();
  return mergeInvoiceFormData({
    ...base,
    agency: {
      ...base.agency,
      agencyName: "Ruhnika Creative Studio",
      addressLine1: "Plot 42, Saheed Nagar",
      city: "Bhubaneswar",
      pinCode: "751007",
      agencyState: "Odisha",
      gstin: "21AAPFR2345K1Z5",
      pan: "AAPFR2345K",
    },
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

function blockOf(path: string) {
  if (path.startsWith("payment.")) return "payment";
  if (path.startsWith("agency.")) return "agency";
  return "other";
}

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
  let realTotal = 0;
  let benignTotal = 0;
  let realPayment = 0;
  let realAgency = 0;

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

    const guestPaths = new Set(guest.hydratedFields.map((h) => h.path));
    const lost = signedIn.preservedFields.filter((p) => guestPaths.has(p.path));
    const real = lost.filter(
      (l) =>
        normalizeForCompare(l.incomingValue) !==
        normalizeForCompare(l.currentValue),
    );
    const benign = lost.length - real.length;

    realTotal += real.length;
    benignTotal += benign;
    realPayment += real.filter((l) => blockOf(l.path) === "payment").length;
    realAgency += real.filter((l) => blockOf(l.path) === "agency").length;

    rows.push(
      `| ${key} | ${guest.hydratedFields.length} | ${signedIn.hydratedFields.length} | ${lost.length} | ${benign} | **${real.length}** |`,
    );

    if (real.length) {
      detail.push(
        `### ${key} — ${real.length} card row(s)`,
        ...real.map(
          (l) =>
            `- [${blockOf(l.path)}] \`${l.path}\` (${l.label}) — brief said **${l.incomingValue ?? "?"}**, profile kept **${l.currentValue ?? "?"}**`,
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

    console.log(
      `${key}: lost=${lost.length} (real=${real.length}, benign=${benign})`,
    );
  }

  const scenarios = Object.keys(captures).length;
  const report = [
    "# Signed-in Hydration Report",
    "",
    "Offline replay of `live-engine-capture-2026-07-19.json` onto a profile-shaped",
    "base form (agency + payment prefilled as profileToAgencyDetails and",
    "profileToPaymentDefaults would). Measures what the signed-in path discards",
    "versus the guest path the live battery covers.",
    "",
    "BENIGN = discarded but identical after normalising case/whitespace; the conflict",
    "card suppresses these. REAL = the card will show a row.",
    "",
    "| Scenario | Guest hydrated | Signed-in hydrated | Discarded | Benign | REAL |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
    `## CARD FORECAST: ${realTotal} row(s) across ${scenarios} scenarios — ${realPayment} payment, ${realAgency} agency`,
    `## SUPPRESSED AS BENIGN: ${benignTotal}`,
    `## ASSERTIONS: ${pass}/${total} passed`,
    "",
    ...(detail.length ? detail : ["No real conflicts.", ""]),
  ].join("\n");

  writeFileSync(
    join(process.cwd(), "tests/extraction/SIGNED_IN_HYDRATION_REPORT.md"),
    report,
  );
  console.log(
    `\nCARD FORECAST: ${realTotal} rows (${realPayment} payment, ${realAgency} agency) · BENIGN: ${benignTotal} · ASSERTIONS: ${pass}/${total}`,
  );
}

main();
