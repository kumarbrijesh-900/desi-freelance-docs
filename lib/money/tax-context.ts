import type { AgencyDetails, ClientDetails, TaxConfig } from "@/types/invoice";
import type { TaxContext } from "./types";

/**
 * The records a TaxContext may be built from.
 *
 * These MUST be the live `user_profiles` and `clients` rows plus the invoice's
 * own date of supply — never a child invoice's copied `form_data` snapshot.
 *
 *   The contract determines WHAT is supplied and for how much.
 *   The date of supply determines HOW it is taxed.
 *   A child invoice inherits the first and must re-derive the second.
 *
 * `computeAppliedMsaSnapshot` freezes MSA terms into the child on purpose —
 * the agreement was agreed once. Tax is the mirror case and must not be frozen.
 */
export interface TaxContextSources {
  agency: Pick<
    AgencyDetails,
    | "gstRegistrationStatus"
    | "gstin"
    | "agencyState"
    | "lutAvailability"
    | "lutValidity"
    | "noLutTaxHandling"
  >;
  client: Pick<ClientDetails, "clientState" | "clientLocation" | "isClientSezUnit">;
  tax: Pick<TaxConfig, "taxRate" | "isRcmEnabled">;
  /** Date of supply, ISO yyyy-mm-dd. Normally InvoiceMeta.invoiceDate. */
  supplyDate: string;
}

export function buildTaxContext(sources: TaxContextSources): TaxContext {
  const agency = sources?.agency ?? ({} as TaxContextSources["agency"]);
  const client = sources?.client ?? ({} as TaxContextSources["client"]);
  const tax = sources?.tax ?? ({} as TaxContextSources["tax"]);

  const gstin = agency.gstin ?? "";
  const supplierRegistered =
    agency.gstRegistrationStatus === "registered" || gstin.length === 15;

  /**
   * Both fields are carried through unchanged. `lutAvailability` is a tri-state
   * and "" ("not stated") is NOT the same as "no" — the resolution rules in the
   * engine branch on all three, exactly as the function they replace did.
   */
  const lutDeclared =
    agency.lutAvailability === "yes" || agency.lutAvailability === "no"
      ? agency.lutAvailability
      : "";
  const lutFinancialYear = agency.lutValidity ?? "";

  // A rate of 0 is legitimate and must survive; only absent/null/NaN falls back,
  // matching the `?? 18` the old function used.
  const rawRate = tax.taxRate == null ? Number.NaN : Number(tax.taxRate);
  const defaultRate = Number.isFinite(rawRate) ? rawRate : 18;

  return {
    supplyDate: sources?.supplyDate ?? "",
    supplierRegistered,
    supplierState: agency.agencyState ?? "",
    recipientState: client.clientState ?? "",
    recipientLocation:
      client.clientLocation === "international" ? "international" : "domestic",
    recipientIsSez: client.isClientSezUnit === "yes",
    lutDeclared,
    lutFinancialYear,
    noLutHandling:
      agency.noLutTaxHandling === "add-igst" ? "add-igst" : "keep-zero-tax",
    reverseCharge: Boolean(tax.isRcmEnabled),
    defaultRate,
  };
}
