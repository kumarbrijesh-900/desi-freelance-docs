"use client";

import { 
  Link as LinkIcon, 
  ShieldCheck, 
  Layers, 
  Monitor, 
  Calculator, 
  CreditCard 
} from "lucide-react";
import { MotionReveal, MotionStagger } from "@/components/ui/motion-primitives";
import { motion } from "@/components/ui/motion-primitives";
import { cn } from "@/lib/ui-foundation";

interface BentoCardProps {
  title: string;
  copy: string;
  icon: any;
  className?: string;
  visual?: React.ReactNode;
}

function BentoCard({ title, copy, icon: Icon, className, visual }: BentoCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-[color:var(--border-subtle)] bg-white p-8 md:p-10 transition-all duration-300",
        className
      )}
    >
      <div className="relative z-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 shadow-sm">
          <Icon className="h-6 w-6 text-zinc-900" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-zinc-500 md:text-base">
          {copy}
        </p>
      </div>

      <div className="mt-8 flex flex-1 items-end justify-center">
        {visual}
      </div>
    </motion.div>
  );
}

export default function BentoFeatureGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:py-32">
      <MotionReveal preset="fade-up" className="mb-16 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-lime-600)]">
          The Architecture
        </p>
        <h2 className="mt-4 text-3xl font-black tracking-tighter text-zinc-900 md:text-5xl">
          Engineered for Operators.
        </h2>
      </MotionReveal>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {/* Row 1 */}
        <BentoCard
          className="md:col-span-2"
          icon={LinkIcon}
          title="One Link, Infinite States."
          copy="Say goodbye to Invoice_v3_Final.pdf. Lance generates a single secure URL that dynamically evolves from a Pro Forma estimate to a Settled Receipt."
          visual={
            <div className="flex w-full items-center gap-2 rounded-full bg-zinc-50 p-2 border border-zinc-100 opacity-60">
              <div className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
              <div className="h-1.5 w-24 rounded-full bg-zinc-200" />
              <div className="ml-auto h-6 w-16 rounded-full bg-zinc-900/5 px-2 text-[8px] font-bold flex items-center justify-center">LIVING</div>
            </div>
          }
        />
        <BentoCard
          icon={ShieldCheck}
          title="Zero-Trust Legal Gating."
          copy="Your IP is your leverage. Client access to granular deliverables is strictly gated behind a server-side Master Services Agreement (MSA)."
          visual={
            <div className="relative flex h-24 w-full items-center justify-center opacity-40">
              <div className="absolute h-16 w-16 rounded-xl border-2 border-dashed border-zinc-300" />
              <ShieldCheck className="h-8 w-8 text-zinc-400" />
            </div>
          }
        />

        {/* Row 2 */}
        <BentoCard
          icon={Layers}
          title="Stage-Wise Milestones."
          copy="Group deliverables into custom milestones like 'Advances' and 'Finals'. The system auto-calculates exact subtotals to unlock the next phase."
          visual={
            <div className="flex flex-col gap-2 w-full max-w-[120px] opacity-50">
              <div className="h-2 w-full rounded bg-zinc-900" />
              <div className="h-2 w-2/3 rounded bg-zinc-200" />
              <div className="h-2 w-1/2 rounded bg-zinc-200" />
            </div>
          }
        />
        <BentoCard
          className="md:col-span-2"
          icon={Monitor}
          title="Desktop-Class App."
          copy="Install Lance directly to your macOS Dock or Windows Taskbar. Complete with native OS notification badging, bypassing the browser entirely."
          visual={
            <div className="relative flex w-full max-w-[200px] h-20 items-end justify-center">
              <div className="w-full h-full rounded-t-lg border-t border-x border-zinc-200 bg-zinc-50" />
              <div className="absolute -bottom-1 h-3 w-12 rounded bg-zinc-900" />
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-lime-400" />
            </div>
          }
        />

        {/* Row 3 */}
        <BentoCard
          className="md:col-span-2"
          icon={Calculator}
          title="Native TDS Tracking."
          copy="Stop losing track of corporate tax deductions. Lance’s smart-modal instantly calculates the Net TDS deducted at source upon settlement."
          visual={
            <div className="flex items-center gap-4 w-full opacity-60">
              <div className="flex flex-col gap-1">
                <div className="h-1 w-8 rounded bg-zinc-200" />
                <div className="h-3 w-16 rounded bg-zinc-900" />
              </div>
              <div className="h-8 w-px bg-zinc-100" />
              <div className="flex flex-col gap-1">
                <div className="h-1 w-8 rounded bg-zinc-200" />
                <div className="h-3 w-16 rounded bg-lime-500" />
              </div>
            </div>
          }
        />
        <BentoCard
          icon={CreditCard}
          title="Contextual UPI Payments."
          copy="Never confuse a client with the Grand Total. Lance dynamically updates your UPI/Bank instructions to demand only the Active Milestone Subtotal."
          visual={
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-900 text-lime-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
              </svg>
            </div>
          }
        />
      </div>
    </section>
  );
}
