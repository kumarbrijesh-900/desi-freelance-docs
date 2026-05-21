"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MoreHorizontal, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  Share2,
  FileText,
  Download,
  Trash
} from "lucide-react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon, ChevronLeftIcon, ChevronDownIcon } from "@/components/ui/app-icons";
import AppSelectField from "@/components/ui/AppSelectField";
import {
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
  appGridClass,
} from "@/lib/layout-foundation";
import { getAppButtonClass, cn } from "@/lib/ui-foundation";
import {
  listInvoices,
  deleteInvoice,
  markInvoiceSettled,
  markMilestoneSettled,
  requestNextMilestone,
  getReadReceiptsBatch,
  type SavedInvoice,
  type MsaResponse,
  markInvoiceAsTracked,
} from "@/lib/supabase/invoices";
import { trackedOnly, offlineOnly } from "@/lib/invoice-channel-helpers";
import {
  getClientSessionUser,
  supabase,
  withTimeoutFallback,
} from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";
import SettlementModal from "@/components/invoice/SettlementModal";

/* ─── Helpers ────────────────────────────────────── */

const PREVIEW_KEY = "invoice-preview-data";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(inv: SavedInvoice) {
  const amount = inv.grand_total ?? (inv.form_data?.lineItems ?? []).reduce((s, i) => s + Number(i.qty ?? 0) * Number(i.rate ?? 0), 0);
  if (!amount) return "—";
  const currency = inv.form_data?.client?.clientCurrency || "INR";
  const symbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : "₹";
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

function getWorkType(inv: SavedInvoice) {
  const items = inv.form_data?.lineItems ?? [];
  if (!items.length) return "—";
  const types = [...new Set(items.map((i) => i.type).filter(Boolean))];
  return types.slice(0, 2).join(", ") + (types.length > 2 ? " …" : "");
}

function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/* ─── Badge components ─────────────────────────── */

function CombinedStatusBadge({ 
  status, 
  msaStatus, 
  msaId, 
  dueDate 
}: { 
  status: string; 
  msaStatus: MsaResponse; 
  msaId: string | null; 
  dueDate?: string; 
}) {
  const normalizedInv = status.toLowerCase();
  
  // Priority 1: Settled (Paid)
  if (normalizedInv === "settled") {
    return (
      <span className="border-2 border-[#111118] bg-[#E0FFF7] text-[#006B52] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]">
        Paid
      </span>
    );
  }

  // Priority 2: MSA Pending/Proposed/Rejected
  if (msaId && (msaStatus === "proposed" || msaStatus === "rejected" || msaStatus === "pending")) {
    const label = msaStatus === "rejected" ? "Revision Asked" : "MSA Pending";
    return (
      <span className="border-2 border-[#111118] bg-[#FFFBE6] text-[#111118] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]">
        {label}
      </span>
    );
  }

  // Priority 3: MSA Accepted
  if (msaId && msaStatus === "accepted") {
    return (
      <span className="border-2 border-[#111118] bg-[#BEFF00] text-[#111118] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]">
        MSA Accepted
      </span>
    );
  }

  // Priority 4: Overdue
  let isOverdue = false;
  if (normalizedInv === "finalized" && dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) isOverdue = true;
  }

  if (isOverdue)
    return (
      <span className="border-2 border-[#111118] bg-[#FF5C00] text-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]">
        Overdue
      </span>
    );

  // Priority 5: Sent (Finalized)
  if (normalizedInv === "finalized")
    return (
      <span className="border-2 border-[#111118] bg-[#BEFF00] text-[#111118] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]">
        Sent
      </span>
    );

  // Priority 6: Draft
  return (
    <span className="border-2 border-[#111118] bg-[#F0EAFF] text-[#8B5CF6] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]">
      Draft
    </span>
  );
}

function ViewsBadge({
  count,
}: {
  count: number;
}) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[color:var(--text-muted)] ml-1.5 opacity-60">
      👁 {count}
    </span>
  );
}

function MilestoneProgressBadge({ milestones }: { milestones: any[] }) {
  if (!milestones || milestones.length <= 1) return null;
  const settled = milestones.filter((m) => m.status === "SETTLED").length;
  const total = milestones.length;
  return (
    <div className="text-[11px] font-medium text-[color:var(--text-muted)] mt-0.5">
      {settled} of {total} settled
    </div>
  );
}

/* ─── Filter/Sort bar ──────────────────────────── */

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
type StatusFilter = "all" | "DRAFT" | "SAVED" | "SENT" | "PARTIAL" | "SETTLED";
type MsaFilter = "all" | "pending" | "accepted" | "rejected" | "none";

