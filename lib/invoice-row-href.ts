/**
 * Shared helper to determine the correct URL destination for an invoice row/link.
 * - Editable invoices (draft / revision) open in the editable invoice wizard.
 * - Finalized invoices (live / sent / settled / complete / locked / cancelled) open in the owner's read-only preview.
 */
export function invoiceRowHref(id: string, isEditable: boolean): string {
  if (isEditable) {
    return `/invoice/new?id=${id}&restore=1`;
  }
  return `/invoice/preview?id=${id}`;
}
