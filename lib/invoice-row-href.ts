export function invoiceRowHref(id: string, status?: string): string {
  const normalized = (status || "").toLowerCase();
  const isDraft = !normalized || normalized === "draft";
  // Drafts open in the editor to keep composing; everything finalized/sent/settled
  // (including auto-generated milestone invoices) opens in the read-only preview,
  // which renders the invoice and offers print/download (and an Edit link back).
  return isDraft
    ? `/invoice/new?id=${id}&restore=1`
    : `/invoice/preview?id=${id}`;
}
