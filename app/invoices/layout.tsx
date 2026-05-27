import { ReactNode } from "react";

export default function InvoicesLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full bg-paper-lav">{children}</div>;
}
