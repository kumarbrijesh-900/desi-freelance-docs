import { z } from "zod";
import type { IndiaStateOption } from "@/lib/india-state-options";
import type {
  InternationalCountryOption,
  InternationalCurrencyCode,
} from "@/lib/international-billing-options";
import {
  invoiceAllowedUnitsByType,
  invoiceDefaultUnitByType,
} from "@/lib/invoice-deliverables";
import { normalizeInvoiceLineItemType } from "@/lib/invoice-line-item-catalog";
import {
  composeIndianAddress,
  evaluateStateSignals,
  hydrateIndianAddressFields,
} from "@/lib/invoice-address";
import { resolveLineItemSacCode } from "@/lib/invoice-sac";
import { derivePanFromGstin, getStateFromGstin } from "@/lib/gstin-parser";

export type InvoiceLineItemType =
  | "Logo Design"
  | "Branding & Identity"
  | "Graphic Design"
  | "Illustration"
  | "UI/UX Design"
  | "Animation"
  | "Motion Graphics"
  | "Photography"
  | "Videography"
  | "Video Editing"
  | "Social Media Content"
  | "Packaging Design"
  | "Print Design"
  | "Infographics & Presentation Design"
  | "UI/UX"
  | "Social Media"
  | "Other";

export type InvoiceRateUnit =
  | "per-deliverable"
  | "per-item"
  | "per-screen"
  | "per-hour"
  | "per-day"
  | "per-revision"
  | "per-concept"
  | "per-post"
  | "per-video"
  | "per-image";

export type MilestoneStatus = "PENDING" | "SETTLED";

export interface InvoiceLineItem {
  id: string;
  type: InvoiceLineItemType;
  description: string;
  qty: number;
  rate: number;
  rateUnit: InvoiceRateUnit;
  sacCode?: string;
  // Milestone fields
  is_milestone_header?: boolean;
  milestone_group_id?: string;
  milestone_status?: MilestoneStatus;
  tds_amount?: number;
}

export interface AgencyDetails {
  agencyName: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pinCode: string;
  agencyState: IndiaStateOption | "";
  gstin: string;
  pan: string;
  logoUrl: string;
  gstRegistrationStatus: "" | "registered" | "not-registered";
  lutAvailability: "" | "yes" | "no";
  lutNumber: string;
  lutValidity: string;
  noLutTaxHandling: "" | "add-igst" | "keep-zero-tax";
  signatureUrl: string;
  profileLogoUrl?: string;
  // MSA Defaults
  msaPaymentTermsDays?: number;
  msaLateFeeRate?: number;
  msaLateFeeUnit?: "monthly" | "annually" | "daily";
  msaIpTriggerType?:
    | "upon_full_payment"
    | "upon_signing"
    | "upon_delivery"
    | "proportional_transfer"
    | "retained_by_creator";
  msaJurisdictionCity?: string;
  msaVersionLabel?: string;
  msaNotesBoilerplate?: string;
  msaLicenseType?: LicenseType | "";
}

export interface ClientDetails {
  clientName: string;
  clientAddress: string;
  clientAddressLine1: string;
  clientAddressLine2: string;
  clientCity: string;
  clientPinCode: string;
  clientPostalCode: string;
  clientEmail: string;
  clientState: IndiaStateOption | "";
  clientCountry: InternationalCountryOption | "";
  clientCurrency: InternationalCurrencyCode | "";
  clientGstin: string;
  clientLocation: "domestic" | "international";
  clientType?: "agency" | "freelancer";
  isClientSezUnit: "" | "yes" | "no" | "not-sure";
  // MSA Blueprint fields
  msaEffectiveDate?: string;
  msaPaymentTermsDays?: number;
  msaLateFeeRate?: number;
  msaLateFeeUnit?: "monthly" | "annually" | "daily";
  msaIpTriggerType?:
    | "upon_full_payment"
    | "upon_signing"
    | "upon_delivery"
    | "proportional_transfer"
    | "retained_by_creator";
  msaJurisdictionCity?: string;
  msaVersionLabel?: string;
  msaNotesBoilerplate?: string;
  msaLicenseType?: LicenseType | "";
}

export interface InvoiceMeta {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  hasAddendum: boolean;
}

export interface TaxConfig {
  taxMode: "none" | "gst" | "igst";
  taxRate: number;
  isRcmEnabled: boolean;
}

export type InvoiceTaxType = "CGST_SGST" | "IGST" | "NONE";

export interface InvoiceTaxBreakdown {
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalTax: number;
  taxType: InvoiceTaxType;
}

export type LicenseType =
  | "full-assignment"
  | "exclusive-license"
  | "non-exclusive-license";

export interface LicenseDetails {
  isLicenseIncluded: boolean;
  licenseType: LicenseType | "";
  licenseDuration: string;
}

