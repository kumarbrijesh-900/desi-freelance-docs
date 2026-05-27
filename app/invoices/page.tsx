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

export default function InvoicesPage() {
  const [projects, setProjects] = useState<ProjectWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filters = ["All", "Draft", "Sent", "MSA proposed", "Revision", "Live", "Settled", "Complete"];

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
    return s === 'live' || s === 'finalized' || s === 'sent';
  });
  const outstandingSum = outstandingInvoices.reduce((sum, item) => {
    let t = Number(item.invoice.grand_total || 0);
    if (t === 0 && item.invoice.form_data?.totals?.total) t = Number(item.invoice.form_data.totals.total);
    return sum + t;
  }, 0);

  const settledInvoices = flattenedInvoices.filter(item => (item.invoice.status || '').toLowerCase() === 'settled');
  const settledSum = settledInvoices.reduce((sum, item) => {
    let t = Number(item.invoice.grand_total || 0);
    if (t === 0 && item.invoice.form_data?.totals?.total) t = Number(item.invoice.form_data.totals.total);
    return sum + t;
  }, 0);
  
  const gstCollected = settledSum * 0.18; // approximation for display

  return (
    <div className={appPageShellClass}>
      <AppHeader />
      <main className={`${appPageContainerClass} max-w-[1200px] mx-auto py-8 relative overflow-x-hidden`}>
        
        {/* Floating sticker */}
        <div className="absolute top-[80px] right-0 z-10 hidden lg:block">
          <Sticker rotate={-6} tone="coral">✦ {formatInr(outstandingSum)} outstanding</Sticker>
        </div>

        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex gap-2 mb-3 items-center">
              <div className="px-3 py-1 bg-lav text-white text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">ALL TIME</div>
              <div className="px-3 py-1 bg-white text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">{filteredInvoices.length} RESULTS</div>
            </div>
            <h1 className="font-display font-black text-[80px] leading-[0.8] mb-3 text-ink">
              <Marker tone="rose">Invoices</Marker>
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
              className="border-2 border-ink bg-grass px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_var(--color-rule)] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_var(--color-rule)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none whitespace-nowrap"
            >
              + NEW INVOICE
            </a>
          </div>
        </div>

        {/* Stat strip — full color */}
        <div className="flex gap-3 mb-6">
          {[
            { l: "Outstanding", v: formatInr(outstandingSum), s: `${outstandingInvoices.length} invoices`, bg: "bg-coral", fg: "text-white" },
            { l: "Settled · 90d", v: formatInr(settledSum), s: `${settledInvoices.length} invoices`, bg: "bg-grass", fg: "text-white" },
            { l: "Avg paid in", v: "11 days", s: "vs 18 industry", bg: "bg-acid", fg: "text-ink" },
            { l: "GST collected", v: formatInr(gstCollected), s: "FY 25-26", bg: "bg-lav", fg: "text-white" },
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
                default: return true;
              }
            }).length;

            let toneClass = "bg-transparent text-ink border-transparent hover:bg-paper-2 hover:border-ink/20";
            if (filter === f) {
               if (f === "All") toneClass = "bg-acid text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Draft") toneClass = "bg-butter text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Sent") toneClass = "bg-sky text-white shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "MSA proposed") toneClass = "bg-white text-ink shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Revision") toneClass = "bg-coral text-white shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Live") toneClass = "bg-lav text-white shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Settled") toneClass = "bg-grass text-white shadow-[2px_2px_0_var(--color-rule)]";
               else if (f === "Complete") toneClass = "bg-white text-ink shadow-[2px_2px_0_var(--color-rule)]";
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
              />
            ))}
            <AppPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </main>
    </div>
  );
}
