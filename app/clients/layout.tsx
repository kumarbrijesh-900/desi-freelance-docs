import { ReactNode } from "react";

export default function ClientsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full bg-paper">{children}</div>;
}
