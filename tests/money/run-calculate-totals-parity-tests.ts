/**
 * calculateInvoiceTotals parity — the adapter must return exactly what the
 * implementation it replaced returned.
 *
 * Run: npx tsx tests/money/run-calculate-totals-parity-tests.ts
 *
 * `legacyCalculateInvoiceTotals` below is a FROZEN VERBATIM COPY of the function
 * as it stood at 138c11c, before it was put onto the engine. It is duplicated
 * here on purpose: once the real one is an adapter there is nothing left to
 * compare against, and a parity test that compares the new code to itself proves
 * nothing. Do not "tidy" it, do not make it import anything — its only job is to
 * still behave the way the old one did.
 *
 * Every one of the thirteen fields of InvoiceComputedValues is compared.
 *
 * When calculateInvoiceTotals is finally deleted, delete this file with it.
 */
import assert from "node:assert/strict";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { computeInvoiceTax } from "@/lib/invoice-tax";

// ---------------------------------------------------------------------------
// FROZEN COPY — lib/invoice-calculations.ts @ 138c11c
// ---------------------------------------------------------------------------
function legacyCalculateInvoiceTotals(formData: any): any {
  const lineItems = formData?.lineItems || [];
  const milestones = formData?.milestones || [];
  const isRcmEnabled = formData?.tax?.isRcmEnabled || false;

  const effectiveItems =
    milestones && milestones.length > 0
      ? (milestones[0]?.lineItems ?? [])
      : lineItems;

  const subtotal = effectiveItems.reduce((sum: number, item: any) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    return sum + qty * rate;
  }, 0);

  const taxBreakdown = computeInvoiceTax(formData, subtotal);

  return {
    subtotal,
    grandTotal: subtotal + (isRcmEnabled ? 0 : taxBreakdown.taxAmount),
    isRcmEnabled,
    ...taxBreakdown,
  };
}
// ---------------------------------------------------------------------------

/**
 * Eleven of the thirteen fields must be byte-identical.
 *
 * `cgst` and `sgst` are compared separately below. The frozen implementation
 * derived them as `Number((taxAmount / 2).toFixed(2))` and a remainder, so which
 * component received the odd paisa depended on the binary representation of the
 * half: (111.115).toFixed(2) rounds DOWN, (74.075).toFixed(2) rounds UP. The
 * engine instead splits in integer paise and always gives the odd paisa to SGST.
 *
 * What is asserted for those two is what actually has to hold: their sum is the
 * slab tax exactly, each is within one paisa of the legacy figure, and the pair
 * is a permutation of the legacy pair. Total tax, grand total and payable are
 * unaffected and are asserted byte-identical like everything else.
 */
const FIELDS = [
  "subtotal", "grandTotal", "isRcmEnabled", "registered", "taxType", "rate",
  "taxableValue", "igst", "taxAmount", "totalPayable", "label",
] as const;

const SUPPLY_DATE = "2026-06-01";
const VALID_FY = "fy_2026_27";

const REGISTRATION = ["registered", "not-registered", ""] as const;
const STATES = ["Karnataka", "Maharashtra", ""] as const;
const LUT_AVAILABILITY = ["", "yes", "no"] as const;
const NO_LUT_HANDLING = ["", "add-igst"] as const;
const LOCATIONS = ["domestic", "international"] as const;
const SEZ = ["", "yes", "no"] as const;
const RCM = [false, true] as const;
const RATES = [18, 12, 0] as const;

/** Line-item shapes: milestone-billed, flat-billed, empty, and string numerics. */
const ITEM_SHAPES: { name: string; patch: Record<string, unknown> }[] = [
  { name: "milestones[0]", patch: { milestones: [{ lineItems: [{ qty: 2, rate: 30000 }, { qty: 1, rate: 40000 }] }, { lineItems: [{ qty: 1, rate: 999999 }] }] } },
  { name: "flat lineItems", patch: { lineItems: [{ qty: 3, rate: 42000 }] } },
  { name: "string numerics", patch: { milestones: [{ lineItems: [{ qty: "12", rate: "3200" }, { qty: "1", rate: "72000" }] }] } },
  { name: "odd paisa", patch: { milestones: [{ lineItems: [{ qty: 1, rate: 1234.61 }] }] } },
  { name: "empty milestone", patch: { milestones: [{ lineItems: [] }] } },
  { name: "no items at all", patch: {} },
];

let swept = 0;
const failures: string[] = [];

