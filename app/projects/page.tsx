"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ProjectTimeline, {
  type MilestoneTimelineProp,
} from "@/components/project/ProjectTimeline";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getInvoiceLockState, type LockState } from "@/lib/invoice-lock-state";
import { cn } from "@/lib/ui-foundation";
import {
  getAllProjectsWithInvoices,
  type InvoiceRow,
  type MilestoneRow,
  type ProjectWithInvoices,
} from "@/lib/supabase/projects";

type ProjectFilter = "all" | "active" | "at-risk" | "awaiting-signature" | "complete";
type ProjectSort = "receivable" | "recent" | "alphabetical";

const FILTERS: Array<{ value: ProjectFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "at-risk", label: "At Risk" },
  { value: "awaiting-signature", label: "Awaiting Signature" },
  { value: "complete", label: "Complete" },
];

const CANONICAL_BADGE_STYLES: Record<LockState, { label: string; className: string; style?: React.CSSProperties }> = {
  editable: {
    label: "DRAFT",
    className: "border-[#D4D2CC] bg-transparent text-[#6B6660]",
  },
  "client-proposed": {
    label: "REVISION REQUESTED",
    className: "border-[#111118] bg-[#FFB35F] text-[#111118]",
  },
  "awaiting-client": {
    label: "AWAITING CLIENT",
    className: "border-[#111118] bg-[#FFE08A] text-[#111118]",
  },
  "msa-accepted": {
    label: "LOCKED",
    className: "border-[#111118] bg-[#FBE5E5] text-[#111118]",
  },
  "invoice-settled": {
    label: "SETTLED",
    className: "border-[#111118] bg-[#00DCB4] text-[#111118]",
  },
  "invoice-partial": {
    label: "PARTIALLY SETTLED",
    className: "border-[#111118] text-[#111118]",
    style: { background: "linear-gradient(90deg, #00DCB4 0 50%, #FFB35F 50% 100%)" },
  },
  "invoice-cancelled": {
    label: "CANCELLED",
    className: "border-[#111118] bg-[#D4D2CC] text-[#111118]",
  },
};

function formatIndian(amount = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
}

function isReceivableStatus(status: string) {
  return ["finalized", "sent", "partial", "saved"].includes(status.toLowerCase());
}

function getDaysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function getClientName(record: ProjectWithInvoices) {
  return (
    record.project.client?.client_name ||
    record.invoices[0]?.form_data?.client?.clientName ||
    "General Engagements"
  );
}

function getProjectMilestones(record: ProjectWithInvoices): MilestoneTimelineProp[] {
  return record.invoices.flatMap((invoice, invoiceIndex) => {
    const invoiceMilestones = record.milestones.filter(
      (milestone) => milestone.invoice_id === invoice.id
    );

    if (invoiceMilestones.length === 0 && invoice.form_data?.milestones?.length > 0) {
      return invoice.form_data.milestones.map((milestone: any, index: number) => ({
        id: milestone.id || `${invoice.id}-${index}`,
        title: milestone.title || `Milestone ${index + 1}`,
        order_index: invoiceIndex * 100 + index,
        status: milestone.status || "pending",
        amount: Number(milestone.amount || 0),
        due_date: invoice.due_date || invoice.form_data?.meta?.dueDate || "",
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number || "",
      }));
    }

    return invoiceMilestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title || "Untitled",
      order_index: invoiceIndex * 100 + (milestone.order_index ?? 0),
      status: milestone.status || "pending",
      amount: Number(milestone.amount || 0),
      due_date: invoice.due_date || invoice.form_data?.meta?.dueDate || "",
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number || "",
    }));
  });
}

function getPrimaryInvoiceState(invoice: InvoiceRow, project: ProjectWithInvoices["project"]) {
  return getInvoiceLockState({
    status: invoice.status,
    msaStatus: invoice.msa_status,
    sharedToEmail: invoice.shared_to_email,
    clientMsaNote: invoice.client_msa_note,
    projectMsaAcceptedAt: project.msa_accepted_at,
    projectStatus: project.status,
  }).state;
}

