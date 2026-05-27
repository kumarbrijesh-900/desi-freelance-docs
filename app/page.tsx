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
      <section className="relative overflow-hidden pt-24 pb-32 px-4 sm:px-6 lg:px-8 border-b-4 border-coral bg-paper-butter">
        <div className="mx-auto w-full max-w-[1440px] relative z-20 text-center">
          
          <div className="absolute top-0 left-[15%] hidden lg:block z-30">
            <Sticker rotate={-12} tone="sky">No accounting jargon</Sticker>
          </div>
          <div className="absolute top-24 right-[10%] hidden lg:block z-30">
            <Sticker rotate={8} tone="lav">Gen-Z approved ✌️</Sticker>
          </div>
          <div className="absolute bottom-10 left-[20%] hidden lg:block z-30">
            <Sticker rotate={-6} tone="acid">Takes 10s</Sticker>
          </div>

          <div className="flex justify-center mb-12">
            <Pill tone="ghost" className="bg-paper shadow-chunk-sm">
              Free invoicing tool for Indian freelancers
            </Pill>
          </div>
          
          <h1 className="font-display text-5xl md:text-[80px] lg:text-[108px] font-black uppercase leading-[0.9] tracking-[-0.04em] text-ink mb-12">
            Invoicing,<br />stripped to<br />the <Marker tone="rose">essentials</Marker>.
          </h1>
          
          <div className="flex justify-center">
            <p className="text-lg md:text-xl text-ink-2 max-w-2xl leading-relaxed font-sans mb-12">
              Create GST-compliant, milestone-driven invoices in under 2 minutes. Built for Indian freelancers and agencies.
            </p>
          </div>
          
          <div className="flex justify-center">
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

        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="bg-paper py-8 border-b-4 border-sky">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center font-mono text-[12px] md:text-[14px] font-bold uppercase tracking-[0.14em] text-ink-3">
            <span>GST Compliant</span>
            <span className="hidden sm:block w-2 h-2 bg-ink rotate-45"></span>
            <span>Milestone Billing</span>
            <span className="hidden sm:block w-2 h-2 bg-ink rotate-45"></span>
            <span>Contract Enforcement</span>
            <span className="hidden sm:block w-2 h-2 bg-ink rotate-45"></span>
            <span>Private by Default</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-paper-butter py-24 border-b-4 border-acid">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-20">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink-2 mb-4">
              How it works
            </p>
            <h2 className="font-display text-4xl md:text-6xl font-black uppercase text-ink tracking-[-0.03em] leading-tight">
              Built for freelancers,<br />not accountants.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <Box shadow="ink" className="p-8 bg-paper">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-ink bg-acid text-ink font-display font-black text-2xl rounded-full mb-6 shadow-chunk-sm">
                1
              </div>
              <h3 className="font-mono text-lg font-bold uppercase tracking-[0.1em] text-ink mb-4">
                Create invoice, set milestones
              </h3>
              <p className="text-base text-ink-2 leading-relaxed font-sans">
                A clean, zero-bloat editor. Add your client, define milestones, set line items with quantities and rates. GST tax codes auto-assigned. No accounting jargon.
              </p>
            </Box>

            {/* Step 2 */}
            <Box shadow="ink" className="p-8 bg-paper">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-ink bg-rose text-ink font-display font-black text-2xl rounded-full mb-6 shadow-chunk-sm">
                2
              </div>
              <h3 className="font-mono text-lg font-bold uppercase tracking-[0.1em] text-ink mb-4">
                Tax math, handled
              </h3>
              <p className="text-base text-ink-2 leading-relaxed font-sans">
                IGST, CGST, SGST — computed from your GSTIN and client location. LUT validated for exports. You just fill in the amount.
              </p>
            </Box>

            {/* Step 3 */}
            <Box shadow="ink" className="p-8 bg-paper">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-ink bg-sky text-ink font-display font-black text-2xl rounded-full mb-6 shadow-chunk-sm">
                3
              </div>
              <h3 className="font-mono text-lg font-bold uppercase tracking-[0.1em] text-ink mb-4">
                Share link, get paid
              </h3>
              <p className="text-base text-ink-2 leading-relaxed font-sans">
                Generate a secure link. Your client sees the invoice, accepts terms, and pays. You get notified the moment they open it.
              </p>
            </Box>

            {/* Step 4 */}
            <Box shadow="ink" className="p-8 bg-paper">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-ink bg-lav text-ink font-display font-black text-2xl rounded-full mb-6 shadow-chunk-sm">
                4
              </div>
              <h3 className="font-mono text-lg font-bold uppercase tracking-[0.1em] text-ink mb-4">
                Contracts, enforced
              </h3>
              <p className="text-base text-ink-2 leading-relaxed font-sans">
                Every invoice ships with a Master Service Agreement. Your client must accept terms before they can view the invoice. Payment terms, late fees, IP rights — all locked in upfront.
              </p>
            </Box>
          </div>
        </div>
      </section>

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