export interface PaymentDetails {
  license: LicenseDetails;
  notes: string;
  paymentSettlementType: "" | "forex" | "inr" | "unknown";
  accountName: string;
  bankName: string;
  bankAddress: string;
  accountNumber: string;
  ifscCode: string;
  swiftBicCode: string;
  ibanRoutingCode: string;
  qrCodeUrl: string;
  profileQrUrl?: string;
}

export interface InvoiceFormData {
  agency: AgencyDetails;
  client: ClientDetails;
  meta: InvoiceMeta;
  lineItems: InvoiceLineItem[];
  tax: TaxConfig;
  payment: PaymentDetails;
}

export interface InvoiceComputedValues extends InvoiceTaxBreakdown {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  isRcmEnabled: boolean;
}

export type InvoiceStepperStep =
  | "agency"
  | "client"
  | "deliverables"
  | "payment"
  | "meta"
  | "totals";

export const defaultInvoiceFormData: InvoiceFormData = {
  agency: {
    agencyName: "",
    address: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    pinCode: "",
    agencyState: "",
    gstin: "",
    pan: "",
    logoUrl: "",
    gstRegistrationStatus: "not-registered",
    lutAvailability: "",
    lutNumber: "",
    lutValidity: "",
    noLutTaxHandling: "",
    signatureUrl: "",
  },
  client: {
    clientName: "",
    clientAddress: "",
    clientAddressLine1: "",
    clientAddressLine2: "",
    clientCity: "",
    clientPinCode: "",
    clientPostalCode: "",
    clientEmail: "",
    clientState: "",
    clientCountry: "",
    clientCurrency: "",
    clientGstin: "",
    clientLocation: "domestic",
    isClientSezUnit: "",
    msaPaymentTermsDays: 15,
    msaLateFeeRate: 1.5,
    msaLateFeeUnit: "monthly",
    msaIpTriggerType: "upon_full_payment",
    msaLicenseType: "full-assignment",
    msaJurisdictionCity: "",
  },
  meta: {
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    paymentTerms: "",
    hasAddendum: false,
  },
  lineItems: [
    {
      id: "line-1",
      type: "UI/UX Design",
      description: "",
      qty: 1,
      rate: 0,
      rateUnit: "per-screen",
      sacCode: resolveLineItemSacCode({
        type: "UI/UX Design",
        sacCode: "",
      }),
    },
  ],
  tax: {
    taxMode: "gst",
    taxRate: 18,
    isRcmEnabled: false,
  },
  payment: {
    license: {
      isLicenseIncluded: false,
      licenseType: "",
      licenseDuration: "",
    },
    notes: "1.5% monthly late fee applies. Final files delivered after full payment.",
    paymentSettlementType: "",
    accountName: "",
    bankName: "",
    bankAddress: "",
    accountNumber: "",
    ifscCode: "",
    swiftBicCode: "",
    ibanRoutingCode: "",
    qrCodeUrl: "",
  },
};

function normalizeAgencyDetails(agency: AgencyDetails): AgencyDetails {
  const hydratedAddress = hydrateIndianAddressFields({
    addressLine1: agency.addressLine1,
    addressLine2: agency.addressLine2,
    city: agency.city,
    pinCode: agency.pinCode,
    legacyAddress: agency.address,
  });
  const gstinState = getStateFromGstin(agency.gstin);
  const derivedPan = derivePanFromGstin(agency.gstin);
  const stateSignals = evaluateStateSignals({
    manualState: agency.agencyState,
    city: hydratedAddress.city,
    pinCode: hydratedAddress.pinCode,
    gstinState,
    label: "Agency state",
  });
  const nextAgencyState =
    agency.agencyState ||
    (stateSignals.strongestState as IndiaStateOption | "") ||
    "";

  return {
    ...agency,
    ...hydratedAddress,
    agencyState: nextAgencyState,
    pan: agency.pan || derivedPan,
    address: composeIndianAddress({
      addressLine1: hydratedAddress.addressLine1,
      addressLine2: hydratedAddress.addressLine2,
      city: hydratedAddress.city,
      state: nextAgencyState,
      pinCode: hydratedAddress.pinCode,
    }),
  };
}

function normalizeClientDetails(client: ClientDetails): ClientDetails {
  if (client.clientLocation === "international") {
    return client;
  }

  const hydratedAddress = hydrateIndianAddressFields({
    addressLine1: client.clientAddressLine1,
    addressLine2: client.clientAddressLine2,
    city: client.clientCity,
    state: client.clientState,
    pinCode: client.clientPinCode,
    legacyAddress: client.clientAddress,
  });
  const gstinState = getStateFromGstin(client.clientGstin);
  const stateSignals = evaluateStateSignals({
    manualState: client.clientState,
    city: hydratedAddress.city,
    pinCode: hydratedAddress.pinCode,
    gstinState,
    label: "Client state",
  });
  const nextClientState =
    client.clientState ||
    (stateSignals.strongestState as IndiaStateOption | "") ||
    "";

  return {
    ...client,
    ...hydratedAddress,
    clientState: nextClientState,
    clientAddress: composeIndianAddress({
      addressLine1: hydratedAddress.addressLine1,
      addressLine2: hydratedAddress.addressLine2,
      city: hydratedAddress.city,
      state: nextClientState,
      pinCode: hydratedAddress.pinCode,
    }),
  };
}

