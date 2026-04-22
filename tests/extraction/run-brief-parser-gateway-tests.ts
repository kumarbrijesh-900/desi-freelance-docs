import assert from "node:assert/strict";
import {
  normalizeBriefParserInput,
  normalizeBriefParserResponse,
  toLegacyAiBriefExtraction,
} from "@/lib/brief-parser-gateway";

function testInputBundleNormalization() {
  const bundle = normalizeBriefParserInput({
    briefText: "Client: Acme",
    ocrText: "Deliverable: Logo",
    voiceTranscript: "Net 15",
  });

  assert.match(bundle.combinedText, /Typed brief:\nClient: Acme/);
  assert.match(bundle.combinedText, /OCR text:\nDeliverable: Logo/);
  assert.match(bundle.combinedText, /Voice transcript:\nNet 15/);
}

function testGatewayResponseNormalizationAndLegacyAdapter() {
  const response = normalizeBriefParserResponse({
    normalizedExtraction: {
      agency: {
        businessName: "Desi Studio",
        gstRegistered: true,
        gstin: "29ABCDE1234F1Z5",
        state: "Karnataka",
      },
      client: {
        name: "Acme Ltd",
        location: "domestic",
        state: "Maharashtra",
        gstinOrTaxId: "27AAACM8899L1Z2",
      },
      deliverables: [
        {
          type: "Logo Design",
          description: "Logo design with final files",
          quantity: 1,
          rate: 25000,
          unit: "per-deliverable",
          sacCode: "998391",
        },
      ],
      payment: {
        terms: "Net 15",
        bankName: "HDFC Bank",
      },
      meta: {
        currency: "INR",
        totalAmount: 25000,
      },
      taxHints: {
        treatment: "IGST",
        rate: 18,
        domesticOrInternational: "domestic",
      },
      license: {},
    },
    confidence: {
      overall: "high",
      fields: {
        "client.name": "high",
        "deliverables.0.description": "high",
      },
    },
    missingFields: [],
    clarificationQuestions: [],
    providerUsed: "gemini-flash",
    fallbackUsed: false,
    fallbackPath: ["gemini-flash"],
    rawStored: true,
    documentId: "doc_123",
    warnings: [],
    parserVersion: "parse-brief-v1",
    parsedAt: "2026-04-19T00:00:00.000Z",
  });

  assert.ok(response, "gateway response should normalize");
  assert.equal(response.providerUsed, "gemini-flash");
  assert.equal(response.normalizedExtraction.deliverables[0]?.sacCode, "998391");

  const legacy = toLegacyAiBriefExtraction(response);
  assert.equal(legacy.clientName.value, "Acme Ltd");
  assert.equal(legacy.gst.type.value, "IGST");
  assert.equal(legacy.deliverables[0]?.description.value, "Logo design with final files");
  assert.equal(legacy.deliverables[0]?.rate.value, 25000);
}

function run() {
  testInputBundleNormalization();
  testGatewayResponseNormalizationAndLegacyAdapter();
  console.log("Brief parser gateway contract tests passed");
}

run();
