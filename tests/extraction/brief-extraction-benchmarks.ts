import type { InvoiceLineItemType, InvoiceRateUnit } from "@/types/invoice";

export type ExtractionBenchmarkDeliverableExpectation = {
  type?: InvoiceLineItemType;
  description?: string;
  qty?: number;
  rate?: number;
  rateUnit?: InvoiceRateUnit;
};

export type ExtractionBenchmarkFieldExpectation = {
  agencyName?: string;
  clientName?: string;
  agencyState?: string;
  clientState?: string;
  clientCountry?: string;
  clientLocationType?: "domestic" | "international";
  currency?: string;
  totalAmount?: number;
  rate?: number;
  rateUnit?: InvoiceRateUnit;
  deliverables?: ExtractionBenchmarkDeliverableExpectation[];
  gstRegistrationStatus?: "registered" | "not-registered";
  gstin?: string;
  lutAvailability?: "yes" | "no";
  taxType?: "CGST_SGST" | "IGST" | "ZERO_RATED";
  paymentTerms?: string;
  dueDate?: string;
  timeline?: string;
};

export type ExtractionBenchmarkCase = {
  id: string;
  title: string;
  text: string;
  expectedExtracted: ExtractionBenchmarkFieldExpectation;
  expectedInferred: ExtractionBenchmarkFieldExpectation;
  expectedClarifications: string[];
};

