/**
 * Golden fixtures for the money engine.
 *
 * Run: npx tsx tests/money/run-money-engine-fixtures.ts
 *
 * Every expected figure below is stated explicitly rather than derived from the
 * engine, so a change in engine behaviour fails here instead of silently
 * agreeing with itself. The last three groups (LUT lapse, registration acquired,
 * rate revised) are the ones nobody catches by hand: each is a PAIR of the same
 * contract taxed on two different dates of supply.
 */
import assert from "node:assert/strict";
import { computeInvoiceMoney } from "../../lib/money/compute-invoice-money";
import type { MoneyLine, TaxContext } from "../../lib/money/types";

const BASE: TaxContext = {
  supplyDate: "2026-06-01",
  supplierRegistered: true,
  supplierState: "Karnataka",
  recipientState: "Karnataka",
  recipientLocation: "domestic",
  recipientIsSez: false,
  lutDeclared: "",
  lutFinancialYear: "",
  noLutHandling: "keep-zero-tax",
  reverseCharge: false,
  defaultRate: 18,
};

const ctx = (patch: Partial<TaxContext>): TaxContext => ({ ...BASE, ...patch });
const ONE_LAKH: MoneyLine[] = [{ qty: 1, rate: 100000 }];

type Expected = {
  taxableValue: number;
  taxTotal: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  roundOff: number;
  amountPayable: number;
  treatment: string;
  slabCount?: number;
  warnings?: string[];
};

type Fixture = {
  name: string;
  lines: MoneyLine[];
  context: TaxContext;
  expect: Expected;
};

const FIXTURES: Fixture[] = [
  {
    name: "1. unregistered supplier",
    lines: ONE_LAKH,
    context: ctx({ supplierRegistered: false }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "unregistered" },
  },
  {
    name: "2. reverse charge",
    lines: ONE_LAKH,
    context: ctx({ reverseCharge: true }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "reverse_charge" },
  },
  {
    name: "3. intrastate CGST + SGST",
    lines: ONE_LAKH,
    context: ctx({}),
    expect: { taxableValue: 100000, taxTotal: 18000, cgstTotal: 9000, sgstTotal: 9000, igstTotal: 0, roundOff: 0, amountPayable: 118000, treatment: "intrastate" },
  },
  {
    name: "4. interstate IGST",
    lines: ONE_LAKH,
    context: ctx({ recipientState: "Maharashtra" }),
    expect: { taxableValue: 100000, taxTotal: 18000, cgstTotal: 0, sgstTotal: 0, igstTotal: 18000, roundOff: 0, amountPayable: 118000, treatment: "interstate" },
  },
  {
    name: "5. export with valid LUT — zero rated",
    lines: ONE_LAKH,
    context: ctx({ recipientLocation: "international", recipientState: "", lutDeclared: "yes", lutFinancialYear: "fy_2026_27" }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "export_zero_rated", warnings: [] },
  },
  {
    name: "6. export, no LUT, agency chose add-igst",
    lines: ONE_LAKH,
    context: ctx({ recipientLocation: "international", recipientState: "", lutFinancialYear: "", noLutHandling: "add-igst" }),
    expect: { taxableValue: 100000, taxTotal: 18000, igstTotal: 18000, roundOff: 0, amountPayable: 118000, treatment: "export_igst", warnings: [] },
  },
  {
    name: "6b. export, nothing stated about a LUT — zero-rates but warns",
    lines: ONE_LAKH,
    context: ctx({ recipientLocation: "international", recipientState: "", lutDeclared: "", lutFinancialYear: "", noLutHandling: "keep-zero-tax" }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "export_zero_rated", warnings: ["LUT_VALIDITY_MISSING"] },
  },
  {
    name: "6c. export, LUT explicitly declared absent — charges IGST",
    lines: ONE_LAKH,
    context: ctx({ recipientLocation: "international", recipientState: "", lutDeclared: "no", noLutHandling: "keep-zero-tax" }),
    expect: { taxableValue: 100000, taxTotal: 18000, igstTotal: 18000, roundOff: 0, amountPayable: 118000, treatment: "export_igst", warnings: [] },
  },
  {
    name: "7. SEZ recipient with valid LUT",
    lines: ONE_LAKH,
    context: ctx({ recipientIsSez: true, lutDeclared: "yes", lutFinancialYear: "fy_2026_27" }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "sez_zero_rated" },
  },
  {
    name: "8. mixed slabs 18% + 12% on one intrastate invoice",
    lines: [
      { qty: 1, rate: 100000, taxRate: 18 },
      { qty: 1, rate: 50000, taxRate: 12 },
    ],
    context: ctx({}),
    expect: { taxableValue: 150000, taxTotal: 24000, cgstTotal: 12000, sgstTotal: 12000, roundOff: 0, amountPayable: 174000, treatment: "intrastate", slabCount: 2 },
  },
  {
    name: "9. zero-value invoice",
    lines: [],
    context: ctx({}),
    expect: { taxableValue: 0, taxTotal: 0, roundOff: 0, amountPayable: 0, treatment: "intrastate", slabCount: 0 },
  },
  {
    name: "10. rounding edge — odd paisa split across CGST/SGST",
    lines: [{ qty: 1, rate: 1234.61 }],
    context: ctx({}),
    expect: { taxableValue: 1234.61, taxTotal: 222.23, cgstTotal: 111.12, sgstTotal: 111.11, roundOff: 0.16, amountPayable: 1457, treatment: "intrastate" },
  },
  {
    name: "11a. LUT valid — M1 supplied 10 Feb 2026 under FY 2025-26 LUT",
    lines: ONE_LAKH,
    context: ctx({ supplyDate: "2026-02-10", recipientLocation: "international", recipientState: "", lutDeclared: "yes", lutFinancialYear: "fy_2025_26" }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "export_zero_rated", warnings: [] },
  },
  {
    name: "11b. LUT LAPSED — same contract, M2 supplied 15 Apr 2026",
    lines: ONE_LAKH,
    context: ctx({ supplyDate: "2026-04-15", recipientLocation: "international", recipientState: "", lutDeclared: "yes", lutFinancialYear: "fy_2025_26" }),
    expect: { taxableValue: 100000, taxTotal: 18000, igstTotal: 18000, roundOff: 0, amountPayable: 118000, treatment: "export_igst", warnings: ["LUT_LAPSED"] },
  },
  {
    name: "12a. registration not yet acquired — M1",
    lines: ONE_LAKH,
    context: ctx({ supplierRegistered: false }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "unregistered" },
  },
  {
    name: "12b. registration acquired mid-project — M2",
    lines: ONE_LAKH,
    context: ctx({ supplierRegistered: true }),
    expect: { taxableValue: 100000, taxTotal: 18000, roundOff: 0, amountPayable: 118000, treatment: "intrastate" },
  },
  {
    name: "13a. rate before revision — 18%",
    lines: ONE_LAKH,
    context: ctx({ defaultRate: 18 }),
    expect: { taxableValue: 100000, taxTotal: 18000, roundOff: 0, amountPayable: 118000, treatment: "intrastate" },
  },
  {
    name: "13b. rate revised mid-project — 12%",
    lines: ONE_LAKH,
    context: ctx({ defaultRate: 12 }),
    expect: { taxableValue: 100000, taxTotal: 12000, cgstTotal: 6000, sgstTotal: 6000, roundOff: 0, amountPayable: 112000, treatment: "intrastate" },
  },
  {
    name: "14. state unresolved — refuses to guess intra vs interstate",
    lines: ONE_LAKH,
    context: ctx({ recipientState: "" }),
    expect: { taxableValue: 100000, taxTotal: 0, roundOff: 0, amountPayable: 100000, treatment: "indeterminate", warnings: ["STATE_UNRESOLVED"] },
  },
];

