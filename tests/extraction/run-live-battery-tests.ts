/**
 * Live-battery regression suite.
 * Fixtures are REAL parse-brief v17 responses captured from production on
 * 2026-07-07 (6 scenarios: domestic intra/inter-state, adversarial roles,
 * export+LUT, foreign ambiguous currency, milestone-heavy).
 * They replay through the gateway normalizer + hydrator, asserting the
 * write-path invariants that must never regress.
 *
 * F2 and D4 were re-captured 2026-07-10 from parse-brief v2 (P1-D and P2-F fixed
 * server-side). D1/D2/D3/F1 remain valid v17 captures; the gateway defaults their
 * missing milestones key. D1 still carries dueDate "7 Days" deliberately — it now
 * proves the hydrator's ISO date gate (P1-C).
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
  assert.notEqual(f.meta.dueDate, "7 Days", "non-ISO junk must never reach a date field");
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
  const result = hydrateEmpty("F2");
  const f = result.nextFormData;
  assert.equal(f.client.clientLocation, "international");
  assert.equal(f.payment.paymentSettlementType, "forex");
  assert.equal(typeof f.meta.paymentTerms, "number");
  assert.ok(result.missingFields.includes("meta.currency"), "unstated foreign currency must stay missing");
  assert.ok(
    result.clarificationQuestions.some((q: string) => q.toLowerCase().includes("currency")),
    "currency clarification must surface",
  );
  console.log("F2 foreign Wise: ok");
}

function testD4MilestoneProse() {
  const result = hydrateEmpty("D4");
  const f = result.nextFormData;
  assert.equal(f.client.clientState, "Maharashtra");
  assert.equal(f.lineItems[0]?.rate, 300000);
  assert.equal(f.meta.paymentTerms, 15, "milestone prose has no net-days; terms must stay untouched");
  assert.equal(typeof f.meta.paymentTerms, "number");
  assert.equal(result.parsedMilestones.length, 3, "structured milestones must survive the gateway");
  assert.equal(result.parsedMilestones[0]?.percent, 40);
  assert.equal(result.parsedMilestones[1]?.date, "2026-07-25");
  assert.equal(result.parsedMilestones[2]?.date, "2026-08-20");
  console.log("D4 structured milestones: ok");
}

testD1IntraStateHinglish();
testD1OverwriteSafety();
testD2InterStateBankRails();
testD3AdversarialRoles();
testF1ExportWithLut();
testF2ForeignWise();
testD4MilestoneProse();
console.log("Live-battery fixture tests passed");
