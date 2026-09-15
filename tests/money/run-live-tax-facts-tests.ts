/**
 * Live tax facts — the three mid-project changes a child invoice must re-derive,
 * and the one it must not.
 *
 * Run: npx tsx tests/money/run-live-tax-facts-tests.ts
 *
 * Each case builds a parent snapshot, overlays the live rows as they stand on
 * the child's date of supply, and runs the result through the engine. The
 * assertion is on the money, not on the overlay — a correct overlay that still
 * produces the wrong tax is not a pass.
 */
import assert from "node:assert/strict";
import { overlayLiveTaxFacts } from "@/lib/money/live-tax-facts";
import type { RecipientTaxRow, SupplierTaxRow } from "@/lib/money/live-tax-facts";
import { computeInvoiceMoney } from "@/lib/money/compute-invoice-money";
import { buildTaxContext } from "@/lib/money/tax-context";

const PARENT = {
  agency: {
    gstRegistrationStatus: "not-registered",
    gstin: "",
    agencyState: "Karnataka",
    lutAvailability: "",
    lutNumber: "",
    lutValidity: "",
    noLutTaxHandling: "",
    agencyName: "Ruhnika Creative Studio",
  },
  client: {
    clientName: "Kadamba Studios",
    clientEmail: "accounts@kadamba.example",
    clientState: "Karnataka",
    clientCountry: "",
    clientLocation: "domestic",
    isClientSezUnit: "no",
    clientGstin: "",
    clientCity: "Bengaluru",
    clientPinCode: "560100",
    clientAddressLine1: "4th Floor, Ananta",
    clientAddressLine2: "",
  },
  tax: { taxRate: 18, isRcmEnabled: false },
  meta: { invoiceDate: "2026-02-10" },
  milestones: [{ lineItems: [{ qty: 1, rate: 100000 }] }],
};

function money(formData: any, supplyDate: string) {
  return computeInvoiceMoney(
    formData.milestones[0].lineItems,
    buildTaxContext({
      agency: formData.agency,
      client: formData.client,
      tax: formData.tax,
      supplyDate,
    }),
  );
}

function child(supplier: SupplierTaxRow | null, recipient: RecipientTaxRow | null) {
  return overlayLiveTaxFacts(PARENT, supplier, recipient);
}

type Case = { name: string; run: () => void };

