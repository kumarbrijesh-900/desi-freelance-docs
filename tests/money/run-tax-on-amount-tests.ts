/**
 * `computeTaxOnAmount` is the ONE way to tax an amount that is not the
 * invoice's own line-item total - a single milestone's value, say. Before it
 * existed, the dashboard and the invoice document each called
 * `computeInvoiceTax` directly, which is a second implementation of the tax
 * rules. That is how the invoice came to print correct CGST/SGST rows under a
 * TOTAL DUE that excluded them: rows from one implementation, total from the
 * other, and no way to see they disagreed.
 *
 * This sweeps every combination the legacy branches on and asserts the two
 * agree. It exists because the wrapper has logic of its own - a synthetic line
 * item and `milestones: undefined` - which `run-calculate-totals-parity-tests`
 * cannot see. If someone changes `billableLineItems`, this is what fails.
 *
 * Delete this file when `computeInvoiceTax` is deleted, not before.
 */
import { computeInvoiceTax } from "@/lib/invoice-tax";
import { computeTaxOnAmount } from "@/lib/invoice-calculations";

const REG = ["registered", "not-registered", ""];
const LOC = ["domestic", "international"];
const NOLUT = ["add-igst", "keep-zero-tax", ""];
const RCM = [true, false];
const RATE = [18, 12, 5, 0];
const STATES: [string, string][] = [
  ["Karnataka", "Karnataka"],
  ["Karnataka", "Maharashtra"],
  ["Karnataka", ""],
];
const SEZ = ["yes", "no"];
const AMOUNTS = [0, 1, 115000, 204000, 33333.33];

/**
 * A LUT is only a LUT when its financial year covers the supply date. The
 * engine checks that; the legacy takes "yes" at face value. Sweeping `yes`
 * WITHOUT a valid FY would therefore report hundreds of false divergences -
 * they are the intended divergence `run-legacy-parity-tests` already pins.
 * So every `yes` here carries a year that covers the supply date below.
 */
const LUTS: [string, string][] = [["yes", "fy_2026_27"], ["no", ""], ["", ""]];
const SUPPLY_DATE = "2026-05-23";

/**
 * cgst and sgst are compared as a SUM, not individually. On an odd number of
 * paisa the two implementations hand the spare paisa to different halves - the
 * engine gives it to SGST by design (see fixture 10, "odd paisa goes to
 * SGST"), the legacy gives it to CGST. Both sum to the same taxAmount, and
 * `run-calculate-totals-parity-tests` pins the same contract as "sum-exact".
 * Asserting the split would encode a rule the engine never promised.
 */
const FIELDS = [
  "registered", "taxType", "rate", "taxableValue",
  "igst", "taxAmount", "totalPayable",
] as const;

const HALVES_SUM = (legacy: Record<string, unknown>, engine: Record<string, unknown>) =>
  Number(legacy.cgst) + Number(legacy.sgst) === Number(engine.cgst) + Number(engine.sgst) &&
  Math.abs(Number(legacy.cgst) - Number(engine.cgst)) <= 0.01;

let swept = 0;
const divergences: string[] = [];

for (const gstRegistrationStatus of REG)
for (const clientLocation of LOC)
for (const [lutAvailability, lutValidity] of LUTS)
for (const noLutTaxHandling of NOLUT)
for (const isRcmEnabled of RCM)
for (const taxRate of RATE)
for (const [agencyState, clientState] of STATES)
for (const isClientSezUnit of SEZ)
for (const amount of AMOUNTS) {
  const formData = {
    agency: {
      gstRegistrationStatus,
      gstin: gstRegistrationStatus === "registered" ? "29ABLPB2947K1ZC" : "",
      agencyState, lutAvailability, lutValidity, noLutTaxHandling,
    },
    client: { clientState, clientLocation, isClientSezUnit, clientCountry: "" },
    tax: { taxMode: "gst", taxRate, isRcmEnabled },
    meta: { invoiceDate: SUPPLY_DATE },
  };

  const legacy = computeInvoiceTax(formData, amount) as Record<string, unknown>;
  const engine = computeTaxOnAmount(formData, amount) as unknown as Record<string, unknown>;
  swept++;

  const bad: string[] = FIELDS.filter((f) => legacy[f] !== engine[f]);
  if (!HALVES_SUM(legacy, engine)) bad.push("cgst+sgst");
  if (bad.length > 0 && divergences.length < 5) {
    divergences.push(
      `reg=${gstRegistrationStatus || "-"} loc=${clientLocation} lut=${lutAvailability || "-"} ` +
      `nolut=${noLutTaxHandling || "-"} rcm=${isRcmEnabled} rate=${taxRate} ` +
      `${agencyState}->${clientState || "-"} sez=${isClientSezUnit} amount=${amount} :: ` +
      bad.map((f) => `${f} legacy=${String(legacy[f] ?? "-")} engine=${String(engine[f] ?? "-")}`).join(", "),
    );
  } else if (bad.length > 0) {
    divergences.push("(further divergences suppressed)");
  }
}

if (divergences.length === 0) {
  console.log(`PASS  ${swept} combinations, computeTaxOnAmount identical to computeInvoiceTax`);
} else {
  console.log(`FAIL  ${divergences.length} divergences across ${swept} combinations`);
  divergences.slice(0, 5).forEach((d) => console.log(`      ${d}`));
}

// The taxable value must be the amount handed in, never re-derived from the
// invoice's own line items - that was the whole reason this function exists.
const withItems = {
  agency: { gstRegistrationStatus: "registered", gstin: "29ABLPB2947K1ZC", agencyState: "Karnataka" },
  client: { clientState: "Karnataka", clientLocation: "domestic", isClientSezUnit: "no" },
  tax: { taxMode: "gst", taxRate: 18, isRcmEnabled: false },
  meta: { invoiceDate: SUPPLY_DATE },
  milestones: [{ id: "m1", lineItems: [{ qty: "9", rate: "99999" }] }],
  lineItems: [{ qty: "7", rate: "77777" }],
};
const isolated = computeTaxOnAmount(withItems, 204000);
const ignoredItems =
  isolated.taxableValue === 204000 &&
  isolated.cgst === 18360 &&
  isolated.sgst === 18360 &&
  isolated.grandTotal === 240720;

console.log(
  ignoredItems
    ? "PASS  taxes the amount given, ignoring the invoice's own line items"
    : `FAIL  leaked the invoice's line items :: taxableValue=${isolated.taxableValue} grandTotal=${isolated.grandTotal}`,
);

if (divergences.length > 0 || !ignoredItems) process.exit(1);
