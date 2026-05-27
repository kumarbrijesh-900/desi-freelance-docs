"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import { getAppSubtlePanelClass } from "@/lib/ui-foundation";

function EditorLoadingState() {
  return (
    <main className={appPageShellClass}>
      <AppHeader />

      <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
        <div className="mx-auto w-full max-w-[1120px]">
          <div className={getAppSubtlePanelClass("muted")}>
            <div className="space-y-2 px-6 py-7">
              <p className="text-sm font-normal text-[color:var(--text-primary)]">
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
  );
}

const InvoiceEditorPage = dynamic(
  () => import("@/components/invoice/InvoiceEditorPage"),
  {
    ssr: false,
    loading: EditorLoadingState,
  },
);

function InvoiceEditorMount() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");
  const mode = searchParams.get("restore") === "1"
    ? "restore"
    : searchParams.get("fresh") === "1"
      ? "fresh"
      : "blank";

  return <InvoiceEditorPage key={invoiceId ? `invoice:${invoiceId}` : `new:${mode}`} />;
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<EditorLoadingState />}>
      <InvoiceEditorMount />
    </Suspense>
  );
}
