import React from "react";
import { Metadata } from "next";
import FaqSection from "@/components/faq/FaqSection";
import AppHeader from "@/components/AppHeader";
import {
  appPageShellClass,
  appPageContainerClass,
} from "@/lib/layout-foundation";

export const metadata: Metadata = {
  title: "Freelance Invoicing Support & GST FAQs | Lance",
  description:
    "Get answers to frequently asked questions about GST compliance, international invoicing, and using the Lance smart invoice engine.",
};

export default function SupportPage() {
  return (
    <main className={appPageShellClass}>
      <AppHeader />

      <div className={cn(appPageContainerClass, "pt-24 pb-12 text-center")}>
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-lime-600)] mb-3">
            Help Center
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-6">
            Lance Support & Knowledge Base
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Everything you need to know about professional billing, GST
            compliance, and mastering the Lance workflow.
          </p>
        </div>
      </div>

      <FaqSection />

      {/* Footer */}
      <footer className="border-t border-[color:var(--border-subtle)] mt-20">
        <div
          className={`${appPageContainerClass} flex flex-col items-center gap-2 py-8 text-center sm:flex-row sm:justify-between sm:text-left`}
        >
          <p className="text-xs font-medium text-[color:var(--text-muted)]">
            © {new Date().getFullYear()} Lance. Built for Indian freelancers.
          </p>
        </div>
      </footer>
    </main>
  );
}

// Simple CN helper for RSC if not imported
function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}
