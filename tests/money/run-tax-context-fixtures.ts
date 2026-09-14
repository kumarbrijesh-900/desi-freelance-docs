/**
 * Fixtures for buildTaxContext — the mapper from live records to a TaxContext.
 *
 * Run: npx tsx tests/money/run-tax-context-fixtures.ts
 *
 * Two groups. The first asserts each field's derivation in isolation. The
 * second runs buildTaxContext -> computeInvoiceMoney end to end against the two
 * shapes that actually exist in production today (one intrastate, one
 * interstate), so the mapper is pinned to real rows and not only to invented ones.
 */
import assert from "node:assert/strict";
import { buildTaxContext } from "../../lib/money/tax-context";
import type { TaxContextSources } from "../../lib/money/tax-context";
import { computeInvoiceMoney } from "../../lib/money/compute-invoice-money";

const AGENCY: TaxContextSources["agency"] = {
  gstRegistrationStatus: "registered",
  gstin: "29AAPFR2345K1Z5",
  agencyState: "Karnataka",
  lutAvailability: "",
  lutValidity: "",
  noLutTaxHandling: "",
};

const CLIENT: TaxContextSources["client"] = {
  clientState: "Karnataka",
  clientLocation: "domestic",
  isClientSezUnit: "no",
};

const TAX: TaxContextSources["tax"] = { taxRate: 18, isRcmEnabled: false };

function sources(patch: {
  agency?: Partial<TaxContextSources["agency"]>;
  client?: Partial<TaxContextSources["client"]>;
  tax?: Partial<TaxContextSources["tax"]>;
  supplyDate?: string;
}): TaxContextSources {
  return {
    agency: { ...AGENCY, ...(patch.agency ?? {}) },
    client: { ...CLIENT, ...(patch.client ?? {}) },
    tax: { ...TAX, ...(patch.tax ?? {}) },
    supplyDate: patch.supplyDate ?? "2026-06-01",
  };
}

type Case = { name: string; run: () => void };

