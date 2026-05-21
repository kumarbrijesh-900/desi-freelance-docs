export const INVOICE_DATA_CHANGED_EVENT = "lance:invoice-data-changed";
export const INVOICE_DATA_CHANGED_STORAGE_KEY = "lance_invoice_data_changed_at";

type InvoiceDataChangedDetail = {
  invoiceId?: string;
  action?: string;
  updatedAt?: string;
};

export function announceInvoiceDataChanged(detail: InvoiceDataChangedDetail = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    ...detail,
    updatedAt: detail.updatedAt ?? new Date().toISOString(),
  };

  window.dispatchEvent(
    new CustomEvent(INVOICE_DATA_CHANGED_EVENT, {
      detail: payload,
    }),
  );

  try {
    window.localStorage.setItem(
      INVOICE_DATA_CHANGED_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Local storage can be unavailable in privacy modes. The in-tab event above
    // still keeps the current session reactive.
  }
}
