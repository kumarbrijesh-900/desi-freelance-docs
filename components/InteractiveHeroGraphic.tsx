"use client";

import React, { useRef, useState, useEffect } from "react";
import { Building2, Briefcase } from "lucide-react";
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from "framer-motion";

export default function InteractiveHeroGraphic() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);

  // Phase sequence:
  // 0: Forward (Agency -> Client) - 3s
  // 1: Client Received (Pulse) - 1s
  // 2: Return (Client -> Agency) - 3s
  // 3: Agency Received (Pulse) - 1s
  useEffect(() => {
    const durations = [3000, 1000, 3000, 1000];
    const timer = setTimeout(() => {
      setPhase((prev) => (prev + 1) % 4);
    }, durations[phase]);
    return () => clearTimeout(timer);
  }, [phase]);

  // Motion values for mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for parallax effect
  const springConfig = { damping: 30, stiffness: 120 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Layer transforms (depth mapping) - Reduced to max ±15px as requested
  const blobX = useTransform(smoothX, [-300, 300], [5, -5]);
  const blobY = useTransform(smoothY, [-300, 300], [5, -5]);

  const shapesX = useTransform(smoothX, [-300, 300], [-8, 8]);
  const shapesY = useTransform(smoothY, [-300, 300], [-8, 8]);

  const cardX = useTransform(smoothX, [-300, 300], [-12, 12]);
  const cardY = useTransform(smoothY, [-300, 300], [-12, 12]);
  const cardRotate = useTransform(smoothX, [-300, 300], [-3, 3]);

  // Front-most elements (icons)
  const frontX = useTransform(smoothX, [-300, 300], [-15, 15]);
  const frontY = useTransform(smoothY, [-300, 300], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const getStatusText = () => {
    switch (phase) {
      case 0: return "Sending invoice...";
      case 1: return "Invoice delivered ✓";
      case 2: return "Processing payment...";
      case 3: return "Payment received ✓";
      default: return "";
    }
  };

  const isGreenText = phase === 1 || phase === 3;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full aspect-square md:aspect-[4/3] relative overflow-hidden bg-[color:var(--bg-surface-soft)]/50 border border-[color:var(--border-subtle)] shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      {/* LAYER 1: The Blobs (Colorful Background) */}
      <motion.div
        style={{ x: blobX, y: blobY }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="absolute top-10 left-10 w-[60%] h-[60%] bg-gradient-to-tr from-[#BEFF00]/15 to-transparent blur-3xl rounded-full" />
        <div className="absolute bottom-10 right-10 w-[50%] h-[50%] bg-gradient-to-bl from-[#00D4A0]/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-gradient-to-r from-[#FF4D2A]/5 to-transparent blur-3xl rounded-full" />
      </motion.div>

      {/* LAYER 2: The Grid (Static) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%">
          <pattern
            id="hatch-hero"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="24" stroke="black" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hatch-hero)" />
        </svg>
      </div>

      {/* LAYER 3: Abstract Geometric Shapes (Behind) */}
      <motion.div
        style={{ x: shapesX, y: shapesY }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-[15%] left-[20%] w-10 h-10 border border-[#FF4D2A]/20 rotate-12" />
        <div className="absolute bottom-[20%] right-[15%] w-14 h-14 bg-[#BEFF00]/10 rounded-full" />
        <div className="absolute top-[40%] left-[10%] w-6 h-6 border-2 border-[#00D4A0]/20 rounded-sm -rotate-12" />
      </motion.div>

      {/* LAYER 4: Glassmorphic Card */}
      <motion.div
        style={{ x: cardX, y: cardY, rotateY: cardRotate }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none perspective-[1000px]"
      >
        <div className="w-56 h-72 bg-white/40 border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-2 w-1/2 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-1.5 w-full bg-[color:var(--bg-surface-muted)] rounded-full" />
              <div className="h-1.5 w-full bg-[color:var(--bg-surface-muted)] rounded-full" />
              <div className="h-1.5 w-3/4 bg-[color:var(--bg-surface-muted)] rounded-full" />
            </div>
          </div>

          <div className="pt-6 border-t border-[color:var(--border-subtle)]/50 flex items-end justify-between">
            <div className="space-y-1">
              <div className="h-1.5 w-12 bg-[color:var(--bg-surface-muted)] rounded-full" />
              <div className="h-3 w-20 bg-gray-900 rounded-full" />
            </div>
            {/* Required Lime Square */}
            <div className="h-8 w-8 bg-[#BEFF00] shadow-[0_4px_12px_rgba(190,255,0,0.3)]" />
          </div>
        </div>
      </motion.div>

      {/* LAYER 5: Interactive Elements (Front-most) */}
      <motion.div
        style={{ x: frontX, y: frontY }}
        className="absolute inset-0 pointer-events-none z-10"
      >
        {/* Connection Path SVG */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          {/* Main dashed path connecting icons */}
          <motion.path
            id="lifecycle-path"
            d="M150,500 C300,500 400,350 500,500 C600,650 700,500 850,500"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="3"
            strokeDasharray="10 8"
          />
          
          {/* Traveling Dot */}
          <motion.circle
            r="6"
            fill={phase < 2 ? "#BEFF00" : "#10B981"}
            style={{ 
              offsetPath: "path('M150,500 C300,500 400,350 500,500 C600,650 700,500 850,500')",
              filter: "drop-shadow(0 0 8px currentColor)"
            }}
            animate={{ 
              offsetDistance: phase === 0 ? "100%" : phase === 2 ? "0%" : (phase === 1 ? "100%" : "0%"),
              opacity: (phase === 0 || phase === 2) ? 1 : 0
            }}
            transition={{ 
              duration: (phase === 0 || phase === 2) ? 3 : 0, 
              ease: "easeInOut" 
            }}
          />

          {/* Path Labels */}
          <foreignObject x="250" y="420" width="200" height="40">
            <AnimatePresence>
              {phase === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#BEFF00] text-center"
                >
                  Invoice sent →
                </motion.div>
              )}
            </AnimatePresence>
          </foreignObject>

          <foreignObject x="550" y="540" width="200" height="40">
            <AnimatePresence>
              {phase === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#10B981] text-center"
                >
                  ← Payment received
                </motion.div>
              )}
            </AnimatePresence>
          </foreignObject>
        </svg>

        {/* Agency Icon */}
        <div className="absolute top-[50%] left-[10%] -translate-y-1/2 flex flex-col items-center gap-3">
          <motion.div 
            animate={{ 
              backgroundColor: phase === 3 ? "#10B981" : "#FFFFFF",
              borderColor: phase === 3 ? "#10B981" : "#F3F4F6",
              color: phase === 3 ? "#FFFFFF" : "#111827",
              scale: phase === 3 ? 1.1 : 1
            }}
            className="relative flex h-14 w-14 items-center justify-center shadow-[var(--brutal-shadow-lg)] border-2"
          >
            <Building2 className="h-7 w-7" strokeWidth={1.5} />
            {/* Radiating Pulse */}
            <AnimatePresence>
              {phase === 3 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 border-2 border-[#10B981]"
                />
              )}
            </AnimatePresence>
          </motion.div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            Agency
          </span>
        </div>

        {/* Client Icon */}
        <div className="absolute top-[50%] right-[10%] -translate-y-1/2 flex flex-col items-center gap-3">
          <motion.div 
            animate={{ 
              backgroundColor: (phase === 1 || phase === 2) ? "#10B981" : "#FFFFFF",
              borderColor: (phase === 1 || phase === 2) ? "#10B981" : "#F3F4F6",
              color: (phase === 1 || phase === 2) ? "#FFFFFF" : "#111827",
              scale: phase === 1 ? 1.1 : 1
            }}
            className="relative flex h-14 w-14 items-center justify-center shadow-[var(--brutal-shadow-lg)] border-2"
          >
            <Briefcase className="h-7 w-7" strokeWidth={1.5} />
            {/* Radiating Pulse */}
            <AnimatePresence>
              {phase === 1 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 border-2 border-[#10B981]"
                />
              )}
            </AnimatePresence>
          </motion.div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            Client
          </span>
        </div>
      </motion.div>

      {/* Status Pill */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2.5 rounded-full bg-white/80 border border-[color:var(--border-subtle)] px-4 py-2 shadow-sm"
          >
            {isGreenText ? (
              <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-gray-300" />
            )}
            <span className={isGreenText ? "text-xs font-bold text-[#10B981]" : "text-xs font-medium text-[color:var(--text-muted)]"}>
              {getStatusText()}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
