import type { Metadata } from "next";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import {
  appPageContainerClass,
  appPageShellClass,
} from "@/lib/layout-foundation";

export const metadata: Metadata = {
  title: "Terms of Service — Lance",
  description:
    "Terms of Service for using Lance, the smart invoice platform for Indian freelancers.",
};

const EFFECTIVE_DATE = "April 23, 2026";

export default function TermsPage() {
  return (
    <main className={appPageShellClass}>
      <AppHeader />

      <article
        className={`${appPageContainerClass} mx-auto max-w-2xl pb-24 pt-12 sm:pt-16`}
      >
        <header className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Legal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            Effective date: {EFFECTIVE_DATE}
          </p>
        </header>

        <div className="prose-lance space-y-8 text-[color:var(--text-secondary)]">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Lance (&quot;the Service&quot;), you agree
              to be bound by these Terms of Service. If you do not agree, do not
              use the Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Lance is a smart invoice generation platform designed for Indian
              creative freelancers and agencies. The Service allows you to
              create, preview, export, and optionally save invoices using
              AI-assisted extraction from project briefs.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>
              Certain features — including invoice cloud storage and history —
              require authentication via a third-party provider (Google OAuth).
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities under your account.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm leading-6">
              <li>Use the Service for fraudulent or misleading invoices</li>
              <li>Attempt to circumvent authentication or security measures</li>
              <li>
                Submit content that violates applicable laws or third-party
                rights
              </li>
              <li>
                Reverse-engineer, scrape, or programmatically access the Service
                beyond its intended use
              </li>
            </ul>
          </Section>

          <Section title="5. Intellectual Property">
            <p>
              All invoices you create through Lance remain your intellectual
              property. Lance does not claim ownership over any content you
              generate. The platform&apos;s source code, design system, and
              branding are proprietary.
            </p>
          </Section>

          <Section title="6. Data and Privacy">
            <p>
              Your use of the Service is also governed by our{" "}
              <Link
                href="/privacy"
                className="font-medium text-[color:var(--color-lime-700)] underline underline-offset-2 hover:text-[color:var(--text-primary)] transition-colors"
              >
                Privacy Policy
              </Link>
              . Invoice data submitted for AI extraction is processed via
              third-party APIs (OpenAI) and is not stored permanently by those
              providers beyond the processing window.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              The Service is provided &quot;as is&quot; without warranties of
              any kind. Lance is not liable for any errors in extracted invoice
              data, tax calculations, or compliance determinations. Users are
              responsible for verifying all invoice content before sending to
              clients or filing with tax authorities.
            </p>
          </Section>

          <Section title="8. GST and Tax Disclaimer">
            <p>
              Lance provides automated GST calculations (CGST/SGST/IGST) as a
              convenience tool. These calculations are indicative only and do
              not constitute tax advice. Consult a qualified chartered
              accountant or tax professional for compliance matters.
            </p>
          </Section>

          <Section title="9. Termination">
            <p>
              We reserve the right to suspend or terminate your access to the
              Service at our discretion, with or without notice, for conduct
              that we believe violates these Terms or is harmful to other users
              or the Service.
            </p>
          </Section>

          <Section title="10. Changes to Terms">
            <p>
              We may update these Terms from time to time. Continued use of the
              Service after changes constitutes acceptance of the updated Terms.
              We will indicate the effective date at the top of this page.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For questions about these Terms, please reach out via the contact
              information provided on the platform.
            </p>
          </Section>
        </div>

        <footer className="mt-16 border-t border-[color:var(--border-subtle)] pt-6">
          <Link
            href="/invoices"
            className="text-sm font-medium text-[color:var(--color-lime-700)] hover:text-[color:var(--text-primary)] transition-colors"
          >
            ← Back to Invoices
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
        {title}
      </h2>
      <div className="mt-2 text-sm leading-7">{children}</div>
    </section>
  );
}
