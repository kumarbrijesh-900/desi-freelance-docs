/**
 * Types-only husk. The legacy OpenAI extraction client that lived here was
 * retired on 2026-07-06 and archived at
 * _archived/legacy-extraction/ai-brief-extractor.ts. These types remain the
 * shared extraction-payload shape consumed by lib/brief-parser-gateway.ts.
 */
export type AiBriefConfidence = "high" | "medium" | "low";

export type AiBriefField<T> = {
  value: T | null;
  confidence: AiBriefConfidence;
};

export type AiBriefTaxType = "CGST_SGST" | "IGST" | "ZERO";
export type AiBriefLocationType = "domestic" | "international";

export type AiBriefExtraction = {
  inference_matrix?: {
    macro_resolution: {
      linguistic_translation: string;
      nexus_and_compliance: string;
    };
    agency_nodes_1_to_6: {
      identity_inference: string;
      tax_id_inference: string;
    };
    client_and_msa_nodes_7_to_16: {
      client_identity_inference: string;
      msa_baseline_inference: string;
    };
    meta_nodes_17_to_19: {
      invoice_number_inference: string;
      date_currency_inference: string;
    };
    item_nodes_20_to_24: {
      deliverable_splitting_logic: string;
      financial_math_logic: string;
    };
    tax_nodes_25_to_27: {
      sac_deduction_logic: string;
      rcm_lut_logic: string;
    };
    payment_nodes_28_to_34: {
      bank_routing_inference: string;
      addendum_trigger_logic: string;
    };
  };
  agencyName: AiBriefField<string>;
  agencyAddress: AiBriefField<string>;
  agencyState: AiBriefField<string>;
  clientName: AiBriefField<string>;
  clientAddress: AiBriefField<string>;
  clientCountry: AiBriefField<string>;
  clientState: AiBriefField<string>;
  clientTaxId: AiBriefField<string>;
  totalAmount: AiBriefField<number>;
  currency: AiBriefField<string>;
  gst: {
    type: AiBriefField<AiBriefTaxType>;
    rate: AiBriefField<number>;
    gstin: AiBriefField<string>;
    isRegistered: AiBriefField<boolean>;
    lutAvailable: AiBriefField<boolean>;
    lutNumber: AiBriefField<string>;
    pan: AiBriefField<string>;
  };
  deliverables: Array<{
    type: AiBriefField<string>;
    description: AiBriefField<string>;
    quantity: AiBriefField<number>;
    rate: AiBriefField<number>;
    unit: AiBriefField<string>;
    sacCode: AiBriefField<string>;
  }>;
  paymentTerms: AiBriefField<string>;
  paymentMode: AiBriefField<string>;
  paymentSchedule: Array<{
    milestone: AiBriefField<string>;
    percentage: AiBriefField<number>;
    dueWhen: AiBriefField<string>;
  }>;
  payment: {
    bankName: AiBriefField<string>;
    accountName: AiBriefField<string>;
    accountNumber: AiBriefField<string>;
    ifscCode: AiBriefField<string>;
    swiftCode: AiBriefField<string>;
    ibanOrRouting: AiBriefField<string>;
    bankAddress: AiBriefField<string>;
  };
  timeline: {
    invoiceDate: AiBriefField<string>;
    dueDate: AiBriefField<string>;
    deliveryTimeline: AiBriefField<string>;
  };
  locations: {
    agency: AiBriefField<string>;
    client: AiBriefField<string>;
    inferredType: AiBriefField<AiBriefLocationType>;
  };
  license: {
    isIncluded: AiBriefField<boolean>;
    type: AiBriefField<string>;
    duration: AiBriefField<string>;
  };
  hasAddendum: AiBriefField<boolean>;
  addendumNotes: AiBriefField<string>;
  confidenceScore: AiBriefConfidence;
};
