/**
 * ─── Client Directory Page ─────────────────────────
 *
 * Auth-gated page listing all saved clients with
 * search, add, edit, and delete. Clients are auto-saved
 * after invoice generation and can be re-used.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { MotionReveal, MotionButton, MotionStagger } from "@/components/ui/motion-primitives";
import {
  appGridClass,
  appPageContainerClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import {
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
  getAppStatusPillClass,
  appFieldLabelClass,
  appSectionTitleClass,
  cn,
} from "@/lib/ui-foundation";
import { ChevronLeftIcon } from "@/components/ui/app-icons";
import {
  listClients,
  deleteClient,
  type SavedClient,
} from "@/lib/supabase/clients";
import { supabase } from "@/lib/supabase/client";
import { playInteractionCue } from "@/lib/interaction-feedback";

/* ─── Client Card ─────────────────────────────────── */

function ClientCard({
  client,
  onDelete,
}: {
  client: SavedClient;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isInternational = client.client_location === "international";

  const handleDelete = async () => {
    if (!confirm(`Delete "${client.client_name}"? This also removes their MSAs.`)) return;
    setIsDeleting(true);
    const { error } = await deleteClient(client.id);
    if (!error) {
      playInteractionCue("saveSuccess");
      onDelete(client.id);
    }
    setIsDeleting(false);
  };

  return (
    <div className={`${getAppPanelClass()} group relative`}>
      {/* Location badge */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className={getAppStatusPillClass(isInternational ? "muted" : "default")}
        >
          {isInternational ? "🌍 International" : "🇮🇳 Domestic"}
        </span>
        {client.invoice_count > 0 && (
          <span className="text-[10px] font-medium text-[color:var(--text-muted)]">
            {client.invoice_count} invoice{client.invoice_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Client info */}
      <h3 className="text-[15px] font-semibold text-[color:var(--text-primary)]">
        {client.client_name || "Unnamed Client"}
      </h3>

      {client.client_email && (
        <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">
          {client.client_email}
        </p>
      )}

      <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[color:var(--text-secondary)]">
        {client.client_address || "No address"}
      </p>

      {(client.client_state || client.client_country) && (
        <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
          {isInternational ? client.client_country : `State: ${client.client_state}`}
        </p>
      )}

      {client.client_gstin && (
        <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
          GSTIN: {client.client_gstin}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--border-subtle)] pt-3">
        <Link
          href={`/clients/${client.id}`}
          className={getAppButtonClass({ variant: "subtle", size: "sm" })}
        >
          View & Edit
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={getAppButtonClass({ variant: "destructive-lite", size: "sm" })}
        >
          {isDeleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="mb-4 text-[48px]">📋</div>
      <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">No clients yet</h2>
      <p className="mt-1.5 max-w-sm text-[13px] text-[color:var(--text-muted)]">
        Clients are automatically saved when you create invoices.
        You can also add them manually.
      </p>
      <Link
        href="/invoice/new"
        className={`mt-4 ${getAppButtonClass({ variant: "primary" })}`}
      >
        Create an Invoice
      </Link>
    </div>
  );
}

/* ─── Search Icon ─────────────────────────────────── */

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/* ─── Main Page ───────────────────────────────────── */

export default function ClientsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setIsAuthenticated(true);

      const { data } = await listClients();
      setClients(data);
      setIsLoading(false);
    }
    init();
  }, []);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        c.client_email.toLowerCase().includes(q) ||
        c.client_address.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const handleDelete = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  if (isLoading) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[color:var(--text-muted)]">Loading clients…</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">Sign in to view your clients</p>
          <Link href="/login" className={getAppButtonClass({ variant: "primary" })}>
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={appPageShellClass}>
      <AppHeader />

      <section className={`${appPageContainerClass} py-5 sm:py-8`}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-10 lg:col-start-2">
            {/* Header */}
            <MotionReveal preset="fade-up">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Link
                    href="/"
                    className="mb-3 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                  >
                    <ChevronLeftIcon className="h-3.5 w-3.5" />
                    Home
                  </Link>
                  <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                    Clients
                  </h1>
                  <p className="mt-1 text-[13px] text-[color:var(--text-muted)]">
                    {clients.length} client{clients.length !== 1 ? "s" : ""} saved
                  </p>
                </div>

                {clients.length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search clients…"
                      className={`${getAppFieldClass()} !pl-9`}
                    />
                  </div>
                )}
              </div>
            </MotionReveal>

            {/* Content */}
            {clients.length === 0 ? (
              <MotionReveal preset="fade-up" delay={10}>
                <EmptyState />
              </MotionReveal>
            ) : (
              <MotionStagger>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
                {filteredClients.length === 0 && searchQuery && (
                  <div className="mt-8 text-center text-[13px] text-[color:var(--text-muted)]">
                    No clients matching &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </MotionStagger>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
