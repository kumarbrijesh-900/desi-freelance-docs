import { hydrateInvoiceFormFromParsedExtraction } from "./lib/invoice-parsed-extraction-hydration";
import { runBriefAutofill } from "./lib/invoice-brief-intake";
import { mergeInvoiceFormData, defaultInvoiceFormData } from "./types/invoice";
import { toLegacyAiBriefExtraction } from "./lib/brief-parser-gateway";

const mockParserResponse = {
  normalizedExtraction: {
    agency: {
      businessName: "DesiFreelanceDocs Studio",
      gstRegistered: true,
      gstin: "29ABCDE1234F1Z5",
      pan: null,
      lutEnabled: null,
      lutNumber: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      pinCode: null,
      country: null,
    },
    client: {
      name: "Metro Shoes Pvt Ltd",
      email: null,
      location: "domestic" as const,
      gstinOrTaxId: null,
      isSezUnit: false,
      country: null,
      addressLine1: null,
      addressLine2: null,
      city: "Bengaluru",
      state: null,
      pinCode: "560048",
      postalCode: null,
    },
    deliverables: [
      {
        type: "Logo Design" as const,
        description: "logo design",
        quantity: 1,
        rate: 18000,
        unit: null,
        sacCode: null,
      },
    ],
    payment: {
      terms: "Net 15",
      mode: null,
      accountName: null,
      bankName: null,
      bankAddress: null,
      accountNumber: null,
      ifscCode: null,
      swiftCode: null,
      ibanOrRouting: null,
    },
    meta: {
      invoiceNumber: null,
      invoiceDate: null,
      dueDate: null,
      currency: "INR",
      totalAmount: 18000,
    },
    taxHints: {
      treatment: "CGST_SGST" as const,
      rate: null,
      domesticOrInternational: "domestic" as const,
      placeOfSupply: null,
      exportMentioned: false,
      sezMentioned: false,
      lutMentioned: false,
      ambiguity: null,
    },
  },
  confidence: {
    overall: "high" as const,
    fields: {},
  },
  missingFields: [],
  clarificationQuestions: [],
  warnings: [],
  providerUsed: "grok" as const,
  fallbackUsed: false,
  fallbackPath: ["grok"] as any[],
  rawStored: false,
  documentId: null,
  parserVersion: "parse-brief-v1",
  parsedAt: new Date().toISOString(),
};

const aiExtraction = toLegacyAiBriefExtraction(mockParserResponse as any);

const currentFormData = mergeInvoiceFormData(defaultInvoiceFormData);

const normalizedInput = {
    text: "Please create an invoice for Metro Shoes Pvt Ltd. My business name is DesiFreelanceDocs Studio. I am GST registered. GSTIN 29ABCDE1234F1Z5. Deliverable: logo design for ₹18,000. Payment terms: Net 15.",
    ocrText: "",
    voiceTranscript: ""
};

const result = runBriefAutofill({
  currentFormData,
  input: normalizedInput,
  aiExtraction: aiExtraction as any
});

const parserHydration = hydrateInvoiceFormFromParsedExtraction({
  currentFormData,
  baseFormData: result.nextFormData,
  parserResponse: mockParserResponse as any,
});

const hydratedFormData = parserHydration.nextFormData;
const finalMerged = mergeInvoiceFormData(hydratedFormData);

console.log("=== AI EXTRACTION ===");
console.log("Agency Name:", aiExtraction.agencyName);
console.log("Client Name:", aiExtraction.clientName);

console.log("\n=== RUN BRIEF AUTOFILL RESULT ===");
console.log("Agency Name:", result.nextFormData.agency.agencyName);
console.log("Client State:", result.nextFormData.client.clientState);
console.log("Line Item Rate:", result.nextFormData.lineItems[0].rate);

console.log("\n=== HYDRATED FORM DATA ===");
console.log("Agency Name:", hydratedFormData.agency.agencyName);
console.log("Client State:", hydratedFormData.client.clientState);
console.log("Line Item Rate:", hydratedFormData.lineItems[0].rate);