export function mergeInvoiceFormData(
  value?: Partial<InvoiceFormData> | null
): InvoiceFormData {
  const defaultLineItem = defaultInvoiceFormData.lineItems[0];
  const normalizeLineItem = (
    item?: Partial<InvoiceLineItem> | null
  ): InvoiceLineItem => {
    const nextType =
      normalizeInvoiceLineItemType(item?.type) ?? defaultLineItem.type;
    const nextRateUnit = invoiceAllowedUnitsByType[nextType].includes(
      item?.rateUnit ?? defaultLineItem.rateUnit
    )
      ? (item?.rateUnit ?? defaultLineItem.rateUnit)
      : invoiceDefaultUnitByType[nextType];

    return {
      ...defaultLineItem,
      ...item,
      type: nextType,
      rateUnit: nextRateUnit,
      sacCode: resolveLineItemSacCode({
        type: nextType,
        sacCode: item?.sacCode,
      }),
    };
  };

  return {
    agency: normalizeAgencyDetails({
      ...defaultInvoiceFormData.agency,
      ...value?.agency,
      gstRegistrationStatus:
        value?.agency?.gstRegistrationStatus ||
        defaultInvoiceFormData.agency.gstRegistrationStatus,
    }),
    client: normalizeClientDetails({
      ...defaultInvoiceFormData.client,
      ...value?.client,
    }),
    meta: {
      ...defaultInvoiceFormData.meta,
      ...value?.meta,
    },
    lineItems: Array.isArray(value?.lineItems)
      ? value.lineItems.map((item) => normalizeLineItem(item))
      : defaultInvoiceFormData.lineItems.map((item) => normalizeLineItem(item)),
    tax: {
      ...defaultInvoiceFormData.tax,
      ...value?.tax,
    },
    payment: {
      ...defaultInvoiceFormData.payment,
      ...value?.payment,
      license: {
        ...defaultInvoiceFormData.payment.license,
        ...value?.payment?.license,
      },
    },
  };
}
/* ─── Zod Schemas ────────────────────────────────────────── */

export const agencySchema = z.object({
  agencyName: z.string().min(1, "Agency name is required"),
  address: z.string().optional(),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  pinCode: z.string().min(6, "Pin code must be at least 6 digits"),
  agencyState: z.string().min(1, "State is required"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  logoUrl: z.string().optional(),
  gstRegistrationStatus: z.enum(["registered", "not-registered"]),
  lutAvailability: z.string().optional(),
  lutNumber: z.string().optional(),
  lutValidity: z.string().optional(),
  noLutTaxHandling: z.string().optional(),
  signatureUrl: z.string().optional(),
  profileLogoUrl: z.string().optional(),
});

export const clientSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().optional(),
  clientAddressLine1: z.string().optional(),
  clientAddressLine2: z.string().optional(),
  clientCity: z.string().optional(),
  clientPinCode: z.string().optional(),
  clientPostalCode: z.string().optional(),
  clientEmail: z.string().email("Invalid client email").optional().or(z.literal("")),
  clientState: z.string().optional(),
  clientCountry: z.string().optional(),
  clientCurrency: z.string().optional(),
  clientGstin: z.string().optional(),
  clientLocation: z.enum(["domestic", "international"]),
  isClientSezUnit: z.string().optional(),
});

export const metaSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  hasAddendum: z.boolean().default(false),
});

export const lineItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string().min(1, "Description is required"),
  qty: z.number().min(0),
  rate: z.number().min(0),
  rateUnit: z.string(),
  sacCode: z.string().optional(),
  is_milestone_header: z.boolean().optional(),
  milestone_group_id: z.string().optional(),
  milestone_status: z.enum(["PENDING", "SETTLED"]).optional(),
  tds_amount: z.number().optional(),
});

export const taxSchema = z.object({
  taxMode: z.enum(["none", "gst", "igst"]),
  taxRate: z.number().min(0),
  isRcmEnabled: z.boolean().default(false),
});

export const paymentSchema = z.object({
  license: z.object({
    isLicenseIncluded: z.boolean(),
    licenseType: z.string().optional(),
    licenseDuration: z.string().optional(),
  }),
  notes: z.string().optional(),
  paymentSettlementType: z.string().optional(),
  accountName: z.string().optional(),
  bankName: z.string().optional(),
  bankAddress: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  swiftBicCode: z.string().optional(),
  ibanRoutingCode: z.string().optional(),
  qrCodeUrl: z.string().optional(),
});

export const invoiceSchema = z.object({
  agency: agencySchema,
  client: clientSchema,
  meta: metaSchema,
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  tax: taxSchema,
  payment: paymentSchema,
});
