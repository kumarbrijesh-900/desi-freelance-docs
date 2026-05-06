"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon, ChevronLeftIcon } from "@/components/ui/app-icons";
import {
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import { getAppButtonClass, cn } from "@/lib/ui-foundation";
import {
  listInvoices,
  deleteInvoice,
  markInvoiceSettled,
  markMilestoneSettled,
  requestNextMilestone,
  getCurrentUserId,
  getReadReceiptsBatch,
  type SavedInvoice,
  type MsaResponse,
} from "@/lib/supabase/invoices";
import { supabase } from "@/lib/supabase/client";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
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

/* ─── Badge components ─────────────────────────── */

function StatusBadge({ status, dueDate }: { status: string; dueDate?: string }) {
  const normalized = status.toLowerCase();
  const isDraft = normalized === "draft";
  const isFinalized = normalized === "finalized";
  const isSettled = normalized === "settled";

  let isOverdue = false;
  if (isFinalized && dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      isOverdue = true;
    }
  }

  if (isOverdue)
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700">
        Overdue
      </span>
    );

  if (isSettled)
    return (
      <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--state-success-text)]">
        Paid
      </span>
    );

  if (isFinalized)
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
        Sent
      </span>
    );

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] text-[color:var(--text-muted)]`}
    >
      Draft
    </span>
  );
}

function MsaBadge({
  msaId,
  status,
}: {
  msaId: string | null;
  status: MsaResponse;
}) {
  if (!msaId)
    return (
      <span className="text-[12px] text-[color:var(--text-muted)]">—</span>
    );

  if (status === "proposed" || status === "rejected")
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 animate-pulse">
        Negotiating
      </span>
    );

  if (status === "accepted")
    return (
      <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--state-success-text)]">
        ✓ Accepted
      </span>
    );

  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
      Pending
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
        className="h-8 flex-1 min-w-[180px] rounded-md border border-[color:var(--border-default)] bg-white px-3 text-[13px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] outline-none focus:border-[color:var(--color-lime-700)] transition-colors"
      />

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        className="h-8 rounded-md border border-[color:var(--border-default)] bg-white px-2 text-[13px] text-[color:var(--text-primary)] outline-none"
      >
        <option value="all">All Status</option>
        <option value="DRAFT">Draft</option>
        <option value="SAVED">Saved</option>
        <option value="SENT">Sent</option>
        <option value="PARTIAL">Partial</option>
        <option value="SETTLED">Settled</option>
      </select>

      {/* MSA filter */}
      <select
        value={msaFilter}
        onChange={(e) => setMsaFilter(e.target.value as MsaFilter)}
        className="h-8 rounded-md border border-[color:var(--border-default)] bg-white px-2 text-[13px] text-[color:var(--text-primary)] outline-none"
      >
        <option value="all">All MSA</option>
        <option value="none">No MSA</option>
        <option value="pending">MSA Pending</option>
        <option value="accepted">MSA Accepted</option>
        <option value="rejected">Revision Asked</option>
      </select>

      {/* Sort */}
      <select
        value={sortKey}
        onChange={(e) => setSortKey(e.target.value as SortKey)}
        className="h-8 rounded-md border border-[color:var(--border-default)] bg-white px-2 text-[13px] text-[color:var(--text-primary)] outline-none"
      >
        <option value="date-desc">Newest First</option>
        <option value="date-asc">Oldest First</option>
        <option value="amount-desc">Amount ↓</option>
        <option value="amount-asc">Amount ↑</option>
      </select>

      <span className="text-[12px] text-[color:var(--text-muted)]">
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
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const lineItems = invoice.form_data?.lineItems ?? [];
  const hasRelationalMilestones = (invoice.milestones ?? []).length > 0;
  const hasLegacyMilestones = lineItems.some(i => i.is_milestone_header);
  const hasMilestones = hasRelationalMilestones || hasLegacyMilestones;

  const canSettle =
    invoice.status.toLowerCase() === "finalized";

  return (
    <>
      <tr 
        className={cn(
          "border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-surface-soft)] transition-colors group cursor-pointer",
          isExpanded && "bg-[color:var(--bg-surface-soft)]/50"
        )}
        onClick={() => invoice.parent_invoice_id ? onView(invoice) : onEdit(invoice)}
      >
        {/* Invoice # */}
        <td className="px-4 py-3 text-[13px] font-semibold text-[color:var(--text-primary)] whitespace-nowrap">
          <div className="flex items-center gap-2">
            {hasMilestones && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md hover:bg-[color:var(--bg-surface-muted)] transition-all duration-200 text-[color:var(--text-muted)]",
                  isExpanded ? "rotate-90 text-[color:var(--text-primary)]" : "rotate-0"
                )}
              >
                ›
              </button>
            )}
            {invoice.invoice_number}
          </div>
        </td>

      {/* Date */}
      <td className="px-4 py-3 text-[12px] text-[color:var(--text-secondary)] whitespace-nowrap">
        {fmtDate(invoice.created_at)}
        {invoice.form_data?.meta?.dueDate ? (
          <div className="text-[11px] text-[color:var(--text-muted)]">
            Due {fmtDate(invoice.form_data.meta.dueDate)}
          </div>
        ) : null}
      </td>

      {/* Client */}
      <td className="px-4 py-3">
        <div className="text-[13px] font-medium text-[color:var(--text-primary)] truncate max-w-[160px]">
          {invoice.form_data?.client?.clientName || (
            <span className="text-[color:var(--text-muted)]">—</span>
          )}
        </div>
        {invoice.shared_to_email && (
          <div className="text-[11px] text-[color:var(--text-muted)] truncate max-w-[160px]">
            {invoice.shared_to_email}
          </div>
        )}
      </td>

      {/* Work Type */}
      <td className="px-4 py-3 text-[12px] text-[color:var(--text-secondary)] max-w-[140px]">
        <span className="truncate block">{getWorkType(invoice)}</span>
      </td>

      {/* Amount */}
      <td className="px-4 py-3 text-[13px] font-semibold text-[color:var(--text-primary)] whitespace-nowrap tabular-nums">
        {fmtAmount(invoice)}
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <StatusBadge status={invoice.status} dueDate={invoice.form_data?.meta?.dueDate} />
          <ViewsBadge count={viewCount} />
        </div>
      </td>

      {/* MSA Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <MsaBadge
          msaId={invoice.msa_id}
          status={invoice.msa_status ?? "pending"}
        />
      </td>

        {/* Actions */}
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {canSettle && !hasMilestones && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMarkSettled(invoice.id); }}
                disabled={settlingId === invoice.id}
                className={getAppButtonClass({ variant: "primary", size: "sm" })}
              >
                {settlingId === invoice.id ? "…" : "Mark as Settled"}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onView(invoice); }}
              className={getAppButtonClass({ variant: "secondary", size: "sm" })}
            >
              View
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(invoice); }}
              className={getAppButtonClass({ variant: "secondary", size: "sm" })}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(invoice.id);
              }}
              disabled={deletingId === invoice.id}
              className={getAppButtonClass({ variant: "destructive-lite", size: "sm" })}
            >
              {deletingId === invoice.id ? "…" : "Delete"}
            </button>
          </div>
        </td>
      </tr>

      {/* Milestone Accordion Rows */}
      {isExpanded && hasMilestones && (
        <>
          {(invoice.milestones ?? []).length > 0 ? (
            // Render from relational milestones if available
            invoice.milestones!.map((m: any, idx: number) => {
              const isSettled = m.status === "SETTLED";
              const currency = invoice.form_data?.client?.clientCurrency || "INR";
              const symbol = currency === "USD" ? "$" : "₹";
              
              return (
                <tr key={m.id} className="bg-[color:var(--bg-surface-soft)]/30 border-b border-[color:var(--border-subtle)]">
                  <td className="pl-12 py-3 text-[11px] font-medium text-[color:var(--text-muted)] italic">
                    ↳ {m.description}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[color:var(--text-muted)]">
                    Milestone Stage
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[color:var(--text-muted)]">
                    —
                  </td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[color:var(--text-secondary)] tabular-nums">
                    {symbol}{(m.amount ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      isSettled 
                        ? "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)] border border-[color:var(--state-success-border)]" 
                        : "bg-[color:var(--bg-surface-muted)] text-[color:var(--text-muted)] border border-[color:var(--border-subtle)]"
                    )}>
                      {isSettled ? "Settled" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {!isSettled && (
                        <button
                          type="button"
                          onClick={() => onMarkSettled(invoice.id, m.id)}
                          className="text-[10px] font-bold text-[color:var(--color-lime-700)] hover:underline"
                        >
                          Mark Settled
                        </button>
                      )}
                      {isSettled && idx < (invoice.milestones ?? []).length - 1 && (
                        <button
                          type="button"
                          disabled={requestingId === invoice.milestones![idx + 1]?.id}
                          onClick={() => onRequestNext(invoice.id, invoice.milestones![idx + 1]?.id)}
                          className="text-[10px] font-bold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] disabled:opacity-50"
                        >
                          {requestingId === invoice.milestones![idx + 1]?.id ? "Requesting…" : "Request Next"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            // Fallback to form_data logic
            lineItems.map((item, idx) => {
              if (!item.is_milestone_header) return null;
              
              let subtotal = 0;
              for (let i = idx + 1; i < lineItems.length; i++) {
                if (lineItems[i].is_milestone_header) break;
                subtotal += Number(lineItems[i].qty ?? 0) * Number(lineItems[i].rate ?? 0);
              }
              
              const isSettled = item.milestone_status === "SETTLED";
              const currency = invoice.form_data.client?.clientCurrency || "INR";
              const symbol = currency === "USD" ? "$" : "₹";

              return (
                <tr key={item.id} className="bg-[color:var(--bg-surface-soft)]/30 border-b border-[color:var(--border-subtle)]">
                  <td className="pl-12 py-3 text-[11px] font-medium text-[color:var(--text-muted)] italic">
                    ↳ {item.description}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[color:var(--text-muted)]">
                    Milestone Stage
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[color:var(--text-muted)]">
                    —
                  </td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[color:var(--text-secondary)] tabular-nums">
                    {symbol}{subtotal.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      isSettled 
                        ? "bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)] border border-[color:var(--state-success-border)]" 
                        : "bg-[color:var(--bg-surface-muted)] text-[color:var(--text-muted)] border border-[color:var(--border-subtle)]"
                    )}>
                      {isSettled ? "Settled" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {!isSettled && (
                        <button
                          type="button"
                          onClick={() => onMarkSettled(invoice.id, item.id)}
                          className="text-[10px] font-bold text-[color:var(--color-lime-700)] hover:underline"
                        >
                          Mark Settled
                        </button>
                      )}
                      {isSettled && idx < lineItems.filter(i => i.is_milestone_header).length - 1 && (
                        <button
                          type="button"
                          disabled={requestingId === item.id}
                          onClick={() => onRequestNext(invoice.id, lineItems[idx + 1]?.id)}
                          className="text-[10px] font-bold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] disabled:opacity-50"
                        >
                          {requestingId === lineItems[idx + 1]?.id ? "Requesting…" : "Request Next"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <MotionReveal preset="fade-up" className="w-full max-w-md">
        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-6 shadow-2xl">
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

export default function InvoiceHistoryPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [receipts, setReceipts] = useState<
    Record<string, { count: number; lastViewed: string | null }>
  >({});
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [msaFilter, setMsaFilter] = useState<MsaFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

  useEffect(() => {
    async function init() {
      const userId = await getCurrentUserId();
      if (!userId) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      setAuthenticated(true);

      const { data } = await listInvoices();
      setInvoices(data);

      // Batch-load read receipts
      const sharedIds = data.filter((i) => i.share_token).map((i) => i.id);
      if (sharedIds.length) {
        const batch = await getReadReceiptsBatch(sharedIds);
        setReceipts(batch);
      }
      setLoading(false);
    }
    init();
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this invoice? This cannot be undone.")) {
      return;
    }
    setDeletingId(id);
    const { error } = await deleteInvoice(id);
    if (!error) setInvoices((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
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
    const { invoiceId, milestoneId } = activeSettlement;
    setSettlingId(milestoneId);

    // Step 1: Settle the milestone row
    await markMilestoneSettled(invoiceId, milestoneId, tdsAmount).catch((e) =>
      console.warn('markMilestoneSettled skipped:', e)
    );

    // Step 2: Check if there are more milestones
    const inv = invoices.find((i) => i.id === invoiceId);
    const milestones = inv?.form_data?.milestones ?? [];
    const currentMilestoneIndex = activeSettlement.milestoneIndex;
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
    let list = [...invoices];

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
  }, [invoices, search, statusFilter, msaFilter, sortKey]);

  // Stats
  const stats = useMemo(() => {
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

    invoices.forEach(inv => {
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

      if (inv.status === "SETTLED" && inv.settled_at) {
        const settledDate = new Date(inv.settled_at);
        if (settledDate >= startOfCurrentMonth) {
          settledThisMonth += amount;
        }
      }
    });

    return {
      outstanding,
      overdue,
      dueThisWeek,
      awaitingMsa,
      settledThisMonth,
      msaRejected: invoices.filter((i) => i.msa_response === "REVISION ASKED").length,
    };
  }, [invoices]);

  /* ── Unauthenticated ── */
  if (authenticated === false) {
    return (
      <main className={appPageShellClass}>
        <AppHeader rightSlot={<LogoutButton />} />
        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className="mx-auto max-w-lg px-4 pt-16 text-center">
            <MotionReveal preset="fade-up">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                <DocumentSparkIcon className="h-6 w-6 text-[color:var(--text-secondary)]" />
              </span>
              <h1 className="mt-5 text-2xl font-bold text-[color:var(--text-primary)]">
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
      <AppHeader rightSlot={<LogoutButton />} />

      <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
        <div className="mx-auto max-w-[1200px] px-4">
          {/* Header */}
          <MotionReveal className="mb-6" preset="fade-up">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[28px]">
                  Invoices
                </h1>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}{" "}
                  total
                </p>
              </div>
              <Link
                href="/invoice/new"
                className={getAppButtonClass({
                  variant: "primary",
                  size: "sm",
                })}
              >
                + New Invoice
              </Link>
            </div>
          </MotionReveal>

          {/* Stat cards */}
          {!loading && invoices.length > 0 && (
            <MotionReveal
              className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
              preset="fade-up"
            >
              {[
                {
                  label: "Outstanding",
                  value: `₹${stats.outstanding.toLocaleString("en-IN")}`,
                  color: "text-[color:var(--text-primary)]",
                  accent: "bg-[color:var(--text-primary)]",
                  icon: "⏳",
                },
                {
                  label: "Overdue",
                  value: `₹${stats.overdue.toLocaleString("en-IN")}`,
                  color: "text-red-600",
                  accent: "bg-red-500",
                  icon: "⚠️",
                },
                {
                  label: "Due This Week",
                  value: `₹${stats.dueThisWeek.toLocaleString("en-IN")}`,
                  color: "text-amber-600",
                  accent: "bg-amber-400",
                  icon: "📅",
                },
                {
                  label: "Awaiting MSA",
                  value: stats.awaitingMsa,
                  color: "text-amber-700",
                  accent: "bg-amber-200",
                  icon: "✍️",
                },
                {
                  label: "Settled This Month",
                  value: `₹${stats.settledThisMonth.toLocaleString("en-IN")}`,
                  color: "text-[color:var(--state-success-text)]",
                  accent: "bg-[color:var(--state-success-border)]",
                  icon: "💰",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="relative overflow-hidden rounded-lg border border-[color:var(--border-subtle)] bg-white p-3 shadow-sm transition-all hover:shadow-md"
                >
                  <div
                    className={cn("absolute left-0 top-0 h-1 w-full", s.accent)}
                  />
                  <div className="relative z-10">
                    <div
                      className={`text-xl font-bold tabular-nums ${s.color}`}
                    >
                      {s.value}
                    </div>
                    <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      {s.label}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 text-2xl opacity-[0.03] grayscale pointer-events-none select-none">
                    {s.icon}
                  </div>
                </div>
              ))}
            </MotionReveal>
          )}

          {/* MSA rejection notification */}
          {stats.msaRejected > 0 && (
            <MotionReveal className="mb-4" preset="fade-up">
              <div className="flex items-center gap-3 rounded-lg border border-[color:var(--state-warning-border)] bg-[color:var(--state-warning-bg)] px-4 py-3">
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
          {loading ? (
            <div className="flex justify-center py-20">
              <p className="text-sm text-[color:var(--text-secondary)]">Loading invoices…</p>
            </div>
          ) : invoices.length === 0 ? (
            <MotionReveal preset="fade-up">
              <div className="flex flex-col items-center gap-5 px-6 py-20 text-center rounded-xl border border-[color:var(--border-default)] bg-white shadow-sm">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                  <DocumentSparkIcon className="h-6 w-6 text-[color:var(--text-secondary)]" />
                </span>
                <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
                  No invoices yet
                </h2>
                <p className="max-w-sm text-sm text-[color:var(--text-secondary)]">
                  Create your first invoice and send it to a client.
                </p>
                <Link
                  href="/invoice/new"
                  className={getAppButtonClass({
                    variant: "primary",
                    size: "md",
                  })}
                >
                  Create Invoice
                </Link>
              </div>
            </MotionReveal>
          ) : (
            <MotionReveal preset="fade-up">
              <div className="rounded-xl border border-[color:var(--border-default)] bg-white shadow-sm overflow-hidden">
                {/* Filter bar */}
                <div className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-4 py-3">
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                        {[
                          "Invoice #",
                          "Date / Due",
                          "Client",
                          "Work Type",
                          "Amount",
                          "Status",
                          "MSA STATUS",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className={cn(
                              "px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]",
                              h === "" && "text-right"
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

          {activeNextMilestone && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <MotionReveal preset="fade-up" className="w-full max-w-md">
                <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-6 shadow-2xl">
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
      </section>
    </main>
  );
}
