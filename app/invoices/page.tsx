"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon, ChevronLeftIcon } from "@/components/ui/app-icons";
import { appPageContainerClass, appPageSectionClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAppButtonClass } from "@/lib/ui-foundation";
import {
  listInvoices,
  deleteInvoice,
  markInvoiceSettled,
  getCurrentUserId,
  getReadReceiptsBatch,
  type SavedInvoice,
  type MsaResponse,
} from "@/lib/supabase/invoices";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";

/* ─── Helpers ────────────────────────────────────── */

const PREVIEW_KEY = "invoice-preview-data";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAmount(inv: SavedInvoice) {
  const items = inv.form_data?.lineItems ?? [];
  const subtotal = items.reduce((s, i) => s + (i.qty ?? 0) * (i.rate ?? 0), 0);
  if (!subtotal) return "—";
  const currency = inv.form_data?.client?.clientCurrency || "INR";
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "₹";
  return `${symbol}${subtotal.toLocaleString("en-IN")}`;
}

function getWorkType(inv: SavedInvoice) {
  const items = inv.form_data?.lineItems ?? [];
  if (!items.length) return "—";
  const types = [...new Set(items.map((i) => i.type).filter(Boolean))];
  return types.slice(0, 2).join(", ") + (types.length > 2 ? " …" : "");
}

/* ─── Badge components ─────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const fin = status === "finalized";
  const set = status === "settled";
  const ovr = status === "overdue";
  
  if (set) return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--state-success-text)]">
      Settled
    </span>
  );
  
  if (ovr) return (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700">
      Overdue
    </span>
  );

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
      fin
        ? "border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]"
        : "border-[color:var(--state-info-border)] bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)]"
    }`}>
      {fin ? "Finalized" : "Draft"}
    </span>
  );
}

function MsaBadge({ msaId, response }: { msaId: string | null; response: MsaResponse }) {
  if (!msaId) return <span className="text-[12px] text-[color:var(--text-muted)]">—</span>;
  
  if (response === "negotiating") return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 animate-pulse">
      Action Required
    </span>
  );

  if (response === "accepted") return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--state-success-text)]">✓ Accepted</span>
  );
  if (response === "rejected") return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--state-warning-border)] bg-[color:var(--state-warning-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--state-warning-text)]">✕ Rejected</span>
  );
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">Pending</span>
  );
}

function ViewsBadge({ count, lastViewed }: { count: number; lastViewed: string | null }) {
  if (!count) return <span className="text-[12px] text-[color:var(--text-muted)]">—</span>;
  return (
    <span title={lastViewed ? `Last viewed ${fmtDate(lastViewed)}` : undefined}
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--text-secondary)]">
      👁 {count}
    </span>
  );
}

/* ─── Filter/Sort bar ──────────────────────────── */

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
type StatusFilter = "all" | "draft" | "finalized" | "settled" | "overdue";
type MsaFilter = "all" | "pending" | "accepted" | "rejected" | "negotiating" | "none";

function FilterBar({
  statusFilter, setStatusFilter,
  msaFilter, setMsaFilter,
  sortKey, setSortKey,
  search, setSearch,
  total,
}: {
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void;
  msaFilter: MsaFilter; setMsaFilter: (v: MsaFilter) => void;
  sortKey: SortKey; setSortKey: (v: SortKey) => void;
  search: string; setSearch: (v: string) => void;
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
        <option value="draft">Draft</option>
        <option value="finalized">Finalized</option>
        <option value="settled">Settled</option>
        <option value="overdue">Overdue</option>
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
        <option value="rejected">MSA Rejected</option>
        <option value="negotiating">Negotiating</option>
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

      <span className="text-[12px] text-[color:var(--text-muted)]">{total} result{total !== 1 ? "s" : ""}</span>
    </div>
  );
}

/* ─── Table row ────────────────────────────────── */

