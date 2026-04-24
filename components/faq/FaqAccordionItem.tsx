"use client";

import React, { useState } from "react";
import { cn } from "@/lib/ui-foundation";
import { ChevronDownIcon } from "@/components/ui/app-icons";

interface FaqAccordionItemProps {
  question: string;
  answer: string;
}

export default function FaqAccordionItem({ question, answer }: FaqAccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left transition-all duration-200 group"
      >
        <span className="text-base font-semibold text-gray-900 group-hover:text-[color:var(--interactive-primary)] transition-colors">
          {question}
        </span>
        <ChevronDownIcon 
          className={cn(
            "h-5 w-5 text-gray-400 transition-transform duration-300 ease-in-out",
            isOpen ? "rotate-180 text-gray-900" : "rotate-0"
          )} 
        />
      </button>
      
      <div 
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-5 pr-12 text-sm leading-relaxed text-gray-600">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
