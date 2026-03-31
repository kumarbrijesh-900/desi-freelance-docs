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
  gstin: string;
  pan: string;
  logoUrl: string;
}

export interface ClientDetails {
  clientName: string;
  clientAddress: string;
  clientGstin: string;
  clientTaxId: string;
  clientLocation: "domestic" | "international";
  gstRegistrationStatus: "" | "registered" | "not-registered";
  hasValidLut: "" | "yes" | "no";
  lutNumber: string;
  exportTaxHandling: "" | "add-igst" | "handle-separately";
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

export type InvoiceCurrency =
  | "INR"
  | "USD"
  | "EUR"
  | "GBP"
  | "AED"
  | "AUD"
  | "CAD"
  | "SGD";

export interface PaymentDetails {
  license: LicenseDetails;
  notes: string;
  currency: InvoiceCurrency;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  qrCodeUrl: string;
  bankName: string;
  swiftCode: string;
  bankAddress: string;
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
    gstin: "",
    pan: "",
    logoUrl: "",
  },
  client: {
    clientName: "",
    clientAddress: "",
    clientGstin: "",
    clientTaxId: "",
    clientLocation: "domestic",
    gstRegistrationStatus: "",
    hasValidLut: "",
    lutNumber: "",
    exportTaxHandling: "",
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
    currency: "INR",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    qrCodeUrl: "",
    bankName: "",
    swiftCode: "",
    bankAddress: "",
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
