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
              <Pill tone="ghost" className="bg-paper shadow-chunk-sm mb-10 inline-flex">
                Free invoicing tool for Indian freelancers
              </Pill>
              
              <h1 className="font-display text-6xl md:text-[80px] lg:text-[108px] font-black uppercase leading-[0.9] tracking-[-0.04em] text-ink mb-10">
                Invoicing,<br />stripped to<br />the <Marker tone="rose">essentials</Marker>.
              </h1>
              
              <p className="text-lg md:text-xl text-ink-2 max-w-lg leading-relaxed font-sans mb-12">
                Create GST-compliant, milestone-driven invoices in under 2 minutes. Built for Indian freelancers and agencies.
              </p>
              
              <Button
                variant="primary"
                onClick={() => router.push(isLoggedIn ? "/invoice/new?fresh=1" : "/invoice/new?guest=1&fresh=1")}
                className="px-10 py-5 text-[18px]"
              >
                Create Invoice
                <svg className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </div>

            {/* Right Column: Invoice Preview Card */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-12 -left-12 z-30">
                <Sticker rotate={-12} tone="sky">No accounting jargon</Sticker>
              </div>
              <div className="absolute top-1/2 -right-8 z-30">
                <Sticker rotate={8} tone="lav">Gen-Z approved ✦</Sticker>
              </div>
              <div className="absolute -bottom-6 left-12 z-30">
                <Sticker rotate={-6} tone="acid">Takes 10s</Sticker>
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center font-mono text-[12px] md:text-[14px] font-bold uppercase tracking-[0.14em] text-ink-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full border-2 border-ink bg-acid"></span>
              <span>GST Compliant</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full border-2 border-ink bg-coral"></span>
              <span>Milestone Billing</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full border-2 border-ink bg-sky"></span>
              <span>Contract Enforcement</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full border-2 border-ink bg-lav"></span>
              <span>Private by Default</span>
            </div>
          </div>
        </div>
      </section>

      <StripeDivider tone="sky" />

      {/* ── Features ── */}
      <section className="bg-paper-butter py-24">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-20">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-4">
              How it works
            </p>
            <h2 className="font-display text-4xl md:text-6xl font-black uppercase text-ink tracking-[-0.03em] leading-tight">
              Built for freelancers,<br />not accountants.
            </h2>
          </div>

          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Step 1 */}
            <Box shadow="ink" className="p-8 bg-paper flex items-center gap-8">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-ink bg-acid text-ink font-display font-black text-3xl rounded-xl shadow-[2px_2px_0_var(--color-ink)]">
                1
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
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-ink bg-rose text-ink font-display font-black text-3xl rounded-xl shadow-[2px_2px_0_var(--color-ink)]">
                2
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
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-ink bg-sky text-ink font-display font-black text-3xl rounded-xl shadow-[2px_2px_0_var(--color-ink)]">
                3
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
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-ink bg-lav text-ink font-display font-black text-3xl rounded-xl shadow-[2px_2px_0_var(--color-ink)]">
                4
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
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-acid text-[18px] font-black text-ink shadow-[2px_2px_0_var(--color-ink)]">
                  L
                </span>
                <span className="font-display text-3xl font-black uppercase tracking-tight text-ink">
                  Lance
                </span>
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3 leading-relaxed">
                GST-compliant invoicing for Indian freelancers and agencies.
              </p>
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
