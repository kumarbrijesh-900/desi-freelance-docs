"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabase/client";
import InteractiveHeroGraphic from "@/components/InteractiveHeroGraphic";

import { Button } from "@/components/ui/Button";
import { Box } from "@/components/ui/Box";
import { Sticker } from "@/components/ui/Sticker";
import { Marker } from "@/components/ui/Marker";
import { Pill } from "@/components/ui/Pill";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      }
      setIsLoggedIn(!!data.session);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/dashboard");
      }
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col bg-paper-butter">
      <AppHeader />

      {/* ── Hero ── */}
      <section className="border-b-2 border-ink bg-paper-butter relative overflow-hidden">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-32 relative">
          
          <div className="absolute top-12 right-[45%] z-10 hidden lg:block">
            <Sticker rotate={-8} tone="lav">Gen-Z approved ✌️</Sticker>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="relative z-20">
              <Pill tone="ghost" className="mb-8 bg-paper">
                Free invoicing tool for Indian freelancers
              </Pill>
              
              <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.5rem] font-bold uppercase leading-[1.05] tracking-[-0.035em] text-ink mb-6">
                Invoicing,<br />stripped to<br />the <Marker tone="rose">essentials</Marker>.
              </h1>
              
              <p className="text-base sm:text-lg text-ink-2 max-w-md mb-10 leading-relaxed font-sans">
                Create GST-compliant, milestone-driven invoices in under 2 minutes. Built for Indian freelancers and agencies.
              </p>
              
              <Button
                variant="primary"
                onClick={() => router.push(isLoggedIn ? "/invoice/new?fresh=1" : "/invoice/new?guest=1&fresh=1")}
                className="px-8 py-4 text-[15px]"
              >
                Create Invoice
                <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </div>
            
            {/* Right: Hero Graphic */}
            <div className="hidden lg:block relative z-20">
              <InteractiveHeroGraphic />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="border-b-2 border-ink bg-paper py-5">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-center font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
            <span>GST Compliant</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-ink rotate-45"></span>
            <span>Milestone Billing</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-ink rotate-45"></span>
            <span>Contract Enforcement</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-ink rotate-45"></span>
            <span>Private by Default</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-paper-butter flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-3">
            How it works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-ink mb-12 tracking-[-0.03em]">
            Built for freelancers,<br />not accountants.
          </h2>

          <div className="space-y-6">
            <Box shadow="ink" className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-acid text-ink font-display font-bold text-xl rounded-full">
                1
              </div>
              <div>
                <h3 className="font-mono text-sm sm:text-base font-bold uppercase tracking-[0.1em] text-ink mb-2">
                  Create invoice, set milestones
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed max-w-xl font-sans">
                  A clean, zero-bloat editor. Add your client, define milestones, set line items with quantities and rates. GST tax codes auto-assigned. No accounting jargon.
                </p>
              </div>
            </Box>

            <Box shadow="sky" tone="sky" className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink font-display font-bold text-xl rounded-full">
                2
              </div>
              <div>
                <h3 className="font-mono text-sm sm:text-base font-bold uppercase tracking-[0.1em] text-white mb-2">
                  Tax math, handled
                </h3>
                <p className="text-sm text-white/90 leading-relaxed max-w-xl font-sans">
                  IGST, CGST, SGST — computed from your GSTIN and client location. LUT validated for exports. You just fill in the amount.
                </p>
              </div>
            </Box>

            <Box shadow="lav" className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start bg-paper">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-lav text-white font-display font-bold text-xl rounded-full">
                3
              </div>
              <div>
                <h3 className="font-mono text-sm sm:text-base font-bold uppercase tracking-[0.1em] text-ink mb-2">
                  Share link, get paid
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed max-w-xl font-sans">
                  Generate a secure link. Your client sees the invoice, accepts terms, and pays. You get notified the moment they open it.
                </p>
              </div>
            </Box>

            <Box shadow="coral" className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start bg-paper">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-coral text-white font-display font-bold text-xl rounded-full">
                4
              </div>
              <div>
                <h3 className="font-mono text-sm sm:text-base font-bold uppercase tracking-[0.1em] text-ink mb-2">
                  Contracts, enforced
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed max-w-xl font-sans">
                  Every invoice ships with a Master Service Agreement. Your client must accept terms before they can view the invoice. Payment terms, late fees, IP rights — all locked in upfront.
                </p>
              </div>
            </Box>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t-2 border-ink bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-acid text-[14px] font-black text-ink shadow-[2px_2px_0_var(--color-ink)]">
                  L
                </span>
                <span className="font-display text-xl font-bold uppercase tracking-tight text-ink">
                  Lance
                </span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-3">
                GST-compliant invoicing for Indian freelancers and agencies.
              </p>
            </div>
            
            <div className="flex gap-12">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-3">
                  Product
                </p>
                <a href="/invoice/new" className="block text-[13px] font-medium text-ink hover:text-lav transition-colors mb-2">
                  Create Invoice
                </a>
                <a href="/support" className="block text-[13px] font-medium text-ink hover:text-lav transition-colors">
                  FAQ
                </a>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-3">
                  Legal
                </p>
                <a href="/terms" className="block text-[13px] font-medium text-ink hover:text-lav transition-colors mb-2">
                  Terms
                </a>
                <a href="/privacy" className="block text-[13px] font-medium text-ink hover:text-lav transition-colors">
                  Privacy
                </a>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-3">
                  Contact
                </p>
                <a href="mailto:hello@lanceinvoice.xyz" className="block text-[13px] font-medium text-ink hover:text-lav transition-colors">
                  hello@lanceinvoice.xyz
                </a>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-ink/10 mt-10 pt-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
              © 2026 Lance. Made in India.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
