"use client";

import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
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
        <AppHeader />
        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className="mx-auto w-full max-w-[1120px]">
            <div className={getAppSubtlePanelClass("muted")}>
              <div className="space-y-2 px-6 py-7">
                <p className="text-sm font-medium text-[color:var(--text-primary)]">
                  Loading sandbox...
                </p>
                <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
                  Preparing your guest session. No account required to test the magic.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    ),
  }
);

export default function SandboxPage() {
  return (
    <>
      <InvoiceEditorPage />
      {/* We'll pass the guest parameter via URL in the link leading here */}
    </>
  );
}