let failures = 0;

for (const fixture of FIXTURES) {
  const money = computeInvoiceMoney(fixture.lines, fixture.context);
  const e = fixture.expect;
  try {
    assert.equal(money.taxableValue, e.taxableValue, "taxableValue");
    assert.equal(money.taxTotal, e.taxTotal, "taxTotal");
    if (e.cgstTotal !== undefined) assert.equal(money.cgstTotal, e.cgstTotal, "cgstTotal");
    if (e.sgstTotal !== undefined) assert.equal(money.sgstTotal, e.sgstTotal, "sgstTotal");
    if (e.igstTotal !== undefined) assert.equal(money.igstTotal, e.igstTotal, "igstTotal");
    assert.equal(money.roundOff, e.roundOff, "roundOff");
    assert.equal(money.amountPayable, e.amountPayable, "amountPayable");
    assert.equal(money.treatment, e.treatment, "treatment");
    if (e.slabCount !== undefined) assert.equal(money.slabs.length, e.slabCount, "slabs.length");
    if (e.warnings !== undefined) {
      assert.deepEqual(money.warnings.map((w) => w.code).sort(), [...e.warnings].sort(), "warnings");
    }
    assert.equal(money.grossBeforeRounding, Math.round((e.taxableValue + money.taxTotal) * 100) / 100, "grossBeforeRounding");
    // Invariant, every fixture: the parts must reconstruct the payable exactly.
    assert.equal(
      Math.round((e.taxableValue + money.taxTotal + money.roundOff) * 100) / 100,
      money.amountPayable,
      "taxableValue + taxTotal + roundOff !== amountPayable",
    );
    // Invariant: CGST and SGST must sum to the slab tax, no paisa lost.
    for (const slab of money.slabs) {
      assert.equal(
        Math.round((slab.cgst + slab.sgst + slab.igst) * 100) / 100,
        slab.taxAmount,
        `slab ${slab.rate}% components !== taxAmount`,
      );
    }
    console.log(`PASS  ${fixture.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${fixture.name}`);
    console.log(`      ${(error as Error).message}`);
    console.log(`      got: ${JSON.stringify({ taxableValue: money.taxableValue, taxTotal: money.taxTotal, cgstTotal: money.cgstTotal, sgstTotal: money.sgstTotal, igstTotal: money.igstTotal, roundOff: money.roundOff, amountPayable: money.amountPayable, treatment: money.treatment, slabs: money.slabs.length, warnings: money.warnings.map((w) => w.code) })}`);
  }
}

console.log(`\n${FIXTURES.length - failures}/${FIXTURES.length} fixtures passed`);
if (failures > 0) process.exit(1);
