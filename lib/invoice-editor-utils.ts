import { addDays } from "@/lib/date-math";
import {
  defaultInvoiceFormData,
  mergeInvoiceFormData,
  type InvoiceFormData,
  type InvoiceStepperStep,
} from "@/types/invoice";

export const VALIDATION_STEPS: InvoiceStepperStep[] = [
  "agency",
  "client",
  "meta",
  "deliverables",
  "payment",
  "totals",
];

export const orderedSteps: InvoiceStepperStep[] = [
  "agency",
  "client",
  "deliverables",
  "payment",
];

export const PREVIEW_STORAGE_KEY = "invoice-preview-data";
export const DRAFT_STORAGE_KEY = "invoice-editor-draft";
export const ANONYMOUS_DRAFT_KEY = "lance_anonymous_draft";

export type StoredDraft = {
  formData: InvoiceFormData;
  currentStep: InvoiceStepperStep;
  savedAt: string;
  documentId?: string | null;
  clientMsaNote?: string | null;
  projectId?: string | null;
  projectName?: string;
};

export function clampNewInvoiceStartStep(step: InvoiceStepperStep): InvoiceStepperStep {
  const stepIndex = orderedSteps.indexOf(step);
  const clientIndex = orderedSteps.indexOf("client");
  if (stepIndex > clientIndex) return "client";
  return step;
}

export function clearPersistedInvoiceDrafts() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(ANONYMOUS_DRAFT_KEY);
    window.localStorage.removeItem("lance_draft_invoice");
    window.localStorage.removeItem("lance_draft_timestamp");
    window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage; a fresh in-memory form is still initialized.
  }
}

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSuggestedDueDate(paymentTerms: number, invoiceDate: string) {
  return addDays(invoiceDate, paymentTerms);
}

export function getDraftPlaceholderNumber() {
  const year = new Date().getFullYear();
  return `INV-${year}-000`;
}

export function getDemoData(invoiceNumber: string): InvoiceFormData {
  const today = getTodayDateString();

  return {
    agency: {
      agencyName: "Ashok Creative Studio",
      address: "2nd Floor, 14 Residency Road, Bengaluru, Karnataka 560025",
      addressLine1: "2nd Floor, 14 Residency Road",
      addressLine2: "",
      city: "Bengaluru",
      pinCode: "560025",
      agencyState: "Karnataka",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      logoUrl: "/dummy-logo.svg",
      gstRegistrationStatus: "registered",
      lutAvailability: "",
      lutNumber: "",
      lutValidity: "",
      noLutTaxHandling: "",
      signatureUrl: "",
    },
    client: {
      clientName: "Metro Shoes Pvt. Ltd.",
      clientAddress:
        "Phoenix Marketcity, Whitefield Main Road, Bengaluru 560048",
      clientAddressLine1: "Phoenix Marketcity, Whitefield Main Road",
      clientAddressLine2: "",
      clientCity: "Bengaluru",
      clientPinCode: "560048",
      clientPostalCode: "",
      clientEmail: "",
      clientState: "Karnataka",
      clientCountry: "",
      clientCurrency: "",
      clientGstin: "29AAACM8899L1Z2",
      clientLocation: "domestic" as const,
      isClientSezUnit: "no" as const,
    },
    meta: {
      invoiceNumber,
      invoiceDate: today,
      dueDate: addDays(today, 15),
      paymentTerms: 15,
      hasAddendum: false,
    },
    lineItems: [
      {
        id: "demo-line-1",
        type: "UI/UX" as const,
        description: "Landing Page UI Design",
        qty: 3,
        rate: 12000,
        rateUnit: "per-screen" as const,
      },
      {
        id: "demo-line-2",
        type: "Illustration" as const,
        description: "Editorial Illustration",
        qty: 2,
        rate: 8000,
        rateUnit: "per-item" as const,
      },
    ],
    milestones: [],
    tax: {
      taxMode: "gst" as const,
      taxRate: 18,
      isRcmEnabled: false,
    },
    payment: {
      license: {
        isLicenseIncluded: true,
        licenseType: "exclusive-license" as const,
        licenseDuration: "3 years",
      },
      notes:
        "50% advance received. Remaining balance due within 15 days. Final editable files and exports will be delivered after full payment.",
      terms: "50% advance received. Remaining balance due within 15 days.",
      paymentSettlementType: "",
      accountName: "Ashok Creative Studio",
      bankName: "HDFC Bank",
      bankAddress: "",
      accountNumber: "50200044321098",
      ifscCode: "HDFC0001122",
      swiftBicCode: "",
      ibanRoutingCode: "",
      qrCodeUrl: "/dummy-qr.svg",
    },
  };
}