function FilterBar({
  statusFilter,
  setStatusFilter,
  msaFilter,
  setMsaFilter,
  sortKey,
  setSortKey,
  search,
  setSearch,
  total,
}: {
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  msaFilter: MsaFilter;
  setMsaFilter: (v: MsaFilter) => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
  search: string;
  setSearch: (v: string) => void;
  total: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search client, invoice #…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11 flex-1 min-w-[240px] border-2 border-[#111118] bg-white px-4 text-[14px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] outline-none focus:ring-2 focus:ring-[color:var(--color-lime-300)] transition-all"
      />

      {/* Status filter */}
      <div className="w-full sm:w-[160px]">
        <AppSelectField
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          hasValue={statusFilter !== "all"}
        >
          <option value="all">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SAVED">Saved</option>
          <option value="SENT">Sent</option>
          <option value="PARTIAL">Partial</option>
          <option value="SETTLED">Settled</option>
        </AppSelectField>
      </div>

      {/* MSA filter */}
      <div className="w-full sm:w-[160px]">
        <AppSelectField
          value={msaFilter}
          onChange={(e) => setMsaFilter(e.target.value as MsaFilter)}
          hasValue={msaFilter !== "all"}
        >
          <option value="all">All MSA</option>
          <option value="none">No MSA</option>
          <option value="pending">MSA Pending</option>
          <option value="accepted">MSA Accepted</option>
          <option value="rejected">Revision Asked</option>
        </AppSelectField>
      </div>

      {/* Sort */}
      <div className="w-full sm:w-[160px]">
        <AppSelectField
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          hasValue={true}
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Amount ↓</option>
          <option value="amount-asc">Amount ↑</option>
        </AppSelectField>
      </div>

      <span className="text-[12px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider ml-auto">
        {total} result{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

/* ─── Table row ────────────────────────────────── */

function InvoiceRow({
  invoice,
  viewCount,
  onView,
  onEdit,
  onDelete,
  onMarkSettled,
  onRequestNext,
  deletingId,
  settlingId,
  requestingId,
  isSelected,
  onToggleSelect,
  onToggleTracking,
}: {
  invoice: SavedInvoice;
  viewCount: number;
  onView: (inv: SavedInvoice) => void;
  onEdit: (inv: SavedInvoice) => void;
  onDelete: (id: string) => void;
  onMarkSettled: (id: string, milestoneId?: string) => void;
  onRequestNext: (id: string, milestoneId: string) => void;
  deletingId: string | null;
  settlingId: string | null;
  requestingId: string | null;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleTracking: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const lineItems = invoice.form_data?.lineItems ?? [];
  const hasRelationalMilestones = (invoice.milestones ?? []).length > 0;
  const hasLegacyMilestones = lineItems.some(i => i.is_milestone_header);
  const hasMilestones = hasRelationalMilestones || hasLegacyMilestones;

  const canSettle =
    invoice.status.toLowerCase() === "finalized";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRowClick = () => {
    if (invoice.parent_invoice_id) onView(invoice);
    else onEdit(invoice);
  };

  return (
    <>
      <tr 
        className={cn(
          "border-b border-[color:var(--border-subtle)] hover:bg-indigo-light/40 transition-colors group cursor-pointer",
          isExpanded && "bg-[color:var(--bg-surface-soft)]/50",
          isSelected && "bg-indigo-light/20 hover:bg-indigo-light/30"
        )}
        onClick={(e) => {
          // If clicking on checkbox or its label, let it handle
          handleRowClick();
        }}
      >
        {/* Selection Checkbox */}
        <td className="px-4 py-4 w-10 shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(invoice.id)}
            className="h-4 w-4 rounded border-[#111118] text-indigo-brand focus:ring-indigo-brand cursor-pointer"
          />
        </td>

        {/* Invoice # */}
        <td className="px-4 py-4 text-[13px] font-semibold text-[color:var(--text-primary)] whitespace-nowrap">
          <div className="flex items-center gap-3">
            {hasMilestones && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] transition-colors"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            {!hasMilestones && <div className="w-5 shrink-0" />}
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-indigo-brand hover:underline">{invoice.invoice_number}</span>
              <span className="text-[11px] font-medium text-[color:var(--text-muted)]">
                {fmtDate(invoice.created_at)}
                {invoice.form_data?.meta?.dueDate && (
                  <> · Due {fmtDate(invoice.form_data.meta.dueDate)}</>
                )}
              </span>
              <MilestoneProgressBadge milestones={invoice.milestones ?? []} />
              {invoice.msa_status === "proposed" && invoice.client_msa_note && (
                <div 
                  className="mt-1.5 max-w-[280px] border-2 border-[#111118] bg-[#FFFBE6] px-2 py-1 text-[11px] font-bold text-[#111118] shadow-[2px_2px_0_#111118] truncate"
                  title={invoice.client_msa_note}
                  onClick={(e) => e.stopPropagation()}
                >
                  Proposal: &quot;{invoice.client_msa_note}&quot;
                </div>
              )}
              <div className="sm:hidden mt-2 flex items-center gap-2">
                <CombinedStatusBadge 
                  status={invoice.status} 
                  msaStatus={invoice.msa_status ?? "pending"} 
                  msaId={invoice.msa_id}
                  dueDate={invoice.form_data?.meta?.dueDate}
                />
                <ViewsBadge count={viewCount} />
              </div>
            </div>
          </div>
        </td>

        {/* Client */}
        <td className="px-4 py-4">
          <div className="text-[13px] font-bold text-[color:var(--text-primary)] truncate max-w-[200px]">
            {invoice.form_data?.client?.clientName || (
              <span className="text-[color:var(--text-muted)]">—</span>
            )}
          </div>
          {invoice.shared_to_email && (
            <div className="text-[11px] font-medium text-[color:var(--text-muted)] truncate max-w-[200px]">
              {invoice.shared_to_email}
            </div>
          )}
        </td>

        {/* Amount */}
        <td className="px-4 py-4 text-[13px] font-bold text-[color:var(--text-primary)] text-right whitespace-nowrap tabular-nums">
          {fmtAmount(invoice)}
        </td>

        {/* Status */}
        <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
          <div className="flex items-center">
            <CombinedStatusBadge 
              status={invoice.status} 
              msaStatus={invoice.msa_status ?? "pending"} 
              msaId={invoice.msa_id}
              dueDate={invoice.form_data?.meta?.dueDate}
            />
            <ViewsBadge count={viewCount} />
          </div>
        </td>

        {/* Actions */}
        <td className="px-4 py-4 whitespace-nowrap text-right w-[120px] hidden sm:table-cell">
          <div className={cn("relative inline-block text-left", showDropdown && "z-50")} ref={dropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className="flex h-8 w-8 items-center justify-center border border-[#111118] hover:bg-[color:var(--bg-surface-muted)] transition-colors text-[color:var(--text-muted)]"
            >
              <MoreHorizontal size={18} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 z-50 mt-1 w-48 origin-top-right border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-md)] focus:outline-none text-left">
                <div className="py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDropdown(false); onView(invoice); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[#BEFF00] hover:text-[#111118]"
                  >
                    <Eye size={14} className="text-[color:var(--text-muted)]" /> View
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDropdown(false); onEdit(invoice); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[#BEFF00] hover:text-[#111118]"
                  >
                    <Edit2 size={14} className="text-[color:var(--text-muted)]" /> Edit
                  </button>
                  {canSettle && !hasMilestones && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDropdown(false); onMarkSettled(invoice.id); }}
                      disabled={settlingId === invoice.id}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-lime-600 hover:bg-lime-50"
                    >
                      <CheckCircle size={14} /> {settlingId === invoice.id ? "Updating…" : "Mark Settled"}
                    </button>
                  )}
                  {invoice.is_offline && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                        try {
                          await markInvoiceAsTracked(invoice.id);
                          onToggleTracking(invoice.id);
                        } catch (err) {
                          console.error("[OfflineToggle] switch to tracking failed:", err);
                        }
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[#BEFF00] hover:text-[#111118]"
                    >
                      Switch to digital tracking
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDropdown(false); onDelete(invoice.id); }}
                    disabled={deletingId === invoice.id}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#FF5C00] hover:bg-[color:var(--state-danger-bg)]"
                  >
                    <Trash2 size={14} /> {deletingId === invoice.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Milestone Accordion Rows */}
      {isExpanded && hasMilestones && (
        <>
          {(invoice.milestones ?? []).length > 0 ? (
            invoice.milestones!.map((m: any, idx: number) => {
              const isSettled = m.status === "SETTLED";
              const currency = invoice.form_data?.client?.clientCurrency || "INR";
              const symbol = currency === "USD" ? "$" : "₹";
              
              return (
                <React.Fragment key={m.id}>
                  <tr className="bg-[color:var(--bg-surface-soft)] border-b border-[color:var(--border-subtle)] group/sub">
                    <td colSpan={2} className="pl-12 py-3 text-[12px] font-medium text-[color:var(--text-secondary)] relative">
                      <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gray-200" />
                      ↳ Milestone {(m.order_index ?? idx) + 1}: {m.title || "Untitled"}
                      {invoice.children?.find(c => c.milestone_index === (m.order_index ?? idx) + 1) && (
                        <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 border-2 border-blue-200">
                          {invoice.children.find(c => c.milestone_index === (m.order_index ?? idx) + 1)?.invoice_number}
                        </span>
                      )}
                      {(() => {
                        const dueStr = m.dueDate || invoice.form_data?.meta?.dueDate;
                        if (!dueStr) return null;
                        const days = Math.ceil((new Date(dueStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        if (days < 0) return <span className="text-red-500 font-bold ml-2">({Math.abs(days)} days overdue)</span>;
                        if (days === 0) return <span className="text-orange-500 font-bold ml-2">(Due today)</span>;
                        return <span className="text-green-600 font-bold ml-2">(Due in {days} days)</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-[13px] font-bold text-[color:var(--text-secondary)] text-right tabular-nums">
                      {symbol}{(m.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        isSettled 
                          ? "border-2 border-[#111118] bg-[#E0FFF7] text-[#006B52]" 
                          : "border-2 border-[#111118] bg-[#F0EAFF] text-[#8B5CF6]"
                      )}>
                        {isSettled ? "Settled" : "Payment Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSettled && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onMarkSettled(invoice.id, m.id); }}
                          className="h-[28px] px-3 text-[11px] font-bold text-lime-600 border-2 border-lime-300 bg-white hover:bg-lime-50 transition-colors"
                        >
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                  {(m.line_items || []).map((li: any, liIdx: number) => (
                    <tr key={`${m.id}-li-${liIdx}`} className="bg-[color:var(--bg-surface-soft)] border-b border-[color:var(--border-subtle)]/50">
                      <td colSpan={2} className="pl-16 py-2 text-[11px] text-[color:var(--text-muted)] relative">
                        <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gray-200" />
                        <div className="absolute left-6 top-1/2 w-4 h-[2px] bg-gray-200" />
                        • {li.description}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-[color:var(--text-muted)]">
                        {li.qty} {li.unit || 'unit'} @ {symbol}{(li.rate || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2 text-[11px] font-medium text-right tabular-nums text-[color:var(--text-muted)]">
                        {symbol}{((li.qty || 0) * (li.rate || 0)).toLocaleString("en-IN")}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })
          ) : (
            lineItems.map((item, idx) => {
              if (!item.is_milestone_header) return null;
              
              let subtotal = 0;
              let mCount = 0;
              const legacyItems: any[] = [];
              lineItems.forEach((li, i) => {
                if (i <= idx && li.is_milestone_header) mCount++;
              });

              for (let i = idx + 1; i < lineItems.length; i++) {
                if (lineItems[i].is_milestone_header) break;
                subtotal += Number(lineItems[i].qty ?? 0) * Number(lineItems[i].rate ?? 0);
                legacyItems.push(lineItems[i]);
              }
              
              const isSettled = item.milestone_status === "SETTLED";
              const currency = invoice.form_data.client?.clientCurrency || "INR";
              const symbol = currency === "USD" ? "$" : "₹";

              return (
                <React.Fragment key={item.id}>
                  <tr className="bg-[color:var(--bg-surface-soft)] border-b border-[color:var(--border-subtle)] group/sub">
                    <td colSpan={2} className="pl-12 py-3 text-[12px] font-medium text-[color:var(--text-secondary)] relative">
                      <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gray-200" />
                      ↳ Milestone {mCount}: {item.description}
                      {invoice.children?.find(c => c.milestone_index === mCount) && (
                        <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 border-2 border-blue-200">
                          {invoice.children.find(c => c.milestone_index === mCount)?.invoice_number}
                        </span>
                      )}
                      {(() => {
                        const dueStr = invoice.form_data?.meta?.dueDate;
                        if (!dueStr) return null;
                        const days = Math.ceil((new Date(dueStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        if (days < 0) return <span className="text-red-500 font-bold ml-2">({Math.abs(days)} days overdue)</span>;
                        if (days === 0) return <span className="text-orange-500 font-bold ml-2">(Due today)</span>;
                        return <span className="text-green-600 font-bold ml-2">(Due in {days} days)</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-[13px] font-bold text-[color:var(--text-secondary)] text-right tabular-nums">
                      {symbol}{subtotal.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        isSettled 
                          ? "border-2 border-[#111118] bg-[#E0FFF7] text-[#006B52]" 
                          : "border-2 border-[#111118] bg-[#F0EAFF] text-[#8B5CF6]"
                      )}>
                        {isSettled ? "Settled" : "Payment Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSettled && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onMarkSettled(invoice.id, item.id); }}
                          className="h-[28px] px-3 text-[11px] font-bold text-lime-600 border-2 border-lime-300 bg-white hover:bg-lime-50 transition-colors"
                        >
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                  {legacyItems.map((li: any, liIdx: number) => (
                    <tr key={`${item.id}-li-${liIdx}`} className="bg-[color:var(--bg-surface-soft)] border-b border-[color:var(--border-subtle)]/50">
                      <td colSpan={2} className="pl-16 py-2 text-[11px] text-[color:var(--text-muted)] relative">
                        <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gray-200" />
                        <div className="absolute left-6 top-1/2 w-4 h-[2px] bg-gray-200" />
                        • {li.description}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-[color:var(--text-muted)]">
                        {li.qty} {li.unit || 'unit'} @ {symbol}{(li.rate || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2 text-[11px] font-medium text-right tabular-nums text-[color:var(--text-muted)]">
                        {symbol}{((li.qty || 0) * (li.rate || 0)).toLocaleString("en-IN")}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })
          )}
        </>
      )}
    </>
  );
}

/* ─── Page ─────────────────────────────────────── */

function InvoiceSettlementConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <MotionReveal preset="fade-up" className="w-full max-w-md">
        <div className="border-2 border-[#111118] bg-white p-6 shadow-[var(--brutal-shadow-lg)]">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
              Mark as Settled?
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)] leading-relaxed">
              This confirms you've received payment externally. This action cannot be undone.
            </p>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 ${getAppButtonClass({ variant: "ghost", size: "md" })}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`flex-[2] ${getAppButtonClass({ variant: "primary", size: "md" })}`}
            >
              {isSubmitting ? "Updating…" : "Yes, Mark as Settled"}
            </button>
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}

function InvoiceDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  isSubmitting: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <MotionReveal preset="fade-up" className="w-full max-w-md">
        <div className="border-2 border-[#111118] bg-white p-6 shadow-[var(--brutal-shadow-lg)]">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#111118] uppercase tracking-tight">
              {count > 1 ? `Delete ${count} Invoices?` : "Delete Invoice?"}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)] leading-relaxed">
              Are you sure you want to permanently delete {count > 1 ? "these invoices" : "this invoice"}? This action cannot be undone.
            </p>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 ${getAppButtonClass({ variant: "ghost", size: "md" })}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`flex-[2] ${getAppButtonClass({ variant: "primary", size: "md" })} text-white`}
              style={{ backgroundColor: '#FF5C00', borderColor: '#111118' }}
            >
              {isSubmitting ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}

export default function InvoiceHistoryPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [receipts, setReceipts] = useState<
    Record<string, { count: number; lastViewed: string | null }>
  >({});
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [activeFullSettlementId, setActiveFullSettlementId] = useState<string | null>(null);
  const [activeNextMilestone, setActiveNextMilestone] = useState<{
    parentInvoiceId: string;
    nextMilestoneIndex: number;
    nextMilestoneName: string;
    totalMilestones: number;
    sendingNext: boolean;
  } | null>(null);

  // Settlement Modal State
  const [activeSettlement, setActiveSettlement] = useState<{
    invoiceId: string;
    milestoneId: string;
    milestoneIndex: number;
    name: string;
    subtotal: number;
    symbol: string;
  } | null>(null);

  // Filters
  const [activeChannelTab, setActiveChannelTab] = useState<"tracked" | "offline">("tracked");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [msaFilter, setMsaFilter] = useState<MsaFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let isActive = true;

    async function init() {
      const user = await withTimeoutFallback(getClientSessionUser(), 2000, null);
      if (!isActive) return;

      const userId = user?.id ?? null;
      if (!userId) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      setAuthenticated(true);

      const { data, error } = await withTimeoutFallback(listInvoices(), 4000, {
        data: [] as SavedInvoice[],
        error: "Timed out while loading invoices.",
      });
      if (!isActive) return;

      if (error && error !== "Not authenticated") {
        setLoadError(error);
        setLoading(false);
        return;
      }

      setInvoices(data ?? []);

      // Batch-load read receipts
      const sharedIds = (data ?? []).filter((i) => i.share_token).map((i) => i.id);
      if (sharedIds.length) {
        const batch = await withTimeoutFallback(
          getReadReceiptsBatch(sharedIds),
          3000,
          {},
        );
        if (!isActive) return;
        setReceipts(batch);
      }
      setLoading(false);
    }

    void init();

    return () => {
      isActive = false;
    };
  }, []);

  const handleView = (inv: SavedInvoice) => {
    try {
      window.localStorage.setItem(PREVIEW_KEY, JSON.stringify(inv.form_data));
      router.push("/invoice/preview");
    } catch {}
  };

  const handleEdit = (inv: SavedInvoice) => {
    try {
      // Save to editor draft storage
      window.localStorage.setItem(
        "invoice-editor-draft",
        JSON.stringify({
          formData: inv.form_data,
          currentStep: "totals",
          savedAt: new Date().toISOString(),
          documentId: inv.id, // Re-use ID to track which invoice to update
          clientMsaNote: inv.client_msa_note, // NEW: metadata for editor
        }),
      );
      router.push("/invoice/new?fresh=0"); // Use fresh=0 to avoid auto-filling profile over this
    } catch {}
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeletingId(id);
    setDeleteTargetId(null);
    const { error } = await deleteInvoice(id);
    if (!error) setInvoices((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  };

  const handleToggleTracking = (id: string) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_offline: false } : i))
    );
  };

  const handleMarkSettled = async (id: string, milestoneId?: string) => {
    // If it's a milestone, we open the modal
    if (milestoneId) {
      const inv = invoices.find(i => i.id === id);
      if (!inv) return;
      
      // Try to find in relational milestones first
      const relMilestone = inv.milestones?.find(m => m.id === milestoneId);
      const item = relMilestone || inv.form_data.lineItems.find(li => li.id === milestoneId);
      
      if (!item) return;

      // Calculate subtotal for this milestone
      let subtotal = 0;
      if (relMilestone) {
        subtotal = relMilestone.amount ?? (relMilestone.line_items ?? []).reduce((s: number, li: any) => s + (li.qty ?? 0) * (li.rate ?? 0), 0);
      } else {
        const idx = inv.form_data.lineItems.findIndex(li => li.id === milestoneId);
        for (let i = idx + 1; i < inv.form_data.lineItems.length; i++) {
          if (inv.form_data.lineItems[i].is_milestone_header) break;
          subtotal += Number(inv.form_data.lineItems[i].qty ?? 0) * Number(inv.form_data.lineItems[i].rate ?? 0);
        }
      }

      const currency = inv.form_data.client?.clientCurrency || "INR";
      const symbol = currency === "USD" ? "$" : "₹";

      // Find the index of this milestone
      const relMilestoneIndex = inv.milestones?.findIndex((m: any) => m.id === milestoneId) ?? 0;
      const formMilestoneIndex = relMilestoneIndex >= 0 ? relMilestoneIndex : 0;

      setActiveSettlement({
        invoiceId: id,
        milestoneId,
        milestoneIndex: formMilestoneIndex,
        name: (item as any).description || (item as any).title || `Milestone ${formMilestoneIndex + 1}`,
        subtotal,
        symbol
      });
      return;
    }

    // Full invoice settlement opens confirmation modal
    setActiveFullSettlementId(id);
  };

  const handleConfirmFullSettlement = async () => {
    if (!activeFullSettlementId) return;
    setSettlingId(activeFullSettlementId);
    
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'settled', 
        settled_at: new Date().toISOString() 
      })
      .eq('id', activeFullSettlementId);

    if (!error) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === activeFullSettlementId ? { ...inv, status: "settled" as any } : inv,
        ),
      );
    }
    setSettlingId(null);
    setActiveFullSettlementId(null);
  };

  const handleConfirmMilestoneSettlement = async (tdsAmount: number) => {
    if (!activeSettlement) return;
    const { invoiceId, milestoneId, milestoneIndex: currentMilestoneIndex } = activeSettlement;
    setSettlingId(milestoneId);

    // Step 1: Settle the milestone row
    const { error: msError } = await markMilestoneSettled(invoiceId, currentMilestoneIndex, tdsAmount);
    if (msError) console.error("markMilestoneSettled failed:", msError);

    // Step 2: Check if there are more milestones
    const inv = invoices.find((i) => i.id === invoiceId);
    const milestones = inv?.form_data?.milestones ?? [];
    const nextMilestoneIndex = currentMilestoneIndex + 1;
    const hasMoreMilestones = nextMilestoneIndex < milestones.length;

    if (hasMoreMilestones) {
      // Show next milestone modal instead of fully settling
      const nextMilestone = milestones[nextMilestoneIndex];
      setActiveSettlement(null);
      setSettlingId(null);
      setActiveNextMilestone({
        parentInvoiceId: invoiceId,
        nextMilestoneIndex,
        nextMilestoneName: nextMilestone?.title || `Milestone ${nextMilestoneIndex + 1}`,
        totalMilestones: milestones.length,
        sendingNext: false,
      });
      return;
    }

    // No more milestones — settle the full invoice
    const { error: invoiceError } = await markInvoiceSettled(invoiceId);
    if (invoiceError) {
      console.error('Failed to settle invoice:', invoiceError);
      setSettlingId(null);
      return;
    }

    // Update local UI state
    setInvoices((prev) =>
      prev.map((i) => {
        if (i.id !== invoiceId) return i;
        const updatedRelMilestones = (i.milestones || []).map((m) =>
          m.id === milestoneId
            ? { ...m, status: 'SETTLED' as const, tds_amount: tdsAmount }
            : m
        );
        return {
          ...i,
          status: 'settled' as any,
          settled_at: new Date().toISOString(),
          milestones: updatedRelMilestones,
        };
      })
    );

    setActiveSettlement(null);
    setSettlingId(null);
  };

  const handleTriggerNextMilestone = async () => {
    if (!activeNextMilestone) return;
    setActiveNextMilestone((prev) => prev ? { ...prev, sendingNext: true } : null);

    try {
      const res = await fetch("/api/invoice/trigger-next-milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentInvoiceId: activeNextMilestone.parentInvoiceId,
          nextMilestoneIndex: activeNextMilestone.nextMilestoneIndex,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        alert(`Failed to send next milestone: ${json.error}`);
        return;
      }

      // Refresh invoice list to show new child invoice
      const { data: refreshed } = await listInvoices();
      setInvoices(refreshed);
      setActiveNextMilestone(null);
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setActiveNextMilestone((prev) => prev ? { ...prev, sendingNext: false } : null);
    }
  };

  const handleCloseProject = async () => {
    if (!activeNextMilestone) return;
    const { error } = await markInvoiceSettled(activeNextMilestone.parentInvoiceId);
    if (!error) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === activeNextMilestone.parentInvoiceId
            ? { ...i, status: 'settled' as any, settled_at: new Date().toISOString() }
            : i
        )
      );
    }
    setActiveNextMilestone(null);
  };

  const handleRequestNext = async (id: string, milestoneId: string) => {
    setRequestingId(milestoneId);
    try {
      const res = await fetch("/api/invoice/request-milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id, milestoneId }),
      });

      if (res.ok) {
        alert("Milestone request sent to client via email.");
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to send request"}`);
      }
    } catch (err) {
      alert("Failed to send request. Check your connection.");
    } finally {
      setRequestingId(null);
    }
  };

  // Filtered + sorted
  const filtered = useMemo(() => {
    const channelFiltered = ((invoices ?? [])
      .map(inv => ({ ...inv, isOffline: inv.is_offline }))
      .filter(activeChannelTab === "offline" ? offlineOnly : trackedOnly) as unknown as SavedInvoice[]);
    let list = [...channelFiltered];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoice_number?.toLowerCase().includes(q) ||
          i.form_data?.client?.clientName?.toLowerCase().includes(q) ||
          i.shared_to_email?.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all")
      list = list.filter((i) => i.status === statusFilter);

    if (msaFilter !== "all") {
      if (msaFilter === "none") list = list.filter((i) => !i.msa_id);
      else
        list = list.filter(
          (i) => i.msa_id && (i.msa_status ?? "pending") === msaFilter,
        );
    }

    list.sort((a, b) => {
      if (sortKey === "date-desc")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sortKey === "date-asc")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      const amtA = (a.form_data?.lineItems ?? []).reduce(
        (s, i) => s + Number(i.qty) * Number(i.rate),
        0,
      );
      const amtB = (b.form_data?.lineItems ?? []).reduce(
        (s, i) => s + Number(i.qty) * Number(i.rate),
        0,
      );
      return sortKey === "amount-desc" ? amtB - amtA : amtA - amtB;
    });

    return list;
  }, [invoices, search, statusFilter, msaFilter, sortKey, activeChannelTab]);

  const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const handleBulkExport = async () => {
    const selectedInvoices = invoices.filter((inv) => selectedIds.has(inv.id));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Invoices");

    // Define columns
    worksheet.columns = [
      { header: "Invoice #", key: "invoice_number", width: 15 },
      { header: "Issue Date", key: "issue_date", width: 15 },
      { header: "Project/Brief", key: "project", width: 30 },
      { header: "Client Name", key: "client_name", width: 25 },
      { header: "Client GSTIN", key: "client_gstin", width: 20 },
      { header: "Place of Supply", key: "place_of_supply", width: 20 },
      { header: "SAC Code", key: "sac_code", width: 10 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "Base Amount", key: "base_amount", width: 15 },
      { header: "CGST", key: "cgst", width: 12 },
      { header: "SGST", key: "sgst", width: 12 },
      { header: "IGST", key: "igst", width: 12 },
      { header: "Total Tax", key: "total_tax", width: 15 },
      { header: "Grand Total", key: "grand_total", width: 15 },
      { header: "Est. TDS", key: "tds", width: 12 },
      { header: "Net Receivable", key: "net_receivable", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Due Date", key: "due_date", width: 15 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" }, // Indigo-brand color
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    selectedInvoices.forEach((inv) => {
      const fd = inv.form_data || {};
      const client = fd.client || {};
      const agency = fd.agency || {};
      const taxSettings = fd.tax || {};
      
      const amount = inv.grand_total || 0;
      const taxRate = taxSettings.taxRate || 0;
      const tdsRate = taxSettings.tdsRate || 0;
      
      const subtotal = amount / (1 + taxRate / 100);
      const totalTax = amount - subtotal;
      
      const isInterState = agency.agencyState && client.clientState && agency.agencyState !== client.clientState;
      const isInternational = client.clientLocation === "international";
      
      let cgst = 0, sgst = 0, igst = 0;
      if (!isInternational && taxRate > 0) {
        if (isInterState) {
          igst = totalTax;
        } else {
          cgst = totalTax / 2;
          sgst = totalTax / 2;
        }
      }

      const expectedTds = (subtotal * tdsRate) / 100;
      const netPayable = amount - expectedTds;
      const primaryItem = fd.lineItems?.[0] || {};
      
      const dueDateStr = fd.meta?.dueDate;
      const isOverdue = dueDateStr && new Date(dueDateStr) < today && inv.status !== "SETTLED";

      const row = worksheet.addRow({
        invoice_number: inv.invoice_number,
        issue_date: fmtDate(inv.created_at),
        project: primaryItem.description || "—",
        client_name: client.clientName || "—",
        client_gstin: client.clientGstin || "—",
        place_of_supply: client.clientState || client.clientCountry || "—",
        sac_code: primaryItem.sacCode || "9983",
        currency: client.clientCurrency || "INR",
        base_amount: Number(subtotal.toFixed(2)),
        cgst: Number(cgst.toFixed(2)),
        sgst: Number(sgst.toFixed(2)),
        igst: Number(igst.toFixed(2)),
        total_tax: Number(totalTax.toFixed(2)),
        grand_total: Number(amount.toFixed(2)),
        tds: Number(expectedTds.toFixed(2)),
        net_receivable: Number(netPayable.toFixed(2)),
        status: inv.status,
        due_date: dueDateStr ? fmtDate(dueDateStr) : "—",
      });

      // Style Late Payments
      if (isOverdue) {
        row.getCell("status").font = { color: { argb: "FFFF0000" }, bold: true };
        row.getCell("due_date").font = { color: { argb: "FFFF0000" }, bold: true };
      }
    });

    // Auto-width adjustment
    worksheet.columns.forEach((column) => {
      let maxColumnLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxColumnLength) {
          maxColumnLength = columnLength;
        }
      });
      column.width = maxColumnLength < 12 ? 12 : maxColumnLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Invoices_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const handleConfirmBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);

    // 1. Fetch all milestone IDs for selected invoices
    const { data: milestones } = await supabase
      .from("invoice_milestones")
      .select("id")
      .in("invoice_id", ids);

    if (milestones && milestones.length > 0) {
      const milestoneIds = milestones.map(m => m.id);
      // 2. Delete line items for these milestones
      await supabase
        .from("invoice_line_items")
        .delete()
        .in("milestone_id", milestoneIds);
    }

    // 3. Delete milestones
    await supabase
      .from("invoice_milestones")
      .delete()
      .in("invoice_id", ids);

    // 3b. Delete notifications referencing these invoices
    try {
      await supabase.from("notifications").delete().in("invoice_id", ids);
    } catch (e) { /* table may not exist */ }

    // 3c. Delete activity log entries referencing these invoices
    try {
      await supabase.from("activity_log").delete().in("entity_id", ids);
    } catch (e) { /* table may not exist */ }

    // 3d. Delete share tokens or share records if table exists
    try {
    } catch (e) { /* table may not exist */ }

    // 3e. Delete child invoices referencing these invoices
    try {
      await supabase.from("invoices").delete().in("parent_invoice_id", ids);
    } catch (e) { /* no children */ }

    // 4. Delete invoices themselves
    const { error } = await supabase.from("invoices").delete().in("id", ids);

    if (!error) {
      setInvoices((prev) => prev.filter((inv) => !selectedIds.has(inv.id)));
      setSelectedIds(new Set());
    } else {
      alert("Error deleting some invoices. Please try again.");
    }
    setIsBulkDeleting(false);
  };

  // Stats
  const stats = useMemo(() => {
    const trackedForStats = ((invoices ?? [])
      .map(inv => ({ ...inv, isOffline: inv.is_offline }))
      .filter(trackedOnly) as unknown as SavedInvoice[]);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const endOf7Days = new Date(today);
    endOf7Days.setDate(today.getDate() + 7);
    
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const getAmount = (inv: SavedInvoice) => {
      if (inv.grand_total !== undefined && inv.grand_total !== null) return inv.grand_total;
      const items = inv.form_data?.lineItems ?? [];
      return items.reduce((s, i) => s + Number(i.qty ?? 0) * Number(i.rate ?? 0), 0);
    };

    const isPending = (status: string) => status === "SENT" || status === "PARTIAL" || status === "SAVED";

    let outstanding = 0;
    let overdue = 0;
    let dueThisWeek = 0;
    let awaitingMsa = 0;
    let settledThisMonth = 0;
    let totalSettled = 0;
    let totalProject = 0;

    trackedForStats.forEach(inv => {
      const amount = getAmount(inv);
      const isIssued = isPending(inv.status);
      
      if (isIssued) {
        outstanding += amount;
        
        if (inv.form_data?.meta?.dueDate) {
          const dueDate = new Date(inv.form_data.meta.dueDate);
          if (dueDate < today) {
            overdue += amount;
          } else if (dueDate <= endOf7Days) {
            dueThisWeek += amount;
          }
        }
      }

      if ((inv.msa_status ?? "pending") === "pending") {
        awaitingMsa++;
      }

      if (inv.status === "SETTLED") {
        totalSettled += amount;
        if (inv.settled_at) {
          const settledDate = new Date(inv.settled_at);
          if (settledDate >= startOfCurrentMonth) {
            settledThisMonth += amount;
          }
        }
      }

      if (!inv.parent_invoice_id) {
        totalProject += amount;
      }
    });

    const activeInvoiceCount = trackedForStats.filter(inv => !inv.parent_invoice_id).length;
    const collectionPercent = totalProject > 0 ? Math.round((totalSettled / totalProject) * 100) : 0;

    return {
      outstanding,
      overdue,
      dueThisWeek,
      awaitingMsa,
      settledThisMonth,
      totalSettled,
      totalProject,
      collectionPercent,
      activeInvoiceCount,
      msaRejected: trackedForStats.filter((i) => i.msa_response === "REVISION ASKED").length,
    };
  }, [invoices]);

  /* ── Unauthenticated ── */
  if (authenticated === false) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className="mx-auto max-w-lg px-4 pt-16 text-center">
            <MotionReveal preset="fade-up">
              <span className="inline-flex h-14 w-14 items-center justify-center border-2 border-[#111118] bg-[color:var(--bg-surface-soft)]">
                <DocumentSparkIcon className="h-6 w-6 text-[color:var(--text-secondary)]" />
              </span>
              <h1 className="mt-5 text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                Sign in to view your invoices
              </h1>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Your invoices are stored securely. Please log in to access your
                history.
              </p>
              <Link
                href="/login"
                className={`mt-5 inline-block ${getAppButtonClass({ variant: "primary", size: "md" })}`}
              >
                Log in
              </Link>
            </MotionReveal>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={appPageShellClass}>
      <AppHeader />

      <section className={`${appPageContainerClass} pt-8 sm:pt-12 pb-24`}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
          {/* Header */}
          <MotionReveal className="mb-8" preset="fade-up">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px] font-syne">
                  Invoices
                </h1>
                {invoices.length > 0 && (
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}{" "}
                    total
                  </p>
                )}
              </div>
            </div>
          </MotionReveal>

          {/* Stat snapshot */}
          {!loading && invoices.length > 0 && (
            <MotionReveal preset="fade-up" className="mb-6">
              <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] px-5 py-4">
                {/* Main row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Hero metric — left */}
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)]">
                      {formatCurrency(stats.outstanding)}
                    </span>
                    <span className="text-[12px] text-[color:var(--text-muted)]">
                      outstanding · {stats.activeInvoiceCount} {stats.activeInvoiceCount === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </div>

                  {/* Secondary metrics — right */}
                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Settled */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-[4px] h-[20px] bg-green-500 shrink-0" />
                      <div>
                        <p className="text-[10px] leading-tight text-[color:var(--text-muted)]">Settled</p>
                        <p className="text-[14px] font-semibold leading-tight text-[color:var(--text-primary)]">
                          {formatCurrency(stats.totalSettled)}
                        </p>
                      </div>
                    </div>

                    {/* Overdue */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-[4px] h-[20px] bg-red-500 shrink-0" />
                      <div>
                        <p className="text-[10px] leading-tight text-[color:var(--text-muted)]">Overdue</p>
                        <p className="text-[14px] font-semibold leading-tight text-[color:var(--text-primary)]">
                          {formatCurrency(stats.overdue)}
                        </p>
                      </div>
                    </div>

                    {/* Due this week */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-[4px] h-[20px] bg-amber-400 shrink-0" />
                      <div>
                        <p className="text-[10px] leading-tight text-[color:var(--text-muted)]">Due this week</p>
                        <p className="text-[14px] font-semibold leading-tight text-[color:var(--text-primary)]">
                          {formatCurrency(stats.dueThisWeek)}
                        </p>
                      </div>
                    </div>

                    {/* Settled this month */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      <div className="w-[4px] h-[20px] bg-[#4F46E5] shrink-0" />
                      <div>
                        <p className="text-[10px] leading-tight text-[color:var(--text-muted)]">This month</p>
                        <p className="text-[14px] font-semibold leading-tight text-[color:var(--text-primary)]">
                          {formatCurrency(stats.settledThisMonth)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full h-[4px] bg-[color:var(--bg-surface-muted)] overflow-hidden">
                    <div
                      className="h-full bg-[#4F46E5] transition-all duration-500"
                      style={{ width: `${stats.collectionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </MotionReveal>
          )}

          {/* MSA rejection notification */}
          {stats.msaRejected > 0 && (
            <MotionReveal className="mb-4" preset="fade-up">
              <div className="flex items-center gap-3 border border-[color:var(--state-warning-border)] bg-[color:var(--state-warning-bg)] px-4 py-3">
                <span className="text-lg">⚠️</span>
                <p className="text-sm font-medium text-[color:var(--state-warning-text)]">
                  {stats.msaRejected} invoice
                  {stats.msaRejected !== 1 ? "s have" : " has"} a rejected MSA —
                  reach out to your client.
                </p>
              </div>
            </MotionReveal>
          )}

          {/* Main content */}
          {loadError ? (
            <div className="flex flex-col items-center gap-4 border border-[color:var(--state-warning-border)] bg-[color:var(--state-warning-bg)] px-6 py-12 text-center">
              <p className="text-lg font-semibold text-[color:var(--text-primary)]">
                Could not load your invoices
              </p>
              <p className="max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
                {loadError} Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={getAppButtonClass({ variant: "primary" })}
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <p className="text-sm text-[color:var(--text-secondary)]">Loading invoices…</p>
            </div>
          ) : invoices.length === 0 ? (
            <MotionReveal preset="fade-up">
              <div className="py-16 px-8 text-center border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-lg)]">
                <div className="inline-flex h-16 w-16 items-center justify-center border-2 border-[#111118] bg-[#BEFF00] shadow-[var(--brutal-shadow-md)] mb-6">
                  <span className="text-2xl font-black text-[#111118]">L</span>
                </div>
                <h2 className="text-xl font-bold uppercase text-[#111118] mb-2">No invoices yet</h2>
                <p className="text-[13px] text-[color:var(--text-muted)] mb-6 max-w-md mx-auto">
                  Create your first invoice and get paid faster. Lance handles the tax math, legal terms, and compliance — you just fill in the work.
                </p>
                <a
                  href="/invoice/new"
                  className="inline-flex items-center gap-2 border-2 border-[#111118] bg-[#BEFF00] px-6 py-3 text-[13px] font-bold uppercase text-[#111118] shadow-[var(--brutal-shadow-md)] hover:shadow-[var(--brutal-shadow-lg)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  Create First Invoice →
                </a>
              </div>
            </MotionReveal>
          ) : (
            <MotionReveal preset="fade-up">
              <div
                className="mb-4 inline-flex items-center"
                style={{
                  border: "2px solid #111118",
                  boxShadow: "4px 4px 0 #111118",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveChannelTab("tracked")}
                  className="px-5 py-3 text-[12px] font-black uppercase tracking-wider transition-colors"
                  style={{
                    backgroundColor: activeChannelTab === "tracked" ? "#BEFF00" : "#FFFFFF",
                    color: "#111118",
                    borderRight: "2px solid #111118",
                  }}
                >
                  Tracked ({(invoices ?? []).map(inv => ({ ...inv, isOffline: inv.is_offline })).filter(trackedOnly).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannelTab("offline")}
                  className="px-5 py-3 text-[12px] font-black uppercase tracking-wider transition-colors"
                  style={{
                    backgroundColor: activeChannelTab === "offline" ? "#BEFF00" : "#FFFFFF",
                    color: "#111118",
                  }}
                >
                  Offline ({(invoices ?? []).map(inv => ({ ...inv, isOffline: inv.is_offline })).filter(offlineOnly).length})
                </button>
              </div>
              <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] overflow-visible">
                {/* Filter bar */}
                <div className="border-b-2 border-[#111118] bg-[color:var(--bg-surface-soft)] px-4 py-3">
                  <FilterBar
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    msaFilter={msaFilter}
                    setMsaFilter={setMsaFilter}
                    sortKey={sortKey}
                    setSortKey={setSortKey}
                    search={search}
                    setSearch={setSearch}
                    total={filtered.length}
                  />
                </div>

              {filtered.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-[color:var(--text-muted)]">
                  No invoices match your filters.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setMsaFilter("all");
                    }}
                    className="font-semibold text-[color:var(--text-secondary)] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="overflow-visible">
                  <table className="w-full min-w-full sm:min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                        <th className="px-4 py-2.5 w-10 shrink-0">
                          <input
                            ref={masterCheckboxRef}
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-[#111118] text-indigo-brand focus:ring-indigo-brand cursor-pointer"
                          />
                        </th>
                        {[
                          "Invoice",
                          "Client",
                          "Amount",
                          "Status",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className={cn(
                              "px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]",
                              (h === "Actions" || h === "Amount") && "text-right",
                              (h === "Status" || h === "Actions") && "hidden sm:table-cell"
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv) => (
                        <InvoiceRow
                          key={inv.id}
                          invoice={inv}
                          viewCount={receipts[inv.id]?.count ?? 0}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMarkSettled={handleMarkSettled}
                          onRequestNext={handleRequestNext}
                          deletingId={deletingId}
                          settlingId={settlingId}
                          requestingId={requestingId}
                          isSelected={selectedIds.has(inv.id)}
                          onToggleSelect={toggleSelect}
                          onToggleTracking={handleToggleTracking}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </MotionReveal>
          )}
          {/* Settlement Modal */}
          <SettlementModal
            isOpen={!!activeSettlement}
            onClose={() => setActiveSettlement(null)}
            onConfirm={handleConfirmMilestoneSettlement}
            milestoneName={activeSettlement?.name || ""}
            subtotal={activeSettlement?.subtotal || 0}
            currencySymbol={activeSettlement?.symbol || "₹"}
            isSubmitting={!!settlingId}
          />

          <InvoiceSettlementConfirmModal
            isOpen={!!activeFullSettlementId}
            onClose={() => setActiveFullSettlementId(null)}
            onConfirm={handleConfirmFullSettlement}
            isSubmitting={!!settlingId && settlingId === activeFullSettlementId}
          />

          <InvoiceDeleteConfirmModal
            isOpen={!!deleteTargetId}
            onClose={() => setDeleteTargetId(null)}
            onConfirm={handleConfirmDelete}
            count={1}
            isSubmitting={!!deletingId}
          />

          <InvoiceDeleteConfirmModal
            isOpen={showBulkDeleteConfirm}
            onClose={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleConfirmBulkDelete}
            count={selectedIds.size}
            isSubmitting={isBulkDeleting}
          />

          {activeNextMilestone && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
              <MotionReveal preset="fade-up" className="w-full max-w-md">
                <div className="border-2 border-[#111118] bg-white p-6 shadow-[var(--brutal-shadow-lg)]">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">🎉</span>
                    <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                      Milestone settled!
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)] leading-relaxed mb-6">
                    Your project has {activeNextMilestone.totalMilestones} milestones. Based on your invoice, Lance noticed you have {activeNextMilestone.totalMilestones - activeNextMilestone.nextMilestoneIndex} more milestone{activeNextMilestone.totalMilestones - activeNextMilestone.nextMilestoneIndex > 1 ? 's' : ''} remaining. Would you like to send <strong>{activeNextMilestone.nextMilestoneName}</strong> to the client now?
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseProject}
                      className={`flex-1 ${getAppButtonClass({ variant: "ghost", size: "md" })}`}
                    >
                      Close Project
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerNextMilestone}
                      disabled={activeNextMilestone.sendingNext}
                      className={`flex-[2] ${getAppButtonClass({ variant: "primary", size: "md" })}`}
                    >
                      {activeNextMilestone.sendingNext
                        ? "Sending…"
                        : `Send ${activeNextMilestone.nextMilestoneName} Invoice`}
                    </button>
                  </div>
                </div>
              </MotionReveal>
            </div>
          )}
        </div>
      </div>
    </section>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-[9999] flex items-center gap-6 border-2 border-[#111118] bg-white px-6 py-4 shadow-[var(--brutal-shadow-lg)]"
          >
            <div className="flex items-center gap-3 pr-6 border-r border-[color:var(--border-subtle)]">
              <div className="flex h-6 w-6 items-center justify-center bg-[#111118] text-[11px] font-bold text-[#BEFF00] tabular-nums">
                {selectedIds.size}
              </div>
              <span className="text-sm font-semibold text-[color:var(--text-secondary)] whitespace-nowrap">Selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-soft)] transition-colors whitespace-nowrap"
              >
                <Download size={16} /> Export All
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#FF5C00] hover:bg-[color:var(--state-danger-bg)] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Trash size={16} /> {isBulkDeleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
