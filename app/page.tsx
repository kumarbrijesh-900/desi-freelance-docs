"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import StoryJourney from "@/components/landing/StoryJourney";
import StoryMilestone from "@/components/landing/StoryMilestone";
import StoryCreate from "@/components/landing/StoryCreate";

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

  const startInvoice = () =>
    router.push(isLoggedIn ? "/invoice/new?fresh=1" : "/invoice/new?guest=1&fresh=1");

  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <AppHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-paper px-6 pt-16 pb-20 sm:pt-20 sm:pb-24">
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-ochre/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ochre-deep">
              ✦ Free · for Indian freelancers
            </span>
            <h1 className="mb-5 font-display text-[clamp(44px,5.4vw,68px)] font-bold leading-[1.02] tracking-[-0.02em] text-ink text-balance">
              Invoicing, stripped to the{" "}
              <span className="relative whitespace-nowrap">
                essentials
                <span className="absolute -left-[0.06em] -right-[0.06em] bottom-[0.08em] -z-10 h-[0.34em] rounded-[3px] bg-ochre/40" />
              </span>
              .
            </h1>
            <p className="mb-7 max-w-[30em] text-[19px] leading-relaxed text-ink-2">
              GST-compliant, milestone-driven invoices in under two minutes. Built for independent designers, devs and studios across India — <b className="font-bold text-ink">made to feel like you, not your CA</b>.
            </p>
            <div className="mb-6 flex flex-wrap gap-3.5">
              <Button variant="primary" onClick={startInvoice} className="px-[22px] py-3.5 text-[15px] font-bold">
                Create your first invoice →
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-[18px] gap-y-2 text-[13px] font-semibold text-ink-3">
              <span className="inline-flex items-center gap-1.5"><span className="font-extrabold text-grass">✓</span> No signup to start</span>
              <span className="inline-flex items-center gap-1.5"><span className="font-extrabold text-grass">✓</span> No credit card</span>
              <span className="inline-flex items-center gap-1.5"><span className="font-extrabold text-grass">✓</span> Exports as PDF</span>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute left-[40px] top-[26px] -right-[22px] -bottom-[26px] rotate-[1.4deg] rounded-[26px] bg-ochre/90" />
            <div className="relative rounded-[18px] border border-soft bg-paper-2 p-[30px] shadow-[var(--brutal-shadow-lg)]">
              <div className="mb-5 flex items-start justify-between border-b border-soft pb-5">
                <div>
                  <div className="font-display text-[27px] font-bold tracking-[-0.01em] text-ink tabular-nums">INV-042</div>
                  <div className="mt-0.5 text-[13px] text-ink-2">Acme Corp · milestone 2 of 3</div>
                </div>
                <span className="rounded-full bg-grass px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-acc-ink">Paid</span>
              </div>
              <div className="flex items-center justify-between py-2 text-[14.5px]"><span className="text-ink-2">Brand identity design</span><span className="font-bold text-ink tabular-nums">₹85,000</span></div>
              <div className="flex items-center justify-between border-t border-soft/60 py-2 text-[14.5px]"><span className="text-ink-2">Web development</span><span className="font-bold text-ink tabular-nums">₹1,20,000</span></div>
              <div className="flex items-center justify-between border-t border-soft/60 py-2 text-[14.5px]"><span className="text-ink-2">IGST (18%)</span><span className="font-bold text-ink tabular-nums">₹36,900</span></div>
              <div className="mt-4 flex items-center justify-between border-t border-soft pt-4">
                <span className="font-display text-[17px] font-semibold text-ink">Total</span>
                <span className="font-display text-[25px] font-extrabold text-ink tabular-nums">₹2,41,900</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="border-y border-soft bg-paper-2">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-9 gap-y-3.5 px-6 py-[22px]">
          <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink"><span className="h-[11px] w-[11px] rounded-full bg-grass" />GST compliant</span>
          <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink"><span className="h-[11px] w-[11px] rounded-full bg-sky" />Milestone billing</span>
          <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink"><span className="h-[11px] w-[11px] rounded-full bg-acid" />MSA enforced</span>
          <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink"><span className="h-[11px] w-[11px] rounded-full bg-ochre" />RCM / LUT aware</span>
          <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink"><span className="h-[11px] w-[11px] rounded-full bg-clay" />Private by default</span>
        </div>
      </div>

      {/* ── USP stories ── */}
      <section id="see-it-work" className="bg-paper px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto mb-12 max-w-[34em] text-center">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-3">See it work</div>
            <h2 className="font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.04] text-ink">
              Your invoices, <span className="text-acid">on autopilot</span>.
            </h2>
            <p className="mt-3 text-base text-ink-2">The parts you&rsquo;d normally chase, nag, or recompute by hand — Lance just does them.</p>
          </div>

          <div className="flex flex-col gap-7">
            <StoryCreate />
            <StoryJourney />
            <StoryMilestone />

            <div className="lst lst-gst">
              <div className="frame">
                <div className="stage">
                  <div className="card">
                    <div className="field"><span className="lab">Amount</span><span className="val num">₹2,05,000</span></div>
                    <div className="trow t1"><span className="tl">IGST @ 18%</span><span className="tv num">₹36,900</span></div>
                    <div className="trow t2"><span className="tl">Place of supply · Karnataka</span><span className="tv">✓</span></div>
                    <div className="total"><span className="tt">Total</span><span className="tv num">₹2,41,900</span></div>
                  </div>
                  <span className="badge">auto-computed</span>
                </div>
                <div className="cap">
                  <span className="accent" style={{ background: "var(--color-ochre)" }} />
                  <div className="t">GST math, automatic</div>
                  <div className="d">IGST, CGST or SGST — picked and computed from your GSTIN and the client&rsquo;s location. LUT-aware for exports. You just enter the amount.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="bg-paper px-6 pb-20 sm:pb-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="relative overflow-hidden rounded-[26px] bg-acid px-8 py-14 text-center shadow-[var(--brutal-shadow-lg)] sm:px-12">
            <h2 className="font-display text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.05] text-acc-ink">
              Ship your first invoice<br />in two minutes.
            </h2>
            <p className="mx-auto mb-7 mt-3.5 text-[17px] text-acc-ink/80">No signup required. Start now, save when you&rsquo;re ready.</p>
            <Button variant="paper" onClick={startInvoice} className="bg-white px-[22px] py-3.5 text-[15px] font-bold">
              Create your first invoice →
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-soft bg-paper px-6 py-14">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-wrap justify-between gap-10">
            <div className="max-w-[22em]">
              <div className="flex items-center gap-2.5">
                <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-acid font-display text-[19px] font-extrabold text-acc-ink">L</span>
                <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-ink">Lance</span>
              </div>
              <p className="mt-3.5 text-[13.5px] leading-relaxed text-ink-2">GST-compliant, milestone-driven invoicing for independent freelancers and studios across India.</p>
            </div>
            <div className="flex flex-wrap gap-x-16 gap-y-8">
              <div>
                <div className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-3">Product</div>
                <a href="/invoice/new" className="mb-2.5 block text-sm font-semibold text-ink transition-colors hover:text-acid">Create invoice</a>
                <a href="/support" className="mb-2.5 block text-sm font-semibold text-ink transition-colors hover:text-acid">FAQ</a>
              </div>
              <div>
                <div className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-3">Legal</div>
                <a href="/terms" className="mb-2.5 block text-sm font-semibold text-ink transition-colors hover:text-acid">Terms</a>
                <a href="/privacy" className="mb-2.5 block text-sm font-semibold text-ink transition-colors hover:text-acid">Privacy</a>
              </div>
              <div>
                <div className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-3">Contact</div>
                <a href="mailto:hello@lanceinvoice.xyz" className="block text-sm font-semibold text-ink transition-colors hover:text-acid">hello@lanceinvoice.xyz</a>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap justify-between gap-2.5 border-t border-soft pt-[22px] text-[12.5px] text-ink-3">
            <span>© 2026 Lance. Made in India.</span>
            <span className="font-mono">v2.0</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
