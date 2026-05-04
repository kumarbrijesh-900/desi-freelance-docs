/**
 * Synthesize a global MSA document from an agency's profile defaults.
 *
 * Used to auto-generate the agency's fallback MSA when:
 *  - No project addendum exists on the invoice
 *  - No client-specific MSA exists for the recipient
 *  - The agency has filled in their Global Contract Defaults in profile
 */

export interface AgencyMsaDefaults {
  agency_name?: string | null;
  msa_payment_terms_days?: number | null;
  msa_late_fee_rate?: number | null;
  msa_late_fee_unit?: string | null;
  msa_ip_trigger_type?: string | null;
  msa_jurisdiction_city?: string | null;
}

export interface SynthesizedMsa {
  title: string;
  content: string;
}

export function canSynthesizeGlobalMsa(p: AgencyMsaDefaults): boolean {
  return (
    typeof p.msa_payment_terms_days === "number" &&
    typeof p.msa_late_fee_rate === "number" &&
    !!p.msa_ip_trigger_type &&
    !!p.msa_jurisdiction_city
  );
}

function humanizeIpTrigger(trigger: string): string {
  const map: Record<string, string> = {
    upon_full_payment: "upon receipt of full payment for the invoice",
    upon_delivery: "upon delivery of the final work",
    upon_signing: "upon signing of this Agreement",
  };
  return map[trigger] ?? trigger.replace(/_/g, " ");
}

export function synthesizeGlobalMsa(profile: AgencyMsaDefaults): SynthesizedMsa {
  const agencyName = profile.agency_name?.trim() || "The Agency";
  const paymentDays = profile.msa_payment_terms_days ?? 15;
  const lateFeeRate = profile.msa_late_fee_rate ?? 1.5;
  const lateFeeUnit = profile.msa_late_fee_unit ?? "monthly";
  const ipTrigger = humanizeIpTrigger(profile.msa_ip_trigger_type ?? "upon_full_payment");
  const jurisdiction = profile.msa_jurisdiction_city ?? "Bangalore";

  const title = `${agencyName} \u2014 Master Services Agreement`;

  const content = [
    "MASTER SERVICE AGREEMENT",
    "",
    `This Master Service Agreement ("Agreement") is entered into between ${agencyName} ("Agency") and the client ("Client") as referenced in the associated invoice.`,
    "",
    "1. SCOPE OF WORK",
    "The Agency will provide services as described in each invoice or statement of work (\"SOW\") issued under this Agreement. Each SOW will detail the specific deliverables, timelines, and associated fees.",
    "",
    "2. INTELLECTUAL PROPERTY RIGHTS",
    `All intellectual property created during the engagement shall remain the property of the Agency until the conditions for transfer are met. Ownership of the final deliverables transfers to the Client ${ipTrigger}.`,
    "",
    "Work-in-progress files, source files, and intermediate assets remain the property of the Agency unless explicitly included in the deliverables.",
    "",
    "3. PAYMENT TERMS",
    `- Payment is due within ${paymentDays} days of invoice issuance, unless otherwise specified on the invoice.`,
    `- Late payments will incur a fee of ${lateFeeRate}% ${lateFeeUnit} on the outstanding balance.`,
    `- The Agency reserves the right to suspend work if payment is overdue by more than ${paymentDays} days beyond the due date.`,
    "",
    "4. REVISIONS & SCOPE CHANGES",
    "- Each invoice or SOW includes the revision rounds specified therein.",
    "- Additional revisions or scope changes will be billed at the Agency's standard rates.",
    "- Major scope changes require a revised SOW and mutual agreement.",
    "",
    "5. CONFIDENTIALITY",
    "Both parties agree to keep confidential all proprietary information shared during the engagement. This obligation survives the termination of this Agreement.",
    "",
    "6. TERMINATION",
    "Either party may terminate this Agreement with 14 days written notice. The Client remains liable for all work completed and approved up to the termination date.",
    "",
    "7. JURISDICTION & GOVERNING LAW",
    `This Agreement shall be governed by the laws of India and any disputes shall be subject to the exclusive jurisdiction of the courts of ${jurisdiction}.`,
    "",
    "8. ACCEPTANCE",
    "By accepting this Agreement (digitally or by issuing payment against an invoice), the Client agrees to be bound by the terms herein. Project-specific addendums on individual invoices override these terms only where explicitly stated.",
  ].join("\n");

  return { title, content };
}
