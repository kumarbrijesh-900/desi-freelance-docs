"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import {
  ArrowRightIcon,
  SparklesIcon,
} from "@/components/ui/app-icons";
import { 
  Terminal, 
  Scale, 
  Link as LinkIcon 
} from "lucide-react";
import {
  MotionReveal,
  MotionStagger,
  MotionButton,
} from "@/components/ui/motion-primitives";
import { motion, AnimatePresence } from "@/components/ui/motion-primitives";
import { useScroll, useTransform } from "framer-motion";
import {
  appPageContainerClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import { getAppButtonClass, cn } from "@/lib/ui-foundation";
import { supabase } from "@/lib/supabase/client";

import InteractiveHeroGraphic from "@/components/InteractiveHeroGraphic";

const HERO_TEXT = "Invoicing, stripped to the essentials.";
const TRUST_ITEMS = [
  {
    icon: "shield",
    title: "GST Compliant",
    desc: "CGST, SGST, IGST — calculated automatically",
  },
  {
    icon: "lock",
    title: "Bulletproof Contracts",
    desc: "Legally protective MSA terms included by default",
  },
  {
    icon: "sparkle",
    title: "Private by Design",
    desc: "Your data stays yours. We never sell or share it.",
  },
];

const FEATURES = [
  {
    icon: Terminal,
    title: "Fast Invoice Builder",
    desc: "A clean, zero-bloat interface. Paste your project brief and AI fills in the details — client info, line items, tax codes. No accounting jargon.",
    accent: "var(--color-coral-400)",
  },
  {
    icon: Scale,
    title: "Auto GST Calculation",
    desc: "Built for Indian tax rules. IGST, CGST, SGST calculated automatically. LUT compliance enforced for international exports. You just fill in the amount.",
    accent: "var(--color-lime-500)",
  },
  {
    icon: LinkIcon,
    title: "Share via Secure Link",
    desc: "Stop emailing PDFs. Generate a secure link your client can view, accept terms on, and use to pay. Track when they open it.",
    accent: "var(--color-cyan-500)",
  },
];

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L3 7V12C3 17.5 7.5 22 12 22C16.5 22 21 17.5 21 12V7L12 2Z" />
      <path d="M9 12L11 14L15 10" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" />
    </svg>
  );
}

