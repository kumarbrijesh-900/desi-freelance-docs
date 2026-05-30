export function invoiceRowHref(id: string): string {
  return `/invoice/new?id=${id}&restore=1`;
}
