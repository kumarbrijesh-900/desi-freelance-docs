"use client";

import React, { useState, useRef, useEffect } from "react";
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
  // Layer 1 (Blob): Moves in opposite direction, very slow
  const blobX = useTransform(smoothX, [-300, 300], [15, -15]);
  const blobY = useTransform(smoothY, [-300, 300], [15, -15]);

  // Layer 3 (Shapes): Move in same direction, slightly faster
  const shapesX = useTransform(smoothX, [-300, 300], [-25, 25]);
  const shapesY = useTransform(smoothY, [-300, 300], [-25, 25]);

  // Layer 4 (Card): Moves fastest for front-most depth
  const cardX = useTransform(smoothX, [-300, 300], [-40, 40]);
  const cardY = useTransform(smoothY, [-300, 300], [-40, 40]);
  const cardRotate = useTransform(smoothX, [-300, 300], [-5, 5]);

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
      {/* LAYER 1: The Blob (Background) */}
      <motion.div
        style={{ x: blobX, y: blobY }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[80%] h-[80%] bg-gradient-to-tr from-[#D4FF00]/20 to-transparent blur-3xl rounded-full animate-pulse" />
      </motion.div>

      {/* LAYER 2: The Grid (Static) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%">
          <pattern id="hatch" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
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
        {/* Circle */}
        <div className="absolute top-[20%] left-[25%] w-12 h-12 bg-black rounded-full shadow-lg" />
        
        {/* Outlined Rectangle */}
        <div className="absolute bottom-[25%] right-[20%] w-24 h-16 border-2 border-[#D4FF00] rounded-lg" />
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
            <div className="h-8 w-8 bg-[#D4FF00] rounded-lg shadow-[0_4px_12px_rgba(212,255,0,0.3)]" />
          </div>
        </div>
      </motion.div>

      {/* LAYER 5: Interactive Spline (Front-most) */}
      <motion.div
        style={{ x: cardX, y: cardY }}
        className="absolute inset-0 pointer-events-none z-10"
      >
        <svg className="absolute top-[42%] right-[22%] w-40 h-20 overflow-visible" viewBox="0 0 120 40">
          <motion.path
            d="M0,20 Q30,0 60,20 T120,20"
            fill="none"
            stroke="currentColor"
            className="text-black/20"
            strokeWidth="1.5"
            strokeDasharray="6, 4"
            animate={{ strokeDashoffset: [0, -20] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
          {/* Accent dot at the end of path */}
          <motion.circle
            cx="120"
            cy="20"
            r="2"
            fill="#D4FF00"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
