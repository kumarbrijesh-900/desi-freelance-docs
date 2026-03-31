import type { IndiaStateOption } from "@/lib/india-state-options";

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
  clientState: IndiaStateOption | "";
  clientGstin: string;
  clientLocation: "domestic" | "international";
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
  accountName: string;
  accountNumber: string;
  ifscCode: string;
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

export interface InvoiceComputedValues {
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
    agencyState: "",
    gstin: "",
    pan: "",
    logoUrl: "",
    gstRegistrationStatus: "",
    lutAvailability: "",
    lutNumber: "",
    noLutTaxHandling: "",
  },
  client: {
    clientName: "",
    clientAddress: "",
    clientState: "",
    clientGstin: "",
    clientLocation: "domestic",
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
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    qrCodeUrl: "",
  },
};

export function mergeInvoiceFormData(
  value?: Partial<InvoiceFormData> | null
): InvoiceFormData {
  const defaultLineItem = defaultInvoiceFormData.lineItems[0];

  return {
    agency: {
      ...defaultInvoiceFormData.agency,
      ...value?.agency,
    },
    client: {
      ...defaultInvoiceFormData.client,
      ...value?.client,
    },
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