function InvoiceRow({
  invoice, viewCount, lastViewed, onView, onEdit, onDelete, onMarkSettled, deletingId, settlingId,
}: {
  invoice: SavedInvoice;
  viewCount: number;
  lastViewed: string | null;
  onView: (inv: SavedInvoice) => void;
  onEdit: (inv: SavedInvoice) => void;
  onDelete: (id: string) => void;
  onMarkSettled: (id: string) => void;
  deletingId: string | null;
  settlingId: string | null;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canSettle = invoice.status === "finalized" && invoice.msa_response === "accepted";

  return (
    <tr className="border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-surface-soft)] transition-colors group">
      {/* Invoice # */}
      <td className="px-4 py-3 text-[13px] font-semibold text-[color:var(--text-primary)] whitespace-nowrap">
        {invoice.invoice_number}
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-[12px] text-[color:var(--text-secondary)] whitespace-nowrap">
        {fmtDate(invoice.created_at)}
        {invoice.form_data?.meta?.dueDate ? (
          <div className="text-[11px] text-[color:var(--text-muted)]">Due {fmtDate(invoice.form_data.meta.dueDate)}</div>
        ) : null}
      </td>

      {/* Client */}
      <td className="px-4 py-3">
        <div className="text-[13px] font-medium text-[color:var(--text-primary)] truncate max-w-[160px]">
          {invoice.form_data?.client?.clientName || <span className="text-[color:var(--text-muted)]">—</span>}
        </div>
        {invoice.shared_to_email && (
          <div className="text-[11px] text-[color:var(--text-muted)] truncate max-w-[160px]">{invoice.shared_to_email}</div>
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
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={invoice.status} />
          {invoice.msa_response === "negotiating" && (
            <span className="text-[10px] font-medium text-amber-600">Client proposing changes</span>
          )}
        </div>
      </td>

      {/* MSA Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <MsaBadge msaId={invoice.msa_id} response={invoice.msa_response ?? "pending"} />
      </td>

      {/* Views */}
      <td className="px-4 py-3 whitespace-nowrap">
        <ViewsBadge count={viewCount} lastViewed={lastViewed} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canSettle && (
            <button
              type="button"
              onClick={() => onMarkSettled(invoice.id)}
              disabled={settlingId === invoice.id}
              className={getAppButtonClass({ variant: "primary", size: "sm" })}
            >
              {settlingId === invoice.id ? "…" : "Mark Settled"}
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(invoice)}
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onView(invoice)}
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            View
          </button>


          {confirmDelete ? (
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => { onDelete(invoice.id); setConfirmDelete(false); }}
                disabled={deletingId === invoice.id}
                className="rounded px-2 py-1 text-[11px] font-semibold text-[color:var(--state-warning-text)] hover:bg-[color:var(--state-warning-bg)] transition-colors"
              >
                {deletingId === invoice.id ? "…" : "Yes"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded px-2 py-1 text-[11px] font-semibold text-[color:var(--text-muted)] hover:bg-[color:var(--bg-surface-soft)] transition-colors"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={getAppButtonClass({ variant: "ghost", size: "sm" })}
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Page ─────────────────────────────────────── */

export default function InvoiceHistoryPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [receipts, setReceipts] = useState<Record<string, { count: number; lastViewed: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [msaFilter, setMsaFilter] = useState<MsaFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

  useEffect(() => {
    async function init() {
      const userId = await getCurrentUserId();
      if (!userId) { setAuthenticated(false); setLoading(false); return; }
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
      window.localStorage.setItem("invoice-editor-draft", JSON.stringify({
        formData: inv.form_data,
        currentStep: "totals",
        savedAt: new Date().toISOString(),
        documentId: inv.id, // Re-use ID to track which invoice to update
        clientMsaNote: inv.client_msa_note, // NEW: metadata for editor
      }));
      router.push("/invoice/new?fresh=0"); // Use fresh=0 to avoid auto-filling profile over this
    } catch {}
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await deleteInvoice(id);
    if (!error) setInvoices((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  };

  const handleMarkSettled = async (id: string) => {
    setSettlingId(id);
    const { error } = await markInvoiceSettled(id);
    if (!error) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, status: "settled" as any } : inv
        )
      );
    }
    setSettlingId(null);
  };

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...invoices];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.form_data?.client?.clientName?.toLowerCase().includes(q) ||
        i.shared_to_email?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);

    if (msaFilter !== "all") {
      if (msaFilter === "none") list = list.filter((i) => !i.msa_id);
      else list = list.filter((i) => i.msa_id && (i.msa_response ?? "pending") === msaFilter);
    }

    list.sort((a, b) => {
      if (sortKey === "date-desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortKey === "date-asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      const amtA = (a.form_data?.lineItems ?? []).reduce((s, i) => s + i.qty * i.rate, 0);
      const amtB = (b.form_data?.lineItems ?? []).reduce((s, i) => s + i.qty * i.rate, 0);
      return sortKey === "amount-desc" ? amtB - amtA : amtA - amtB;
    });

    return list;
  }, [invoices, search, statusFilter, msaFilter, sortKey]);

  // Stats
  const stats = useMemo(() => ({
    total: invoices.length,
    finalized: invoices.filter((i) => i.status === "finalized").length,
    msaPending: invoices.filter((i) => i.msa_id && (i.msa_response ?? "pending") === "pending").length,
    msaNegotiating: invoices.filter((i) => i.msa_response === "negotiating").length,
    msaRejected: invoices.filter((i) => i.msa_response === "rejected").length,
    totalViews: Object.values(receipts).reduce((s, r) => s + r.count, 0),
  }), [invoices, receipts]);

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
              <h1 className="mt-5 text-2xl font-bold text-[color:var(--text-primary)]">Sign in to view your invoices</h1>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Your invoices are stored securely. Please log in to access your history.</p>
              <Link href="/login" className={`mt-5 inline-block ${getAppButtonClass({ variant: "primary", size: "md" })}`}>Log in</Link>
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
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[28px]">Invoices</h1>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} total
                </p>
              </div>
              <Link href="/invoice/new" className={getAppButtonClass({ variant: "primary", size: "sm" })}>
                + New Invoice
              </Link>
            </div>
          </MotionReveal>

          {/* Stat cards */}
          {!loading && invoices.length > 0 && (
            <MotionReveal className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" preset="fade-up">
              {[
                { label: "Total", value: stats.total, color: "text-[color:var(--text-primary)]" },
                { label: "Finalized", value: stats.finalized, color: "text-[color:var(--state-success-text)]" },
                { label: "Action Required", value: stats.msaNegotiating, color: "text-amber-700 font-bold" },
                { label: "MSA Pending", value: stats.msaPending, color: "text-amber-600" },
                { label: "Views (All)", value: stats.totalViews, color: "text-[color:var(--text-secondary)]" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-[color:var(--border-subtle)] bg-white p-4 shadow-sm">
                  <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{s.label}</div>
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
                  {stats.msaRejected} invoice{stats.msaRejected !== 1 ? "s have" : " has"} a rejected MSA — reach out to your client.
                </p>
              </div>
            </MotionReveal>
          )}

          {/* Table */}
          <MotionReveal preset="fade-up">
            <div className="rounded-xl border border-[color:var(--border-default)] bg-white shadow-sm overflow-hidden">

              {/* Filter bar */}
              {invoices.length > 0 && (
                <div className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-4 py-3">
                  <FilterBar
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                    msaFilter={msaFilter} setMsaFilter={setMsaFilter}
                    sortKey={sortKey} setSortKey={setSortKey}
                    search={search} setSearch={setSearch}
                    total={filtered.length}
                  />
                </div>
              )}

              {loading ? (
                <div className="flex items-center gap-3 px-6 py-10">
                  <DocumentSparkIcon className="h-5 w-5 text-[color:var(--text-muted)]" />
                  <p className="text-sm text-[color:var(--text-secondary)]">Loading invoices…</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center gap-5 px-6 py-16 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                    <DocumentSparkIcon className="h-6 w-6 text-[color:var(--text-secondary)]" />
                  </span>
                  <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">No invoices yet</h2>
                  <p className="max-w-sm text-sm text-[color:var(--text-secondary)]">
                    Create your first invoice using the smart brief extraction flow.
                  </p>
                  <Link href="/invoice/new?fresh=1" className={getAppButtonClass({ variant: "primary", size: "md" })}>
                    Create Invoice
                  </Link>
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-[color:var(--text-muted)]">
                  No invoices match your filters.{" "}
                  <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setMsaFilter("all"); }}
                    className="font-semibold text-[color:var(--text-secondary)] hover:underline">
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                        {["Invoice #", "Date / Due", "Client", "Work Type", "Amount", "Status", "MSA", "Views", ""].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
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
                          lastViewed={receipts[inv.id]?.lastViewed ?? null}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMarkSettled={handleMarkSettled}
                          deletingId={deletingId}
                          settlingId={settlingId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </MotionReveal>

          {/* Back */}
          <div className="mt-6">
            <Link href="/" className={getAppButtonClass({ variant: "ghost", size: "sm" })}>
              <span className="inline-flex items-center gap-2">
                <ChevronLeftIcon className="h-4 w-4" />
                Back to Home
              </span>
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