function getProjectState(record: ProjectWithInvoices): LockState {
  const status = (record.project.status || "").toLowerCase();
  if (status === "cancelled") return "invoice-cancelled";

  const revisionInvoice = record.invoices.find(
    (invoice) =>
      invoice.msa_status?.toLowerCase() === "proposed" &&
      Boolean(invoice.client_msa_note)
  );
  if (revisionInvoice) return getPrimaryInvoiceState(revisionInvoice, record.project);

  const awaitingInvoice = record.invoices.find(
    (invoice) =>
      invoice.msa_status?.toLowerCase() === "pending" &&
      Boolean(invoice.shared_to_email)
  );
  if (awaitingInvoice) return getPrimaryInvoiceState(awaitingInvoice, record.project);

  if (record.metrics.billed > 0 && record.metrics.outstanding === 0) {
    return "invoice-settled";
  }

  if (record.metrics.collected > 0 && record.metrics.outstanding > 0) {
    return "invoice-partial";
  }

  if (record.project.msa_accepted_at) return "msa-accepted";
  return "editable";
}

function CanonicalStateBadge({ state }: { state: LockState }) {
  const badge = CANONICAL_BADGE_STYLES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]",
        badge.className,
      )}
      style={badge.style}
    >
      {badge.label}
    </span>
  );
}

function getProjectHealth(record: ProjectWithInvoices): ProjectFilter {
  const state = getProjectState(record);
  if (state === "client-proposed") return "at-risk";
  if (state === "awaiting-client") return "awaiting-signature";
  if (state === "invoice-settled") return "complete";

  const hasOverdue = record.invoices.some((invoice) => {
    const daysUntil = getDaysUntil(invoice.due_date || invoice.form_data?.meta?.dueDate);
    return isReceivableStatus(invoice.status || "") && daysUntil !== null && daysUntil < 0;
  });

  if (hasOverdue) return "at-risk";
  return "active";
}

function getLatestActivity(record: ProjectWithInvoices) {
  const candidates = [
    record.project.updated_at,
    ...record.invoices.map((invoice) => invoice.updated_at),
    ...record.milestones.map((milestone) => milestone.updated_at || milestone.created_at || ""),
  ]
    .map((date) => new Date(date).getTime())
    .filter((time) => !Number.isNaN(time));

  return Math.max(...candidates, 0);
}

function getNextAction(record: ProjectWithInvoices) {
  const revisionInvoice = record.invoices.find(
    (invoice) =>
      invoice.msa_status?.toLowerCase() === "proposed" &&
      Boolean(invoice.client_msa_note)
  );
  if (revisionInvoice) {
    return {
      detail: `${revisionInvoice.invoice_number} has client edits waiting.`,
      label: "Update addendum",
      href: `/invoice/new?id=${revisionInvoice.id}&restore=1&step=payment`,
      tone: "danger",
    };
  }

  const overdueInvoice = record.invoices.find((invoice) => {
    const daysUntil = getDaysUntil(invoice.due_date || invoice.form_data?.meta?.dueDate);
    return isReceivableStatus(invoice.status || "") && daysUntil !== null && daysUntil < 0;
  });
  if (overdueInvoice) {
    const daysPast = Math.abs(
      getDaysUntil(overdueInvoice.due_date || overdueInvoice.form_data?.meta?.dueDate) ?? 0
    );
    return {
      detail: `${overdueInvoice.invoice_number} is ${daysPast} ${daysPast === 1 ? "day" : "days"} late.`,
      label: "Review invoice",
      href: `/invoice/preview?id=${overdueInvoice.id}`,
      tone: "danger",
    };
  }

  const awaitingInvoice = record.invoices.find(
    (invoice) =>
      invoice.msa_status?.toLowerCase() === "pending" &&
      Boolean(invoice.shared_to_email)
  );
  if (awaitingInvoice) {
    return {
      detail: `${awaitingInvoice.invoice_number} is awaiting client response.`,
      label: "Open invoice",
      href: `/invoice/preview?id=${awaitingInvoice.id}`,
      tone: "warning",
    };
  }

  const draftInvoice = record.invoices.find(
    (invoice) => (invoice.status || "").toLowerCase() === "draft"
  );
  if (draftInvoice) {
    return {
      detail: `${draftInvoice.invoice_number} has not been sent yet.`,
      label: "Finalize draft",
      href: `/invoice/new?id=${draftInvoice.id}&restore=1`,
      tone: "draft",
    };
  }

  const activeInvoice = record.invoices.find((invoice) =>
    isReceivableStatus(invoice.status || "")
  );
  if (activeInvoice) {
    return {
      detail: `${activeInvoice.invoice_number} is live with payment pending.`,
      label: "View invoice",
      href: `/invoice/preview?id=${activeInvoice.id}`,
      tone: "active",
    };
  }

  return {
    detail: record.invoices.length > 0 ? "All linked invoices are settled." : "No invoices linked yet.",
    label: "View project",
    href: `/project/${record.project.id}`,
    tone: "success",
  };
}

