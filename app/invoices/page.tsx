"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionReveal, MotionStagger } from "@/components/ui/motion-primitives";
import {
  DocumentSparkIcon,
  ChevronLeftIcon,
} from "@/components/ui/app-icons";
import {
  appCardClass,
  appGridClass,
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import { getAppButtonClass } from "@/lib/ui-foundation";
import {
  listInvoices,
  deleteInvoice,
  getCurrentUserId,
  type SavedInvoice,
} from "@/lib/supabase/invoices";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";

const PREVIEW_STORAGE_KEY = "invoice-preview-data";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  if (status === "finalized") {
    return (
      <span className="inline-flex items-center rounded-full border border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-success-text)]">
        Finalized
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--state-info-border)] bg-[color:var(--state-info-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--state-info-text)]">
      Draft
    </span>
  );
}

export default function InvoiceHistoryPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const userId = await getCurrentUserId();
      if (!userId) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      setAuthenticated(true);

      const { data, error } = await listInvoices();
      if (!error) {
        setInvoices(data);
      }
      setLoading(false);
    }

    init();
  }, []);

  const handleViewInvoice = (invoice: SavedInvoice) => {
    // Load form data into localStorage for the preview page
    try {
      window.localStorage.setItem(
        PREVIEW_STORAGE_KEY,
        JSON.stringify(invoice.form_data)
      );
      router.push("/invoice/preview");
    } catch (error) {
      console.error("Failed to load invoice for preview:", error);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm("Delete this invoice? This action cannot be undone.")) {
      return;
    }

    setDeletingId(invoiceId);
    const { error } = await deleteInvoice(invoiceId);
    if (!error) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    }
    setDeletingId(null);
  };

  // ─── Not authenticated ────────────────────────────────────
  if (authenticated === false) {
    return (
      <main className={appPageShellClass}>
        <AppHeader rightSlot={<LogoutButton />} />
        <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
          <div className={appGridClass}>
            <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
              <MotionReveal className={`${appCardClass} p-8`} preset="fade-up">
                <div className="flex flex-col items-center gap-5 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                    <DocumentSparkIcon className="h-6 w-6 text-[color:var(--text-secondary)]" />
                  </span>
                  <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
                    Sign in to view your invoices
                  </h1>
                  <p className="max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
                    Your saved invoices are stored securely in the cloud. Please log in to access your invoice history.
                  </p>
                  <Link
                    href="/login"
                    className={getAppButtonClass({ variant: "primary", size: "md" })}
                  >
                    Log in
                  </Link>
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={appPageShellClass}>
      <AppHeader rightSlot={<LogoutButton />} />

      <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
            {/* Header */}
            <MotionReveal className="mb-6" preset="fade-up">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[30px]">
                    Your Invoices
                  </h1>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} saved
                  </p>
                </div>
                <Link
                  href="/invoice/new"
                  className={getAppButtonClass({ variant: "primary", size: "sm" })}
                >
                  + New Invoice
                </Link>
              </div>
            </MotionReveal>

            {/* Loading state */}
            {loading ? (
              <MotionReveal className={`${appCardClass} p-8`} preset="fade-up">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] text-[color:var(--text-secondary)]">
                    <DocumentSparkIcon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    Loading invoices…
                  </p>
                </div>
              </MotionReveal>
            ) : invoices.length === 0 ? (
              /* Empty state */
              <MotionReveal className={`${appCardClass} p-8`} preset="fade-up">
                <div className="flex flex-col items-center gap-5 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]">
                    <DocumentSparkIcon className="h-6 w-6 text-[color:var(--text-secondary)]" />
                  </span>
                  <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
                    No invoices yet
                  </h2>
                  <p className="max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
                    Create your first invoice using the smart brief extraction flow, then save or export it to see it here.
                  </p>
                  <Link
                    href="/invoice/new"
                    className={getAppButtonClass({ variant: "primary", size: "md" })}
                  >
                    Create Invoice
                  </Link>
                </div>
              </MotionReveal>
            ) : (
              /* Invoice list */
              <MotionStagger className="space-y-3">
                {invoices.map((invoice) => (
                  <MotionReveal key={invoice.id} preset="fade-up">
                    <div className={`${appCardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="truncate text-base font-semibold text-[color:var(--text-primary)]">
                            {invoice.invoice_number}
                          </h3>
                          {getStatusBadge(invoice.status)}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[color:var(--text-muted)]">
                          {invoice.form_data?.client?.clientName ? (
                            <span>Client: {invoice.form_data.client.clientName}</span>
                          ) : null}
                          <span>Created {formatDate(invoice.created_at)} {formatTime(invoice.created_at)}</span>
                          {invoice.updated_at !== invoice.created_at ? (
                            <span>Updated {formatDate(invoice.updated_at)}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(invoice)}
                          className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(invoice.id)}
                          disabled={deletingId === invoice.id}
                          className={getAppButtonClass({ variant: "ghost", size: "sm" })}
                        >
                          {deletingId === invoice.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </MotionReveal>
                ))}
              </MotionStagger>
            )}

            {/* Back to home */}
            <MotionReveal className="mt-8" preset="fade-up" delay={20}>
              <Link
                href="/"
                className={getAppButtonClass({ variant: "ghost", size: "sm" })}
              >
                <span className="inline-flex items-center gap-2">
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back to Home
                </span>
              </Link>
            </MotionReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
