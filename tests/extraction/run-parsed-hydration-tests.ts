import assert from "node:assert/strict";
import type { BriefParserResponse } from "@/lib/brief-parser-gateway";
import { hydrateInvoiceFormFromParsedExtraction } from "@/lib/invoice-parsed-extraction-hydration";
import { defaultInvoiceFormData, mergeInvoiceFormData } from "@/types/invoice";

function createParserResponse(
  overrides: Partial<BriefParserResponse> = {}
): BriefParserResponse {
  return {
    normalizedExtraction: {
      agency: {
        businessName: "Acme Design Studio",
        gstRegistered: true,
        gstin: "29ABCDE1234F1Z5",
        pan: "ABCDE1234F",
        lutEnabled: true,
        lutNumber: "LUT-2026-001",
        addressLine1: "14 Residency Road",
        addressLine2: "Ashok Nagar",
        city: "Bengaluru",
        state: "Karnataka",
        pinCode: "560025",
      },
      client: {
        name: "Globex Media LLC",
        email: "finance@globex.ae",
        location: "international",
        gstinOrTaxId: "VAT-7788",
        country: "United Arab Emirates",
        addressLine1: "Office 221",
        addressLine2: "Business Bay",
        city: "Dubai",
        postalCode: "00000",
        isSezUnit: null,
      },
      deliverables: [
        {
          type: "Logo Design",
          description: "Logo design with final brand files",
          quantity: 2,
          rate: 25000,
          unit: "per-deliverable",
          sacCode: "998391",
        },
      ],
      payment: {
        terms: "Net 15",
        mode: "Wise",
        accountName: "Acme Design Studio",
        bankName: "HDFC Bank",
        bankAddress: "MG Road, Bengaluru",
        accountNumber: "50200044321098",
        ifscCode: "hdfc0001122",
        swiftCode: "HDFCINBB",
        ibanOrRouting: "ROUTE-123",
      },
      meta: {
        invoiceNumber: "INV-2026-101",
        invoiceDate: "2026-04-20",
        dueDate: "2026-05-05",
        currency: "AED",
        totalAmount: 50000,
      },
      taxHints: {
        treatment: "ZERO_RATED",
        rate: 0,
        domesticOrInternational: "international",
        exportMentioned: true,
        sezMentioned: true,
        lutMentioned: true,
      },
    },
    confidence: {
      overall: "high",
      fields: {},
    },
    missingFields: [],
    clarificationQuestions: ["Confirm whether the SEZ hint applies to this client."],
    providerUsed: "gemini-flash",
    fallbackUsed: false,
    fallbackPath: ["gemini-flash"],
    rawStored: true,
    documentId: "doc_123",
    warnings: [],
    parserVersion: "parse-brief-v1",
    parsedAt: "2026-04-20T00:00:00.000Z",
    ...overrides,
  };
}

function testHydratesEmptyInvoiceForm() {
  const result = hydrateInvoiceFormFromParsedExtraction({
    currentFormData: mergeInvoiceFormData(defaultInvoiceFormData),
    parserResponse: createParserResponse(),
  });
  const { nextFormData } = result;

  assert.equal(nextFormData.agency.agencyName, "Acme Design Studio");
  assert.equal(nextFormData.agency.gstRegistrationStatus, "registered");
  assert.equal(nextFormData.agency.gstin, "29ABCDE1234F1Z5");
  assert.equal(nextFormData.agency.lutAvailability, "yes");
  assert.equal(nextFormData.agency.agencyState, "Karnataka");
  assert.equal(nextFormData.client.clientLocation, "international");
  assert.equal(nextFormData.client.clientName, "Globex Media LLC");
  assert.equal(nextFormData.client.clientEmail, "finance@globex.ae");
  assert.equal(nextFormData.client.clientCountry, "United Arab Emirates");
  assert.equal(nextFormData.client.isClientSezUnit, "not-sure");
  assert.equal(nextFormData.client.clientCurrency, "AED");
  assert.equal(nextFormData.lineItems[0]?.type, "Logo Design");
  assert.equal(nextFormData.lineItems[0]?.description, "Logo design with final brand files");
  assert.equal(nextFormData.lineItems[0]?.qty, 2);
  assert.equal(nextFormData.lineItems[0]?.rate, 25000);
  assert.equal(nextFormData.lineItems[0]?.sacCode, "998391");
  assert.equal(nextFormData.meta.invoiceNumber, "INV-2026-101");
  assert.equal(nextFormData.meta.paymentTerms, "Net 15");
  assert.equal(nextFormData.payment.paymentSettlementType, "forex");
  assert.equal(nextFormData.payment.ifscCode, "HDFC0001122");
  assert.deepEqual(result.clarificationQuestions, [
    "Confirm whether the SEZ hint applies to this client.",
  ]);
}

