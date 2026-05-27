"use client";

import React, { useState } from "react";
import { cn } from "@/lib/ui-foundation";
import { ChevronDownIcon } from "@/components/ui/app-icons";

interface FaqAccordionItemProps {
  question: string;
  answer: string;
}

export default function FaqAccordionItem({
  question,
  answer,
}: FaqAccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[color:var(--border-subtle)] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 pr-4 text-left transition-all duration-200 group"
      >
        <span className="text-base font-bold text-[color:var(--text-primary)] group-hover:text-[color:var(--brand-indigo-deep)] transition-colors">
          {question}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-5 w-5 text-[color:var(--text-muted)] transition-transform duration-300 ease-in-out",
            isOpen ? "rotate-180 text-[color:var(--text-primary)]" : "rotate-0",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-5 pr-12 text-sm leading-relaxed text-[color:var(--text-secondary)]">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
