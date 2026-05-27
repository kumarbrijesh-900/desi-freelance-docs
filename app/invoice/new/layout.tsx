import { ReactNode } from "react";

export default function InvoiceNewLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full bg-paper-rose">{children}</div>;
}
