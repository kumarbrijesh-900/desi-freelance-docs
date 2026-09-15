/**
 * Live tax facts — overlay today's supplier and recipient records onto a child
 * invoice's inherited form_data.
 *
 *   The contract determines WHAT is supplied and for how much.
 *   The date of supply determines HOW it is taxed.
 *   A child invoice inherits the first and must re-derive the second.
 *
 * A milestone invoice is generated months after its parent from a wholesale
 * copy of the parent's form_data. That copy is correct for the commercial
 * terms — which were agreed once, and which `computeAppliedMsaSnapshot`
 * deliberately freezes — and wrong for everything tax determines, because tax
 * is decided by the facts standing on the date of supply.
 *
 * Two of those facts are recorded in live tables and were previously frozen:
 *
 *   - the supplier's GST registration and LUT (user_profiles)
 *   - the recipient's place of supply and SEZ status (clients)
 *
 * A third — `tax.taxRate` — has no live table. It exists only on the invoice,
 * so it stays inherited and a mid-project rate revision is NOT corrected here.
 *
 * The row shapes below mirror `profileToAgencyDetails` (lib/supabase/profiles.ts)
 * and `savedClientToClientDetails` (lib/supabase/clients.ts) field for field.
 * They are restated rather than imported because both of those modules pull in
 * the browser Supabase singleton at module scope, and this runs on the server.
 */

export interface SupplierTaxRow {
  gst_registration_status?: string | null;
  gstin?: string | null;
  state?: string | null;
  lut_availability?: string | null;
  lut_number?: string | null;
  lut_validity?: string | null;
  no_lut_tax_handling?: string | null;
}

export interface RecipientTaxRow {
  state?: string | null;
  country?: string | null;
  /** Carries "domestic" | "international" — see savedClientToClientDetails. */
  client_type?: string | null;
  sez_status?: string | null;
  gstin?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  pin_code?: string | null;
}

export interface TaxFactChange {
  path: string;
  from: string;
  to: string;
}

/**
 * A live value overlays the inherited one only when it is actually recorded.
 *
 * Blank means "not on file", never "changed to blank" — a half-filled profile
 * must not erase a good snapshot and push the invoice into the engine's
 * `indeterminate` branch, which charges no tax at all. De-registration is not
 * silent under this rule: it writes "not-registered", which is a present value.
 */
function overlay(
  target: Record<string, unknown>,
  key: string,
  liveValue: string | null | undefined,
  path: string,
  changes: TaxFactChange[],
): void {
  if (liveValue === null || liveValue === undefined) return;
  const live = String(liveValue).trim();
  if (live === "") return;
  const inherited = String(target[key] ?? "").trim();
  if (inherited === live) return;
  changes.push({ path, from: inherited, to: live });
  target[key] = liveValue;
}

/**
 * Returns a new formData with live tax facts applied, plus every field that
 * moved. Caller decides what to do with the changes — log them, surface them,
 * or refuse. Nothing here throws.
 *
 * Deliberately NOT overlaid: names, emails, MSA terms, payment identifiers and
 * `tax.taxRate`. Client address lines ARE overlaid alongside the state, because
 * a document showing the old city beside the new state is incoherent.
 */
export function overlayLiveTaxFacts(
  formData: any,
  supplier?: SupplierTaxRow | null,
  recipient?: RecipientTaxRow | null,
): { formData: any; changes: TaxFactChange[] } {
  const changes: TaxFactChange[] = [];
  const agency = { ...(formData?.agency ?? {}) };
  const client = { ...(formData?.client ?? {}) };

  if (supplier) {
    overlay(agency, "gstRegistrationStatus", supplier.gst_registration_status, "agency.gstRegistrationStatus", changes);
    overlay(agency, "gstin", supplier.gstin, "agency.gstin", changes);
    overlay(agency, "agencyState", supplier.state, "agency.agencyState", changes);
    overlay(agency, "lutAvailability", supplier.lut_availability, "agency.lutAvailability", changes);
    overlay(agency, "lutNumber", supplier.lut_number, "agency.lutNumber", changes);
    overlay(agency, "lutValidity", supplier.lut_validity, "agency.lutValidity", changes);
    overlay(agency, "noLutTaxHandling", supplier.no_lut_tax_handling, "agency.noLutTaxHandling", changes);
  }

  if (recipient) {
    overlay(client, "clientState", recipient.state, "client.clientState", changes);
    overlay(client, "clientCountry", recipient.country, "client.clientCountry", changes);
    overlay(client, "clientLocation", recipient.client_type, "client.clientLocation", changes);
    overlay(client, "isClientSezUnit", recipient.sez_status, "client.isClientSezUnit", changes);
    overlay(client, "clientGstin", recipient.gstin, "client.clientGstin", changes);
    overlay(client, "clientAddressLine1", recipient.address_line_1, "client.clientAddressLine1", changes);
    overlay(client, "clientAddressLine2", recipient.address_line_2, "client.clientAddressLine2", changes);
    overlay(client, "clientCity", recipient.city, "client.clientCity", changes);
    overlay(client, "clientPinCode", recipient.pin_code, "client.clientPinCode", changes);
  }

  return { formData: { ...formData, agency, client }, changes };
}

/**
 * The tax-determining subset, for logging what a child was actually issued on.
 */
export function describeTaxFacts(formData: any): string {
  const a = formData?.agency ?? {};
  const c = formData?.client ?? {};
  return [
    `reg=${a.gstRegistrationStatus || "-"}`,
    `supplierState=${a.agencyState || "-"}`,
    `lut=${a.lutAvailability || "-"}/${a.lutValidity || "-"}`,
    `noLut=${a.noLutTaxHandling || "-"}`,
    `recipientState=${c.clientState || "-"}`,
    `loc=${c.clientLocation || "-"}`,
    `sez=${c.isClientSezUnit || "-"}`,
    `rate=${formData?.tax?.taxRate ?? "-"}`,
  ].join(" ");
}
