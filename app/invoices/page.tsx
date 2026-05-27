"use client";

import React, { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAllProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { InvoiceEventRow } from "@/components/invoices/InvoiceEventRow";
import { AppPagination } from "@/components/ui/AppPagination";

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
      case "Complete": return status === "complete"; // Or whatever logic if complete exists
      default: return true;
    }
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={appPageShellClass}>
      <AppHeader />
      <main className={`${appPageContainerClass} max-w-[1200px] mx-auto py-8`}>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black tracking-tighter">Invoices · {filteredInvoices.length}</h1>
          <a
            href="/invoice/new?fresh=1"
            className="border-2 border-black bg-[color:var(--color-lime-warm)] px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-black shadow-[4px_4px_0_#111118] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_#111118] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            + NEW INVOICE
          </a>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                  filter === f
                    ? "bg-black text-white border-2 border-black"
                    : "bg-transparent text-neutral-600 border-2 border-transparent hover:border-black hover:bg-neutral-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-[300px]">
            <input
              type="text"
              placeholder="Search by invoice number, client, or project…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black font-normal app-focus-ring"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-extrabold tracking-widest text-neutral-400">
            Loading invoices…
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white border-2 border-black shadow-[8px_8px_0_#111118]">
            <div className="text-3xl font-black tracking-tighter mb-2">No invoices yet</div>
            <p className="text-neutral-500 font-bold tracking-wide">
              Create your first invoice to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
