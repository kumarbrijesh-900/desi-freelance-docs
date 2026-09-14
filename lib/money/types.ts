/**
 * Money engine — types.
 *
 * Every returned figure is named for its BASIS. There is deliberately no field
 * called `total`, `grandTotal` or `amount`: each of those names has already
 * meant two different things in this codebase (the `grand_total` column holds a
 * pre-tax subtotal) and every money bug so far has been a caller guessing which
 * basis it was holding.
 */

export type TaxTreatment =
  | "unregistered"
  | "reverse_charge"
  | "intrastate"
  | "interstate"
  | "export_zero_rated"
  | "export_igst"
  | "sez_zero_rated"
  | "sez_igst"
  | "indeterminate";

export type MoneyWarningCode =
  | "LUT_LAPSED"
  | "LUT_NOT_YET_EFFECTIVE"
  | "LUT_VALIDITY_MISSING"
  | "STATE_UNRESOLVED"
  | "REGISTERED_BUT_ZERO_RATE"
  | "NEGATIVE_LINE";

export interface MoneyWarning {
  code: MoneyWarningCode;
  message: string;
}

/** The only shape the engine reads. Deliberately narrower than InvoiceLineItem. */
export interface MoneyLine {
  id?: string;
  qty: number | string;
  rate: number | string;
  /**
   * Optional per-line GST rate. Not present on InvoiceLineItem today, so it is
   * always undefined in v1 and the slab array collapses to one entry. Reading
   * it here means mixed slabs become a schema change only, not an engine change.
   */
  taxRate?: number;
}

/**
 * How this supply is taxed. Sourced from the LIVE user_profiles + clients rows
 * plus the date of supply — never from a copied form_data snapshot.
 *
 *   The contract determines WHAT is supplied and for how much.
 *   The date of supply determines HOW it is taxed.
 *   A child invoice inherits the first and must re-derive the second.
 */
export interface TaxContext {
  /** Date of supply, ISO yyyy-mm-dd. Drives LUT validity. */
  supplyDate: string;
  supplierRegistered: boolean;
  /** "" when unknown. */
  supplierState: string;
  /** "" when unknown. */
  recipientState: string;
  recipientLocation: "domestic" | "international";
  recipientIsSez: boolean;
  /** AgencyDetails.lutValidity FY code, e.g. "fy_2026_27". "" = no LUT held. */
  lutFinancialYear: string;
  noLutHandling: "add-igst" | "keep-zero-tax";
  reverseCharge: boolean;
  /** Applied to any line without its own taxRate. */
  defaultRate: number;
}

export interface TaxSlab {
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
}

export interface InvoiceMoney {
  /** Sum of line amounts, pre-tax. What `grand_total` actually holds today. */
  taxableValue: number;
  /** Grouped by effective rate, ascending. GSTR-1 reconciles against this. */
  slabs: TaxSlab[];
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  /** Sec 170 CGST Act. amountPayable - (taxableValue + taxTotal). */
  roundOff: number;
  /** Whole rupees. The only figure a client is ever asked to pay. */
  amountPayable: number;
  treatment: TaxTreatment;
  /** Client-facing, e.g. "CGST 9% + SGST 9%". */
  label: string;
  /** Non-fatal conditions a surface should show BEFORE the invoice goes out. */
  warnings: MoneyWarning[];
}
