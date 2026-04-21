"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import { ArrowRightIcon, SparklesIcon, DocumentSparkIcon, MicrophoneIcon } from "@/components/ui/app-icons";
import { MotionReveal, MotionStagger, MotionButton } from "@/components/ui/motion-primitives";
import { motion } from "@/components/ui/motion-primitives";
import {
  appPageContainerClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import { getAppButtonClass } from "@/lib/ui-foundation";
import { supabase } from "@/lib/supabase/client";

const HERO_WORDS = ["Describe", "your", "project.", "Get", "a", "perfect", "invoice."];
const TRUST_ITEMS = [
  {
    icon: "shield",
    title: "GST Compliant",
    desc: "CGST, SGST, IGST — calculated automatically",
  },
  {
    icon: "sparkle",
    title: "Instant Extraction",
    desc: "One brief fills every field in seconds",
  },
  {
    icon: "lock",
    title: "Private by Design",
    desc: "Your data stays yours. Nothing is stored.",
  },
];

const FEATURES = [
  {
    icon: MicrophoneIcon,
    title: "Speak or type your brief",
    desc: "Just describe the project naturally — the engine understands context, amounts, and parties.",
    accent: "var(--color-coral-400)",
  },
  {
    icon: SparklesIcon,
    title: "Every field, filled instantly",
    desc: "Tax codes, addresses, line items, payment terms — extracted and validated instantly.",
    accent: "var(--color-lime-500)",
  },
  {
    icon: DocumentSparkIcon,
    title: "Export in one click",
    desc: "Preview your invoice, tweak anything, and export a professional PDF. Done.",
    accent: "var(--color-cyan-500)",
  },
];

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7V12C3 17.5 7.5 22 12 22C16.5 22 21 17.5 21 12V7L12 2Z" />
      <path d="M9 12L11 14L15 10" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
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
      <AppHeader rightSlot={isLoggedIn ? <LogoutButton /> : null} />

      {/* ─── Hero ─── */}
      <section className={`${appPageContainerClass} relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32`}>
        {/* Gradient accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[600px]"
          style={{
            background: "radial-gradient(ellipse, rgba(190,255,0,0.07) 0%, rgba(0,212,160,0.04) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <MotionReveal preset="fade-up" delay={0}>
            <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-lime-300)] bg-[color:var(--color-lime-50)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-lime-700)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-lime-400)] animate-pulse" />
              Smart Invoice Engine
            </p>
          </MotionReveal>

          <div className="mt-8">
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-5xl lg:text-6xl">
              {HERO_WORDS.map((word, i) => (
                <motion.span
                  key={word + i}
                  initial={{ opacity: 0, y: 14, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    delay: 0.15 + i * 0.06,
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="inline-block mr-[0.28em]"
                >
                  {word}
                </motion.span>
              ))}
            </h1>
          </div>

          <MotionReveal preset="fade-up" delay={700}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[color:var(--text-muted)] sm:text-lg sm:leading-8">
              Turn a raw client brief into a GST-compliant, export-ready invoice
              in under <span className="font-semibold text-[color:var(--text-secondary)]">10 seconds</span>. 
              Built for Indian creative freelancers.
            </p>
          </MotionReveal>

          <MotionReveal preset="fade-up" delay={900}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={isLoggedIn ? "/invoice/new" : "/login"}
                className={getAppButtonClass({ variant: "primary", size: "lg" })}
              >
                <span className="inline-flex items-center gap-2.5">
                  <SparklesIcon className="h-4 w-4" />
                  Create Invoice
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
              <a
                href="#how-it-works"
                className={getAppButtonClass({ variant: "ghost", size: "lg" })}
              >
                See how it works
              </a>
            </div>
          </MotionReveal>

          <MotionReveal preset="fade-in" delay={1200}>
            <p className="mt-12 text-xs tracking-wide text-[color:var(--text-soft)]">
              Trusted by 200+ Indian freelancers &amp; agencies
            </p>
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
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-lime-50)]">
                <TrustIcon type={item.icon} className="h-4.5 w-4.5 text-[color:var(--color-lime-600)]" />
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
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-3xl">
            Three steps. Ten seconds. Done.
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
                    className="relative flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ background: `color-mix(in srgb, ${feat.accent} 12%, white)` }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: feat.accent }}
                    />
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

      {/* ─── CTA Banner ─── */}
      <section className={`${appPageContainerClass} pb-24 sm:pb-32`}>
        <MotionReveal preset="fade-up">
          <div className="relative overflow-hidden rounded-[var(--app-radius-shell)] border border-[color:var(--color-lime-300)] bg-[color:var(--color-lime-300)] px-8 py-14 text-center sm:px-16 sm:py-20">
            {/* Subtle pattern overlay */}
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #111118 0.5px, transparent 0.5px)", backgroundSize: "24px 24px" }}
            />

            <h2 className="relative text-2xl font-bold tracking-[-0.02em] text-[#111118] sm:text-3xl">
              Start invoicing smarter
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-[#111118]/60">
              No credit card. No setup. Just describe your project and let Lance handle the rest.
            </p>
            <div className="relative mt-8">
              <MotionButton
                onClick={() => window.location.href = isLoggedIn ? "/invoice/new" : "/login"}
                className="inline-flex items-center gap-2.5 rounded-[var(--app-radius-button)] border border-[#111118]/15 bg-[#111118] px-6 py-3 text-sm font-semibold text-[color:var(--color-lime-300)] shadow-[0_2px_12px_rgba(17,17,24,0.15)] transition-all hover:shadow-[0_4px_20px_rgba(17,17,24,0.25)]"
              >
                <SparklesIcon className="h-4 w-4" />
                Create Your First Invoice
                <ArrowRightIcon className="h-4 w-4" />
              </MotionButton>
            </div>
          </div>
        </MotionReveal>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[color:var(--border-subtle)]">
        <div className={`${appPageContainerClass} flex flex-col items-center gap-2 py-8 text-center sm:flex-row sm:justify-between sm:text-left`}>
          <p className="text-xs font-medium text-[color:var(--text-muted)]">
            © {new Date().getFullYear()} Lance. Built for Indian freelancers.
          </p>
          <div className="flex gap-6 text-xs text-[color:var(--text-soft)]">
            <a href="#" className="hover:text-[color:var(--text-primary)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[color:var(--text-primary)] transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
