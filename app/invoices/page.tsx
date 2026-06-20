"use client";

import React, { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAllProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { isInvoiceRowDeletable } from "@/components/invoices/InvoiceEventRow";
import { ProjectInvoiceGroup } from "@/components/invoices/ProjectInvoiceGroup";
import { AppPagination } from "@/components/ui/AppPagination";
import { Marker } from "@/components/ui/Marker";
import { Pill } from "@/components/ui/Pill";
import { Sticker } from "@/components/ui/Sticker";
import { formatInr } from "@/components/dashboard/ActiveDrilldown";
import { deleteInvoice } from "@/lib/supabase/invoices";
import * as XLSX from "xlsx";

export default function InvoicesPage() {
  const [projects, setProjects] = useState<ProjectWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{ invoiceId: string; label: string } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    const deletable = flattenedInvoices.filter(
      item => selectedIds.has(item.invoice.id) &&
        isInvoiceRowDeletable(item.invoice, item.masterMsaStatus, item.masterHasClientMsaNote)
    );
    let ok = 0;
    let failed = 0;
    for (const item of deletable) {
      const { error } = await deleteInvoice(item.invoice.id);
      if (error) failed++; else ok++;
    }
    const skipped = selectedIds.size - deletable.length;
    await loadProjects();
    clearSelection();
    setBulkDeleteConfirm(false);
    const parts = [`${ok} deleted`];
    if (skipped > 0) parts.push(`${skipped} protected skipped`);
    if (failed > 0) parts.push(`${failed} failed`);
    setActionMessage(parts.join(" · "));
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleExportXls = () => {
    const chosen = flattenedInvoices.filter(item => selectedIds.has(item.invoice.id));
    if (chosen.length === 0) return;

    const today = new Date();
    const toDate = (v: any) => (v ? new Date(v) : "");
    const daysBetween = (a: any, b: any) =>
      Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
    const fyOf = (v: any) => {
      if (!v) return "";
      const d = new Date(v);
      const sy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      return `${sy}-${String((sy + 1) % 100).padStart(2, "0")}`;
    };
    const msaMap: Record<string, string> = { accepted: "Contract accepted", proposed: "Proposed", pending: "Not sent" };

    let sumAmount = 0, sumOutstanding = 0, sumCollected = 0;

    type Agg = { n: number; amount: number; outstanding: number; collected: number; payDays: number; payCount: number };
    const blank = (): Agg => ({ n: 0, amount: 0, outstanding: 0, collected: 0, payDays: 0, payCount: 0 });
    const byStatus = new Map<string, Agg>();
    const byClient = new Map<string, Agg>();
    const byTreatment = new Map<string, Agg>();
    const byMonth = new Map<string, Agg>();
    const byAgeing = new Map<string, Agg>();
    const bump = (map: Map<string, Agg>, key: string, amount: number, outstanding: number, collected: number, payDays: number | "") => {
      const a = map.get(key) || blank();
      a.n += 1; a.amount += amount; a.outstanding += outstanding; a.collected += collected;
      if (typeof payDays === "number") { a.payDays += payDays; a.payCount += 1; }
      map.set(key, a);
    };

    const detailRows: any[] = chosen.map(item => {
      const inv: any = item.invoice;
      const fd: any = inv.form_data || {};
      const tax: any = fd.tax || {};
      const client: any = fd.client || {};
      const agency: any = fd.agency || {};
      const meta: any = fd.meta || {};

      const statusRaw = (inv.status || "draft").toLowerCase();
      const paid = statusRaw === "settled" || statusRaw === "paid" || !!inv.settled_at;
      const shared = !!inv.shared_at;
      const cancelled = statusRaw === "cancelled";
      const amount = Number(inv.grand_total || 0);
      const outstanding = shared && !paid && !cancelled && !statusRaw.includes("partial") ? amount : 0;
      const collected = paid ? amount : 0;
      sumAmount += amount; sumOutstanding += outstanding; sumCollected += collected;

      const daysToPay = paid && inv.shared_at && inv.settled_at ? daysBetween(inv.shared_at, inv.settled_at) : "";
      const overdue = !paid && inv.due_date && new Date(inv.due_date) < today ? daysBetween(inv.due_date, today) : 0;
      const ageing = paid ? "Paid" : !inv.due_date ? "No due date" : overdue <= 0 ? "Current" : overdue <= 30 ? "1-30" : overdue <= 60 ? "31-60" : "60+";

      const taxRate = Number(tax.taxRate || 0);
      const rcm = !!tax.isRcmEnabled;
      const intl = String(client.clientLocation || "").toLowerCase() === "international";
      const sameState = !!agency.agencyState && !!client.clientState && agency.agencyState === client.clientState;
      const treatment = intl
        ? (agency.lutNumber ? "Export - LUT (zero-rated)" : "Export")
        : rcm ? "RCM - recipient pays"
        : taxRate > 0 ? (sameState ? "CGST+SGST" : "IGST")
        : "No tax";

      const mtotal = item.masterInvoice?.form_data?.milestones?.length || 0;
      const mpos = item.isMaster ? 1 : (Number.isFinite(Number(inv.milestone_index)) ? Number(inv.milestone_index) : null);
      const milestone = mpos ? (mtotal > 0 ? `M${mpos} of ${mtotal}` : `M${mpos}`) : "";

      const msa = item.masterMsaStatus
        ? (String(item.masterMsaStatus).toLowerCase() === "proposed" && item.masterHasClientMsaNote
            ? "Revision requested"
            : (msaMap[String(item.masterMsaStatus).toLowerCase()] || String(item.masterMsaStatus)))
        : "";

      const terms = inv.applied_payment_terms || (inv.payment_terms_days ? `Net ${inv.payment_terms_days} days` : "");
      const clientName = item.clientName || client.clientName || "Unknown";
      const invDate = meta.invoiceDate || inv.created_at;
      const monthKey = invDate ? new Date(invDate).toISOString().slice(0, 7) : "Unknown";

      bump(byStatus, statusRaw || "draft", amount, outstanding, collected, daysToPay);
      bump(byClient, clientName, amount, outstanding, collected, daysToPay);
      bump(byTreatment, treatment, amount, outstanding, collected, daysToPay);
      bump(byMonth, monthKey, amount, outstanding, collected, daysToPay);
      bump(byAgeing, ageing, amount, outstanding, collected, daysToPay);

      return {
        "Invoice #": inv.invoice_number || "DRAFT",
        "Type": item.isMaster ? "Master" : (mpos ? `M${mpos} billing` : "Milestone billing"),
        "Master invoice": item.isMaster ? "" : (item.masterInvoice?.invoice_number || ""),
        "Project": item.projectName || "Unlinked",
        "Milestone": milestone,
        "Client": clientName,
        "Contract (MSA)": msa,
        "Invoice date": toDate(invDate),
        "Shared": toDate(inv.shared_at),
        "Due": toDate(inv.due_date),
        "Settled": toDate(inv.settled_at),
        "Amount (INR)": amount,
        "Paid?": paid ? "Yes" : "No",
        "Outstanding (INR)": outstanding,
        "Collected (INR)": collected,
        "Days to pay": daysToPay,
        "Days overdue": overdue,
        "Ageing": ageing,
        "Payment terms": terms,
        "Settlement": inv.is_offline ? "Offline" : (paid ? "Online (Lance)" : ""),
        "GST rate %": taxRate,
        "Tax treatment": treatment,
        "RCM": rcm ? "Yes" : "No",
        "Place of supply": client.clientState || "",
        "Location": intl ? "International" : "Domestic",
        "Currency": client.clientCurrency || "INR",
        "Client GSTIN": client.clientGstin || "",
        "Your GSTIN": agency.gstin || "",
        "FY": fyOf(invDate),
      };
    });

    detailRows.push({
      "Invoice #": `TOTALS (${chosen.length} invoices)`,
      "Type": "", "Master invoice": "", "Project": "", "Milestone": "", "Client": "",
      "Contract (MSA)": "", "Invoice date": "", "Shared": "", "Due": "", "Settled": "",
      "Amount (INR)": sumAmount, "Paid?": "", "Outstanding (INR)": sumOutstanding, "Collected (INR)": sumCollected,
      "Days to pay": "", "Days overdue": "", "Ageing": "", "Payment terms": "", "Settlement": "",
      "GST rate %": "", "Tax treatment": "", "RCM": "", "Place of supply": "", "Location": "",
      "Currency": "", "Client GSTIN": "", "Your GSTIN": "", "FY": "",
    });

    const wsDetail = XLSX.utils.json_to_sheet(detailRows, { cellDates: true });
    wsDetail["!cols"] = Object.keys(detailRows[0]).map(k => ({ wch: Math.min(26, Math.max(10, k.length + 2)) }));
    if (wsDetail["!ref"]) {
      const range = XLSX.utils.decode_range(wsDetail["!ref"]);
      wsDetail["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
    }

    const aoa: any[][] = [];
    aoa.push(["Lance — Invoice Summary"]);
    aoa.push([`Exported ${new Date().toISOString().slice(0, 10)} · ${chosen.length} invoices`]);
    aoa.push([]);
    aoa.push(["BY STATUS", "Invoices", "Amount", "Outstanding", "Collected"]);
    Array.from(byStatus.entries()).sort((a, b) => b[1].amount - a[1].amount).forEach(([k, a]) =>
      aoa.push([k, a.n, a.amount, a.outstanding, a.collected]));
    aoa.push(["TOTAL", chosen.length, sumAmount, sumOutstanding, sumCollected]);
    aoa.push([]);
    aoa.push(["AGEING (unpaid)", "Invoices", "Outstanding"]);
    ["Current", "1-30", "31-60", "60+"].forEach(b => {
      const a = byAgeing.get(b);
      if (a) aoa.push([b, a.n, a.outstanding]);
    });
    aoa.push([]);
    aoa.push(["BY TAX TREATMENT", "Invoices", "Amount"]);
    Array.from(byTreatment.entries()).sort((a, b) => b[1].amount - a[1].amount).forEach(([k, a]) =>
      aoa.push([k, a.n, a.amount]));
    aoa.push([]);
    aoa.push(["BY CLIENT", "Invoices", "Amount", "Outstanding", "Collected", "Avg days to pay"]);
    Array.from(byClient.entries()).sort((a, b) => b[1].amount - a[1].amount).forEach(([k, a]) =>
      aoa.push([k, a.n, a.amount, a.outstanding, a.collected, a.payCount ? Math.round(a.payDays / a.payCount) : ""]));
    aoa.push([]);
    aoa.push(["BY MONTH", "Invoices", "Amount", "Collected"]);
    Array.from(byMonth.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]))).forEach(([k, a]) =>
      aoa.push([k, a.n, a.amount, a.collected]));

    const wsSummary = XLSX.utils.aoa_to_sheet(aoa);
    wsSummary["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Invoices");
    XLSX.writeFile(wb, `lance-invoices-${new Date().toISOString().slice(0, 10)}.xlsx`, { cellDates: true });
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
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

  // Group filtered invoices back under their project, master first then milestones.
  const groupedProjects = (() => {
    const map = new Map<string, { projectId: string | null; projectName?: string; clientName?: string; items: typeof filteredInvoices }>();
    for (const item of filteredInvoices) {
      const key = item.projectId || "__unlinked__";
      if (!map.has(key)) map.set(key, { projectId: item.projectId, projectName: item.projectName, clientName: item.clientName, items: [] });
      map.get(key)!.items.push(item);
    }
    const groups = Array.from(map.values());
    groups.forEach(g => g.items.sort((a, b) => {
      if (a.isMaster) return -1;
      if (b.isMaster) return 1;
      return (Number(a.invoice.milestone_index) || 0) - (Number(b.invoice.milestone_index) || 0);
    }));
    return groups;
  })();

  const totalPages = Math.ceil(groupedProjects.length / itemsPerPage);
  const paginatedGroups = groupedProjects.slice(
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
    <div className={`${appPageShellClass} h-dvh overflow-hidden flex flex-col`}>
      <AppHeader />
      <main className={`${appPageContainerClass} max-w-[1200px] mx-auto pt-8 pb-4 relative overflow-x-hidden flex-1 min-h-0 flex flex-col`}>
        
        {actionMessage && (
          <div className="mb-6 px-4 py-3 bg-ink text-white text-sm font-bold shadow-none">
            {actionMessage}
          </div>
        )}


        <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="font-display font-black text-[36px] leading-none text-ink">Invoices</h1>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink/50 whitespace-nowrap">All time · {filteredInvoices.length} results</span>
          </div>
          <div className="flex gap-3 items-center shrink-0">
            <div className="relative w-[300px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink font-bold">⌕</div>
              <input
                type="text"
                placeholder="Search · #, client, project…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-soft font-bold text-sm shadow-none focus:outline-none focus:border-ink placeholder:text-ink/40 transition-all focus:shadow-none"
              />
            </div>
            <a
              href="/invoice/new?fresh=1"
              className="border border-soft bg-acid px-5 py-2.5 text-sm font-black uppercase tracking-widest text-acc-ink shadow-none transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none whitespace-nowrap"
            >
              + NEW INVOICE
            </a>
          </div>
        </div>

        {/* Stat strip — calm tan (canonical: tan cards + one ink hero) */}
        <div className="flex flex-wrap gap-4 mb-4 shrink-0">
          {[
            { l: "Outstanding", v: formatInr(outstandingSum), s: `${outstandingInvoices.length} invoices`, hero: true },
            { l: "Settled · 90d", v: formatInr(settledSum), s: `${settledInvoices.length} invoices`, hero: false },
            { l: "Avg paid in", v: avgPaidDays !== null ? `${avgPaidDays} days` : "—", s: avgPaidDays !== null ? "turnaround" : "none yet", hero: false },
            { l: "GST collected", v: formatInr(gstCollected), s: "FY 25-26", hero: false },
          ].map((s, i) => (
            <div key={i} className={`p-5 border border-soft shadow-[var(--elev-1)] ${s.hero ? 'flex-[1.5] bg-ink text-acc-ink' : 'flex-1 bg-paper text-ink'}`}>
              <div className={`text-[11px] font-extrabold uppercase tracking-widest mb-1 ${s.hero ? 'opacity-70' : 'opacity-85'}`}>{s.l}</div>
              <div className={`font-black mb-1 ${s.hero ? 'text-[34px] leading-none' : 'text-2xl'}`}>{s.v}</div>
              <div className={`text-[11px] font-extrabold uppercase tracking-widest ${s.hero ? 'opacity-70' : 'opacity-75'}`}>{s.s}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap shrink-0">
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
               if (f === "All") toneClass = "bg-ink text-acc-ink shadow-none";
               else if (f === "Draft") toneClass = "bg-butter text-ink shadow-none";
               else if (f === "Sent") toneClass = "bg-sky text-white shadow-none";
               else if (f === "MSA proposed") toneClass = "bg-white text-ink shadow-none";
               else if (f === "Revision") toneClass = "bg-coral text-white shadow-none";
               else if (f === "Live") toneClass = "bg-acid text-acc-ink shadow-none";
               else if (f === "Settled") toneClass = "bg-grass text-white shadow-none";
               else if (f === "Complete") toneClass = "bg-forest text-acc-ink shadow-none";
               else if (f === "Offline") toneClass = "bg-white text-ink shadow-none";
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

        {/* Bulk selection toolbar */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-white border border-soft shadow-none shrink-0">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filteredInvoices.length > 0 && filteredInvoices.every(item => selectedIds.has(item.invoice.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(new Set(filteredInvoices.map(item => item.invoice.id)));
                  } else {
                    clearSelection();
                  }
                }}
                className="w-4 h-4 border border-soft accent-ink cursor-pointer"
              />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70">
                Select all {filteredInvoices.length}
              </span>
            </label>
            <div className="grow" />
            {selectedIds.size > 0 ? (
              <>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink">{selectedIds.size} selected</span>
                <button type="button" onClick={handleExportXls}
                  className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest border border-soft bg-white text-ink shadow-none hover:-translate-y-[1px] transition-transform">
                  Export XLS
                </button>
                <button type="button" onClick={() => setBulkDeleteConfirm(true)}
                  className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest border border-soft bg-coral text-white shadow-none hover:-translate-y-[1px] transition-transform">
                  Delete
                </button>
                <button type="button" onClick={clearSelection}
                  className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-ink/60 hover:text-ink">
                  Clear
                </button>
              </>
            ) : (
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40">Select rows to export or delete</span>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center font-black tracking-tight text-xl text-ink/40 uppercase">
            Loading invoices…
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white border border-soft shadow-none">
            <div className="text-[32px] font-black tracking-tight mb-2 text-ink">No invoices yet</div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/60">
              Create your first invoice to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
            {paginatedGroups.map(group => (
              <ProjectInvoiceGroup
                key={group.projectId || "__unlinked__"}
                projectName={group.projectName}
                clientName={group.clientName}
                projectId={group.projectId}
                items={group.items}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onDelete={(id, label) => setDeleteConfirm({ invoiceId: id, label })}
              />
            ))}
            </div>
            <div className="flex justify-between items-center mt-4 shrink-0">
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-ink/70">
                <span>Projects per page:</span>
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
          <div className="w-full max-w-sm border border-soft bg-white shadow-[var(--brutal-shadow-lg)] p-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-[color:var(--color-ink)] mb-2">Delete invoice?</h3>
            <p className="text-sm font-bold text-neutral-600 mb-5">
              This will permanently delete <strong>{deleteConfirm.label}</strong>. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="border border-soft bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-[var(--brutal-shadow-md)] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvoice}
                className="border border-soft bg-coral px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-[var(--brutal-shadow-md)] hover:bg-red-600 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirmation Dialog ── */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm border border-soft bg-white shadow-[var(--brutal-shadow-lg)] p-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-[color:var(--color-ink)] mb-2">Delete selected?</h3>
            <p className="text-sm font-bold text-neutral-600 mb-5">
              Permanently deletes the selected <strong>draft/live</strong> invoices. Settled or partial invoices in your selection are protected and skipped. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setBulkDeleteConfirm(false)}
                className="border border-soft bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-[var(--brutal-shadow-md)] hover:bg-[#FAF7F2]">
                Cancel
              </button>
              <button type="button" onClick={handleBulkDelete}
                className="border border-soft bg-coral px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-[var(--brutal-shadow-md)] hover:bg-red-600 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none">
                Delete selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
