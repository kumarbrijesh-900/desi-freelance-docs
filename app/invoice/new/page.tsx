"use client";

import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import {
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import { getAppSubtlePanelClass } from "@/lib/ui-foundation";

const InvoiceEditorPage = dynamic(
  () => import("@/components/invoice/InvoiceEditorPage"),
  {
    ssr: false,
    loading: () => (
      <main className={appPageShellClass}>
        <AppHeader rightSlot={<LogoutButton />} />

        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className="mx-auto w-full max-w-[1120px]">
            <div className={getAppSubtlePanelClass("muted")}>
              <div className="space-y-2 px-6 py-7">
                <p className="text-sm font-medium text-[color:var(--text-primary)]">
                  Loading invoice editor...
                </p>
                <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
                  Restoring your saved invoice context and preparing the form.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    ),
  }
);

export default function NewInvoicePage() {
  return <InvoiceEditorPage />;
}
