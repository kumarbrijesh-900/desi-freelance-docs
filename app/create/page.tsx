"use client";

import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import CreateDocumentWizard from "@/components/flow/CreateDocumentWizard";
import {
  appGridClass,
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
  appReadableContentClass,
} from "@/lib/layout-foundation";
import { getAppButtonClass } from "@/lib/ui-foundation";

export default function CreatePage() {
  return (
    <main className={appPageShellClass}>
      <AppHeader rightSlot={<LogoutButton />} />

      <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
        <div className={appGridClass}>
          <div className={`${appReadableContentClass} space-y-6`}>
            <Link href="/" className={getAppButtonClass({ variant: "secondary", size: "sm" })}>
              ← Back to Home
            </Link>

            <CreateDocumentWizard />
          </div>
        </div>
      </section>
    </main>
  );
}
