/**
 * ─── Template Types & Data Preparation ─────────────
 *
 * Shared interface for all invoice template components.
 * Business logic (tax, compliance, formatting) is computed ONCE
 * and passed to each template as pre-computed props.
 * Templates are purely visual — no business logic.
 */

import type { InvoiceFormData, InvoiceLineItem } from "@/types/invoice";

/* ─── Pre-computed line item for templates ────────── */

export interface TemplateLineItem {
  id: string;
  type: string;
  description: string;
  qty: number;
  rate: number;
  rateFormatted: string;
  unit: string;
  amount: number;
  amountFormatted: string;
  sacCode: string;
}

/* ─── Pre-computed template data ─────────────────── */

export interface TemplateData {
  /* ── Agency ────────────────────────────── */
  agencyName: string;
  agencyAddress: string;
  agencyState: string;
  agencyGstin: string;
  agencyPan: string;
  agencyLogoUrl: string;
  showAgencyGstin: boolean;

  /* ── Client ────────────────────────────── */
  clientName: string;
  clientAddress: string;
  clientState: string;
  clientCountry: string;
  clientTaxId: string;
  clientTaxLabel: string;
  isInternational: boolean;

  /* ── Invoice Meta ──────────────────────── */
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  displayCurrency: string;

  /* ── Line Items ────────────────────────── */
  lineItems: TemplateLineItem[];
  itemCount: number;

  /* ── Totals ────────────────────────────── */
  subtotalFormatted: string;
  taxLabel: string;
  taxFormatted: string;
  grandTotalFormatted: string;
  grandTotalRaw: number;
  approximateUsd: string | null;
  taxComplianceNote: string;

  /* ── Payment ───────────────────────────── */
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankAddress: string;
  swiftBicCode: string;
  ibanRoutingCode: string;
  qrCodeUrl: string;
  hasBankDetails: boolean;
  hasQrCode: boolean;

  /* ── Notes & License ───────────────────── */
  notes: string;
  hasNotes: boolean;
  hasLicense: boolean;
  licenseType: string;
  licenseDuration: string;

  /* ── GST Compliance ─────────────────────── */
  agencyStateCode: string;
  clientStateCode: string;
  amountInWords: string;
  reverseCharge: boolean;
  authorizedSignatory: string;
  signatureUrl: string;
}

/* ─── Template component interface ───────────────── */

export interface InvoiceTemplateProps {
  data: TemplateData;
}
