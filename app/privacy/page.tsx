import type { Metadata } from "next";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import {
  appPageContainerClass,
  appPageShellClass,
} from "@/lib/layout-foundation";

export const metadata: Metadata = {
  title: "Privacy Policy — Lance",
  description:
    "Privacy Policy for Lance, the smart invoice platform for Indian freelancers. Learn how we handle your data.",
};

const EFFECTIVE_DATE = "April 23, 2026";

export default function PrivacyPage() {
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
          <h1 className="mt-2 text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            Effective date: {EFFECTIVE_DATE}
          </p>
        </header>

        <div className="prose-lance space-y-8 text-[color:var(--text-secondary)]">
          <Section title="1. Information We Collect">
            <p>When you use Lance, we may collect:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm leading-6">
              <li>
                <strong>Account information:</strong> Your name, email address,
                and profile photo provided by Google OAuth during sign-in
              </li>
              <li>
                <strong>Invoice data:</strong> Business details, client
                information, line items, and payment details you enter into
                invoices
              </li>
              <li>
                <strong>Usage data:</strong> Pages visited, features used, and
                general interaction patterns (no keystroke logging)
              </li>
              <li>
                <strong>Client data:</strong> Client names, email addresses, GSTIN numbers, and addresses you enter for invoicing purposes
              </li>
              <li>
                <strong>Financial data:</strong> Invoice amounts, payment terms, milestone status, and settlement records
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>Your information is used to:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm leading-6">
              <li>Provide and maintain the Service</li>
              <li>
                Process brief text through AI extraction (third-party AI provider) to generate
                structured invoice data
              </li>
              <li>
                Store your invoices securely in the cloud (for authenticated
                users)
              </li>
              <li>Improve the extraction engine and user experience</li>
            </ul>
          </Section>

          <Section title="3. AI Processing">
            <p>
              Lance may use AI services to process project briefs into structured invoice data. When this feature is active, your brief text is sent to a third-party AI provider for processing. The AI provider processes data in accordance with their own data usage policies. No brief data is stored by the AI provider for training purposes. This feature is optional — you can always create invoices manually without AI processing.
            </p>
          </Section>

          <Section title="4. Data Storage">
            <p>
              <strong>Local storage:</strong> Draft invoices are saved in your
              browser&apos;s localStorage for convenience. This data remains on
              your device and is not transmitted to our servers unless you
              explicitly save to the cloud.
            </p>
            <p className="mt-2">
              <strong>Cloud storage:</strong> When you are logged in and save an
              invoice, it is stored in our Supabase PostgreSQL database. Each
              invoice is associated with your user account and protected by
              Row-Level Security (RLS), meaning only you can access your data.
            </p>
          </Section>

          <Section title="5. Data Sharing">
            <p>
              We do not sell, rent, or share your personal information with
              third parties for marketing purposes. Data is shared only with:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm leading-6">
              <li>
                <strong>Third-Party AI Provider:</strong> For AI-powered brief extraction
                (transient processing only)
              </li>
              <li>
                <strong>Supabase:</strong> For authentication and data storage
              </li>
              <li>
                <strong>Vercel:</strong> For application hosting and delivery
              </li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <p>
              Your invoice data is retained for as long as your account is
              active. You may delete individual invoices at any time from the
              Invoice History page. If you wish to delete your entire account
              and all associated data, please contact us.
            </p>
          </Section>

          <Section title="7. Security">
            <p>We implement industry-standard security measures including:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm leading-6">
              <li>HTTPS encryption for all data in transit</li>
              <li>
                Row-Level Security (RLS) ensuring users can only access their
                own invoices
              </li>
              <li>OAuth-based authentication (no passwords stored by Lance)</li>
              <li>
                Server-side API key management (OpenAI keys never exposed to the
                client)
              </li>
            </ul>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm leading-6">
              <li>Access your stored invoice data</li>
              <li>Delete your invoices at any time</li>
              <li>Export your invoices as PDF</li>
              <li>Request account deletion</li>
            </ul>
          </Section>

          <Section title="9. Cookies">
            <p>
              Lance uses essential cookies for authentication session
              management. We do not use advertising cookies or third-party
              tracking cookies. Analytics, if implemented, use
              privacy-respecting, cookie-free methods.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              Lance is not directed to individuals under the age of 18. We do
              not knowingly collect personal information from children.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Changes will
              be reflected on this page with an updated effective date.
              Continued use of the Service after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For privacy-related questions or data requests, please reach out
              via the contact information provided on the platform.
            </p>
          </Section>

          <Section title="13. Your Rights Under Indian Law (DPDPA 2023)">
            <p>
              Under India&apos;s Digital Personal Data Protection Act, 2023, you have the right to: (a) access your personal data held by Lance, (b) request correction of inaccurate data, (c) request deletion of your data (right to erasure), and (d) withdraw consent for data processing. To exercise any of these rights, contact us at hello@lanceinvoice.xyz. We will respond within 30 days.
            </p>
          </Section>

          <Section title="14. Data Retention & Deletion">
            <p>
              Your invoice data is retained as long as your account is active. If you delete your account, all associated data (invoices, client records, profile information) will be permanently deleted within 30 days. You can delete individual invoices at any time from your dashboard.
            </p>
          </Section>

          <Section title="15. International Data Transfers">
            <p>
              Lance uses Supabase (hosted infrastructure) and Vercel (application hosting), which may process data in regions outside India. By using Lance, you consent to this transfer. All data is encrypted in transit (TLS) and at rest.
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
