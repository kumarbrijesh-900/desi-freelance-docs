"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/ui-foundation";

interface AppTooltipProps {
  children?: ReactNode;
  content: ReactNode;
  className?: string;
  contentClassName?: string;
  position?: "top" | "bottom" | "left" | "right";
  icon?: ReactNode;
}

const TOOLTIP_GAP = 8;
const VIEWPORT_PADDING = 12;

export function AppTooltip({
  children,
  content,
  className,
  contentClassName,
  position = "bottom",
  icon,
}: AppTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth || 256;
    const tooltipHeight = tooltipEl?.offsetHeight || 80;

    let top = 0;
    let left = 0;

    // Calculate based on preferred position
    switch (position) {
      case "top":
        top = rect.top - tooltipHeight - TOOLTIP_GAP;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = rect.bottom + TOOLTIP_GAP;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - TOOLTIP_GAP;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + TOOLTIP_GAP;
        break;
    }

    // Flip vertically if clipped
    if (top < VIEWPORT_PADDING && position === "top") {
      top = rect.bottom + TOOLTIP_GAP;
    } else if (top + tooltipHeight > window.innerHeight - VIEWPORT_PADDING && position === "bottom") {
      top = rect.top - tooltipHeight - TOOLTIP_GAP;
    }

    // Clamp horizontal to viewport
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    } else if (left + tooltipWidth > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - tooltipWidth - VIEWPORT_PADDING;
    }

    // Clamp vertical to viewport
    top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - tooltipHeight - VIEWPORT_PADDING));

    setCoords({ top, left });
  }, [position]);

  // Recalculate on open
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      // Recalculate after a frame so tooltipRef dimensions are available
      requestAnimationFrame(calculatePosition);
    }
  }, [isOpen, calculatePosition]);

  // Close on outside click (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener("scroll", handleScroll, { capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [isOpen]);

  const tooltipContent = mounted && isOpen
    ? createPortal(
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-[99999] w-64 transition-all duration-150",
            isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
          style={{
            top: coords.top,
            left: coords.left,
            pointerEvents: "auto",
          }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div
            className={cn(
              "bg-white border-2 border-[#111118] p-3 shadow-[3px_3px_0px_#111118] text-[#111118] text-[11px] leading-relaxed font-normal text-left whitespace-normal",
              contentClassName
            )}
          >
            {content}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("relative inline-flex items-center", className)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="inline-flex cursor-help"
        >
          {children || (
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#111118]/20 bg-[#111118]/5 text-[9px] font-bold text-[#111118]/50 hover:bg-[#111118]/10 hover:text-[#111118] transition-colors focus:outline-none ring-1 ring-transparent focus:ring-[#BEFF00]"
            >
              {icon || "?"}
            </button>
          )}
        </div>
      </div>
      {tooltipContent}
    </>
  );
}