const CASES: Case[] = [
  {
    name: "1. registered by explicit status",
    run: () => {
      const c = buildTaxContext(sources({ agency: { gstin: "" } }));
      assert.equal(c.supplierRegistered, true);
    },
  },
  {
    name: "2. registered by 15-char GSTIN even when status is blank",
    run: () => {
      const c = buildTaxContext(
        sources({ agency: { gstRegistrationStatus: "", gstin: "29AAPFR2345K1Z5" } }),
      );
      assert.equal(c.supplierRegistered, true);
    },
  },
  {
    name: "3. not registered when status is not-registered and GSTIN is short",
    run: () => {
      const c = buildTaxContext(
        sources({ agency: { gstRegistrationStatus: "not-registered", gstin: "29AAPF" } }),
      );
      assert.equal(c.supplierRegistered, false);
    },
  },
  {
    name: "4. LUT passes through when availability is yes and FY is set",
    run: () => {
      const c = buildTaxContext(
        sources({ agency: { lutAvailability: "yes", lutValidity: "fy_2026_27" } }),
      );
      assert.equal(c.lutFinancialYear, "fy_2026_27");
    },
  },
  {
    name: "5. LUT suppressed when availability is no, even if a FY is recorded",
    run: () => {
      const c = buildTaxContext(
        sources({ agency: { lutAvailability: "no", lutValidity: "fy_2026_27" } }),
      );
      assert.equal(c.lutFinancialYear, "");
    },
  },
  {
    name: "6. LUT suppressed when availability is yes but FY is blank",
    run: () => {
      const c = buildTaxContext(
        sources({ agency: { lutAvailability: "yes", lutValidity: "" } }),
      );
      assert.equal(c.lutFinancialYear, "");
    },
  },
  {
    name: "7. international client maps to international",
    run: () => {
      const c = buildTaxContext(sources({ client: { clientLocation: "international" } }));
      assert.equal(c.recipientLocation, "international");
    },
  },
  {
    name: "8. SEZ only when explicitly yes — not-sure is not yes",
    run: () => {
      assert.equal(buildTaxContext(sources({ client: { isClientSezUnit: "yes" } })).recipientIsSez, true);
      assert.equal(buildTaxContext(sources({ client: { isClientSezUnit: "not-sure" } })).recipientIsSez, false);
      assert.equal(buildTaxContext(sources({ client: { isClientSezUnit: "" } })).recipientIsSez, false);
    },
  },
  {
    name: "9. rate 0 survives; absent rate falls back to 18",
    run: () => {
      assert.equal(buildTaxContext(sources({ tax: { taxRate: 0 } })).defaultRate, 0);
      assert.equal(
        buildTaxContext(sources({ tax: { taxRate: undefined as unknown as number } })).defaultRate,
        18,
      );
    },
  },
  {
    name: "10. reverse charge is coerced to a real boolean",
    run: () => {
      assert.equal(buildTaxContext(sources({ tax: { isRcmEnabled: true } })).reverseCharge, true);
      assert.equal(buildTaxContext(sources({ tax: { isRcmEnabled: false } })).reverseCharge, false);
    },
  },
  {
    name: "11. noLutTaxHandling defaults to keep-zero-tax, honours add-igst",
    run: () => {
      assert.equal(buildTaxContext(sources({})).noLutHandling, "keep-zero-tax");
      assert.equal(
        buildTaxContext(sources({ agency: { noLutTaxHandling: "add-igst" } })).noLutHandling,
        "add-igst",
      );
    },
  },
  {
    name: "12. END TO END — prod shape INV-2026-4078, Karnataka intrastate 18%",
    run: () => {
      const ctx = buildTaxContext(sources({ supplyDate: "2026-05-19" }));
      const money = computeInvoiceMoney([{ qty: 1, rate: 110400 }], ctx);
      assert.equal(money.treatment, "intrastate");
      assert.equal(money.taxableValue, 110400);
      assert.equal(money.cgstTotal, 9936);
      assert.equal(money.sgstTotal, 9936);
      assert.equal(money.taxTotal, 19872);
      assert.equal(money.roundOff, 0);
      assert.equal(money.amountPayable, 130272);
      assert.deepEqual(money.warnings, []);
    },
  },
  {
    name: "13. END TO END — prod shape INV-2026-1230, Maharashtra interstate 18%",
    run: () => {
      const ctx = buildTaxContext(
        sources({ client: { clientState: "Maharashtra" }, supplyDate: "2026-05-24" }),
      );
      const money = computeInvoiceMoney([{ qty: 1, rate: 148000 }], ctx);
      assert.equal(money.treatment, "interstate");
      assert.equal(money.igstTotal, 26640);
      assert.equal(money.cgstTotal, 0);
      assert.equal(money.amountPayable, 174640);
    },
  },
  {
    name: "14. END TO END — the LUT lapse, built from records not literals",
    run: () => {
      const held = {
        agency: { lutAvailability: "yes" as const, lutValidity: "fy_2025_26", noLutTaxHandling: "add-igst" as const },
        client: { clientLocation: "international" as const, clientState: "" as const },
      };
      const feb = computeInvoiceMoney(
        [{ qty: 1, rate: 100000 }],
        buildTaxContext(sources({ ...held, supplyDate: "2026-02-10" })),
      );
      const apr = computeInvoiceMoney(
        [{ qty: 1, rate: 100000 }],
        buildTaxContext(sources({ ...held, supplyDate: "2026-04-15" })),
      );
      assert.equal(feb.treatment, "export_zero_rated");
      assert.equal(feb.amountPayable, 100000);
      assert.equal(apr.treatment, "export_igst");
      assert.equal(apr.amountPayable, 118000);
      assert.deepEqual(apr.warnings.map((w) => w.code), ["LUT_LAPSED"]);
    },
  },
];

let failures = 0;
for (const testCase of CASES) {
  try {
    testCase.run();
    console.log(`PASS  ${testCase.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${testCase.name}`);
    console.log(`      ${(error as Error).message.split("\n")[0]}`);
  }
}

console.log(`\n${CASES.length - failures}/${CASES.length} tax-context cases passed`);
if (failures > 0) process.exit(1);