const CASES: Case[] = [
  {
    name: "1. parent as-is — unregistered supplier bills no GST",
    run: () => {
      const m = money(PARENT, "2026-02-10");
      assert.equal(m.treatment, "unregistered");
      assert.equal(m.amountPayable, 100000);
    },
  },
  {
    name: "2. REGISTRATION ACQUIRED mid-project — child bills CGST+SGST",
    run: () => {
      const { formData, changes } = child(
        { gst_registration_status: "registered", gstin: "29ABLPB2947K1ZC", state: "Karnataka" },
        null,
      );
      const m = money(formData, "2026-06-01");
      assert.equal(m.treatment, "intrastate");
      assert.equal(m.taxTotal, 18000);
      assert.equal(m.amountPayable, 118000);
      assert.ok(changes.some(c => c.path === "agency.gstRegistrationStatus" && c.from === "not-registered" && c.to === "registered"));
    },
  },
  {
    name: "3. CLIENT RELOCATED across a state line — CGST+SGST becomes IGST",
    run: () => {
      const { formData, changes } = child(
        { gst_registration_status: "registered", gstin: "29ABLPB2947K1ZC", state: "Karnataka" },
        { state: "Maharashtra", city: "Mumbai", pin_code: "400001", address_line_1: "12 Ballard Estate" },
      );
      const m = money(formData, "2026-06-01");
      assert.equal(m.treatment, "interstate");
      assert.equal(m.igstTotal, 18000);
      assert.equal(m.cgstTotal, 0);
      // the whole address moves with the state, or the document is incoherent
      assert.equal(formData.client.clientCity, "Mumbai");
      assert.equal(formData.client.clientPinCode, "400001");
      assert.ok(changes.some(c => c.path === "client.clientState" && c.to === "Maharashtra"));
    },
  },
  {
    name: "4. LUT RENEWED — live FY zero-rates where the stale one would have lapsed",
    run: () => {
      const exporter = {
        ...PARENT,
        agency: { ...PARENT.agency, gstRegistrationStatus: "registered", gstin: "29ABLPB2947K1ZC", lutAvailability: "yes", lutValidity: "fy_2025_26" },
        client: { ...PARENT.client, clientLocation: "international", clientState: "" },
      };
      const stale = money(exporter, "2026-06-01");
      assert.equal(stale.treatment, "export_igst", "stale LUT lapsed 31 Mar");
      assert.deepEqual(stale.warnings.map(w => w.code), ["LUT_LAPSED"]);

      const { formData } = overlayLiveTaxFacts(exporter, { lut_availability: "yes", lut_validity: "fy_2026_27" }, null);
      const renewed = money(formData, "2026-06-01");
      assert.equal(renewed.treatment, "export_zero_rated");
      assert.equal(renewed.amountPayable, 100000);
      assert.deepEqual(renewed.warnings, []);
    },
  },
  {
    name: "5. RATE REVISION is NOT corrected — no live table holds taxRate",
    run: () => {
      const { formData, changes } = child(
        { gst_registration_status: "registered", gstin: "29ABLPB2947K1ZC", state: "Karnataka" },
        { state: "Karnataka" },
      );
      assert.equal(formData.tax.taxRate, 18, "inherited rate survives the overlay");
      assert.ok(!changes.some(c => c.path.startsWith("tax.")), "overlay never touches tax.*");
    },
  },
  {
    name: "6. blank live values never erase a good snapshot",
    run: () => {
      const registered = { ...PARENT, agency: { ...PARENT.agency, gstRegistrationStatus: "registered", gstin: "29ABLPB2947K1ZC" } };
      const { formData, changes } = overlayLiveTaxFacts(
        registered,
        { gst_registration_status: "", gstin: null, state: "   " },
        { state: "", sez_status: null },
      );
      assert.equal(formData.agency.gstRegistrationStatus, "registered");
      assert.equal(formData.agency.agencyState, "Karnataka");
      assert.equal(formData.client.clientState, "Karnataka");
      assert.deepEqual(changes, []);
      const m = money(formData, "2026-06-01");
      assert.equal(m.treatment, "intrastate", "must not fall into the indeterminate branch");
    },
  },
  {
    name: "7. DE-REGISTRATION is a present value and does apply",
    run: () => {
      const registered = { ...PARENT, agency: { ...PARENT.agency, gstRegistrationStatus: "registered", gstin: "29ABLPB2947K1ZC" } };
      const { formData } = overlayLiveTaxFacts(registered, { gst_registration_status: "not-registered" }, null);
      assert.equal(formData.agency.gstRegistrationStatus, "not-registered");
      // gstin is still 15 chars, so the engine must still read unregistered from status alone
      const m = money({ ...formData, agency: { ...formData.agency, gstin: "" } }, "2026-06-01");
      assert.equal(m.treatment, "unregistered");
    },
  },
  {
    name: "8. no live rows at all — formData passes through untouched",
    run: () => {
      const { formData, changes } = overlayLiveTaxFacts(PARENT, null, null);
      assert.deepEqual(changes, []);
      assert.deepEqual(formData.agency, PARENT.agency);
      assert.deepEqual(formData.client, PARENT.client);
    },
  },
  {
    name: "9. overlay does not mutate the parent snapshot",
    run: () => {
      const before = JSON.stringify(PARENT);
      overlayLiveTaxFacts(PARENT, { gst_registration_status: "registered", state: "Delhi" }, { state: "Goa" });
      assert.equal(JSON.stringify(PARENT), before, "parent form_data must be untouched");
    },
  },
  {
    name: "10. SEZ status becoming yes flips a domestic supply to zero-rated under LUT",
    run: () => {
      const { formData } = overlayLiveTaxFacts(
        PARENT,
        { gst_registration_status: "registered", gstin: "29ABLPB2947K1ZC", state: "Karnataka", lut_availability: "yes", lut_validity: "fy_2026_27" },
        { state: "Karnataka", sez_status: "yes" },
      );
      const m = money(formData, "2026-06-01");
      assert.equal(m.treatment, "sez_zero_rated");
      assert.equal(m.amountPayable, 100000);
    },
  },
];

let failures = 0;
for (const c of CASES) {
  try {
    c.run();
    console.log(`PASS  ${c.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${c.name}`);
    console.log(`      ${(error as Error).message.split("\n")[0]}`);
  }
}
console.log(`\n${CASES.length - failures}/${CASES.length} live-tax-fact cases passed`);
if (failures > 0) process.exit(1);
