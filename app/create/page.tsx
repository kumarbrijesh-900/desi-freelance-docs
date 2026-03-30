"use client";

import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import CreateDocumentWizard from "@/components/flow/CreateDocumentWizard";

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader rightSlot={<LogoutButton />} />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
          >
            ← Back to Home
          </Link>
        </div>

        <CreateDocumentWizard />
      </section>
    </main>
  );
}