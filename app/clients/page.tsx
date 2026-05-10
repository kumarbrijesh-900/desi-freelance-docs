/**
 * ─── Client Directory Page ─────────────────────────
 *
 * Auth-gated page listing all saved clients in a
 * professional table view with a slide-out drawer
 * for adding and editing client details.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import {
  MotionReveal,
  MotionButton,
  AnimatePresence,
  motion,
} from "@/components/ui/motion-primitives";
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
  upsertClient,
  deleteClient,
  type SavedClient,
} from "@/lib/supabase/clients";
import { createMsa } from "@/lib/supabase/msas";
import { supabase } from "@/lib/supabase/client";
import { playInteractionCue } from "@/lib/interaction-feedback";
import type { ClientDetails } from "@/types/invoice";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import { appFieldHelperTextClass } from "@/lib/ui-foundation";

/* ─── Section Label Component ─────────────────────── */

function FormSectionLabel({ title }: { title: string }) {
  return (
    <div className="mt-8 mb-4 border-b border-gray-100 pb-2 first:mt-0">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {title}
      </h4>
    </div>
  );
}

/* ─── Add / Edit Client Form ─────────────────────── */

function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: SavedClient | null;
  onSave: (client: SavedClient) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.client_name || "");
  const [email, setEmail] = useState(initial?.client_email || "");
  const [address, setAddress] = useState(initial?.client_address || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "");
  const [gstin, setGstin] = useState(initial?.gstin || "");
  const [location, setLocation] = useState(initial?.client_type || "domestic");
  const [clientEntityType, setClientEntityType] = useState<
    "agency" | "freelancer"
  >((initial?.client_entity_type as "agency" | "freelancer") || "agency");
  const [country, setCountry] = useState(initial?.country || "");
  const [msaEffectiveDate, setMsaEffectiveDate] = useState(
    initial?.msa_effective_date || "",
  );
  const [msaPaymentTermsDays, setMsaPaymentTermsDays] = useState(
    initial?.msa_payment_terms_days || 20,
  );
  const [msaLateFeeRate, setMsaLateFeeRate] = useState(
    initial?.msa_late_fee_rate || 1.5,
  );
  const [msaLateFeeUnit, setMsaLateFeeUnit] = useState<
    "monthly" | "annually" | "daily"
  >((initial?.msa_late_fee_unit as any) || "monthly");
  const [msaIpTriggerType, setMsaIpTriggerType] = useState(
    initial?.msa_ip_trigger_type || "upon_full_payment",
  );
  const [msaJurisdictionCity, setMsaJurisdictionCity] = useState(
    initial?.msa_jurisdiction_city || "Bangalore",
  );
  const [msaNotesBoilerplate, setMsaNotesBoilerplate] = useState(
    initial?.msa_notes_boilerplate || "",
  );
  const [showMsaTooltip, setShowMsaTooltip] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEffectiveDate, setShowEffectiveDate] = useState(false);

  const fc = getAppFieldClass;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    const details: ClientDetails = {
      clientName: name.trim(),
      clientEmail: email.trim(),
      clientAddress: address.trim(),
      clientAddressLine1: "",
      clientAddressLine2: "",
      clientCity: city.trim(),
      clientPinCode: "",
      clientPostalCode: "",
      clientState: state as ClientDetails["clientState"],
      clientCountry: country as ClientDetails["clientCountry"],
      clientCurrency: "",
      clientGstin: gstin.trim(),
      clientLocation: location as ClientDetails["clientLocation"],
      clientType: clientEntityType,
      isClientSezUnit: "",
      msaEffectiveDate: msaEffectiveDate || undefined,
      msaPaymentTermsDays: Number(msaPaymentTermsDays),
      msaLateFeeRate: Number(msaLateFeeRate),
      msaLateFeeUnit,
      msaIpTriggerType: msaIpTriggerType as ClientDetails["msaIpTriggerType"],
      msaJurisdictionCity,
      msaVersionLabel: initial?.msa_version_label || "Standard MSA v1.2",
      msaNotesBoilerplate: msaNotesBoilerplate.trim() || undefined,
    };

    const { data, error } = await upsertClient(details, initial?.id);
    if (error) {
      console.error("Failed to save client:", error);
      alert(`Save failed: ${error}`);
      setIsSaving(false);
      return;
    }
    if (data) {
      if (msaNotesBoilerplate.trim() && !initial) {
        const msaResult = await createMsa({
          clientId: data.id,
          title: "Master Service Agreement",
          content: msaNotesBoilerplate.trim(),
          status: "draft",
        });
        if (msaResult.error) {
          console.error("MSA creation failed:", msaResult.error);
        }
      }
      playInteractionCue("saveSuccess");
      onSave(data);
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/30"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full sm:w-[560px] bg-white h-full flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h3 className="text-lg font-bold text-[color:var(--text-primary)]">
            {initial ? "Edit Client" : "Add New Client"}
          </h3>
          <button
            onClick={onCancel}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <form id="client-form" onSubmit={handleSubmit}>
            <FormSectionLabel title="CLIENT INFO" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={appFieldLabelClass}>
                  Client / Company Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Studios"
                  required
                  className={fc({ hasValue: Boolean(name) })}
                />
              </div>

              <div>
                <label className={appFieldLabelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@acme.com"
                  className={fc({ hasValue: Boolean(email) })}
                />
              </div>

              <div>
                <label className={appFieldLabelClass}>Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={fc({ hasValue: true, isSelect: true })}
                >
                  <option value="domestic">🇮🇳 Domestic (India)</option>
                  <option value="international">🌍 International</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={appFieldLabelClass}>Entity Type</label>
                <div className="flex p-1 bg-gray-50 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setClientEntityType("agency")}
                    className={cn(
                      "flex-1 py-1.5 text-[12px] font-bold rounded-md transition-all",
                      clientEntityType === "agency"
                        ? "bg-white text-[color:var(--text-primary)] shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    Agency / Biz
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientEntityType("freelancer")}
                    className={cn(
                      "flex-1 py-1.5 text-[12px] font-bold rounded-md transition-all",
                      clientEntityType === "freelancer"
                        ? "bg-white text-[color:var(--text-primary)] shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    Individual
                  </button>
                </div>
              </div>
            </div>

            <FormSectionLabel title="ADDRESS" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={appFieldLabelClass}>Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full address"
                  className={fc({ hasValue: Boolean(address) })}
                />
              </div>

              <div>
                <label className={appFieldLabelClass}>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className={fc({ hasValue: Boolean(city) })}
                />
              </div>

              {location === "domestic" ? (
                <>
                  <div>
                    <label className={appFieldLabelClass}>State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={fc({ hasValue: Boolean(state), isSelect: true })}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={appFieldLabelClass}>
                      GSTIN {clientEntityType === "agency" && "*"}
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 27AAACR5055K1ZK"
                      maxLength={15}
                      required={clientEntityType === "agency"}
                      className={fc({ hasValue: Boolean(gstin) })}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className={appFieldLabelClass}>Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States"
                    className={fc({ hasValue: Boolean(country) })}
                  />
                </div>
              )}
            </div>

            <FormSectionLabel title="MSA DEFAULTS" />
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>Terms (Days)</label>
                  <input
                    type="number"
                    value={msaPaymentTermsDays}
                    onChange={(e) => setMsaPaymentTermsDays(Number(e.target.value))}
                    className={fc({ hasValue: true })}
                  />
                </div>
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>Late Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={msaLateFeeRate}
                    onChange={(e) => setMsaLateFeeRate(Number(e.target.value))}
                    className={fc({ hasValue: true })}
                  />
                </div>
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>Unit</label>
                  <select
                    value={msaLateFeeUnit}
                    onChange={(e) => setMsaLateFeeUnit(e.target.value as any)}
                    className={cn(fc({ hasValue: true, isSelect: true }), "min-w-[130px]")}
                    style={{ minWidth: '130px' }}
                  >
                    <option value="monthly">monthly</option>
                    <option value="annually">annually</option>
                    <option value="daily">per day</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>IP Trigger</label>
                  <select
                    value={msaIpTriggerType}
                    onChange={(e) => setMsaIpTriggerType(e.target.value as any)}
                    className={fc({ hasValue: true, isSelect: true })}
                  >
                    <option value="upon_full_payment">Upon Full Payment</option>
                    <option value="upon_signing">Upon Signing</option>
                    <option value="upon_delivery">Upon Delivery</option>
                    <option value="proportional_transfer">
                      Proportional
                    </option>
                    <option value="retained_by_creator">
                      License Only
                    </option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>Jurisdiction</label>
                  <input
                    type="text"
                    value={msaJurisdictionCity}
                    onChange={(e) => setMsaJurisdictionCity(e.target.value)}
                    placeholder="e.g. Bangalore"
                    className={fc({ hasValue: Boolean(msaJurisdictionCity) })}
                  />
                </div>
              </div>

              <div>
                {!showEffectiveDate ? (
                  <button
                    type="button"
                    onClick={() => setShowEffectiveDate(true)}
                    className="text-[12px] font-medium text-[color:var(--brand-indigo)] hover:underline"
                  >
                    Set effective date →
                  </button>
                ) : (
                  <div>
                    <label className={appFieldLabelClass}>MSA Effective Date</label>
                    <input
                      type="date"
                      value={msaEffectiveDate}
                      onChange={(e) => setMsaEffectiveDate(e.target.value)}
                      className={fc({ hasValue: Boolean(msaEffectiveDate) })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={appFieldLabelClass}>
                    Default Notes / Boilerplate
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const ipLabels: Record<string, string> = {
                        upon_full_payment: "upon full payment",
                        upon_signing: "upon signing",
                        upon_delivery: "upon delivery",
                        proportional_transfer: "proportionally per milestone",
                        retained_by_creator:
                          "retained by the creator (limited license)",
                      };
                      const ipLabel =
                        ipLabels[msaIpTriggerType] || ipLabels.upon_full_payment;

                      const unitLabels: Record<string, string> = {
                        monthly: "monthly",
                        annually: "annually",
                        daily: "per day",
                      };
                      const unitLabel =
                        unitLabels[msaLateFeeUnit] || unitLabels.monthly;

                      const template = `Payment is due within ${msaPaymentTermsDays ?? 20} days. A late fee of ${msaLateFeeRate ?? 1.5}% ${unitLabel} applies to overdue balances. Intellectual Property rights transfer to the client ${ipLabel}.`;

                      setMsaNotesBoilerplate(template);
                    }}
                    className="text-[11px] font-bold text-[color:var(--brand-indigo)] hover:text-[#4338CA] transition-colors"
                  >
                    + Generate Smart Template
                  </button>
                </div>
                <textarea
                  value={msaNotesBoilerplate}
                  onChange={(e) => setMsaNotesBoilerplate(e.target.value)}
                  rows={4}
                  placeholder="These notes will be pre-filled in the invoice editor..."
                  className={fc({
                    hasValue: Boolean(msaNotesBoilerplate),
                    multiline: true,
                  })}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-100 bg-white p-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={getAppButtonClass({ variant: "ghost" })}
          >
            Cancel
          </button>
          <MotionButton
            type="submit"
            form="client-form"
            disabled={isSaving || !name.trim()}
            className={getAppButtonClass({ variant: "primary" })}
          >
            {isSaving ? "Saving…" : initial ? "Update Client" : "Save Client"}
          </MotionButton>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Search Icon ─────────────────────────────────── */

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/* ─── Plus Icon ───────────────────────────────────── */

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* ─── Edit Icon ───────────────────────────────────── */

function EditIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/* ─── Trash Icon ──────────────────────────────────── */

function TrashIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/* ─── X Mark Icon ─────────────────────────────────── */

function XMarkIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* ─── Main Page ───────────────────────────────────── */

export default function ClientsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<SavedClient | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        c.city.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

  const handleSave = (saved: SavedClient) => {
    setClients((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? saved : c));
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditingClient(null);
  };

  const handleEdit = (client: SavedClient) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDeleteRequest = (clientId: string) => {
    setDeletingClientId(clientId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClientId) return;
    const { error } = await deleteClient(deletingClientId);
    if (error) {
      console.error("Failed to delete client:", error);
      alert(`Delete failed: ${error}`);
      setDeletingClientId(null);
      return;
    }
    playInteractionCue("saveSuccess");
    setClients((prev) => prev.filter((c) => c.id !== deletingClientId));
    setDeletingClientId(null);
  };

  const handleDeleteCancel = () => {
    setDeletingClientId(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setShowForm(true);
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
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">
            Sign in to manage your clients
          </p>
          <Link
            href="/login"
            className={getAppButtonClass({ variant: "primary" })}
          >
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
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                    Clients
                  </h1>
                  {clients.length > 0 && (
                    <p className="mt-1 text-[13px] text-[color:var(--text-muted)]">
                      {clients.length} client{clients.length !== 1 ? "s" : ""}{" "}
                      saved
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {clients.length > 0 && (
                    <div className="relative w-full sm:w-56">
                      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search…"
                        className={`${getAppFieldClass()} !pl-9`}
                      />
                    </div>
                  )}
                  <MotionButton
                    onClick={handleAddNew}
                    className={getAppButtonClass({ variant: "primary" })}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Client
                  </MotionButton>
                </div>
              </div>
            </MotionReveal>

            {/* Add / Edit Drawer */}
            <AnimatePresence>
              {showForm && (
                <ClientForm
                  key={editingClient?.id ?? "new"}
                  initial={editingClient}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              )}
            </AnimatePresence>

            {/* Table */}
            <MotionReveal preset="fade-up" delay={10}>
              {clients.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center gap-5 py-16 text-center rounded-xl border border-[color:var(--border-default)] bg-white shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F3FF]">
                    <svg className="h-7 w-7 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
                      Add your first client
                    </h2>
                    <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-[color:var(--text-muted)]">
                      Save client details here so they auto-fill when you create invoices. No more retyping names, addresses, or GSTINs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className={getAppButtonClass({
                      variant: "primary",
                      size: "md",
                    })}
                  >
                    + Add Client
                  </button>
                </div>
              ) : (
                /* Client table */
                <div className="overflow-visible rounded-[var(--app-radius-card)] border border-[color:var(--border-subtle)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-muted)]">
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                            Client Name
                          </th>
                          <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)] sm:table-cell">
                            Email
                          </th>
                          <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:table-cell">
                            City
                          </th>
                          <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:table-cell">
                            GSTIN
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                            Type
                          </th>
                          <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)] lg:table-cell">
                            Invoices
                          </th>
                          <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClients.map((client, idx) => (
                          <tr
                            key={client.id}
                            className={cn(
                              "group transition-colors hover:bg-[color:var(--bg-surface-muted)]",
                              idx < filteredClients.length - 1 &&
                                "border-b border-[color:var(--border-subtle)]",
                            )}
                          >
                            {/* Name */}
                            <td className="px-4 py-3">
                              <Link
                                href={`/clients/${client.id}`}
                                className="text-[13px] font-semibold text-[color:var(--text-primary)] hover:text-[color:var(--brand-indigo)] transition-colors"
                              >
                                {client.client_name || "Unnamed"}
                              </Link>
                              {/* Mobile: show email below name */}
                              {client.client_email && (
                                <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)] sm:hidden">
                                  {client.client_email}
                                </p>
                              )}
                            </td>

                            {/* Email */}
                            <td className="hidden px-4 py-3 text-[12px] text-[color:var(--text-secondary)] sm:table-cell">
                              {client.client_email || "—"}
                            </td>

                            {/* City */}
                            <td className="hidden px-4 py-3 text-[12px] text-[color:var(--text-secondary)] md:table-cell">
                              {client.city || client.state || "—"}
                            </td>

                            {/* GSTIN */}
                            <td className="hidden px-4 py-3 md:table-cell">
                              {client.gstin ? (
                                <span className="rounded bg-[color:var(--bg-surface-muted)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--text-secondary)]">
                                  {client.gstin}
                                </span>
                              ) : (
                                <span className="text-[12px] text-[color:var(--text-muted)]">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Location badge */}
                            <td className="px-4 py-3">
                              <span
                                className={getAppStatusPillClass(
                                  client.client_type === "international"
                                    ? "muted"
                                    : "default",
                                )}
                              >
                                {client.client_type === "international"
                                  ? "Intl"
                                  : "India"}
                              </span>
                            </td>

                            {/* Invoice count */}
                            <td className="hidden px-4 py-3 text-center text-[12px] text-[color:var(--text-secondary)] lg:table-cell">
                              {client.invoice_count || 0}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              {deletingClientId === client.id ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-[11px] text-red-500 font-medium mr-1">
                                    Delete?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleDeleteConfirm}
                                    className="inline-flex h-7 items-center justify-center rounded-md bg-red-500 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-red-600"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDeleteCancel}
                                    className="inline-flex h-7 items-center justify-center rounded-md border border-[color:var(--border-subtle)] px-2.5 text-[11px] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-surface-muted)]"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(client)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-surface-muted)] hover:text-[color:var(--text-primary)]"
                                    title="Edit"
                                  >
                                    <EditIcon />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteRequest(client.id)
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                                    title="Delete"
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* No search results */}
                  {filteredClients.length === 0 && searchQuery && (
                    <div className="border-t border-[color:var(--border-subtle)] px-4 py-8 text-center text-[13px] text-[color:var(--text-muted)]">
                      No clients matching &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </MotionReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
