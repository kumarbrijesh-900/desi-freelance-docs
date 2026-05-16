import React from "react";
import { Metadata } from "next";
import FaqSection from "@/components/faq/FaqSection";
import AppHeader from "@/components/AppHeader";
import {
  appPageShellClass,
  appPageContainerClass,
  appGridClass,
} from "@/lib/layout-foundation";
import { MotionReveal } from "@/components/ui/motion-primitives";

export const metadata: Metadata = {
  title: "Freelance Invoicing Support & GST FAQs | Lance",
  description:
    "Get answers to frequently asked questions about GST compliance, international invoicing, and using the Lance smart invoice engine.",
};

export default function SupportPage() {
  return (
    <main className={appPageShellClass}>
      <AppHeader />

      <section className={`${appPageContainerClass} pt-8 sm:pt-12 pb-24`}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
            <MotionReveal className="mb-8" preset="fade-up">
              <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                Support & FAQ
              </h1>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                Everything you need to know about professional billing and Lance.
              </p>
            </MotionReveal>

            <FaqSection />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#111118] mt-12 bg-white">
        <div
          className={`${appPageContainerClass} flex flex-col items-center gap-2 py-8 text-center sm:flex-row sm:justify-between sm:text-left`}
        >
          <p className="text-xs font-bold text-[color:var(--text-muted)] uppercase tracking-wider">
            © {new Date().getFullYear()} Lance. Built for Indian freelancers.
          </p>
        </div>
      </footer>
    </main>
  );
}
