import { InvoiceFormData, LicenseType } from "@/types/invoice";
import { ClientDetails } from "@/types/invoice";
import {
  SavedClient,
  savedClientToClientDetails,
} from "@/lib/supabase/clients";

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function lateFeeUnitLabel(unit?: ClientDetails["msaLateFeeUnit"]) {
  switch (unit) {
    case "daily":
      return "per day";
    case "annually":
      return "per annum";
    case "monthly":
    default:
      return "per month";
  }
}

/**
 * Derives a suggested due date based on payment terms and an invoice date.
 * Matches "Net X" or "Due on Receipt".
 */
export function getSuggestedDueDate(paymentTerms: number, invoiceDate: string) {
  if (!invoiceDate) return "";
  const days = Number(paymentTerms) || 0;
  return addDays(invoiceDate, days);
}

/**
 * Hydrates an invoice form state with pre-negotiated MSA blueprint data
 * from a selected client. This ensures the invoice complies with
 * the client-specific legal and financial terms.
 */
export function syncMsaToInvoice(
  currentFormData: InvoiceFormData,
  savedClient: SavedClient,
): InvoiceFormData {
  // Convert DB row to form-friendly details
  const client = savedClientToClientDetails(savedClient);

  // Start with current form but swap the client details and reset addendum flag
  const updated: InvoiceFormData = {
    ...currentFormData,
    client: { ...client },
    meta: {
      ...currentFormData.meta,
      hasAddendum: false, // Default to MSA mode when syncing client authority
    },
  };

  // 1. Hydrate Payment Terms & Calculate Suggested Due Date
  if (client.msaPaymentTermsDays !== undefined) {
    const days = client.msaPaymentTermsDays;

    updated.meta = {
      ...updated.meta,
      paymentTerms: days,
      dueDate: getSuggestedDueDate(
        days,
        updated.meta.invoiceDate || new Date().toISOString().split("T")[0],
      ),
    };
  }

  // 2. Hydrate Terms & Notes (Boilerplate)
  if (client.msaNotesBoilerplate) {
    let finalNotes = client.msaNotesBoilerplate;

    // Add Late Fee Rate if specified in the blueprint
    if (client.msaLateFeeRate && client.msaLateFeeRate > 0) {
      const lateFeeText = `\n\nNote: A late fee of ${client.msaLateFeeRate}% ${lateFeeUnitLabel(client.msaLateFeeUnit)} applies to overdue balances.`;
      if (!finalNotes.includes(lateFeeText.trim())) {
        finalNotes += lateFeeText;
      }
    }

    // Add Revision Policy if specified
    if (client.freeRevisionRounds !== undefined && client.extraRevisionFeePercent !== undefined) {
      const revisionClause = `The quoted fee includes up to ${client.freeRevisionRounds} rounds of revisions per deliverable. Each additional round beyond the included ${client.freeRevisionRounds} will incur a surcharge of ${client.extraRevisionFeePercent}% of that specific line item's total.`;
      if (!finalNotes.includes("rounds of revisions")) {
        finalNotes += `\n\n${revisionClause}`;
      }
    }

    // Append MSA Reference Label for legal tracking
    if (client.msaVersionLabel) {
      const referenceText = `\n\nGoverned by Agreement: ${client.msaVersionLabel}`;
      if (!finalNotes.includes(referenceText.trim())) {
        finalNotes += referenceText;
      }
    }

    updated.payment = {
      ...updated.payment,
      notes: finalNotes.trim(),
    };
  }

  // 3. Hydrate Intellectual Property / License Defaults
  if (client.msaIpTriggerType) {
    let targetLicense: LicenseType = "full-assignment";

    if (client.msaIpTriggerType.toLowerCase().includes("exclusive_license")) {
      targetLicense = "exclusive-license";
    } else if (
      client.msaIpTriggerType.toLowerCase().includes("non_exclusive")
    ) {
      targetLicense = "non-exclusive-license";
    }

    updated.payment.license = {
      ...updated.payment.license,
      isLicenseIncluded: true,
      licenseType: targetLicense,
    };
  }

  return updated;
}
