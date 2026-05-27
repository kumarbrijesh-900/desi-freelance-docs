import type { InvoiceFormData, InvoiceStepperStep } from "@/types/invoice";
import { getInvoiceFieldErrors, isInvoiceStepValid } from "@/lib/invoice-validation";
import { requiresExplicitExportTaxChoice, hasExplicitExportTaxChoice } from "@/lib/invoice-compliance";
import { VALIDATION_STEPS } from "./invoice-editor-utils";

export function getFirstInvalidStep(formData: InvoiceFormData) {
  return (
    VALIDATION_STEPS.find((step) => !isInvoiceStepValid(formData, step)) ?? null
  );
}

export function getMissingFieldLabels(formData: InvoiceFormData) {
  const errors = getInvoiceFieldErrors(formData);
  const groups = new Map<InvoiceStepperStep, Set<string>>();
  const addField = (step: InvoiceStepperStep, label: string) => {
    if (!groups.has(step)) {
      groups.set(step, new Set());
    }

    groups.get(step)?.add(label);
  };

  if (errors.agency.agencyName) addField("agency", "Business / trade name");
  if (errors.agency.address) addField("agency", "Address line 1");
  if (errors.agency.agencyState) addField("agency", "Agency state");
  if (errors.agency.gstin) addField("agency", "Agency GSTIN");

  if (errors.client.clientName) addField("client", "Client name");
  if (errors.client.clientAddress) {
    addField(
      "client",
      formData.client.clientLocation === "international"
        ? "Full address"
        : "Address line 1",
    );
  }
  if (errors.client.clientState) addField("client", "Client state");
  if (errors.client.clientCountry) addField("client", "Client country");

  if (errors.meta.paymentTerms) addField("payment", "Payment terms");
  if (errors.meta.invoiceNumber) addField("meta", "Invoice number");
  if (errors.meta.invoiceDate) addField("meta", "Invoice date");
  if (errors.meta.dueDate) addField("meta", "Due date");

  if (errors.payment.accountName) {
    addField(
      "payment",
      formData.client.clientLocation === "international"
        ? "Beneficiary / Account Name"
        : "Account name",
    );
  }
  if (errors.payment.bankName) addField("payment", "Bank name");
  if (errors.payment.accountNumber) addField("payment", "Account number");
  if (errors.payment.ifscCode) addField("payment", "IFSC code");
  if (errors.payment.bankAddress) addField("payment", "Bank full address");
  if (errors.payment.swiftBicCode) addField("payment", "SWIFT / BIC code");
  if (errors.payment.licenseDuration) addField("payment", "License duration");

  const itemsToValidate =
    formData.milestones && formData.milestones.length > 0
      ? formData.milestones.flatMap((m) => m.lineItems)
      : formData.lineItems;

  if (itemsToValidate.length === 0) {
    addField("deliverables", "At least one line item");
  } else {
    Object.values(errors.lineItems).forEach((lineItemErrors) => {
      if (lineItemErrors.description) {
        addField("deliverables", "Deliverable description");
      }
      if (lineItemErrors.qty) addField("deliverables", "Deliverable quantity");
      if (lineItemErrors.rate) addField("deliverables", "Deliverable rate");
      if (lineItemErrors.sacCode) addField("deliverables", "SAC code");
    });
  }

  if (
    requiresExplicitExportTaxChoice(formData.agency, formData.client) &&
    !hasExplicitExportTaxChoice(formData.agency)
  ) {
    addField("totals", "Export tax handling choice");
  }

  return VALIDATION_STEPS
    .map((step) => ({
      step,
      fields: Array.from(groups.get(step) ?? []),
    }))
    .filter((group) => group.fields.length > 0);
}

export type MissingFieldGroup = {
  step: InvoiceStepperStep;
  fields: string[];
};

export function withProjectRequirement(
  groups: MissingFieldGroup[],
  hasProjectName: boolean,
) {
  if (hasProjectName) return groups;

  const deliverablesGroup = groups.find((group) => group.step === "deliverables");
  if (deliverablesGroup) {
    if (deliverablesGroup.fields.includes("Project")) return groups;
    return groups.map((group) =>
      group.step === "deliverables"
        ? { ...group, fields: ["Project", ...group.fields] }
        : group,
    );
  }

  const nextGroups = [...groups];
  const deliverablesIndex = VALIDATION_STEPS.indexOf("deliverables");
  const insertIndex = nextGroups.findIndex(
    (group) => VALIDATION_STEPS.indexOf(group.step) > deliverablesIndex,
  );
  const projectGroup: MissingFieldGroup = {
    step: "deliverables",
    fields: ["Project"],
  };

  if (insertIndex === -1) {
    nextGroups.push(projectGroup);
  } else {
    nextGroups.splice(insertIndex, 0, projectGroup);
  }

  return nextGroups;
}

export function isStepValidWithProject(
  formData: InvoiceFormData,
  step: InvoiceStepperStep,
  hasProjectName: boolean,
) {
  return isInvoiceStepValid(formData, step) && (step !== "deliverables" || hasProjectName);
}

export function getFirstInvalidStepWithProject(
  formData: InvoiceFormData,
  hasProjectName: boolean,
) {
  const firstInvalidStep = getFirstInvalidStep(formData);
  if (hasProjectName) return firstInvalidStep;
  if (!firstInvalidStep) return "deliverables";

  const deliverablesIndex = VALIDATION_STEPS.indexOf("deliverables");
  const firstInvalidIndex = VALIDATION_STEPS.indexOf(firstInvalidStep);
  return firstInvalidIndex <= deliverablesIndex
    ? firstInvalidStep
    : "deliverables";
}

export function isInvoiceReadyForPreview(formData: InvoiceFormData, hasProjectName: boolean) {
  return VALIDATION_STEPS.every((step) =>
    isStepValidWithProject(formData, step, hasProjectName),
  );
}
