import React from "react";
import { createClient } from "@/lib/supabase/server";
import FaqAccordionItem from "./FaqAccordionItem";
import {
  cn,
  getAppPanelClass,
  appSectionTitleClass,
} from "@/lib/ui-foundation";
import type { Faq } from "@/types/supabase-extra";

export default async function FaqSection() {
  const supabase = await createClient();

  const { data: faqs, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching FAQs:", error);
    return null;
  }

  if (!faqs || faqs.length === 0) {
    return null;
  }

  // Group by category
  const groupedFaqs = faqs.reduce((acc: Record<string, Faq[]>, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold tracking-tight text-[color:var(--text-primary)] mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-lg text-[color:var(--text-secondary)]">
          Everything you need to know about professional billing with Lance.
        </p>
      </div>

      <div className="space-y-12">
        {Object.entries(groupedFaqs).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--text-primary)] border-l-4 border-[color:var(--color-lime-warm)] pl-3 ml-1">
              {category}
            </h3>
            <div
              className={cn(
                getAppPanelClass(),
                "p-0 overflow-hidden divide-y divide-gray-100",
              )}
            >
              <div className="px-6">
                {items.map((faq) => (
                  <FaqAccordionItem
                    key={faq.id}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
