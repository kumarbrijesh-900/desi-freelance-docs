/**
 * ─── Template Types & Data Preparation ─────────────
 *
 * Shared interface for all invoice template components.
 * Business logic (tax, compliance, formatting) is computed ONCE
 * and passed to each template as pre-computed props.
 * Templates are purely visual — no business logic.
 */

import type { InvoiceFormData, InvoiceLineItem, InvoiceTaxBreakdown } from "@/types/invoice";

/* ─── Pre-computed line item for templates ────────── */

export interface TemplateLineItem {
  id: string;
  type: string;
  description: string;
  qty: number | string;
  rate: number | string;
  rateFormatted: string;
  unit: string;
  amount: number;
  amountFormatted: string;
  sacCode: string;
  isMilestoneHeader?: boolean;
  groupSubtotalFormatted?: string;
}

/* ─── Pre-computed tax row for templates ─────────── */

export interface TemplateTaxRow {
  label: string;
  amountFormatted: string;
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
  poNumber?: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  displayCurrency: string;

  /* ── Line Items ────────────────────────── */
  lineItems: TemplateLineItem[];
  itemCount: number;

  /* ── Milestone Billing (v1.5) ──────────────────── */
  isMilestoneInvoice: boolean;
  milestoneCount: number;
  currentMilestoneLabel: string;
  currentMilestoneFormatted: string;
  remainingMilestonesFormatted: string;
  totalProjectFormatted: string;

  /* ── Totals ────────────────────────────── */
  subtotalFormatted: string;
  taxLabel: string;
  taxFormatted: string;
  taxRows: TemplateTaxRow[];
  grandTotalFormatted: string;
  grandTotalRaw: number;
  roundOffRaw?: number;
  roundOffFormatted?: string;
  approximateUsd: string | null;
  taxComplianceNote: string;
  taxInfo: InvoiceTaxBreakdown;

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

  /* ── Extra UI Meta ──────────────────────── */
  isDraft: boolean;
  isOffline: boolean;
  projectName: string;
}

/* ─── Template component interface ───────────────── */

export interface InvoiceTemplateProps {
  data: TemplateData;
}
