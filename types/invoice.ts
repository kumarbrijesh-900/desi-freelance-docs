import type { IndiaStateOption } from "@/lib/india-state-options";
import type {
  InternationalCountryOption,
  InternationalCurrencyCode,
} from "@/lib/international-billing-options";
import {
  composeIndianAddress,
  evaluateStateSignals,
  hydrateIndianAddressFields,
} from "@/lib/invoice-address";
import { derivePanFromGstin, getStateFromGstin } from "@/lib/gstin-parser";

export type InvoiceLineItemType =
  | "Logo Design"
  | "UI/UX"
  | "Illustration"
  | "Photography"
  | "Video Editing"
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

export interface InvoiceLineItem {
  id: string;
  type: InvoiceLineItemType;
  description: string;
  qty: number;
  rate: number;
  rateUnit: InvoiceRateUnit;
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
  noLutTaxHandling: "" | "add-igst" | "keep-zero-tax";
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
  isClientSezUnit: "" | "yes" | "no" | "not-sure";
}

export interface InvoiceMeta {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
}

export interface TaxConfig {
  taxMode: "none" | "gst" | "igst";
  taxRate: number;
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
    noLutTaxHandling: "",
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
  },
  meta: {
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    paymentTerms: "",
  },
  lineItems: [
    {
      id: "line-1",
      type: "UI/UX",
      description: "",
      qty: 1,
      rate: 0,
      rateUnit: "per-screen",
    },
  ],
  tax: {
    taxMode: "gst",
    taxRate: 18,
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
    state: agency.agencyState,
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
      ? value.lineItems.map((item) => ({
          ...defaultLineItem,
          ...item,
        }))
      : defaultInvoiceFormData.lineItems.map((item) => ({ ...item })),
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
