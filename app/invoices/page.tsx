"use client";

import React, { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAllProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { InvoiceEventRow } from "@/components/invoices/InvoiceEventRow";
import { AppPagination } from "@/components/ui/AppPagination";
import { Marker } from "@/components/ui/Marker";
import { Pill } from "@/components/ui/Pill";
import { Sticker } from "@/components/ui/Sticker";
import { formatInr } from "@/components/dashboard/ActiveDrilldown";
import { deleteInvoice } from "@/lib/supabase/invoices";

export default function InvoicesPage() {
  const [projects, setProjects] = useState<ProjectWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{ invoiceId: string; label: string } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filters = ["All", "Draft", "Sent", "MSA proposed", "Revision", "Live", "Settled", "Complete", "Offline"];

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await getAllProjectsWithInvoices();
      if (!error && data) {
        setProjects(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await getAllProjectsWithInvoices();
    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const handleDeleteInvoice = async () => {
    if (!deleteConfirm) return;
    const { error } = await deleteInvoice(deleteConfirm.invoiceId);
    if (error) {
      setActionMessage(`Delete failed: ${error}`);
    } else {
      setActionMessage("Invoice deleted.");
      await loadProjects();
    }
    setDeleteConfirm(null);
    setTimeout(() => setActionMessage(null), 3000);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  // Flatten all invoices and attach project/client metadata
  const flattenedInvoices = projects.flatMap(p => {
    const master = p.invoices.find(i => !(i as any).parent_invoice_id);
    return p.invoices.map(inv => ({
      invoice: inv,
      projectName: p.project.name,
      clientName: p.project.client?.client_name,
      isMaster: !(inv as any).parent_invoice_id,
      projectId: p.project.id,
      masterMsaStatus: master?.msa_status,
      masterHasClientMsaNote: !!master?.client_msa_note,
      masterInvoice: master
    }));
  }).sort((a, b) => new Date(b.invoice.created_at).getTime() - new Date(a.invoice.created_at).getTime());

  const filteredInvoices = flattenedInvoices.filter(item => {
    if (search) {
      const q = search.toLowerCase();
      const num = item.invoice.invoice_number?.toLowerCase() || '';
      const proj = item.projectName?.toLowerCase() || '';
      const cli = item.clientName?.toLowerCase() || '';
      if (!num.includes(q) && !proj.includes(q) && !cli.includes(q)) return false;
    }

    if (filter === "All") return true;

    const status = (item.invoice.status || 'draft').toLowerCase();
    const msaStatus = (item.masterMsaStatus || '').toLowerCase();
    const hasNote = item.masterHasClientMsaNote;

    switch (filter) {
      case "Draft": return status === "draft";
      case "Sent": return status === "sent";
      case "MSA proposed": return msaStatus === "proposed" && !hasNote;
      case "Revision": return msaStatus === "proposed" && hasNote;
      case "Live": return status === "live" || status === "finalized";
      case "Settled": return status === "settled";
      case "Complete": return status === "complete";
      case "Offline": return (item.invoice as any).is_offline === true;
      default: return true;
    }
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Compute stats
  const outstandingInvoices = flattenedInvoices.filter(item => {
    const s = (item.invoice.status || '').toLowerCase();
    return item.invoice.shared_at && s !== 'settled' && s !== 'paid' && s !== 'cancelled' && !s.includes('partial');
  });
  const outstandingSum = outstandingInvoices.reduce((sum, item) => sum + Number(item.invoice.grand_total || 0), 0);

  const settledInvoices = flattenedInvoices.filter(item => {
    const s = (item.invoice.status || '').toLowerCase();
    return s === 'settled' || s === 'paid';
  });
  const settledSum = settledInvoices.reduce((sum, item) => sum + Number(item.invoice.grand_total || 0), 0);
  
  const settledWithDates = settledInvoices.filter(i => i.invoice.shared_at && i.invoice.settled_at);
  const avgPaidDays = settledWithDates.length > 0 
    ? Math.round(settledWithDates.reduce((sum, i) => sum + (new Date(i.invoice.settled_at!).getTime() - new Date(i.invoice.shared_at!).getTime()) / 86400000, 0) / settledWithDates.length)
    : null;

  const gstCollected = settledSum * 0.18; // approximation for display

  return (
    <div className={appPageShellClass}>
      <AppHeader />
      <main className={`${appPageContainerClass} max-w-[1200px] mx-auto py-8 relative overflow-x-hidden`}>
        
        {actionMessage && (
          <div className="mb-6 px-4 py-3 bg-ink text-white text-sm font-bold shadow-[4px_4px_0_var(--color-rule)]">
            {actionMessage}
          </div>
        )}


        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex gap-2 mb-3 items-center">
              <div className="px-3 py-1 bg-lav text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">ALL TIME</div>
              <div className="px-3 py-1 bg-white text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">{filteredInvoices.length} RESULTS</div>
            </div>
            <h1 className="font-display font-black text-[80px] leading-[0.8] mb-3 text-ink">
              Invoices
            </h1>
            <div className="text-[13px] font-extrabold uppercase tracking-widest text-ink/70">
              Every invoice you've ever sent. Or drafted, and never sent.
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative w-[320px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink font-bold">⌕</div>
              <input
                type="text"
                placeholder="Search · #, client, project…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-ink font-bold text-sm shadow-[3px_3px_0_var(--color-rule)] focus:outline-none focus:border-ink placeholder:text-ink/40 transition-all focus:shadow-[4px_4px_0_var(--color-rule)]"
              />
            </div>
            <a
              href="/invoice/new?fresh=1"
              className="border-2 border-ink bg-grass px-6 py-3.5 text-sm font-black uppercase tracking-widest text-ink shadow-[4px_4px_0_var(--color-rule)] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_var(--color-rule)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none whitespace-nowrap"
            >
              + NEW INVOICE
            </a>
          </div>
        </div>

        {/* Stat strip — full color */}
        <div className="flex gap-3 mb-6">
          {[
            { l: "Outstanding", v: formatInr(outstandingSum), s: `${outstandingInvoices.length} invoices`, bg: "bg-coral", fg: "text-ink" },
            { l: "Settled · 90d", v: formatInr(settledSum), s: `${settledInvoices.length} invoices`, bg: "bg-grass", fg: "text-ink" },
            { l: "Avg paid in", v: avgPaidDays !== null ? `${avgPaidDays} days` : "—", s: avgPaidDays !== null ? "Average turnaround" : "No settled invoices yet", bg: "bg-acid", fg: "text-ink" },
            { l: "GST collected", v: formatInr(gstCollected), s: "FY 25-26", bg: "bg-lav", fg: "text-ink" },
          ].map((s, i) => (
            <div key={i} className={`flex-1 p-4 ${s.bg} ${s.fg} border-2 border-ink shadow-[4px_4px_0_var(--color-rule)]`}>
              <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-85 mb-1.5">{s.l}</div>
              <div className="text-[26px] font-black leading-none mb-1.5">{s.v}</div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-75">{s.s}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {filters.map(f => {
            const count = flattenedInvoices.filter(item => {
              if (f === "All") return true;
              const status = (item.invoice.status || 'draft').toLowerCase();
              const msaStatus = (item.masterMsaStatus || '').toLowerCase();
              const hasNote = item.masterHasClientMsaNote;
              switch (f) {
                case "Draft": return status === "draft";
                case "Sent": return status === "sent";
                case "MSA proposed": return msaStatus === "proposed" && !hasNote;
                case "Revision": return msaStatus === "proposed" && hasNote;
                case "Live": return status === "live" || status === "finalized";
                case "Settled": return status === "settled";
                case "Complete": return status === "complete";
                case "Offline": return (item.invoice as any).is_offline === true;
                default: return true;
              }
            }).length;

            let toneClass = "bg-transparent text-ink border-transparent hover:bg-paper-2 hover:border-ink/20";
            if (filter === f) {
               if (f === "All") toneClass = "bg-acid text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Draft") toneClass = "bg-butter text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Sent") toneClass = "bg-sky text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "MSA proposed") toneClass = "bg-white text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Revision") toneClass = "bg-coral text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Live") toneClass = "bg-lav text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Settled") toneClass = "bg-grass text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Complete") toneClass = "bg-white text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Offline") toneClass = "bg-white text-ink shadow-[2px_2px_0_var(--color-rule)]";
            }

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest border-2 transition-all ${toneClass} rounded-full`}
              >
                {f} · {count}
              </button>
            );
          })}
          <div className="grow" />
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70">SORT · NEWEST FIRST ▼</div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-black tracking-tight text-xl text-ink/40 uppercase">
            Loading invoices…
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white border-2 border-ink shadow-[8px_8px_0_var(--color-rule)]">
            <div className="text-[32px] font-black tracking-tight mb-2 text-ink">No invoices yet</div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/60">
              Create your first invoice to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {paginatedInvoices.map(item => (
              <InvoiceEventRow
                key={item.invoice.id}
                invoice={item.invoice}
                projectName={item.projectName}
                clientName={item.clientName}
                isMaster={item.isMaster}
                projectId={item.projectId}
                masterMsaStatus={item.masterMsaStatus}
                masterHasClientMsaNote={item.masterHasClientMsaNote}
                masterInvoice={item.masterInvoice}
                onDelete={(id) => setDeleteConfirm({ invoiceId: id, label: item.invoice.invoice_number || 'this draft' })}
              />
            ))}
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-ink/70">
                <span>Rows per page:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-transparent border-none outline-none font-extrabold text-ink cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <AppPagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm border-[3px] border-black bg-white shadow-[6px_6px_0_#111118] p-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-[#111118] mb-2">Delete invoice?</h3>
            <p className="text-sm font-bold text-neutral-600 mb-5">
              This will permanently delete <strong>{deleteConfirm.label}</strong>. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="border-2 border-black bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-[3px_3px_0_#111118] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvoice}
                className="border-[3px] border-black bg-coral px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-[4px_4px_0_#111118] hover:bg-red-600 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
