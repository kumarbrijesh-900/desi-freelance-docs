import type { InvoiceFormData } from '@/types/invoice'

/**
 * True for invoices the user has downloaded as PDF and is managing
 * manually. These are excluded from the master invoice list and from
 * dashboard health metrics, because Lance cannot observe their state.
 */
export function isOfflineInvoice(
  invoice: Pick<InvoiceFormData, 'isOffline'> | null | undefined
): boolean {
  return Boolean(invoice?.isOffline)
}

/**
 * True for invoices in the digital share flow. These appear in the
 * master list and contribute to dashboard metrics.
 */
export function isTrackedInvoice(
  invoice: Pick<InvoiceFormData, 'isOffline'> | null | undefined
): boolean {
  if (!invoice) return false
  return !invoice.isOffline
}

/**
 * Predicate-friendly filter for arrays of invoices.
 * Usage: invoices.filter(trackedOnly)
 */
export function trackedOnly<T extends { isOffline?: boolean | null }>(
  invoice: T
): boolean {
  return !invoice.isOffline
}

/**
 * Predicate-friendly filter for the offline tab.
 * Usage: invoices.filter(offlineOnly)
 */
export function offlineOnly<T extends { isOffline?: boolean | null }>(
  invoice: T
): boolean {
  return Boolean(invoice.isOffline)
}
