/**
 * The engine has emitted warnings since it was written, and for months nothing
 * displayed them: a 14-lakh draft could sit at 0% GST with a registered
 * supplier and say nothing. The gap was not in the rules, it was in the wiring.
 *
 * So this asserts the WIRING - that `calculateInvoiceTotals` carries the
 * engine's warnings out to the value the editor renders. The rules themselves
 * are covered by run-money-engine-fixtures.
 */
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import type { MoneyWarningCode } from "@/lib/money/types";

const REGISTERED = {
  gstRegistrationStatus: "registered",
  gstin: "29ABLPB2947K1ZC",
  agencyState: "Karnataka",
  lutAvailability: "no",
  noLutTaxHandling: "",
};
const DOMESTIC = {
  clientState: "Karnataka",
  clientLocation: "domestic",
  isClientSezUnit: "no",
  clientCountry: "",
};
const ONE_LINE = [{ id: "m1", lineItems: [{ qty: "1", rate: "1400000" }] }];

function codesFor(formData: unknown): MoneyWarningCode[] {
  return calculateInvoiceTotals(formData as never).warnings.map((w) => w.code);
}

const cases: [string, unknown, MoneyWarningCode[]][] = [
  [
    "clean intrastate invoice warns about nothing",
    { agency: REGISTERED, client: DOMESTIC, tax: { taxRate: 18, isRcmEnabled: false },
      meta: { invoiceDate: "2026-05-23" }, milestones: ONE_LINE },
    [],
  ],
  [
    "INV-2026-7512 shape - registered supplier billing at 0%",
    { agency: REGISTERED, client: { ...DOMESTIC, clientState: "Maharashtra" },
      tax: { taxRate: 0, isRcmEnabled: false },
      meta: { invoiceDate: "2026-09-15" }, milestones: ONE_LINE },
    ["REGISTERED_BUT_ZERO_RATE"],
  ],
  [
    "place of supply cannot be decided",
    { agency: { ...REGISTERED, agencyState: "" }, client: { ...DOMESTIC, clientState: "" },
      tax: { taxRate: 18, isRcmEnabled: false },
      meta: { invoiceDate: "2026-05-23" }, milestones: ONE_LINE },
    ["STATE_UNRESOLVED"],
  ],
  [
    "a credit note masquerading as an invoice",
    { agency: REGISTERED, client: DOMESTIC, tax: { taxRate: 18, isRcmEnabled: false },
      meta: { invoiceDate: "2026-05-23" },
      milestones: [{ id: "m1", lineItems: [{ qty: "1", rate: "-5000" }] }] },
    ["NEGATIVE_LINE"],
  ],
  [
    "export with no LUT on record",
    { agency: { ...REGISTERED, lutAvailability: "" },
      client: { ...DOMESTIC, clientLocation: "international", clientState: "", clientCountry: "US" },
      tax: { taxRate: 18, isRcmEnabled: false },
      meta: { invoiceDate: "2026-05-23" }, milestones: ONE_LINE },
    ["LUT_VALIDITY_MISSING"],
  ],
  [
    "LUT that lapsed before the supply date",
    { agency: { ...REGISTERED, lutAvailability: "yes", lutValidity: "fy_2025_26" },
      client: { ...DOMESTIC, clientLocation: "international", clientState: "", clientCountry: "US" },
      tax: { taxRate: 18, isRcmEnabled: false },
      meta: { invoiceDate: "2026-09-15" }, milestones: ONE_LINE },
    ["LUT_LAPSED"],
  ],
];

const failures: string[] = [];
for (const [name, formData, expected] of cases) {
  const got = codesFor(formData);
  const same =
    got.length === expected.length && expected.every((c) => got.includes(c));
  console.log(
    same
      ? `PASS  ${name}`
      : `FAIL  ${name} :: expected [${expected.join(",")}] got [${got.join(",")}]`,
  );
  if (!same) failures.push(name);
}

// Every warning must carry a message a human can act on. A code alone is not
// a warning, it is a lookup key.
const sample = calculateInvoiceTotals({
  agency: REGISTERED, client: { ...DOMESTIC, clientState: "Maharashtra" },
  tax: { taxRate: 0, isRcmEnabled: false },
  meta: { invoiceDate: "2026-09-15" }, milestones: ONE_LINE,
} as never);
const spoken = sample.warnings.every((w) => typeof w.message === "string" && w.message.length > 20);
console.log(spoken ? "PASS  warnings carry a readable message, not just a code"
                   : "FAIL  a warning reached the UI with no usable message");
if (!spoken) failures.push("message");

console.log(`\n${cases.length + 1 - failures.length}/${cases.length + 1} warning-surfacing cases passed`);
if (failures.length > 0) process.exit(1);
