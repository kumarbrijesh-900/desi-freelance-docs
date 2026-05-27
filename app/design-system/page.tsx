"use client";

import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/Button";
import { Marker } from "@/components/ui/Marker";
import { Pill } from "@/components/ui/Pill";
import { Sticker } from "@/components/ui/Sticker";

export default function DesignSystemPage() {
  const colors = [
    { label: "Paper", value: "var(--color-paper)" },
    { label: "Paper 2", value: "var(--color-paper-2)" },
    { label: "Ink", value: "var(--color-ink)", invert: true },
    { label: "Ink 2", value: "var(--color-ink-2)", invert: true },
    { label: "Ink 3", value: "var(--color-ink-3)" },
    { label: "Acid", value: "var(--color-acid)" },
    { label: "Coral", value: "var(--color-coral)", invert: true },
    { label: "Rose", value: "var(--color-rose)" },
    { label: "Sky", value: "var(--color-sky)", invert: true },
    { label: "Lav", value: "var(--color-lav)" },
    { label: "Butter", value: "var(--color-butter)" },
    { label: "Grass", value: "var(--color-grass)", invert: true },
  ];

  return (
    <main className="min-h-screen bg-paper text-ink p-10 md:p-20 font-sans">
      <div className="max-w-5xl mx-auto space-y-24">
        
        {/* Header */}
        <header>
          <h1 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tight mb-4">
            <Marker tone="butter">Styleguide</Marker>
          </h1>
          <p className="font-mono text-sm tracking-widest uppercase text-ink-2">
            Paper + Ink Design System
          </p>
        </header>

        {/* Colors */}
        <section>
          <h2 className="font-display text-3xl font-bold uppercase mb-8 border-b-2 border-ink pb-4">Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {colors.map((c) => (
              <div key={c.label} className="space-y-3">
                <Box className="h-24 w-full shadow-[3px_3px_0_var(--color-ink)]" style={{ backgroundColor: c.value }} />
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest">
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="font-display text-3xl font-bold uppercase mb-8 border-b-2 border-ink pb-4">Buttons</h2>
          <div className="flex flex-wrap gap-8 items-center">
            <Button variant="primary">Primary (Acid)</Button>
            <Button variant="coral">Coral Alert</Button>
            <Button variant="sky">Sky Info</Button>
            <Button variant="lav">Lav Pro</Button>
            <Button variant="paper">Paper Secondary</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
        </section>

        {/* Pills */}
        <section>
          <h2 className="font-display text-3xl font-bold uppercase mb-8 border-b-2 border-ink pb-4">Pills / Status</h2>
          <div className="flex flex-wrap gap-4">
            <Pill tone="draft">Draft</Pill>
            <Pill tone="sent">Sent</Pill>
            <Pill tone="viewed">Viewed</Pill>
            <Pill tone="paid">Paid</Pill>
            <Pill tone="revision">Revision</Pill>
            <Pill tone="locked">Locked</Pill>
            <Pill tone="warning">Warning</Pill>
            <Pill tone="ghost">Ghost</Pill>
          </div>
        </section>

        {/* Boxes */}
        <section>
          <h2 className="font-display text-3xl font-bold uppercase mb-8 border-b-2 border-ink pb-4">Boxes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Box shadow="ink" className="p-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-2">Default Box</h3>
              <p className="text-sm text-ink-2">Standard ink shadow, paper background.</p>
            </Box>
            
            <Box shadow="coral" className="p-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-2">Coral Shadow</h3>
              <p className="text-sm text-ink-2">Used for alerts or destructive states.</p>
            </Box>

            <Box shadow="sky" tone="sky" className="p-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-2 text-white">Sky Filled</h3>
              <p className="text-sm text-white/90">Filled variant for informational content.</p>
            </Box>

            <Box shadow="ink" tone="acid" className="p-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-2">Acid Filled</h3>
              <p className="text-sm text-ink-2">High emphasis filled variant.</p>
            </Box>
          </div>
        </section>

        {/* Typography Accents */}
        <section>
          <h2 className="font-display text-3xl font-bold uppercase mb-8 border-b-2 border-ink pb-4">Accents</h2>
          
          <div className="space-y-12">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-4 text-ink-2">Markers</h3>
              <div className="text-3xl font-display font-bold space-x-6 leading-loose">
                <Marker tone="acid">Acid Marker</Marker>
                <Marker tone="rose">Rose Marker</Marker>
                <Marker tone="sky">Sky Marker</Marker>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-8 text-ink-2">Stickers</h3>
              <div className="flex flex-wrap gap-12 items-center">
                <Sticker tone="acid" rotate={-4}>Acid Sticker</Sticker>
                <Sticker tone="coral" rotate={6}>Coral Alert!</Sticker>
                <Sticker tone="rose" rotate={-8}>Rose Soft</Sticker>
                <Sticker tone="sky" rotate={4}>Sky Info ☁️</Sticker>
                <Sticker tone="lav" rotate={-10}>Lav Pro ✨</Sticker>
                <Sticker tone="butter" rotate={2}>Butter Warn</Sticker>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
