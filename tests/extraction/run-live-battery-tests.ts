/**
 * Live-battery regression suite.
 * Fixtures are REAL parse-brief v17 responses captured from production on
 * 2026-07-07 (6 scenarios: domestic intra/inter-state, adversarial roles,
 * export+LUT, foreign ambiguous currency, milestone-heavy).
 * They replay through the gateway normalizer + hydrator, asserting the
 * write-path invariants that must never regress.
 *
 * Known frozen parser issues (do NOT "fix" by editing fixtures):
 *  - F2 currency INR is a captured parser mistake (P1-D, prompt fix pending)
 *  - D4 milestones collapsed to prose (P2-F, schema v2 pending)
 *  - D1 dueDate "7 Days" is un-normalized junk (P1-C, hydrator guard pending)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hydrateInvoiceFormFromParsedExtraction } from "@/lib/invoice-parsed-extraction-hydration";
import { normalizeBriefParserResponse } from "@/lib/brief-parser-gateway";
import { mergeInvoiceFormData } from "@/types/invoice";

const fixtures = JSON.parse(
  readFileSync(join(__dirname, "live-battery-fixtures.json"), "utf8"),
);

function hydrateEmpty(key: string) {
  return hydrateInvoiceFormFromParsedExtraction({
    currentFormData: mergeInvoiceFormData(),
    parserResponse: normalizeBriefParserResponse(fixtures[key])!,
  });
}

function testD1IntraStateHinglish() {
  const { nextFormData: f } = hydrateEmpty("D1");
  assert.equal(f.agency.agencyName, "Ruhnika Creative Studio");
  assert.equal(f.client.clientName, "LazyPanda Foods");
  assert.equal(f.client.clientState, "Odisha");
  assert.equal(f.lineItems.length, 2);
  assert.equal(f.lineItems[0]?.rate, 90000);
  assert.equal(f.lineItems[1]?.qty, 12);
  assert.equal(f.lineItems[1]?.rate, 5000);
  assert.equal(typeof f.meta.paymentTerms, "number");
  assert.equal(f.meta.paymentTerms, 15, "advance-split prose must never write a bogus terms number");
  assert.equal(f.payment.accountName, "ruhnika@okhdfcbank");
  console.log("D1 intra-state Hinglish: ok");
}

function testD1OverwriteSafety() {
  const currentFormData = mergeInvoiceFormData({
    client: { clientName: "My Real Client Pvt Ltd" },
    meta: { paymentTerms: 45 },
    lineItems: [
      {
        id: "user-row-1",
        type: "Other",
        description: "Consulting retainer (user typed)",
        qty: 1,
        rate: 999,
        rateUnit: "per-day",
        sacCode: "",
      },
    ],
  } as any);
  const result = hydrateInvoiceFormFromParsedExtraction({
    currentFormData,
    parserResponse: normalizeBriefParserResponse(fixtures.D1)!,
  });
  const f = result.nextFormData;
  assert.equal(f.client.clientName, "My Real Client Pvt Ltd", "user client must survive autofill");
  assert.equal(f.meta.paymentTerms, 45, "user terms must survive autofill");
  assert.equal(f.lineItems[0]?.description, "Consulting retainer (user typed)");
  assert.equal(f.lineItems[0]?.rate, 999);
  assert.ok(result.preservedFields.length >= 1, "conflicts must be reported as preserved");
  console.log("D1 overwrite safety: ok");
}

function testD2InterStateBankRails() {
  const { nextFormData: f } = hydrateEmpty("D2");
  assert.equal(f.client.clientState, "Karnataka");
  assert.equal(f.payment.ifscCode, "HDFC0001234");
  assert.equal(f.payment.accountNumber, "50200045671234");
  assert.equal(f.meta.invoiceDate, "2026-07-05");
  assert.equal(f.meta.dueDate, "2026-07-20");
  assert.equal(f.meta.paymentTerms, 15);
  assert.equal(f.lineItems[0]?.rate, 240000);
  assert.equal(f.lineItems[0]?.sacCode, "998314");
  console.log("D2 inter-state bank rails: ok");
}

function testD3AdversarialRoles() {
  const result = hydrateEmpty("D3");
  const f = result.nextFormData;
  assert.equal(f.agency.agencyName, "Ruhnika Designs", "from/for trap: agency role");
  assert.equal(f.client.clientName, "LazyPanda", "from/for trap: client role");
  assert.equal(f.payment.accountName, "Priya Mohanty", "payee identity must not leak into agency name");
  assert.ok(!f.lineItems[0]?.rate, "missing rates must never be invented");
  assert.ok(result.clarificationQuestions.length >= 3, "ambiguity must surface as questions");
  console.log("D3 adversarial roles: ok");
}

function testF1ExportWithLut() {
  const { nextFormData: f } = hydrateEmpty("F1");
  assert.equal(f.client.clientLocation, "international");
  assert.equal(f.client.clientCountry, "United States");
  assert.equal(f.payment.swiftBicCode, "ICICINBBXXX");
  assert.equal(f.meta.invoiceNumber, "RCS-EXP-014");
  assert.equal(f.meta.dueDate, "2026-08-05");
  assert.equal(f.lineItems[0]?.rate, 4500);
  assert.equal(f.lineItems[1]?.rate, 250);
  console.log("F1 export with LUT: ok");
}

function testF2ForeignWise() {
  const { nextFormData: f } = hydrateEmpty("F2");
  assert.equal(f.client.clientLocation, "international");
  assert.equal(f.payment.paymentSettlementType, "forex");
  assert.equal(typeof f.meta.paymentTerms, "number");
  console.log("F2 foreign Wise: ok");
}

function testD4MilestoneProse() {
  const { nextFormData: f } = hydrateEmpty("D4");
  assert.equal(f.client.clientState, "Maharashtra");
  assert.equal(f.lineItems[0]?.qty, 10);
  assert.equal(f.lineItems[0]?.rate, 30000);
  assert.equal(f.meta.paymentTerms, 15, "milestone prose has no net-days; terms must stay untouched");
  assert.equal(typeof f.meta.paymentTerms, "number");
  console.log("D4 milestone prose: ok");
}

testD1IntraStateHinglish();
testD1OverwriteSafety();
testD2InterStateBankRails();
testD3AdversarialRoles();
testF1ExportWithLut();
testF2ForeignWise();
testD4MilestoneProse();
console.log("Live-battery fixture tests passed");