for (const shape of ITEM_SHAPES)
  for (const gstRegistrationStatus of REGISTRATION)
    for (const agencyState of STATES)
      for (const clientState of STATES)
        for (const lutAvailability of LUT_AVAILABILITY)
          for (const noLutTaxHandling of NO_LUT_HANDLING)
            for (const clientLocation of LOCATIONS)
              for (const isClientSezUnit of SEZ)
                for (const isRcmEnabled of RCM)
                  for (const taxRate of RATES) {
                    const formData: any = {
                      agency: {
                        gstRegistrationStatus, gstin: "", agencyState,
                        lutAvailability,
                        lutValidity: lutAvailability === "yes" ? VALID_FY : "",
                        noLutTaxHandling,
                      },
                      client: { clientState, clientLocation, isClientSezUnit },
                      tax: { taxRate, isRcmEnabled },
                      meta: { invoiceDate: SUPPLY_DATE },
                      ...shape.patch,
                    };

                    const legacy = legacyCalculateInvoiceTotals(formData);
                    const actual = calculateInvoiceTotals(formData);
                    swept += 1;

                    const where =
                      `${shape.name} reg=${gstRegistrationStatus || "-"} aSt=${agencyState || "-"} ` +
                      `cSt=${clientState || "-"} lut=${lutAvailability || "-"} noLut=${noLutTaxHandling || "-"} ` +
                      `loc=${clientLocation} sez=${isClientSezUnit || "-"} rcm=${isRcmEnabled} rate=${taxRate}`;

                    for (const field of FIELDS) {
                      if (legacy[field] !== (actual as any)[field]) {
                        failures.push(
                          `${where} :: ${field} ${JSON.stringify(legacy[field])} vs ${JSON.stringify((actual as any)[field])}`,
                        );
                      }
                    }

                    // CGST/SGST. Only an intrastate supply splits; every other
                    // treatment must report both as a plain zero, exactly as before.
                    if (actual.taxType !== "cgst_sgst") {
                      if (actual.cgst !== legacy.cgst)
                        failures.push(`${where} :: cgst ${legacy.cgst} vs ${actual.cgst} on ${actual.taxType}`);
                      if (actual.sgst !== legacy.sgst)
                        failures.push(`${where} :: sgst ${legacy.sgst} vs ${actual.sgst} on ${actual.taxType}`);
                    } else {
                      const sumNew = Math.round((actual.cgst + actual.sgst) * 100);
                      const sumOld = Math.round((legacy.cgst + legacy.sgst) * 100);
                      const taxPaise = Math.round(actual.taxAmount * 100);
                      if (sumNew !== taxPaise)
                        failures.push(`${where} :: cgst+sgst ${sumNew} !== taxAmount ${taxPaise} paise`);
                      if (sumNew !== sumOld)
                        failures.push(`${where} :: cgst+sgst ${sumNew} vs legacy ${sumOld} paise`);
                      if (Math.abs(Math.round(actual.cgst * 100) - Math.round(legacy.cgst * 100)) > 1)
                        failures.push(`${where} :: cgst moved more than one paisa, ${legacy.cgst} vs ${actual.cgst}`);
                      if (Math.abs(Math.round(actual.sgst * 100) - Math.round(legacy.sgst * 100)) > 1)
                        failures.push(`${where} :: sgst moved more than one paisa, ${legacy.sgst} vs ${actual.sgst}`);
                      if (actual.cgst > actual.sgst)
                        failures.push(`${where} :: odd paisa must go to SGST, got cgst=${actual.cgst} sgst=${actual.sgst}`);
                    }
                  }

for (const line of failures.slice(0, 20)) console.log(`FAIL  ${line}`);
console.log(
  failures.length === 0
    ? `PASS  ${swept} form-data shapes — 11 fields identical, CGST/SGST sum-exact and stable`
    : `\n${failures.length} field divergences across ${swept} shapes`,
);

// The adapter must not have quietly started rounding.
const paisa = calculateInvoiceTotals({
  agency: { gstRegistrationStatus: "registered", gstin: "", agencyState: "Karnataka", lutAvailability: "", lutValidity: "", noLutTaxHandling: "" },
  client: { clientState: "Karnataka", clientLocation: "domestic", isClientSezUnit: "no" },
  tax: { taxRate: 18, isRcmEnabled: false },
  meta: { invoiceDate: SUPPLY_DATE },
  milestones: [{ lineItems: [{ qty: 1, rate: 1234.61 }] }],
});
let rounding = 0;
try {
  assert.equal(paisa.grandTotal, 1456.84, "grandTotal must stay unrounded");
  assert.equal(paisa.totalPayable, 1456.84, "totalPayable must stay unrounded");
  assert.notEqual(paisa.grandTotal, 1457, "must NOT be the Sec 170 whole-rupee figure");
  rounding = 1;
  console.log("PASS  rounding unchanged — grandTotal still unrounded gross");
} catch (error) {
  console.log(`FAIL  rounding :: ${(error as Error).message.split("\n")[0]}`);
}

if (failures.length > 0 || rounding !== 1) process.exit(1);
