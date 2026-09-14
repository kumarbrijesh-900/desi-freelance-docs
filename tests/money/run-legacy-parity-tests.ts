/**
 * Legacy parity — the engine must agree with the function it replaces.
 *
 * Run: npx tsx tests/money/run-legacy-parity-tests.ts
 *
 * Sweeps every combination of the inputs computeInvoiceTax branches on and
 * asserts the engine produces the same tax, the same CGST/SGST/IGST split and
 * the same client-facing label. This is what makes it safe to put the existing
 * consumers onto the engine: not an argument that the new code is better, but a
 * proof that on every reachable input it is identical.
 *
 * The ONE intended difference is asserted separately at the bottom: a LUT that
 * is declared held but is not valid on the date of supply. The legacy function
 * has no date input and cannot see it, so that case is excluded from the sweep
 * (every swept combination uses a LUT valid on the swept date) and pinned below.
 *
 * When computeInvoiceTax is finally deleted, delete this file with it.
 */
import assert from "node:assert/strict";
import { computeInvoiceTax } from "@/lib/invoice-tax";
import { computeInvoiceMoney } from "@/lib/money/compute-invoice-money";
import { buildTaxContext } from "@/lib/money/tax-context";

const SUPPLY_DATE = "2026-06-01";
/** Covers 2026-04-01..2027-03-31, so every swept LUT is valid on SUPPLY_DATE. */
const VALID_FY = "fy_2026_27";
const SUBTOTAL = 100000;

const REGISTRATION = ["registered", "not-registered", ""] as const;
const STATES = ["Karnataka", "Maharashtra", ""] as const;
const LUT_AVAILABILITY = ["", "yes", "no"] as const;
const NO_LUT_HANDLING = ["", "add-igst", "keep-zero-tax"] as const;
const LOCATIONS = ["domestic", "international"] as const;
const SEZ = ["", "yes", "no", "not-sure"] as const;
const RCM = [false, true] as const;
const RATES = [18, 12, 0] as const;

let swept = 0;
const failures: string[] = [];

for (const gstRegistrationStatus of REGISTRATION)
  for (const agencyState of STATES)
    for (const clientState of STATES)
      for (const lutAvailability of LUT_AVAILABILITY)
        for (const noLutTaxHandling of NO_LUT_HANDLING)
          for (const clientLocation of LOCATIONS)
            for (const isClientSezUnit of SEZ)
              for (const isRcmEnabled of RCM)
                for (const taxRate of RATES) {
                  const agency = {
                    gstRegistrationStatus,
                    gstin: "",
                    agencyState,
                    lutAvailability,
                    lutValidity: lutAvailability === "yes" ? VALID_FY : "",
                    noLutTaxHandling,
                  };
                  const client = { clientState, clientLocation, isClientSezUnit };
                  const tax = { taxRate, isRcmEnabled };

                  const legacy = computeInvoiceTax(
                    { agency, client, tax, meta: { invoiceDate: SUPPLY_DATE } },
                    SUBTOTAL,
                  );
                  const money = computeInvoiceMoney(
                    [{ qty: 1, rate: SUBTOTAL }],
                    buildTaxContext({
                      agency: agency as never,
                      client: client as never,
                      tax: tax as never,
                      supplyDate: SUPPLY_DATE,
                    }),
                  );

                  swept += 1;
                  const where =
                    `reg=${gstRegistrationStatus || "-"} aSt=${agencyState || "-"} ` +
                    `cSt=${clientState || "-"} lut=${lutAvailability || "-"} ` +
                    `noLut=${noLutTaxHandling || "-"} loc=${clientLocation} ` +
                    `sez=${isClientSezUnit || "-"} rcm=${isRcmEnabled} rate=${taxRate}`;

                  if (legacy.taxAmount !== money.taxTotal)
                    failures.push(`${where} :: taxAmount ${legacy.taxAmount} vs ${money.taxTotal}`);
                  if (legacy.cgst !== money.cgstTotal)
                    failures.push(`${where} :: cgst ${legacy.cgst} vs ${money.cgstTotal}`);
                  if (legacy.sgst !== money.sgstTotal)
                    failures.push(`${where} :: sgst ${legacy.sgst} vs ${money.sgstTotal}`);
                  if (legacy.igst !== money.igstTotal)
                    failures.push(`${where} :: igst ${legacy.igst} vs ${money.igstTotal}`);
                  if (legacy.label !== money.label)
                    failures.push(`${where} :: label "${legacy.label}" vs "${money.label}"`);
                  if (legacy.totalPayable !== money.grossBeforeRounding)
                    failures.push(`${where} :: payable ${legacy.totalPayable} vs ${money.grossBeforeRounding}`);
                }

for (const line of failures.slice(0, 20)) console.log(`FAIL  ${line}`);
console.log(
  failures.length === 0
    ? `PASS  ${swept} combinations, engine identical to computeInvoiceTax on all of them`
    : `\n${failures.length} divergences across ${swept} combinations`,
);

// ---------------------------------------------------------------------------
// The one intended difference: a LUT the legacy function cannot date-check.
// ---------------------------------------------------------------------------
function exportUnder(lutFy: string, supplyDate: string) {
  const agency = {
    gstRegistrationStatus: "registered",
    gstin: "",
    agencyState: "Karnataka",
    lutAvailability: "yes",
    lutValidity: lutFy,
    noLutTaxHandling: "",
  };
  const client = { clientState: "", clientLocation: "international", isClientSezUnit: "no" };
  const tax = { taxRate: 18, isRcmEnabled: false };
  return {
    legacy: computeInvoiceTax({ agency, client, tax }, SUBTOTAL),
    money: computeInvoiceMoney(
      [{ qty: 1, rate: SUBTOTAL }],
      buildTaxContext({
        agency: agency as never,
        client: client as never,
        tax: tax as never,
        supplyDate,
      }),
    ),
  };
}

let intended = 0;
try {
  const before = exportUnder("fy_2025_26", "2026-02-10");
  assert.equal(before.legacy.taxAmount, 0, "legacy zero-rates a valid LUT");
  assert.equal(before.money.taxTotal, 0, "engine agrees while the LUT is valid");
  assert.equal(before.money.treatment, "export_zero_rated");
  assert.deepEqual(before.money.warnings, []);

  const after = exportUnder("fy_2025_26", "2026-04-15");
  assert.equal(after.legacy.taxAmount, 0, "legacy still zero-rates — it cannot see the date");
  assert.equal(after.money.taxTotal, 18000, "engine charges IGST once the LUT has lapsed");
  assert.equal(after.money.treatment, "export_igst");
  assert.deepEqual(after.money.warnings.map((w) => w.code), ["LUT_LAPSED"]);

  intended = 1;
  console.log("PASS  intended divergence — LUT lapsing 31 Mar is caught by the engine, missed by legacy");
} catch (error) {
  console.log(`FAIL  intended divergence :: ${(error as Error).message.split("\n")[0]}`);
}

if (failures.length > 0 || intended !== 1) process.exit(1);
