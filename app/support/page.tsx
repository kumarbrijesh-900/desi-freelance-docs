import React from "react";
import { Metadata } from "next";
import FaqSection from "@/components/faq/FaqSection";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass } from "@/lib/layout-foundation";
import { MotionReveal } from "@/components/ui/motion-primitives";
import AppPageShell from "@/components/ui/AppPageShell";

export const metadata: Metadata = {
  title: "Freelance Invoicing Support & GST FAQs | Lance",
  description:
    "Get answers to frequently asked questions about GST compliance, international invoicing, and using the Lance smart invoice engine.",
};

export default function SupportPage() {
  return (
    <main data-theme="cockpit" className="relative min-h-screen w-full bg-[color:var(--color-paper)] text-[color:var(--color-ink)]">
      <AppHeader />

      <AppPageShell title="Support &amp; FAQ" meta="GST · international · Lance">
        <MotionReveal preset="fade-up">
          <p className="mb-6 type-body text-[color:var(--color-ink-2)]">
            Everything you need to know about professional billing and Lance.
          </p>
          <FaqSection />
        </MotionReveal>
      </AppPageShell>

      {/* Footer */}
      <footer className="border-t-2 border-soft mt-12 bg-[color:var(--color-paper-2)]">
        <div
          className={`${appPageContainerClass} flex flex-col items-center gap-2 py-8 text-center sm:flex-row sm:justify-between sm:text-left`}
        >
          <p className="type-body font-bold text-[color:var(--color-ink-2)] uppercase tracking-wider">
            © {new Date().getFullYear()} Lance. Built for Indian freelancers.
          </p>
        </div>
      </footer>
    </main>
  );
}