export const EXTRACTION_BENCHMARK_CASES: ExtractionBenchmarkCase[] = [
  {
    id: "clean-domestic-brief",
    title: "Clean domestic brief",
    text: `Agency name: DesiFreelanceDocs Studio
Agency address: 14 Residency Road, Bengaluru, Karnataka 560025
GST registered
Agency GSTIN: 29ABCDE1234F1Z5
Client name: Metro Shoes Pvt. Ltd.
Client address: Phoenix Marketcity, Whitefield, Bengaluru 560048
Deliverable type: UI/UX
Deliverable description: Landing page UI design
Qty: 3
Rate: INR 15000 per screen
Payment terms: Net 15
Due date: 2026-04-25`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Metro Shoes Pvt. Ltd.",
      gstin: "29ABCDE1234F1Z5",
      rate: 15000,
      rateUnit: "per-screen",
      paymentTerms: "Net 15",
      dueDate: "2026-04-25",
      deliverables: [
        {
          type: "UI/UX",
          description: "Landing page UI design",
          qty: 3,
          rate: 15000,
          rateUnit: "per-screen",
        },
      ],
    },
    expectedInferred: {
      agencyState: "Karnataka",
      clientState: "Karnataka",
      clientLocationType: "domestic",
      gstRegistrationStatus: "registered",
      taxType: "CGST_SGST",
    },
    expectedClarifications: [],
  },
  {
    id: "clean-international-brief",
    title: "Clean international brief",
    text: `Agency name: DesiFreelanceDocs Studio
Agency address: 14 Residency Road, Bengaluru, Karnataka 560025
Registered under GST
Agency GSTIN: 29ABCDE1234F1Z5
LUT yes
LUT number / ARN: LUT-2026-7788
Bill to: Acme Labs LLC
Client address: 221B Baker Street, London
Did 5 editorial illustrations at $500 per item
Currency: USD
Payment via Wise
Payment terms: Due on receipt`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Acme Labs LLC",
      gstin: "29ABCDE1234F1Z5",
      lutAvailability: "yes",
      currency: "USD",
      rate: 500,
      rateUnit: "per-item",
      paymentTerms: "Due on receipt",
      deliverables: [
        {
          type: "Illustration",
          description: "Editorial illustrations",
          qty: 5,
          rate: 500,
          rateUnit: "per-item",
        },
      ],
    },
    expectedInferred: {
      agencyState: "Karnataka",
      clientCountry: "United Kingdom",
      clientLocationType: "international",
      gstRegistrationStatus: "registered",
      taxType: "ZERO_RATED",
    },
    expectedClarifications: [],
  },
  {
    id: "conversational-mixed-language",
    title: "Conversational mixed-language brief",
    text: `bhai invoice banana hai for Metro Shoes.
hum DesiFreelanceDocs Studio, Residency Road Bangalore se.
client bhi Bangalore mein hai.
3 landing page screens kiye, 12k per screen.
gst registered.
net 15.`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Metro Shoes",
      rate: 12000,
      rateUnit: "per-screen",
      paymentTerms: "Net 15",
      deliverables: [
        {
          type: "UI/UX",
          description: "Landing page design",
          qty: 3,
          rate: 12000,
          rateUnit: "per-screen",
        },
      ],
    },
    expectedInferred: {
      agencyState: "Karnataka",
      clientState: "Karnataka",
      clientLocationType: "domestic",
      gstRegistrationStatus: "registered",
      taxType: "CGST_SGST",
    },
    expectedClarifications: [],
  },
  {
    id: "ocr-noisy-email",
    title: "OCR-noisy email screenshot text",
    text: `AGENCY N4ME DesiFreelanceDocs Studi0
Addre55 14 Re5idency R0ad, BengalurU, Karnataka 560025
GST reg15tered under GST
GSTIN 29ABCDE1234F1Z5
Bill t0 Metr0 Sh0es Pvt Ltd
Client addre55 Phoenix Marketcity Whitefield Main Road Bengaluru 560048
3 screen5 landing page ui design @ 12k per screen
term5 net15`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Metro Shoes Pvt Ltd",
      gstin: "29ABCDE1234F1Z5",
      rate: 12000,
      rateUnit: "per-screen",
      paymentTerms: "Net 15",
      deliverables: [
        {
          type: "UI/UX",
          description: "Landing page design",
          qty: 3,
          rate: 12000,
          rateUnit: "per-screen",
        },
      ],
    },
    expectedInferred: {
      agencyState: "Karnataka",
      clientState: "Karnataka",
      clientLocationType: "domestic",
      gstRegistrationStatus: "registered",
      taxType: "CGST_SGST",
    },
    expectedClarifications: [],
  },
  {
    id: "multi-deliverable-brief",
    title: "Multi-deliverable brief",
    text: `Invoice for Acme Labs.
30 retouched images + 10 shorts + 1 brand film for campaign launch.
Total project fee USD 2400.
Client is in Singapore.
Payment via Payoneer.`,
    expectedExtracted: {
      clientName: "Acme Labs",
      currency: "USD",
      totalAmount: 2400,
      deliverables: [
        {
          type: "Photography",
          description: "Retouched images",
          qty: 30,
          rateUnit: "per-image",
        },
        {
          type: "Video Editing",
          description: "Short videos",
          qty: 10,
          rateUnit: "per-video",
        },
        {
          type: "Video Editing",
          description: "Brand film",
          qty: 1,
          rateUnit: "per-video",
        },
      ],
    },
    expectedInferred: {
      clientCountry: "Singapore",
      clientLocationType: "international",
    },
    expectedClarifications: ["deliverable-ambiguity"],
  },
  {
    id: "same-state-gst-brief",
    title: "Same-state GST brief",
    text: `We are DesiFreelanceDocs Studio, Bengaluru.
GSTIN 29ABCDE1234F1Z5.
Invoice for Metro Shoes, Whitefield Bengaluru.
Same state billing.
Project fee ₹65000 for homepage redesign.`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Metro Shoes",
      gstin: "29ABCDE1234F1Z5",
      totalAmount: 65000,
    },
    expectedInferred: {
      agencyState: "Karnataka",
      clientState: "Karnataka",
      clientLocationType: "domestic",
      gstRegistrationStatus: "registered",
      taxType: "CGST_SGST",
    },
    expectedClarifications: [],
  },
  {
    id: "interstate-igst-brief",
    title: "Inter-state IGST brief",
    text: `Agency name: DesiFreelanceDocs Studio
Agency address: Residency Road, Bengaluru
GSTIN: 29ABCDE1234F1Z5
Bill to: Acme Retail Pvt Ltd
Client address: Lower Parel, Mumbai
Inter-state billing. Apply IGST 18%.
1 dashboard design at 30000.`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Acme Retail Pvt Ltd",
      gstin: "29ABCDE1234F1Z5",
      rate: 30000,
      deliverables: [
        {
          type: "UI/UX",
          description: "Dashboard design",
          qty: 1,
          rate: 30000,
        },
      ],
    },
    expectedInferred: {
      agencyState: "Karnataka",
      clientState: "Maharashtra",
      clientLocationType: "domestic",
      gstRegistrationStatus: "registered",
      taxType: "IGST",
    },
    expectedClarifications: [],
  },
  {
    id: "export-lut-brief",
    title: "Export LUT brief",
    text: `Please raise invoice for Globex Media, Dubai.
We are DesiFreelanceDocs Studio, Bengaluru.
Registered under GST.
GSTIN 29ABCDE1234F1Z5.
Export of services under LUT.
LUT number / ARN: LUT-2026-8891.
5 banners at 400 AED each.
Payment via bank wire.`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Globex Media",
      gstin: "29ABCDE1234F1Z5",
      lutAvailability: "yes",
      currency: "AED",
      rate: 400,
      deliverables: [
        {
          type: "Social Media",
          description: "Banners",
          qty: 5,
          rate: 400,
          rateUnit: "per-item",
        },
      ],
    },
    expectedInferred: {
      agencyState: "Karnataka",
      clientCountry: "United Arab Emirates",
      clientLocationType: "international",
      gstRegistrationStatus: "registered",
      taxType: "ZERO_RATED",
    },
    expectedClarifications: [],
  },
  {
    id: "partial-incomplete-brief",
    title: "Partial incomplete brief",
    text: `Need invoice for Nike USA.
Some homepage UI UX work, maybe 2 screens.
Charge 15k.
Please autofill whatever you can.`,
    expectedExtracted: {
      clientName: "Nike USA",
      rate: 15000,
      rateUnit: "per-screen",
      deliverables: [
        {
          type: "UI/UX",
          description: "Homepage design",
          qty: 2,
          rate: 15000,
          rateUnit: "per-screen",
        },
      ],
    },
    expectedInferred: {
      clientCountry: "United States",
      clientLocationType: "international",
    },
    expectedClarifications: ["currency-ambiguity"],
  },
  {
    id: "amount-ambiguity-brief",
    title: "Amount ambiguity brief",
    text: `Invoice for Acme Wellness.
We are DesiFreelanceDocs Studio, Pune.
Client is in Mumbai.
GSTIN 27ABCDE1234F1Z5.
Logo design fee 30000.
50% advance and balance on delivery.`,
    expectedExtracted: {
      agencyName: "DesiFreelanceDocs Studio",
      clientName: "Acme Wellness",
      gstin: "27ABCDE1234F1Z5",
      totalAmount: 30000,
      paymentTerms: "50% advance and balance on delivery",
      deliverables: [
        {
          type: "Logo Design",
          description: "Logo design",
          qty: 1,
        },
      ],
    },
    expectedInferred: {
      agencyState: "Maharashtra",
      clientState: "Maharashtra",
      clientLocationType: "domestic",
      gstRegistrationStatus: "registered",
      taxType: "CGST_SGST",
    },
    expectedClarifications: ["amount-ambiguity"],
  },
];
