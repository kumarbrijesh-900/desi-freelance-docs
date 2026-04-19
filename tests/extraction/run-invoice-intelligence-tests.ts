import assert from "node:assert/strict";

import { inferCommercialTermsFromText } from "@/lib/commercial-terms-inference";
import { inferDeliverablesFromText } from "@/lib/deliverable-inference";
import { hydrateInvoiceFormFromParsedExtraction } from "@/lib/invoice-parsed-extraction-hydration";
import { runBriefAutofill } from "@/lib/invoice-brief-intake";
import { defaultInvoiceFormData } from "@/types/invoice";

function runAutofill(text: string) {
  return runBriefAutofill({
    currentFormData: defaultInvoiceFormData,
    input: { text },
  });
}

function testSimpleDomesticRoleOwnership() {
  const result = runAutofill(`Agency name: Bright Pixel Studio
GST registered
Agency GSTIN: 29ABCDE1234F1Z5
Agency PAN: ABCDE1234F
Client name: Metro Shoes Pvt. Ltd.
Client GSTIN: 29AAACM8899L1Z2
Client address: Whitefield, Bengaluru 560048
2 homepage screens at INR 12000 per screen
Payment terms: Net 7
Invoice date: 2026-04-20`);

  assert.equal(result.nextFormData.agency.agencyName, "Bright Pixel Studio");
  assert.equal(result.nextFormData.client.clientName, "Metro Shoes Pvt. Ltd");
  assert.equal(result.nextFormData.agency.gstin, "29ABCDE1234F1Z5");
  assert.equal(result.nextFormData.client.clientGstin, "29AAACM8899L1Z2");
  assert.notEqual(result.nextFormData.client.clientGstin, result.nextFormData.agency.pan);
  assert.equal(result.nextFormData.meta.dueDate, "2026-04-27");
}

function testInternationalAddressAndFinanceTeamSeparation() {
  const result = runAutofill(`Please invoice Acme Labs LLC.
Billing contact: finance team
Client address:
221B Baker Street
Marylebone
London NW1 6XE
United Kingdom
Currency: GBP
1 landing page design at GBP 1800
Payment via Wise`);

  assert.equal(result.nextFormData.client.clientName, "Acme Labs LLC");
  assert.notEqual(result.nextFormData.client.clientName.toLowerCase(), "finance team");
  assert.equal(result.nextFormData.client.clientLocation, "international");
  assert.equal(result.nextFormData.client.clientCountry, "United Kingdom");
  assert.equal(result.nextFormData.client.clientAddressLine1, "221B Baker Street");
  assert.equal(result.nextFormData.client.clientCity, "London");
}

function testSezAmbiguityStaysUnresolved() {
  const result = hydrateInvoiceFormFromParsedExtraction({
    currentFormData: defaultInvoiceFormData,
    parserResponse: {
      normalizedExtraction: {
        agency: {
          businessName: "Bright Pixel Studio",
          gstRegistered: true,
          gstin: "29ABCDE1234F1Z5",
        },
        client: {
          name: "Delta Tech",
          location: "domestic",
          city: "Hyderabad",
          state: "Telangana",
          isSezUnit: null,
        },
        deliverables: [
          {
            type: "UI/UX Design",
            description: "Design consultation",
            quantity: 1,
            rate: 50000,
            unit: "per-deliverable",
            sacCode: "998314",
          },
        ],
        payment: {},
        meta: {},
        taxHints: {
          domesticOrInternational: "domestic",
          sezMentioned: true,
          ambiguity: "SEZ mentioned but authorised operations status is unclear.",
        },
      },
      confidence: { overall: "medium", fields: {} },
      missingFields: ["client.isSezUnit"],
      clarificationQuestions: [
        "Is the domestic client an SEZ unit or developer for authorised operations?",
      ],
      providerUsed: "gemini-flash",
      fallbackUsed: false,
      fallbackPath: ["gemini-flash"],
      rawStored: false,
      warnings: [],
      parserVersion: "test",
      parsedAt: "2026-04-20T00:00:00.000Z",
    },
  });

  assert.equal(result.nextFormData.client.isClientSezUnit, "not-sure");
  assert.ok(result.unresolvedFields.includes("client.isSezUnit"));
}

function testMessyDeliverableDecompositionAndBudgetHandling() {
  const deliverables = inferDeliverablesFromText(
    "30 retouched images, 10 shorts and 1 brand film for campaign launch. Total project fee USD 2400. Optional future reels later."
  );

  assert.equal(deliverables.length, 3);
  assert.deepEqual(
    deliverables.map((item) => item.description),
    ["retouched images", "shorts", "brand film"]
  );
  assert.ok(deliverables.every((item) => item.rate === null));
  assert.ok(deliverables.every((item) => item.pricingSignal !== "rate"));
}

function testCommercialTermsReasoning() {
  const terms = inferCommercialTermsFromText(
    "50% advance, balance before final files. Net 15 from invoice.",
    { invoiceDate: "2026-04-20" }
  );

  assert.equal(terms.advancePercent, 50);
  assert.equal(terms.dueDays, 15);
  assert.equal(terms.dueDate, "2026-05-05");
  assert.match(terms.paymentTerms, /50% advance/);
  assert.match(terms.paymentTerms, /balance before final delivery/);
}

function run() {
  testSimpleDomesticRoleOwnership();
  testInternationalAddressAndFinanceTeamSeparation();
  testSezAmbiguityStaysUnresolved();
  testMessyDeliverableDecompositionAndBudgetHandling();
  testCommercialTermsReasoning();
  console.log("Invoice intelligence tests passed");
}

run();