function ProjectCard({ record }: { record: ProjectWithInvoices }) {
  const clientName = getClientName(record);
  const projectMilestones = getProjectMilestones(record);
  const state = getProjectState(record);
  const nextAction = getNextAction(record);
  const totalMilestoneCount = projectMilestones.length;
  const settledMilestoneCount = projectMilestones.filter((milestone) => {
    const status = (milestone.status || "").toLowerCase();
    return status === "settled" || status === "paid";
  }).length;
  const progress = totalMilestoneCount > 0
    ? Math.round((settledMilestoneCount / totalMilestoneCount) * 100)
    : 0;

  return (
    <article className="flex flex-col border-2 border-[#111118] bg-white shadow-[4px_4px_0_#111118] transition-all hover:-translate-y-[2px] hover:shadow-[6px_6px_0_#111118]">
      <div className="flex flex-col gap-4 border-b-2 border-[#111118] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CanonicalStateBadge state={state} />
              <span className="border-2 border-[#111118] bg-[#F8F8F4] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#111118] shadow-[2px_2px_0_#111118]">
                {settledMilestoneCount}/{totalMilestoneCount || 0} milestones
              </span>
            </div>
            <h2 className="m-0 mt-4 text-[20px] font-black uppercase leading-tight text-[#111118] sm:text-[24px]">
              {record.project.name}
            </h2>
            <p className="m-0 mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              Client: <span className="text-[#111118]">{clientName}</span>
            </p>
            {record.project.description && (
              <p className="m-0 mt-2 max-w-3xl text-[13px] font-medium italic leading-5 text-[color:var(--text-secondary)]">
                {record.project.description}
              </p>
            )}
          </div>
          <Link
            href={`/project/${record.project.id}`}
            className="inline-flex shrink-0 justify-center border-2 border-[#111118] bg-[#D4FF00] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#111118] shadow-[2px_2px_0_#111118] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#111118]"
          >
            View project →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="border-2 border-[#111118] bg-[#F8F8F4] p-3">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Billed</p>
            <p className="m-0 text-[18px] font-black text-[#111118] font-syne">₹{formatIndian(record.metrics.billed)}</p>
          </div>
          <div className="border-2 border-[#111118] bg-[#F8F8F4] p-3">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Collected</p>
            <p className="m-0 text-[18px] font-black text-[#007A63] font-syne">₹{formatIndian(record.metrics.collected)}</p>
          </div>
          <div className="border-2 border-[#111118] bg-[#F8F8F4] p-3">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Outstanding</p>
            <p className="m-0 text-[18px] font-black text-[#FF5C00] font-syne">₹{formatIndian(record.metrics.outstanding)}</p>
          </div>
          <div className="border-2 border-[#111118] bg-[#F8F8F4] p-3">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Days Active</p>
            <p className="m-0 text-[18px] font-black text-[#111118] font-syne">{record.metrics.daysActive}d</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              Milestone progress
            </p>
            <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-[#111118]">
              {progress}% complete
            </p>
          </div>
          <ProjectTimeline milestones={projectMilestones} />
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
          nextAction.tone === "danger" && "bg-[#FFF0EC]",
          nextAction.tone === "warning" && "bg-[#FFFBE6]",
          nextAction.tone === "draft" && "bg-[#F5F4F0]",
          nextAction.tone === "active" && "bg-[#E0F3FF]",
          nextAction.tone === "success" && "bg-[#EBFDF9]"
        )}
      >
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Next action</p>
          <p className="m-0 mt-0.5 text-[13px] font-black text-[#111118]">{nextAction.detail}</p>
        </div>
        <Link
          href={nextAction.href}
          className="inline-flex justify-center border-2 border-[#111118] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#111118] shadow-[2px_2px_0_#111118] transition-all hover:-translate-y-0.5"
        >
          {nextAction.label}
        </Link>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [sortBy, setSortBy] = useState<ProjectSort>("receivable");

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await getAllProjectsWithInvoices();
      if (loadError === "Not authenticated") {
        router.push("/login");
        return;
      }

      if (loadError) {
        setError(loadError);
      } else {
        setProjects(data);
      }
      setLoading(false);
    }

    void loadProjects();
  }, [router]);

  const activeCount = projects.filter((record) => getProjectHealth(record) === "active").length;

  const visibleProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return projects
      .filter((record) => {
        if (!query) return true;
        return (
          record.project.name.toLowerCase().includes(query) ||
          getClientName(record).toLowerCase().includes(query)
        );
      })
      .filter((record) => {
        if (filter === "all") return true;
        return getProjectHealth(record) === filter;
      })
      .sort((a, b) => {
        if (sortBy === "alphabetical") {
          return a.project.name.localeCompare(b.project.name);
        }
        if (sortBy === "recent") {
          return getLatestActivity(b) - getLatestActivity(a);
        }
        return b.metrics.outstanding - a.metrics.outstanding;
      });
  }, [filter, projects, searchTerm, sortBy]);

  if (loading) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="animate-pulse text-[12px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Loading projects...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={appPageShellClass}>
      <AppHeader />
      <section className={`${appPageContainerClass} py-8 sm:py-12`}>
        <MotionReveal preset="fade-up">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 border-b-2 border-[#111118] pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="m-0 text-[48px] font-black uppercase leading-none text-[#111118] font-syne">
                    Projects
                  </h1>
                  <span className="border-2 border-[#111118] bg-[#D4FF00] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#111118] shadow-[2px_2px_0_#111118]">
                    {activeCount} active
                  </span>
                </div>
                <p className="m-0 mt-2 max-w-2xl text-[13px] font-bold text-[color:var(--text-muted)]">
                  Track project-level contracts, invoices, milestone timelines, and receivables from one ledger.
                </p>
              </div>
              <Link
                href="/invoice/new"
                className="inline-flex justify-center border-2 border-[#111118] bg-[#D4FF00] px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-[#111118] shadow-[3px_3px_0_#111118] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#111118]"
              >
                + New Invoice
              </Link>
            </div>

            <div className="border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118]">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search project or client..."
                  className="w-full border-2 border-[#111118] bg-[#F8F8F4] px-3 py-2.5 text-[13px] font-bold text-[#111118] placeholder:text-[#888] focus:outline-none focus:shadow-[2px_2px_0_#111118]"
                />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as ProjectSort)}
                  className="w-full border-2 border-[#111118] bg-white px-3 py-2.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#111118] shadow-[2px_2px_0_#111118] focus:outline-none"
                >
                  <option value="receivable">Receivable High-Low</option>
                  <option value="recent">Recent activity</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "border-2 border-[#111118] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition-all",
                      filter === option.value
                        ? "bg-[#111118] text-[#D4FF00] shadow-[2px_2px_0_#111118]"
                        : "bg-white text-[#111118] hover:bg-[#F8F8F4]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="border-2 border-[#111118] bg-[#FFF0EC] p-4 text-[13px] font-bold text-[#C2410C] shadow-[4px_4px_0_#111118]">
                {error}
              </div>
            )}

            {projects.length === 0 ? (
              <div className="border-[3px] border-[#111118] bg-white p-8 text-center shadow-[4px_4px_0_#111118]">
                <p className="m-0 text-[22px] font-black uppercase text-[#111118] font-syne">
                  No projects yet.
                </p>
                <p className="m-0 mt-2 text-[13px] font-bold text-[color:var(--text-muted)]">
                  Create your first invoice — a project will be set up automatically.
                </p>
                <Link
                  href="/invoice/new"
                  className="mt-5 inline-flex border-2 border-[#111118] bg-[#D4FF00] px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-[#111118] shadow-[3px_3px_0_#111118] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#111118]"
                >
                  + New Invoice
                </Link>
              </div>
            ) : visibleProjects.length === 0 ? (
              <div className="border-2 border-[#111118] bg-white p-8 text-center shadow-[4px_4px_0_#111118]">
                <p className="m-0 text-[14px] font-black uppercase tracking-[0.1em] text-[#111118]">
                  No projects match this view.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setFilter("all");
                  }}
                  className="mt-3 text-[12px] font-black uppercase tracking-[0.1em] text-[#FF5C00] underline decoration-2 underline-offset-4"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {visibleProjects.map((record) => (
                  <ProjectCard key={record.project.id} record={record} />
                ))}
              </div>
            )}
          </div>
        </MotionReveal>
      </section>
    </main>
  );
}
