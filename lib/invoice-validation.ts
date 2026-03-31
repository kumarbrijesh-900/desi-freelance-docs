import type {
  InvoiceFormData,
  InvoiceStepperStep,
} from "@/types/invoice";
import { isInternationalClient } from "@/lib/invoice-compliance";

export type InvoiceFieldErrors = {
  agency: {
    agencyName?: string;
    address?: string;
    agencyState?: string;
    gstin?: string;
    pan?: string;
  };
  client: {
    clientName?: string;
    clientAddress?: string;
    clientState?: string;
    clientGstin?: string;
  };
  meta: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    paymentTerms?: string;
  };
  lineItems: Record<
    string,
    {
      description?: string;
      qty?: string;
      rate?: string;
    }
  >;
  payment: {
    licenseDuration?: string;
  };
};

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function isBlank(value?: string) {
  return !value || !value.trim();
}

export function getInvoiceFieldErrors(
  formData: InvoiceFormData
): InvoiceFieldErrors {
  const errors: InvoiceFieldErrors = {
    agency: {},
    client: {},
    meta: {},
    lineItems: {},
    payment: {},
  };

  if (isBlank(formData.agency.agencyName)) {
    errors.agency.agencyName = "Agency name is required.";
  }

  if (isBlank(formData.agency.address)) {
    errors.agency.address = "Agency address is required.";
  }

  if (isBlank(formData.agency.agencyState)) {
    errors.agency.agencyState = "Agency state is required.";
  }

  if (
    formData.agency.gstRegistrationStatus === "registered" &&
    formData.agency.gstin.trim() &&
    !GSTIN_REGEX.test(formData.agency.gstin.trim().toUpperCase())
  ) {
    errors.agency.gstin =
      "Enter a valid GSTIN in standard 15-character format.";
  }

  if (
    formData.agency.pan.trim() &&
    !PAN_REGEX.test(formData.agency.pan.trim().toUpperCase())
  ) {
    errors.agency.pan =
      "Enter a valid PAN in the format AAAAA9999A.";
  }

  if (isBlank(formData.client.clientName)) {
    errors.client.clientName = "Client name is required.";
  }

  if (isBlank(formData.client.clientAddress)) {
    errors.client.clientAddress = "Client address is required.";
  }

  if (
    !isInternationalClient(formData.client) &&
    isBlank(formData.client.clientState)
  ) {
    errors.client.clientState = "Client state is required for domestic invoices.";
  }

  if (
    !isInternationalClient(formData.client) &&
    formData.client.clientGstin.trim() &&
    !GSTIN_REGEX.test(formData.client.clientGstin.trim().toUpperCase())
  ) {
    errors.client.clientGstin =
      "Enter a valid client GSTIN in standard 15-character format.";
  }

  if (isBlank(formData.meta.paymentTerms)) {
    errors.meta.paymentTerms = "Payment terms are required.";
  }

  if (isBlank(formData.meta.invoiceNumber)) {
    errors.meta.invoiceNumber = "Invoice number is required.";
  }

  if (isBlank(formData.meta.invoiceDate)) {
    errors.meta.invoiceDate = "Invoice date is required.";
  }

  if (isBlank(formData.meta.dueDate)) {
    errors.meta.dueDate = "Due date is required.";
  }

  if (
    formData.meta.invoiceDate &&
    formData.meta.dueDate &&
    new Date(formData.meta.dueDate) < new Date(formData.meta.invoiceDate)
  ) {
    errors.meta.dueDate =
      "Due date cannot be earlier than the invoice date.";
  }

  formData.lineItems.forEach((item) => {
    const itemErrors: {
      description?: string;
      qty?: string;
      rate?: string;
    } = {};

    if (isBlank(item.description)) {
      itemErrors.description = "Description is required.";
    }

    if (!Number.isFinite(item.qty) || item.qty < 1) {
      itemErrors.qty = "Qty must be at least 1.";
    }

    if (!Number.isFinite(item.rate) || item.rate <= 0) {
      itemErrors.rate = "Rate must be greater than 0.";
    }

    if (Object.keys(itemErrors).length > 0) {
      errors.lineItems[item.id] = itemErrors;
    }
  });

  if (
    formData.payment.license.isLicenseIncluded &&
    (formData.payment.license.licenseType === "exclusive-license" ||
      formData.payment.license.licenseType === "non-exclusive-license") &&
    isBlank(formData.payment.license.licenseDuration)
  ) {
    errors.payment.licenseDuration =
      "License duration is required for time-bound licenses.";
  }

  return errors;
}

function hasAnyErrors(value: unknown): boolean {
  if (!value) return false;

  if (typeof value === "string") return Boolean(value);

  if (Array.isArray(value)) {
    return value.some(hasAnyErrors);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasAnyErrors);
  }

  return false;
}

export function isInvoiceStepValid(
  formData: InvoiceFormData,
  step: InvoiceStepperStep
) {
  const errors = getInvoiceFieldErrors(formData);

  switch (step) {
    case "agency":
      return !hasAnyErrors(errors.agency);

    case "client":
      return !hasAnyErrors(errors.client);

    case "deliverables":
      return Object.keys(errors.lineItems).length === 0;

    case "payment":
      return !errors.meta.paymentTerms && !hasAnyErrors(errors.payment);

    case "meta":
      return (
        !errors.meta.invoiceNumber &&
        !errors.meta.invoiceDate &&
        !errors.meta.dueDate
      );

    case "totals":
      return true;

    default:
      return true;
  }
}

export function getInvoiceStepError(
  formData: InvoiceFormData,
  step: InvoiceStepperStep
) {
  const errors = getInvoiceFieldErrors(formData);

  switch (step) {
    case "agency":
      return hasAnyErrors(errors.agency)
        ? "Please fix the highlighted agency fields."
        : "";

    case "client":
      return hasAnyErrors(errors.client)
        ? "Please fix the highlighted client fields."
        : "";

    case "deliverables":
      return Object.keys(errors.lineItems).length > 0
        ? "Each line item needs a description, valid quantity, and valid rate."
        : "";

    case "payment":
      return !errors.meta.paymentTerms && !hasAnyErrors(errors.payment)
        ? ""
        : "Please review payment terms and license details.";

    case "meta":
      return hasAnyErrors({
        invoiceNumber: errors.meta.invoiceNumber,
        invoiceDate: errors.meta.invoiceDate,
        dueDate: errors.meta.dueDate,
      })
        ? "Please fix the highlighted invoice metadata fields."
        : "";

    case "totals":
      return "";

    default:
      return "";
  }
}
