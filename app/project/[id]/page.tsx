"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabase/client";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { cn } from "@/lib/ui-foundation";
import { MotionReveal } from "@/components/ui/motion-primitives";
import ProjectTimeline, { MilestoneTimelineProp } from "@/components/project/ProjectTimeline";

function formatIndian(amount = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    async function loadProjectData() {
      if (!projectId) return;
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // 1. Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projectError || !projectData) {
          console.error("Failed to load project:", projectError);
          setLoading(false);
          return;
        }
        setProject(projectData);

        // 2. Fetch client
        if (projectData.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("*")
            .eq("id", projectData.client_id)
            .single();
          setClient(clientData);
        }

        // 3. Fetch invoices
        const { data: invoicesData } = await supabase
          .from("invoices")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        
        const loadedInvoices = invoicesData || [];
        setInvoices(loadedInvoices);

        // 4. Fetch milestones for those invoices
        if (loadedInvoices.length > 0) {
          const invoiceIds = loadedInvoices.map(inv => inv.id);
          const { data: milestonesData } = await supabase
            .from("invoice_milestones")
            .select("*")
            .in("invoice_id", invoiceIds);
          setMilestones(milestonesData || []);
        }

      } catch (err) {
        console.error("Error loading project detail:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadProjectData();
  }, [projectId, router]);

  // Aggregate project-level milestones chronologically
  const projectMilestones: MilestoneTimelineProp[] = invoices.flatMap((inv) => {
    const invMilestones = milestones.filter((m) => m.invoice_id === inv.id);

    // Fallback to form_data milestones if relational DB table is empty
    if (invMilestones.length === 0 && inv.form_data?.milestones?.length > 0) {
      return inv.form_data.milestones.map((m: any, idx: number) => ({
        id: m.id || `${inv.id}-${idx}`,
        title: m.title || `Milestone ${idx + 1}`,
        order_index: idx,
        status: m.status || "pending",
        amount: Number(m.amount || 0),
        due_date: inv.due_date || inv.form_data?.meta?.dueDate || "",
        invoice_id: inv.id,
        invoice_number: inv.invoice_number || "",
      }));
    }

    return invMilestones.map((m: any) => ({
      id: m.id,
      title: m.title || "Untitled",
      order_index: m.order_index ?? 0,
      status: m.status || "pending",
      amount: Number(m.amount || 0),
      due_date: inv.due_date || inv.form_data?.meta?.dueDate || "",
      invoice_id: inv.id,
      invoice_number: inv.invoice_number || "",
    }));
  });

  // Calculate project financial metrics
  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  invoices.forEach((inv) => {
    const statusLower = (inv.status || "").toLowerCase();
    if (statusLower === "cancelled" || statusLower === "draft") return;

    const invMilestones = milestones.filter((m) => m.invoice_id === inv.id);

    if (invMilestones.length > 0) {
      invMilestones.forEach((m) => {
        const mStatus = (m.status || "").toLowerCase();
        const mAmount = Number(m.amount || 0);
        totalBilled += mAmount;
        if (mStatus === "settled" || mStatus === "paid") {
          totalCollected += mAmount;
        } else {
          totalOutstanding += mAmount;
        }
      });
    } else {
      // Fallback for standard flat invoices
      let amount = 0;
      const items = inv.form_data?.lineItems ?? [];
      if (items.length > 0) {
        amount = items.reduce((sum: number, item: any) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
      } else if (inv.form_data?.totals?.total) {
        amount = Number(inv.form_data.totals.total);
      }
      totalBilled += amount;
      if (statusLower === "settled") {
        totalCollected += amount;
      } else {
        totalOutstanding += amount;
      }
    }
  });

  const daysActive = project ? Math.ceil((new Date().getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const msaInvoice = invoices.find(inv => inv.id === project?.msa_accepted_via_invoice_id);
  const msaInvoiceNumber = msaInvoice ? msaInvoice.invoice_number : "INV-XXXX";
  const msaAcceptedDate = project?.msa_accepted_at ? new Date(project.msa_accepted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";

  const getProjectStatusBadge = (status: string) => {
    const norm = (status || "").toLowerCase();
    if (norm === "active") {
      return (
        <span className="border-2 border-[#111118] bg-[#D4FF00] px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#111118]">
          ACTIVE
        </span>
      );
    }
    if (norm === "completed") {
      return (
        <span className="border-2 border-[#111118] bg-[#00DCB4] px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#111118]">
          COMPLETED
        </span>
      );
    }
    return (
      <span className="border-2 border-[#111118] bg-[#D4D2CC] px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#111118]">
        CANCELLED
      </span>
    );
  };

  const getInvoiceBadgeColor = (status: string) => {
    const norm = (status || "").toLowerCase();
    if (norm === "settled") return "bg-[#00DCB4]";
    if (norm === "partial" || norm === "sent") return "bg-[#FFE08A]";
    if (norm === "cancelled") return "bg-[#D4D2CC]";
    return "bg-white";
  };

  if (loading) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[color:var(--text-muted)] font-black uppercase tracking-widest text-[12px] animate-pulse">Loading project details…</p>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-[color:var(--text-muted)] font-bold uppercase tracking-wider">Project not found.</p>
          <Link
            href="/dashboard"
            className="border-2 border-[#111118] bg-[#D4FF00] px-4 py-2 font-black uppercase text-xs shadow-[3px_3px_0_#111118] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111118] transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={appPageShellClass}>
      <AppHeader />

      <section className={`${appPageContainerClass} pt-8 sm:pt-12 pb-24`}>
        <MotionReveal preset="fade-up">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Back to Dashboard Link */}
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--text-muted)] hover:text-[#111118] uppercase tracking-wider transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>

            {/* Header: Project name, Client, and Status Badge */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 pb-6 border-b-2 border-dashed border-[#111118]/20">
              <div className="space-y-1">
                <h1 className="font-syne font-black text-[#111118] text-[40px] sm:text-[48px] uppercase tracking-normal leading-none">
                  {project.name}
                </h1>
                <p className="text-[13px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">
                  Client: <span className="text-[#111118]">{client?.client_name || "General Engagements"}</span>
                  {client?.city ? ` (${client.city})` : ""}
                </p>
                {project.description && (
                  <p className="text-[14px] font-medium text-[color:var(--text-secondary)] italic pt-2 max-w-3xl leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 pt-1">
                {getProjectStatusBadge(project.status)}
              </div>
            </div>

            {/* Chronological Milestone Timeline */}
            <div className="border-2 border-[#111118] bg-white shadow-[4px_4px_0_#111118] p-4">
              <div className="px-2 pb-2 border-b-2 border-dashed border-[#111118]/10 flex justify-between items-center">
                <p className="text-[11px] font-black text-[#111118] uppercase tracking-widest">
                  Chronological Project Roadmap
                </p>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {projectMilestones.length} Milestones
                </span>
              </div>
              <ProjectTimeline milestones={projectMilestones} />
            </div>

            {/* Metrics block */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118]">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)] m-0">Total Billed</p>
                <p className="text-[24px] sm:text-[32px] font-black font-syne text-[#111118] m-0">₹{formatIndian(totalBilled)}</p>
              </div>
              <div className="border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118]">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)] m-0">Collected</p>
                <p className="text-[24px] sm:text-[32px] font-black font-syne text-[#007A63] m-0">₹{formatIndian(totalCollected)}</p>
              </div>
              <div className="border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118]">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)] m-0">Outstanding</p>
                <p className="text-[24px] sm:text-[32px] font-black font-syne text-[#FF5C00] m-0">₹{formatIndian(totalOutstanding)}</p>
              </div>
              <div className="border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118]">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)] m-0">Days Active</p>
                <p className="text-[24px] sm:text-[32px] font-black font-syne text-[#111118] m-0">{daysActive}d</p>
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="border-2 border-[#111118] bg-white shadow-[4px_4px_0_#111118]">
              <div className="px-4 py-3 border-b-2 border-[#111118] bg-[#F5F5F0]">
                <p className="text-[12px] font-black text-[#111118] uppercase tracking-widest">
                  Associated Invoices Ledger
                </p>
              </div>
              <div className="overflow-x-auto">
                {invoices.length > 0 ? (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-[#111118] bg-[#FAFAF6] text-[10px] font-black uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Invoice Number</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-center">Milestones</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const invMilestones = milestones.filter(m => m.invoice_id === inv.id);
                        let amount = 0;
                        const items = inv.form_data?.lineItems ?? [];
                        if (invMilestones.length > 0) {
                          amount = invMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
                        } else if (items.length > 0) {
                          amount = items.reduce((sum: number, item: any) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
                        } else if (inv.form_data?.totals?.total) {
                          amount = Number(inv.form_data.totals.total);
                        }

                        return (
                          <tr key={inv.id} className="border-b border-gray-200 hover:bg-[#FAFAF9] transition-colors">
                            <td className="px-4 py-3.5 text-[13px] font-bold text-[#111118]">
                              {inv.invoice_number}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={cn(
                                "text-[9px] font-black border-2 px-2 py-0.5 shadow-[1px_1px_0_#111118] uppercase tracking-wider inline-block",
                                getInvoiceBadgeColor(inv.status)
                              )}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center text-[12px] font-bold text-[#111118]">
                              {invMilestones.length}
                            </td>
                            <td className="px-4 py-3.5 text-right text-[13px] font-black text-[#111118] font-mono">
                              ₹{formatIndian(amount)}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Link
                                href={`/invoice/preview?id=${inv.id}`}
                                className="border-2 border-[#111118] bg-white hover:bg-gray-100 text-[#111118] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_#111118] hover:shadow-[2px_2px_0_#111118] hover:-translate-x-[0.5px] hover:-translate-y-[0.5px] transition-all inline-block"
                              >
                                View ↗
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-[13px] font-bold text-gray-400 uppercase italic">
                    No invoices linked to this project yet.
                  </div>
                )}
              </div>
            </div>

            {/* Project Addendum & Compliance Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Addendum Section */}
              <div className="border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118] space-y-3">
                <h3 className="text-[12px] font-black text-[#111118] uppercase tracking-widest border-b border-dashed border-[#111118]/15 pb-2">
                  📜 Project Addendum Terms
                </h3>
                {project.project_addendum_text ? (
                  <p className="text-[13px] text-[color:var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-medium">
                    {project.project_addendum_text}
                  </p>
                ) : (
                  <p className="text-[12px] font-bold text-gray-400 uppercase italic">
                    No specific project addendum terms are registered.
                  </p>
                )}
              </div>

              {/* Compliance & MSA Status Line */}
              <div className="border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118] space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-[12px] font-black text-[#111118] uppercase tracking-widest border-b border-dashed border-[#111118]/15 pb-2">
                    🛡️ Master Compliance Status
                  </h3>
                  <p className="text-[12px] font-medium text-[color:var(--text-secondary)] leading-relaxed pt-2">
                    Project-level compliance is automatically evaluated based on client agreements and signature history. Bypassing individual invoice signatures is enabled for projects with fully executed MSAs.
                  </p>
                </div>
                <div className="pt-4">
                  {project.msa_accepted_at ? (
                    <div className="border-2 border-[#111118] bg-[#FFFBE6] px-4 py-2.5 font-bold text-[12px] text-[#111118] shadow-[2px_2px_0_#111118] inline-block">
                      🛡️ MSA accepted via{" "}
                      <Link
                        href={`/invoice/preview?id=${project.msa_accepted_via_invoice_id}`}
                        className="underline text-indigo-600 hover:text-indigo-800"
                      >
                        {msaInvoiceNumber}
                      </Link>{" "}
                      on {msaAcceptedDate}
                    </div>
                  ) : (
                    <div className="border-2 border-[#111118] bg-white px-4 py-2.5 font-bold text-[12px] text-[color:var(--text-muted)] shadow-[2px_2px_0_#111118] inline-block">
                      🛡️ Project MSA not yet accepted
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </MotionReveal>
      </section>
    </main>
  );
}
