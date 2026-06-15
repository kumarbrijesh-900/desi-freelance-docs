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

const TOOLTIP_GAP = 10;
const VIEWPORT_PADDING = 12;

export function AppTooltip({
  children,
  content,
  className,
  contentClassName,
  position = "top",
  icon,
}: AppTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    // Default to ~190px if not mounted to prevent large jumps
    const tooltipWidth = tooltipEl?.offsetWidth || 190;
    const tooltipHeight = tooltipEl?.offsetHeight || 40;

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

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 350);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  const tooltipContent = mounted && isOpen
    ? createPortal(
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-[99999] w-[190px]",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          style={{
            top: coords.top,
            left: coords.left,
            pointerEvents: "auto",
            transition: "opacity 0.18s, transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            transform: isOpen ? "translateY(0)" : "translateY(6px)",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={cn(
              "relative bg-ink text-paper rounded-[8px] p-[8px_12px] text-[11px] font-medium leading-[1.4] whitespace-normal text-left shadow-[var(--brutal-shadow-md)]",
              contentClassName
            )}
          >
            {content}
            {position === "top" && (
              <div className="absolute top-[100%] left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-ink" />
            )}
            {position === "bottom" && (
              <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-ink" />
            )}
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
              className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full border-[1.75px] border-ink bg-white text-[11px] font-bold hover:bg-paper-2 transition-colors app-focus-ring"
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
