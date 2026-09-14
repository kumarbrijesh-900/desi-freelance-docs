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

  const gstin = (agency.gstin ?? "").trim();
  const supplierRegistered =
    agency.gstRegistrationStatus === "registered" || gstin.length === 15;

  /**
   * An LUT only exists for the engine when the agency says it holds one AND has
   * recorded which financial year it covers. `lutAvailability: "yes"` with a
   * blank `lutValidity` is not a LUT you can prove on a date — the engine warns
   * rather than zero-rating on trust. This is the field nothing read before.
   */
  const lutFinancialYear =
    agency.lutAvailability === "yes" ? (agency.lutValidity ?? "").trim() : "";

  // A rate of 0 is a legitimate value and must survive; only absent/NaN falls back.
  const rawRate = Number(tax.taxRate);
  const defaultRate = Number.isFinite(rawRate) ? rawRate : 18;

  return {
    supplyDate: (sources?.supplyDate ?? "").trim(),
    supplierRegistered,
    supplierState: (agency.agencyState ?? "").trim(),
    recipientState: (client.clientState ?? "").trim(),
    recipientLocation:
      client.clientLocation === "international" ? "international" : "domestic",
    recipientIsSez: client.isClientSezUnit === "yes",
    lutFinancialYear,
    noLutHandling:
      agency.noLutTaxHandling === "add-igst" ? "add-igst" : "keep-zero-tax",
    reverseCharge: Boolean(tax.isRcmEnabled),
    defaultRate,
  };
}
