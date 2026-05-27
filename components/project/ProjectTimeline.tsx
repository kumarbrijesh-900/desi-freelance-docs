"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/ui-foundation";

export interface MilestoneTimelineProp {
  id: string;
  title: string;
  order_index: number;
  status: string;
  amount: number;
  due_date: string;
  invoice_id: string;
  invoice_number: string;
  trigger_mode?: string | null;
  trigger_status?: string | null;
  trigger_date?: string | null;
}

export interface ProjectTimelineProps {
  milestones: MilestoneTimelineProp[];
}

export default function ProjectTimeline({ milestones }: ProjectTimelineProps) {
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.order_index !== b.order_index) {
      return a.order_index - b.order_index;
    }
    const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
    const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
    return timeA - timeB;
  });
  const seenOrderIndexes = new Set<number>();
  const sorted = sortedMilestones.filter((milestone) => {
    if (seenOrderIndexes.has(milestone.order_index)) return false;
    seenOrderIndexes.add(milestone.order_index);
    return true;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getMilestoneNodeStyle = (m: MilestoneTimelineProp) => {
    const statusLower = (m.status || "").toLowerCase();
    const isSettled = statusLower === "settled" || statusLower === "paid";
    const isScheduled =
      m.trigger_mode === "scheduled" && m.trigger_status === "pending";

    let isOverdue = false;
    if (m.due_date && !isSettled) {
      const due = new Date(m.due_date);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        isOverdue = true;
      }
    }

    if (isSettled) {
      // settled -> filled mint (#00DCB4) circle, 16px
      return {
        bg: "bg-[#00DCB4]",
        border: "border-2 border-[#111118]",
      };
    }
    if (isOverdue) {
      // overdue -> filled orange (#FFB35F) circle with 2px red border
      return {
        bg: "bg-[#FFB35F]",
        border: "border-2 border-red-600",
      };
    }
    if (
      statusLower === "live" ||
      statusLower === "active" ||
      statusLower === "sent" ||
      statusLower === "partial" ||
      statusLower === "invoice-partial"
    ) {
      // live or shared+msa-accepted -> filled lime (var(--color-lime-warm)) circle, 16px
      return {
        bg: "bg-[color:var(--color-lime-warm)]",
        border: "border-2 border-[#111118]",
      };
    }
    if (isScheduled) {
      return {
        bg: "bg-white",
        border: "border-2 border-dashed border-[#111118]",
      };
    }
    // pending or msa not yet accepted -> hollow circle with 2px black border, 16px
    return {
      bg: "bg-white",
      border: "border-2 border-[#111118]",
    };
  };

  const truncate = (str: string, len: number) => {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "..." : str;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!milestones || milestones.length === 0) {
    return (
      <div className="w-full py-4 text-center text-[12px] font-bold text-gray-400 uppercase italic">
        No milestones defined
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto py-6 px-4 select-none scrollbar-thin">
      <div className="flex items-center min-w-max relative h-28">
        {/* Connecting lines between nodes: 2px solid black */}
        <div className="absolute top-[8px] left-[80px] right-[80px] h-[2px] bg-[#111118] z-0" />

        {sorted.map((m, idx) => {
          const style = getMilestoneNodeStyle(m);
          const isScheduled =
            m.trigger_mode === "scheduled" && m.trigger_status === "pending";
          return (
            <div
              key={m.id || idx}
              className="relative z-10 flex flex-col items-center w-40 text-center"
            >
              <Link
                href={`/invoice/preview?id=${m.invoice_id}`}
                className="group flex flex-col items-center cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Circle Node: 16px */}
                <div
                  title={isScheduled ? `Scheduled for ${formatDate(m.trigger_date || "")}` : undefined}
                  className={cn(
                    "relative flex w-[16px] h-[16px] items-center justify-center rounded-full transition-transform group-hover:scale-125 z-10 shadow-[var(--brutal-shadow-pressed)]",
                    style.bg,
                    style.border
                  )}
                >
                  {isScheduled && (
                    <Clock3 className="h-3 w-3 text-[#111118]" strokeWidth={2.5} />
                  )}
                </div>

                {/* Label under each node (small, 11px) */}
                <div className="mt-3 space-y-0.5 max-w-[140px]">
                  <p className="text-[11px] font-black text-[#111118] uppercase tracking-tight group-hover:text-[#FF5C00] transition-colors leading-tight truncate">
                    {truncate(m.title, 20)}
                  </p>
                  <p className="text-[9px] font-bold text-[color:var(--color-ink-2)] uppercase tracking-wider">
                    {formatDate(m.due_date)} ·{" "}
                    <span className="font-black text-[#111118]">
                      {formatCurrency(m.amount)}
                    </span>
                  </p>
                  <p className="text-[8px] font-normal text-gray-400 font-mono tracking-widest uppercase">
                    {m.invoice_number}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