export function formatCurrency(amount = 0, currency: string = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency === "INR" ? "₹" : "$"}${amount.toLocaleString("en-IN")}`;
  }
}

export function getFreshInvoiceData(): InvoiceFormData {
  const today = getTodayDateString();
  const fresh = mergeInvoiceFormData();

  return {
    ...fresh,
    meta: {
      ...fresh.meta,
      invoiceNumber: getDraftPlaceholderNumber(),
      invoiceDate: today,
      dueDate: "",
    },
  };
}

export function isFormTouched(formData: InvoiceFormData) {
  const hasAgencyData = Boolean(
    formData.agency.agencyName ||
    formData.agency.address ||
    formData.agency.addressLine1 ||
    formData.agency.addressLine2 ||
    formData.agency.city ||
    formData.agency.pinCode ||
    formData.agency.agencyState ||
    formData.agency.gstin ||
    formData.agency.pan ||
    formData.agency.logoUrl ||
    formData.agency.gstRegistrationStatus ||
    formData.agency.lutAvailability ||
    formData.agency.lutNumber ||
    formData.agency.noLutTaxHandling,
  );

  const hasClientData = Boolean(
    formData.client.clientName ||
    formData.client.clientAddress ||
    formData.client.clientAddressLine1 ||
    formData.client.clientAddressLine2 ||
    formData.client.clientCity ||
    formData.client.clientPinCode ||
    formData.client.clientPostalCode ||
    formData.client.clientEmail ||
    formData.client.clientState ||
    formData.client.clientCountry ||
    formData.client.clientCurrency ||
    formData.client.clientGstin ||
    formData.client.clientLocation === "international" ||
    formData.client.isClientSezUnit,
  );

  const hasMetaData = Boolean(
    formData.meta.paymentTerms || formData.meta.dueDate,
  );

  const hasLineItemData = formData.milestones.some((m) => m.lineItems.some((item) =>
    Boolean(
      item.description ||
      Number(item.rate) > 0 ||
      Number(item.qty) !== 1 ||
      item.type !== "Other" ||
      item.rateUnit !== "per-deliverable" ||
      item.is_milestone_header,
    ),
  ));

  const hasPaymentData = Boolean(
    formData.payment.notes ||
    formData.payment.paymentSettlementType ||
    formData.payment.accountName ||
    formData.payment.bankName ||
    formData.payment.bankAddress ||
    formData.payment.accountNumber ||
    formData.payment.ifscCode ||
    formData.payment.swiftBicCode ||
    formData.payment.ibanRoutingCode ||
    formData.payment.qrCodeUrl ||
    formData.payment.license.isLicenseIncluded,
  );

  return (
    hasAgencyData ||
    hasClientData ||
    hasMetaData ||
    hasLineItemData ||
    hasPaymentData
  );
}

export function getStepShortLabel(step: InvoiceStepperStep) {
  switch (step) {
    case "agency":
      return "Agency";
    case "client":
      return "Client";
    case "deliverables":
      return "Items";
    case "payment":
      return "Payment";
    case "meta":
      return "Meta";
    case "totals":
      return "Totals";
    default:
      return "Step";
  }
}

export function getLockStateLabel(state: string) {
  switch (state) {
    case "msa-accepted":
      return "Terms accepted by client";
    case "invoice-settled":
      return "Settlement complete";
    case "invoice-partial":
      return "Partially settled";
    case "invoice-cancelled":
      return "Cancelled";
    case "awaiting-client":
      return "Awaiting client response";
    case "client-proposed":
      return "Client proposed changes";
    default:
      return "Read-only";
  }
}

export function getStepDescription(step: InvoiceStepperStep) {
  switch (step) {
    case "agency":
      return "Issuer details, address, and tax registration.";
    case "client":
      return "Bill-to details and billing jurisdiction.";
    case "deliverables":
      return "Deliverables, quantities, and commercial rates.";
    case "payment":
      return "Settlement details and supporting payment terms.";
    case "meta":
      return "Invoice number, issue date, and due date.";
    case "totals":
      return "Final tax outcome and payable amount.";
    default:
      return "";
  }
}

export function getStepKind(step: InvoiceStepperStep) {
  switch (step) {
    case "payment":
    case "meta":
      return "support";
    case "totals":
      return "final";
    default:
      return "entry";
  }
}

export function getNextStep(step: InvoiceStepperStep) {
  const currentIndex = orderedSteps.indexOf(step);

  if (currentIndex === -1 || currentIndex === orderedSteps.length - 1) {
    return null;
  }

  return orderedSteps[currentIndex + 1];
}

export const stepVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as const },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const },
  }),
};
