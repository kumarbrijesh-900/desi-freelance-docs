"use client";

import React from "react";
import Link from "next/link";
import { ProjectWithInvoices, type InvoiceRow } from "@/lib/supabase/projects";
import { formatInr } from "@/lib/format-inr";
import { invoiceRowHref } from "@/lib/invoice-row-href";
import { getStatusTint, type StatusKind } from "@/lib/status-tint";
import { resolveInvoiceStatus } from "@/components/invoices/InvoiceEventRow";
import { resolveInvoicePayable } from "@/lib/invoice-calculations";

/**
 * Presentation only. The dashboard has room for a fuller phrase than the
 * roster's pill; these are the same states under longer names, not a second
 * taxonomy. Anything unlisted renders its canonical label unchanged.
 */
const LEDGER_LABEL: Record<string, string> = {
  revision: "revision requested",
  awaiting: "awaiting client",
};

/**
 * One taxonomy, shared with /invoices.
 *
 * This component used to carry its own copy of the status ladder. It never
 * received the derived overdue and unanswered flags, so a master invoice
 * that had gone months without an answer read "awaiting client" here while
 * the roster called it unanswered; and its locked guard was missing the
 * finalized exclusion. Milestone invoices were worse: they were labelled
 * from their MILESTONE row rather than their own status, so an invoice past
 * its due date read "live" under a column headed Status.
 *
 * Both now resolve the same way the roster does. Child rows pass the
 * MASTER's MSA state, which is what the overdue predicate requires.
 */
function getStatusPill(invoice: InvoiceRow, masterMsaStatus: string | null, hasClientMsaNote: boolean) {
  const { label } = resolveInvoiceStatus(invoice, masterMsaStatus, hasClientMsaNote);
  // Every label getStatusInfo produces is also a StatusKind. getStatusTint
  // falls back to neutral for anything else, which is the fallback label.
  return { ...getStatusTint(label as StatusKind), label: LEDGER_LABEL[label] ?? label };
}

export function ProjectInvoicesLedger({ project }: { project: ProjectWithInvoices }) {
  const master = project.invoices.find(inv => !(inv as any).parent_invoice_id);
  const children = project.invoices.filter(inv => (inv as any).parent_invoice_id === master?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allInvoices = master ? [master, ...children] : children;

  if (allInvoices.length === 0) {
    return (
      <div className="py-5 bg-paper-2 type-body text-ink/70">
        No invoices found for this project.
      </div>
    );
  }

  return (
    <div className="py-5">
      <div className="type-label uppercase tracking-widest font-bold text-ink/70 mb-3">
        INVOICES ({allInvoices.length})
      </div>

      <div className="border border-soft rounded-[var(--radius-box)] bg-[color:var(--color-paper-2)] overflow-x-auto">
        <table className="w-full min-w-[520px] text-left border-collapse">
          <thead>
            <tr className="border-b border-soft bg-paper-2">
              <th className="p-3 type-label uppercase font-bold tracking-wide border-r border-soft">Invoice</th>
              <th className="p-3 type-label uppercase font-bold tracking-wide border-r border-soft hidden sm:table-cell">Type</th>
              <th className="p-3 type-label uppercase font-bold tracking-wide border-r border-soft text-right">Amount</th>
              <th className="p-3 type-label uppercase font-bold tracking-wide border-r border-soft">Status</th>
              <th className="p-3 type-label uppercase font-bold tracking-wide text-center w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {allInvoices.map((inv, idx) => {
              const isMaster = inv.id === master?.id;
              const milestoneIndex = Number((inv as any).milestone_index);
              const typeLabel = isMaster
                ? "Master"
                : Number.isFinite(milestoneIndex)
                  ? `M${milestoneIndex} billing`
                  : "Milestone billing";
              const statusInfo = getStatusPill(inv, master?.msa_status || null, !!master?.client_msa_note);

              // Compute grand total
              let total = resolveInvoicePayable(inv);
              if (total === 0) {
                total = Number(inv.form_data?.totals?.total || 0);
              }

              return (
                <tr key={inv.id} className={idx < allInvoices.length - 1 ? "border-b border-soft" : ""}>
                  <td className="p-3 border-r border-soft type-body font-bold">
                    {inv.invoice_number || "DRAFT"}
                  </td>
                  <td className="p-3 border-r border-soft type-body text-ink/70 hidden sm:table-cell">
                    {typeLabel}
                  </td>
                  <td className="p-3 border-r border-soft type-body font-bold text-right">
                    {formatInr(total)}
                  </td>
                  <td className="p-3 border-r border-soft type-body">
                    <span
                      className={`px-2 py-0.5 rounded-full border font-bold uppercase ${statusInfo.strikethrough ? 'line-through' : ''}`}
                      style={{ backgroundColor: statusInfo.bg, color: statusInfo.fg, borderColor: statusInfo.bd, borderStyle: statusInfo.dashed ? 'dashed' : 'solid' }}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {(() => {
                      const status = (inv.status || '').toLowerCase();
                      const msa = (master?.msa_status || '').toLowerCase();
                      const rowHref = invoiceRowHref(inv.id, inv.status);
                      return (
                        <Link
                          href={rowHref}
                          className="inline-block type-label uppercase font-bold tracking-wide border border-soft rounded-[var(--radius-chip)] px-3 py-1 bg-[color:var(--color-paper-2)] shadow-[var(--elev-1)] is-interactive text-ink"
                        >
                          VIEW
                        </Link>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
