"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/ui-foundation";

interface AppTooltipProps {
  children?: ReactNode;
  content: ReactNode;
  className?: string;
  contentClassName?: string;
  position?: "top" | "bottom" | "left" | "right";
  icon?: ReactNode;
}

export function AppTooltip({
  children,
  content,
  className,
  contentClassName,
  position = "top",
  icon,
}: AppTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click for mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
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

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 -mt-[2px] border-l-transparent border-r-transparent border-b-transparent border-t-[#111118]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-[2px] border-l-transparent border-r-transparent border-t-transparent border-b-[#111118]",
    left: "left-full top-1/2 -translate-y-1/2 -ml-[2px] border-t-transparent border-b-transparent border-r-transparent border-l-[#111118]",
    right: "right-full top-1/2 -translate-y-1/2 -mr-[2px] border-t-transparent border-b-transparent border-l-transparent border-r-[#111118]",
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center group", className)}
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

      <div
        className={cn(
          "absolute z-50 w-64 pointer-events-none transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
          positionClasses[position]
        )}
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
      >
        <div
          className={cn(
            "relative bg-white border-2 border-[#111118] p-3 shadow-[2px_2px_0px_#111118] text-[#111118] text-[11px] leading-relaxed font-normal text-left whitespace-normal",
            contentClassName
          )}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