function testPreservesExistingUserEnteredData() {
  const currentFormData = mergeInvoiceFormData({
    agency: {
      ...defaultInvoiceFormData.agency,
      agencyName: "Existing Studio",
    },
    client: {
      ...defaultInvoiceFormData.client,
      clientName: "Existing Client",
    },
  });
  const result = hydrateInvoiceFormFromParsedExtraction({
    currentFormData,
    parserResponse: createParserResponse(),
  });

  assert.equal(result.nextFormData.agency.agencyName, "Existing Studio");
  assert.equal(result.nextFormData.client.clientName, "Existing Client");
  assert.equal(result.nextFormData.agency.gstRegistrationStatus, "registered");
  assert.ok(
    result.preservedFields.some((field) => field.path === "agency.businessName")
  );
  assert.ok(
    result.preservedFields.some((field) => field.path === "client.name")
  );
}

function testLowConfidenceToggleStaysUnresolved() {
  const response = createParserResponse({
    normalizedExtraction: {
      ...createParserResponse().normalizedExtraction,
      client: {
        ...createParserResponse().normalizedExtraction.client,
        isSezUnit: true,
      },
    },
    confidence: {
      overall: "high",
      fields: {
        "client.isSezUnit": "low",
      },
    },
  });
  const result = hydrateInvoiceFormFromParsedExtraction({
    currentFormData: mergeInvoiceFormData(defaultInvoiceFormData),
    parserResponse: response,
  });

  assert.equal(result.nextFormData.client.isClientSezUnit, "");
  assert.ok(result.unresolvedFields.includes("client.isSezUnit"));
}

function testOwnershipAndPlaceholderGuardrails() {
  const result = hydrateInvoiceFormFromParsedExtraction({
    currentFormData: mergeInvoiceFormData(defaultInvoiceFormData),
    parserResponse: createParserResponse({
      normalizedExtraction: {
        ...createParserResponse().normalizedExtraction,
        agency: {
          ...createParserResponse().normalizedExtraction.agency,
          businessName: "GST registered",
          pan: "ABCDE1234F",
        },
        client: {
          ...createParserResponse().normalizedExtraction.client,
          name: "finance team",
          email: "finance@example.com",
          location: "domestic",
          gstinOrTaxId: "ABCDE1234F",
        },
      },
    }),
  });

  assert.equal(result.nextFormData.agency.agencyName, "");
  assert.equal(result.nextFormData.client.clientName, "");
  assert.equal(result.nextFormData.client.clientEmail, "");
  assert.equal(result.nextFormData.client.clientGstin, "");
  assert.equal(result.nextFormData.agency.pan, "ABCDE1234F");
}

function testDerivedDueDateFromNetTerms() {
  const result = hydrateInvoiceFormFromParsedExtraction({
    currentFormData: mergeInvoiceFormData(defaultInvoiceFormData),
    parserResponse: createParserResponse({
      normalizedExtraction: {
        ...createParserResponse().normalizedExtraction,
        payment: {
          ...createParserResponse().normalizedExtraction.payment,
          terms: "Net 7",
        },
        meta: {
          ...createParserResponse().normalizedExtraction.meta,
          invoiceDate: "2026-04-20",
          dueDate: null,
        },
      },
    }),
  });

  assert.equal(result.nextFormData.meta.dueDate, "2026-04-27");
}

function run() {
  testHydratesEmptyInvoiceForm();
  testPreservesExistingUserEnteredData();
  testLowConfidenceToggleStaysUnresolved();
  testOwnershipAndPlaceholderGuardrails();
  testDerivedDueDateFromNetTerms();
  console.log("Parsed extraction hydration tests passed");
}

run();
