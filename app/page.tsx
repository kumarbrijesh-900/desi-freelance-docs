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

      {/* ── Hero ── */}
      <section className="border-b-2 border-[#111118]">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 border-2 border-[#111118] bg-[#FFFBE6] px-3 py-1.5 mb-8">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#111118]">Free invoicing tool for Indian freelancers</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black uppercase leading-[1.05] tracking-[-0.02em] text-[#111118] mb-6">
                Invoicing,<br />stripped to<br />the essentials.
              </h1>
              <p className="text-base sm:text-lg text-[color:var(--text-muted)] max-w-md mb-8 leading-relaxed">
                Paste your project brief, get a GST-compliant invoice in under 2 minutes. Domestic and international.
              </p>
              <a
                href={isLoggedIn ? "/invoice/new" : "/invoice/new?guest=1"}
                className="inline-flex items-center gap-2 border-2 border-[#111118] bg-[#BEFF00] px-8 py-4 text-[15px] font-bold uppercase text-[#111118] shadow-[var(--brutal-shadow-lg)] hover:shadow-[6px_6px_0_#111118] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                Create Invoice
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </a>
            </div>
            {/* Right: Hero Graphic */}
            <div className="hidden lg:block">
              <InteractiveHeroGraphic />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="border-b-2 border-[#111118] bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 py-5 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">GST Compliant</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-[#111118]"></span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Milestone Billing</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-[#111118]"></span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Contract Enforcement</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-[#111118]"></span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Private by Default</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-[#FAFBFC]">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)] mb-3">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#111118] mb-10">Built for freelancers,<br />not accountants.</h2>

          <div className="space-y-4">
            {/* Feature 1 */}
            <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#BEFF00] text-[#111118] font-black text-xl">1</div>
              <div>
                <h3 className="text-base sm:text-lg font-bold uppercase text-[#111118] mb-2">Paste brief, get invoice</h3>
                <p className="text-sm text-[color:var(--text-muted)] leading-relaxed max-w-xl">Drop your project brief. Lance extracts client info, line items, and tax codes. No forms to fill, no accounting jargon to decode.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#FFFBE6] text-[#111118] font-black text-xl">2</div>
              <div>
                <h3 className="text-base sm:text-lg font-bold uppercase text-[#111118] mb-2">Tax math, handled</h3>
                <p className="text-sm text-[color:var(--text-muted)] leading-relaxed max-w-xl">IGST, CGST, SGST — computed from your GSTIN and client location. LUT validated for exports. You just fill in the amount.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[#111118] bg-[#E0FFF7] text-[#111118] font-black text-xl">3</div>
              <div>
                <h3 className="text-base sm:text-lg font-bold uppercase text-[#111118] mb-2">Share link, get paid</h3>
                <p className="text-sm text-[color:var(--text-muted)] leading-relaxed max-w-xl">Generate a secure link. Your client sees the invoice, accepts terms, and pays. You get notified the moment they open it.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t-2 border-[#111118] bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-7 w-7 items-center justify-center border-2 border-[#111118] bg-[#BEFF00] text-[12px] font-black text-[#111118]">L</span>
                <span className="text-[15px] font-black uppercase text-[#111118]">Lance</span>
              </div>
              <p className="text-[12px] text-[color:var(--text-muted)]">GST-compliant invoicing for Indian freelancers and agencies.</p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)] mb-2">Product</p>
                <a href="/invoice/new" className="block text-[13px] font-medium text-[#111118] hover:text-[#8B5CF6] mb-1">Create Invoice</a>
                <a href="/support" className="block text-[13px] font-medium text-[#111118] hover:text-[#8B5CF6]">FAQ</a>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)] mb-2">Legal</p>
                <a href="/terms" className="block text-[13px] font-medium text-[#111118] hover:text-[#8B5CF6] mb-1">Terms</a>
                <a href="/privacy" className="block text-[13px] font-medium text-[#111118] hover:text-[#8B5CF6]">Privacy</a>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)] mb-2">Contact</p>
                <a href="mailto:hello@lanceinvoice.xyz" className="block text-[13px] font-medium text-[#111118] hover:text-[#8B5CF6]">hello@lanceinvoice.xyz</a>
              </div>
            </div>
          </div>
          <div className="border-t border-[color:var(--border-subtle)] mt-8 pt-4">
            <p className="text-[11px] text-[color:var(--text-muted)]">© 2026 Lance. Made in India.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
