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
import BentoFeatureGrid from "@/components/landing/BentoFeatureGrid";
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


export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
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
                Precision Invoicing for Creatives
              </p>
            </MotionReveal>

            <MotionReveal preset="fade-up" delay={0}>
              <div className="mt-8">
                <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-[color:var(--text-primary)] sm:text-6xl lg:text-7xl leading-[0.95]">
                  {HERO_TEXT}
                </h1>
              </div>
            </MotionReveal>

            <MotionReveal preset="fade-up" delay={150}>
              <p className="mx-auto lg:mx-0 mt-6 max-w-xl text-base leading-7 text-[color:var(--text-muted)] sm:text-lg sm:leading-8">
                No clunky dashboards. No accounting jargon. Just a precision-engineered form to generate compliant, beautiful contracts and invoices for your international and domestic clients.
              </p>
            </MotionReveal>

            <MotionReveal preset="fade-up" delay={300}>
              <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row lg:justify-start">
                <Link
                  href={isLoggedIn ? "/invoice/new" : "/login"}
                  className={cn(
                    getAppButtonClass({
                      variant: "primary",
                      size: "lg",
                    }),
                    "bg-black text-white hover:bg-black/90 px-8 h-14 text-base"
                  )}
                >
                  <span className="inline-flex items-center gap-2.5">
                    Create Your First Invoice
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </Link>
                
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-sm font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors underline underline-offset-4 decoration-[color:var(--border-subtle)]"
                >
                  View a sample invoice
                </button>
              </div>
            </MotionReveal>

            <MotionReveal preset="fade-in" delay={1200}>
              <p className="mt-12 text-xs tracking-wide text-[color:var(--text-soft)]">
                Trusted by 200+ Indian freelancers &amp; agencies
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
              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full border border-gray-100 bg-white/50 backdrop-blur-sm shadow-sm" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full border border-gray-100 bg-white/30 backdrop-blur-sm shadow-sm" />
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ─── Bento Feature Grid ─── */}
      <BentoFeatureGrid />

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
                    : "/login")
                }
                tapScale={0.97}
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
        <div
          className={`${appPageContainerClass} flex flex-col items-center gap-2 py-8 text-center sm:flex-row sm:justify-between sm:text-left`}
        >
          <p className="text-xs font-medium text-[color:var(--text-muted)]">
            © {new Date().getFullYear()} Lance. Built for Indian freelancers.
          </p>
          <div className="flex gap-6 text-xs text-[color:var(--text-soft)]">
            <Link
              href="/terms"
              className="hover:text-[color:var(--text-primary)] transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[color:var(--text-primary)] transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>

      {/* ─── Sample Invoice Lightbox ─── */}
      <AnimatePresence>
        {isLightboxOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLightboxOpen(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[101] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4"
            >
              <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl">
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-black/40 transition-colors hover:bg-black/20 hover:text-black/60"
                >
                  <span className="text-xl font-medium">×</span>
                </button>
                <div className="p-2">
                  <img
                    src="/lance-invoice-mockup.png"
                    alt="Sample Lance Invoice"
                    className="h-auto w-full rounded-lg shadow-sm"
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
