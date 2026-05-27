"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/Button";
import { Box } from "@/components/ui/Box";
import { Sticker } from "@/components/ui/Sticker";
import { Marker } from "@/components/ui/Marker";
import { Pill } from "@/components/ui/Pill";
import { StripeDivider } from "@/components/ui/StripeDivider";

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
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8 bg-paper-butter">
        <div className="mx-auto w-full max-w-[1440px] relative z-20">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Text & CTA */}
            <div className="text-left">
              <div className="flex flex-wrap items-center gap-4 mb-10">
                <Sticker tone="coral">✦ FREE · INDIAN FREELANCERS</Sticker>
                <Sticker tone="sky" rotate={-3}>v 2.0</Sticker>
              </div>
              
              <h1 className="font-display text-6xl md:text-[80px] lg:text-[108px] font-black uppercase leading-[0.9] tracking-[-0.04em] text-ink mb-10">
                Invoicing,<br />stripped to<br />the <Marker tone="rose">essentials</Marker>.
              </h1>
              
              <p className="text-lg md:text-xl text-ink-2 max-w-lg leading-relaxed font-sans mb-10">
                GST-compliant, milestone-driven invoices in under two minutes. Built for independent designers, devs and studios across India — <Marker tone="sky">built to feel like you, not your CA</Marker>.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mb-12">
                <Button
                  variant="primary"
                  onClick={() => router.push(isLoggedIn ? "/invoice/new?fresh=1" : "/invoice/new?guest=1&fresh=1")}
                  className="px-6 py-4 text-[13px] font-bold shadow-chunk-sm"
                >
                  Create first invoice →
                </Button>
                <Button
                  variant="paper"
                  className="px-6 py-4 text-[13px] font-bold bg-white"
                >
                  ▶ Watch demo · 90s
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-2">
                <div>✶ no signup to start</div>
                <div>✶ no credit card</div>
                <div>✶ exports as pdf</div>
              </div>
              
              <div className="absolute top-0 right-10 hidden xl:block z-30">
                <Sticker tone="lav" rotate={-8}>✦ 12,400 invoices shipped</Sticker>
              </div>
            </div>

            {/* Right Column: Invoice Preview Card */}
            <div className="relative hidden lg:block">
              <div className="absolute -right-4 top-8 z-30">
                <Sticker rotate={8} tone="acid">✦ 8 templates</Sticker>
              </div>
              <div className="absolute -left-6 bottom-9 z-30">
                <Sticker rotate={-6} tone="rose">⌁ paid in 11 days avg</Sticker>
              </div>

              <Box shadow="coral" className="bg-paper p-8 relative z-20">
                <div className="flex justify-between items-start border-b-2 border-ink pb-6 mb-6">
                  <div>
                    <h3 className="font-display text-3xl font-black uppercase tracking-tight text-ink">INV-042</h3>
                    <p className="font-mono text-xs uppercase tracking-widest text-ink-2 mt-1">Acme Corp</p>
                  </div>
                  <Pill tone="paid">PAID</Pill>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-2">
                    <span className="font-mono text-sm text-ink-2">Brand Identity Design</span>
                    <span className="font-mono text-sm font-bold text-ink">₹85,000</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t-2 border-ink/10">
                    <span className="font-mono text-sm text-ink-2">Web Development</span>
                    <span className="font-mono text-sm font-bold text-ink">₹1,20,000</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t-2 border-ink/10">
                    <span className="font-mono text-sm text-ink-2">IGST (18%)</span>
                    <span className="font-mono text-sm font-bold text-ink">₹36,900</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t-2 border-ink">
                  <span className="font-display text-xl font-bold uppercase text-ink">Total</span>
                  <span className="font-display text-2xl font-black text-ink">₹2,41,900</span>
                </div>
              </Box>
            </div>
          </div>

        </div>
      </section>

      <StripeDivider tone="coral" />

      {/* ── Trust Strip ── */}
      <section className="bg-paper py-8">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6 sm:gap-12 text-center font-mono text-[12px] md:text-[14px] font-bold uppercase tracking-[0.14em] text-ink">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-ink bg-grass"></span>
              <span>GST compliant</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-ink bg-sky"></span>
              <span>Milestone billing</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-ink bg-lav"></span>
              <span>MSA enforced</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-ink bg-coral"></span>
              <span>Private by default</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-ink bg-butter"></span>
              <span>RCM / LUT aware</span>
            </div>
          </div>
        </div>
      </section>

      <StripeDivider tone="sky" />

      {/* ── Features ── */}
      <section className="bg-paper-butter py-24">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          
          <div className="flex justify-between items-end mb-20">
            <div className="text-left max-w-2xl">
              <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-4">
                How it works · 4 Steps
              </p>
              <h2 className="font-display text-4xl md:text-6xl font-black uppercase text-ink tracking-[-0.03em] leading-tight">
                Built for <Marker tone="butter">freelancers</Marker>,<br />not accountants.
              </h2>
            </div>
            <div className="hidden lg:block">
              <Sticker tone="butter" rotate={-4}>✦ avg setup · 2 min</Sticker>
            </div>
          </div>

          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Step 1 */}
            <Box shadow="ink" className="p-8 bg-paper flex items-center gap-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-ink bg-hi text-ink font-display font-black text-2xl rounded-xl">
                01
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-xl font-bold uppercase tracking-[0.1em] text-ink mb-2">
                  Create invoice, set milestones
                </h3>
                <p className="text-base text-ink-2 leading-relaxed font-sans max-w-2xl">
                  A clean, zero-bloat editor. Add your client, define milestones, set line items with quantities and rates. GST tax codes auto-assigned. No accounting jargon.
                </p>
              </div>
              <div className="hidden sm:block text-6xl font-display font-black text-acid">
                ✎
              </div>
            </Box>

            {/* Step 2 */}
            <Box shadow="ink" className="p-8 bg-paper flex items-center gap-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-ink bg-rose text-ink font-display font-black text-2xl rounded-xl">
                02
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-xl font-bold uppercase tracking-[0.1em] text-ink mb-2">
                  Tax math, handled
                </h3>
                <p className="text-base text-ink-2 leading-relaxed font-sans max-w-2xl">
                  IGST, CGST, SGST — computed from your GSTIN and client location. LUT validated for exports. You just fill in the amount.
                </p>
              </div>
              <div className="hidden sm:block text-6xl font-display font-black text-rose">
                ∑
              </div>
            </Box>

            {/* Step 3 */}
            <Box shadow="ink" className="p-8 bg-paper flex items-center gap-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-ink bg-sky text-white font-display font-black text-2xl rounded-xl">
                03
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-xl font-bold uppercase tracking-[0.1em] text-ink mb-2">
                  Share link, get paid
                </h3>
                <p className="text-base text-ink-2 leading-relaxed font-sans max-w-2xl">
                  Generate a secure link. Your client sees the invoice, accepts terms, and pays. You get notified the moment they open it.
                </p>
              </div>
              <div className="hidden sm:block text-6xl font-display font-black text-sky">
                →
              </div>
            </Box>

            {/* Step 4 */}
            <Box shadow="ink" className="p-8 bg-paper flex items-center gap-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-ink bg-lav text-white font-display font-black text-2xl rounded-xl">
                04
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-xl font-bold uppercase tracking-[0.1em] text-ink mb-2">
                  Contracts, enforced
                </h3>
                <p className="text-base text-ink-2 leading-relaxed font-sans max-w-2xl">
                  Every invoice ships with a Master Service Agreement. Your client must accept terms before they can view the invoice. Payment terms, late fees, IP rights — all locked in upfront.
                </p>
              </div>
              <div className="hidden sm:block text-6xl font-display font-black text-lav">
                §
              </div>
            </Box>
          </div>
        </div>
      </section>

      <StripeDivider tone="acid" />

      {/* ── Footer ── */}
      <footer className="bg-paper py-16">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-acid text-[18px] font-black text-ink shadow-[2px_2px_0_var(--color-ink)]">
                  L
                </span>
                <span className="font-display text-3xl font-black uppercase tracking-tight text-ink">
                  Lance
                </span>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3 leading-relaxed mb-4">
                GST-compliant invoicing for Indian freelancers and agencies.
              </p>
              <div className="flex items-center gap-2">
                <Pill tone="rose" className="text-[10px]">made in india</Pill>
                <Pill tone="sky" className="text-[10px]">v 2.0</Pill>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-4">
                  Product
                </p>
                <div className="space-y-3">
                  <a href="/invoice/new" className="block text-sm font-semibold text-ink hover:text-lav transition-colors">
                    Create Invoice
                  </a>
                  <a href="/support" className="block text-sm font-semibold text-ink hover:text-lav transition-colors">
                    FAQ
                  </a>
                </div>
              </div>
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-4">
                  Legal
                </p>
                <div className="space-y-3">
                  <a href="/terms" className="block text-sm font-semibold text-ink hover:text-lav transition-colors">
                    Terms
                  </a>
                  <a href="/privacy" className="block text-sm font-semibold text-ink hover:text-lav transition-colors">
                    Privacy
                  </a>
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-4">
                  Contact
                </p>
                <a href="mailto:hello@lanceinvoice.xyz" className="block text-sm font-semibold text-ink hover:text-lav transition-colors">
                  hello@lanceinvoice.xyz
                </a>
              </div>
            </div>

          </div>
          
          <div className="border-t-2 border-ink/10 mt-16 pt-8 text-center md:text-left">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
              © 2026 Lance. Made in India.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
