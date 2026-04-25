"use client";

import React, { useRef } from "react";
import { Building2, Briefcase, Sparkle } from "lucide-react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";

export default function InteractiveHeroGraphic() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for parallax effect
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Layer transforms (depth mapping)
  const blobX = useTransform(smoothX, [-300, 300], [15, -15]);
  const blobY = useTransform(smoothY, [-300, 300], [15, -15]);

  const shapesX = useTransform(smoothX, [-300, 300], [-25, 25]);
  const shapesY = useTransform(smoothY, [-300, 300], [-25, 25]);

  const cardX = useTransform(smoothX, [-300, 300], [-40, 40]);
  const cardY = useTransform(smoothY, [-300, 300], [-40, 40]);
  const cardRotate = useTransform(smoothX, [-300, 300], [-5, 5]);

  // Front-most elements (icons) move fastest
  const frontX = useTransform(smoothX, [-300, 300], [-55, 55]);
  const frontY = useTransform(smoothY, [-300, 300], [-55, 55]);

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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full aspect-square md:aspect-[4/3] relative overflow-hidden rounded-2xl bg-gray-50/50 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
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
            id="hatch"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="20" stroke="black" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hatch)" />
        </svg>
      </div>

      {/* LAYER 3: Abstract Geometric Shapes (Behind) */}
      <motion.div
        style={{ x: shapesX, y: shapesY }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Floating Shapes */}
        <div className="absolute top-[15%] left-[20%] w-10 h-10 border border-[#FF4D2A]/20 rounded-lg rotate-12" />
        <div className="absolute bottom-[20%] right-[15%] w-14 h-14 bg-[#BEFF00]/10 rounded-full" />
        <div className="absolute top-[40%] left-[10%] w-6 h-6 border-2 border-[#00D4A0]/20 rounded-sm -rotate-12" />
      </motion.div>

      {/* LAYER 4: UI Hint (Glassmorphic Card) */}
      <motion.div
        style={{ x: cardX, y: cardY, rotateY: cardRotate }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none perspective-[1000px]"
      >
        <div className="w-56 h-72 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-2 w-1/2 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              <div className="h-1.5 w-3/4 bg-gray-100 rounded-full" />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100/50 flex items-end justify-between">
            <div className="space-y-1">
              <div className="h-1.5 w-12 bg-gray-100 rounded-full" />
              <div className="h-3 w-20 bg-gray-900 rounded-full" />
            </div>
            <div className="h-8 w-8 bg-[#BEFF00] rounded-lg shadow-[0_4px_12px_rgba(190,255,0,0.3)]" />
          </div>
        </div>
      </motion.div>

      {/* LAYER 5: Interactive Spline & Connection Icons (Front-most) */}
      <motion.div
        style={{ x: frontX, y: frontY }}
        className="absolute inset-0 pointer-events-none z-10"
      >
        {/* Agency Icon (Building) */}
        <div className="absolute top-[45%] left-[12%] flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg border border-gray-100 text-gray-900">
            <Building2 className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
            Agency
          </span>
        </div>

        {/* Client Icon (Briefcase) */}
        <div className="absolute top-[38%] right-[10%] flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg border border-gray-100 text-gray-900">
            <Briefcase className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
            Client
          </span>
        </div>

        {/* The Connection Spline */}
        <svg
          className="absolute top-[40%] left-[18%] w-[65%] h-32 overflow-visible"
          viewBox="0 0 300 100"
        >
          <motion.path
            d="M0,50 C60,50 100,0 150,50 C200,100 240,50 300,40"
            fill="none"
            stroke="currentColor"
            className="text-[#BEFF00]"
            strokeWidth="2"
            strokeDasharray="8, 6"
            animate={{ strokeDashoffset: [0, -28] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Traveling "Pulse" Sparkle */}
          <motion.g
            animate={{
              offsetDistance: ["0%", "100%"],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              offsetPath:
                "path('M0,50 C60,50 100,0 150,50 C200,100 240,50 300,40')",
            }}
          >
            <circle r="4" fill="#BEFF00" className="blur-[2px]" />
            <Sparkle className="h-4 w-4 -translate-x-2 -translate-y-2 text-[#BEFF00] fill-[#BEFF00]" />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}