function TrustIcon({ type, className }: { type: string; className?: string }) {
  if (type === "shield") return <ShieldIcon className={className} />;
  if (type === "sparkle") return <SparklesIcon className={className} />;
  return <LockIcon className={className} />;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { scrollY } = useScroll();

  // Parallax values for background shapes
  const y1 = useTransform(scrollY, [0, 1000], [0, 250]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);
  const rotate1 = useTransform(scrollY, [0, 1000], [0, 90]);
  const rotate2 = useTransform(scrollY, [0, 1000], [0, -60]);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className={appPageShellClass}>
      <AppHeader />

      {/* ─── Hero ─── */}
      <section
        className={`${appPageContainerClass} relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32`}
      >
        {/* Scroll-interactive Abstract Background Geometry */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div
            style={{ y: y1, rotate: rotate1 }}
            className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-[100px] border border-[color:var(--color-lime-300)] opacity-20"
          />
          <motion.div
            style={{ y: y2, rotate: rotate2 }}
            className="absolute top-40 -right-40 h-[600px] w-[600px] rounded-full border border-[color:var(--color-cyan-300)] opacity-10"
          />
          <motion.div
            style={{ y: y1 }}
            className="absolute top-1/2 left-1/4 h-[300px] w-[300px] rounded-full bg-[color:var(--color-lime-100)] opacity-30 blur-[100px]"
          />
        </div>

        {/* Gradient accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[600px] z-0"
          style={{
            background:
              "radial-gradient(ellipse, rgba(190,255,0,0.07) 0%, rgba(0,212,160,0.04) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <MotionReveal preset="fade-up" delay={0}>
              <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-lime-400)]" />
                Free invoicing tool for Indian freelancers
              </p>
            </MotionReveal>

            <MotionReveal preset="fade-up" delay={0}>
              <div className="mt-8">
                <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-primary)] sm:text-6xl lg:text-7xl leading-[0.95]">
                  {HERO_TEXT}
                </h1>
              </div>
            </MotionReveal>

            <MotionReveal preset="fade-up" delay={150}>
              <p className="mx-auto lg:mx-0 mt-6 max-w-xl text-base leading-7 text-[color:var(--text-muted)] sm:text-lg sm:leading-8">
                Paste your project brief, let AI fill in the details, and send a GST-compliant invoice in under 2 minutes. Works for domestic and international clients.
              </p>
            </MotionReveal>

            <MotionReveal preset="fade-up" delay={300}>
              <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row lg:justify-start">
                <Link
                  href={isLoggedIn ? "/invoice/new" : "/invoice/new?guest=1"}
                  className={cn(
                    getAppButtonClass({
                      variant: "primary",
                      size: "lg",
                    }),
                    "bg-black text-white hover:bg-black/90 px-8 h-14 text-base"
                  )}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {isLoggedIn ? "Create Invoice" : "Get Started Free"}
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </MotionReveal>

            <MotionReveal preset="fade-in" delay={1200}>
              <p className="mt-12 text-xs tracking-wide text-[color:var(--text-soft)]">
                Built for Indian freelancers &amp; agencies
              </p>
            </MotionReveal>
          </div>

          <MotionReveal
            preset="fade-up"
            delay={500}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <InteractiveHeroGraphic />

              {/* Decorative elements around the graphic */}
              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full border border-[color:var(--border-subtle)] bg-white/50 shadow-sm" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full border border-[color:var(--border-subtle)] bg-white/30 shadow-sm" />
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ─── Trust Signals ─── */}
      <section className={`${appPageContainerClass} pb-16 sm:pb-20`}>
        <MotionStagger className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {TRUST_ITEMS.map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="group flex items-start gap-3 rounded-[var(--app-radius-card)] border border-[color:var(--border-subtle)] bg-white px-5 py-4 transition-shadow hover:shadow-[0_4px_16px_rgba(17,17,24,0.05)]"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-[color:var(--color-lime-50)]">
                <TrustIcon
                  type={item.icon}
                  className="h-4.5 w-4.5 text-[color:var(--color-lime-600)]"
                />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[color:var(--text-primary)]">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-[color:var(--text-muted)]">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </MotionStagger>
      </section>

      {/* ─── How It Works ─── */}
      <section
        id="how-it-works"
        className={`${appPageContainerClass} pb-20 sm:pb-28`}
      >
        <MotionReveal preset="fade-up" className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-lime-600)]">
            HOW IT WORKS
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-3xl">
            Built for freelancers, not accountants.
          </h2>
        </MotionReveal>

        <MotionStagger className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <MotionReveal key={feat.title} preset="fade-up" delay={i * 120}>
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="group relative overflow-hidden rounded-[var(--app-radius-card)] border border-[color:var(--border-subtle)] bg-white p-6 transition-shadow hover:shadow-[0_8px_24px_rgba(17,17,24,0.06)]"
                >
                  {/* Step number */}
                  <span className="absolute top-4 right-5 text-[64px] font-extrabold leading-none text-[color:var(--color-bg-subtle)] select-none">
                    {i + 1}
                  </span>

                  <div
                    className="relative flex h-11 w-11 items-center justify-center"
                    style={{
                      background: `color-mix(in srgb, ${feat.accent} 12%, white)`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: feat.accent }} />
                  </div>

                  <h3 className="relative mt-4 text-[15px] font-bold text-[color:var(--text-primary)]">
                    {feat.title}
                  </h3>
                  <p className="relative mt-2 text-[13px] leading-5 text-[color:var(--text-muted)]">
                    {feat.desc}
                  </p>
                </motion.div>
              </MotionReveal>
            );
          })}
        </MotionStagger>
      </section>


      {/* ─── FAQ ─── */}
      <section className={`${appPageContainerClass} pb-20 sm:pb-28`}>
        <MotionReveal preset="fade-up" className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-lime-600)]">
            FAQ
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-3xl">
            Common questions
          </h2>
        </MotionReveal>

        <div className="mx-auto mt-10 max-w-2xl divide-y divide-[color:var(--border-subtle)]">
          {[
            {
              q: "Is LanceInvoice really free?",
              a: "Yes. The free plan gives you 5 invoices per month with full GST compliance, AI brief parsing, and secure share links. No credit card required to start.",
            },
            {
              q: "Do I need a GST registration to use this?",
              a: "No. LanceInvoice works for both GST-registered and unregistered freelancers. If you have a GSTIN, the tax calculations happen automatically. If you don't, invoices are generated without tax fields.",
            },
            {
              q: "Can I invoice international clients?",
              a: "Absolutely. LanceInvoice supports multi-currency invoicing with LUT compliance for zero-rated exports. Just mark a client as international and the system handles the tax rules.",
            },
            {
              q: "Is my data safe?",
              a: "Your invoices and client data are stored securely and encrypted. We never sell, share, or use your data for advertising. You can delete your account and all data at any time.",
            },
          ].map((faq, i) => (
            <div key={i} className="py-5">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-[14px] font-semibold text-[color:var(--text-primary)] pr-4">
                  {faq.q}
                </span>
                <span className="shrink-0 text-[color:var(--text-muted)] text-lg">
                  {openFaq === i ? "−" : "+"}
                </span>
              </button>
              {openFaq === i && (
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--text-muted)] pr-8">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className={`${appPageContainerClass} pb-24 sm:pb-32`}>
        <MotionReveal preset="fade-up">
          <div className="relative overflow-hidden rounded-[var(--app-radius-shell)] border border-[color:var(--color-lime-300)] bg-[color:var(--color-lime-300)] px-8 py-14 text-center sm:px-16 sm:py-20">
            {/* Subtle pattern overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, #111118 0.5px, transparent 0.5px)",
                backgroundSize: "24px 24px",
              }}
            />

            <h2 className="relative text-2xl font-bold tracking-[-0.02em] text-[#111118] sm:text-3xl">
              Start invoicing with precision
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-[#111118]/60">
              No credit card. No setup. Just focus on your craft and let Lance handle the compliance.
            </p>
            <div className="relative mt-8">
              <MotionButton
                onClick={() =>
                  (window.location.href = isLoggedIn
                    ? "/invoice/new"
                    : "/invoice/new?guest=1")
                }
                tapScale={0.97}
                className="inline-flex items-center gap-2.5 rounded-[var(--app-radius-button)] border border-[#111118]/15 bg-[#111118] px-6 py-3 text-sm font-semibold text-[color:var(--color-lime-300)] shadow-[0_2px_12px_rgba(17,17,24,0.15)] transition-all hover:shadow-[0_4px_20px_rgba(17,17,24,0.25)]"
              >
                <SparklesIcon className="h-4 w-4" />
                {isLoggedIn ? "Create Invoice" : "Get Started Free"}
                <ArrowRightIcon className="h-4 w-4" />
              </MotionButton>
            </div>
          </div>
        </MotionReveal>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[color:var(--border-subtle)]">
        <div className={`${appPageContainerClass} py-10`}>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
                  L
                </span>
                <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
                  LanceInvoice
                </span>
              </div>
              <p className="mt-3 max-w-xs text-[12px] leading-5 text-[color:var(--text-muted)]">
                GST-compliant invoicing for Indian freelancers and agencies. Free to start.
              </p>
            </div>
            <div className="flex gap-12 text-xs">
              <div className="space-y-3">
                <p className="font-semibold text-[color:var(--text-primary)] uppercase tracking-[0.1em] text-[10px]">Product</p>
                <Link href={isLoggedIn ? "/invoice/new" : "/invoice/new?guest=1"} className="block text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors">
                  Create Invoice
                </Link>
                <Link href="#how-it-works" className="block text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors">
                  How It Works
                </Link>
              </div>
              <div className="space-y-3">
                <p className="font-semibold text-[color:var(--text-primary)] uppercase tracking-[0.1em] text-[10px]">Legal</p>
                <Link href="/terms" className="block text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors">
                  Terms
                </Link>
                <Link href="/privacy" className="block text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors">
                  Privacy
                </Link>
              </div>
              <div className="space-y-3">
                <p className="font-semibold text-[color:var(--text-primary)] uppercase tracking-[0.1em] text-[10px]">Contact</p>
                <a href="mailto:hello@lanceinvoice.xyz" className="block text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors">
                  hello@lanceinvoice.xyz
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-[color:var(--border-subtle)] pt-6 text-center">
            <p className="text-[11px] text-[color:var(--text-soft)]">
              © {new Date().getFullYear()} LanceInvoice. Made in India.
            </p>
          </div>
        </div>
      </footer>

    </main>
  );
}
