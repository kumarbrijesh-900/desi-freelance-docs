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
import { AppPagination } from "@/components/ui/AppPagination";
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
import { Marker } from "@/components/ui/Marker";
import { Pill } from "@/components/ui/Pill";
import { Sticker } from "@/components/ui/Sticker";
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
import {
  getClientSessionUser,
  withTimeoutFallback,
} from "@/lib/supabase/client";
import { playInteractionCue } from "@/lib/interaction-feedback";
import type { ClientDetails } from "@/types/invoice";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import { appFieldHelperTextClass } from "@/lib/ui-foundation";

/* ─── Section Label Component ─────────────────────── */

function FormSectionLabel({ title }: { title: string }) {
  return (
    <div className="mt-8 mb-4 border-b border-[color:var(--color-soft)] pb-2 first:mt-0">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.05em] text-[color:var(--color-ink-2)]">
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
  const [freeRevisionRounds, setFreeRevisionRounds] = useState(
    initial?.free_revision_rounds ?? 2,
  );
  const [extraRevisionFeePercent, setExtraRevisionFeePercent] = useState(
    initial?.extra_revision_fee_percent ?? 15,
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
      freeRevisionRounds: Number(freeRevisionRounds),
      extraRevisionFeePercent: Number(extraRevisionFeePercent),
    };

    const { data, error } = await upsertClient(details, initial?.id);
    if (error) {
      console.error("Failed to save client:", error);
      // TODO: replace with toast when the clients page gets app-wide notifications.
      console.warn(`Save failed: ${error}`);
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
        className="relative w-full sm:w-[560px] bg-white h-full flex flex-col shadow-[var(--brutal-shadow-lg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--color-soft)] p-6">
          <h3 className="text-lg font-bold text-[color:var(--color-ink)]">
            {initial ? "Edit Client" : "Add New Client"}
          </h3>
          <button
            onClick={onCancel}
            className="rounded-full p-2 text-[color:var(--color-ink-2)] hover:bg-[color:var(--color-paper-2)] hover:text-[color:var(--color-ink)] transition-colors"
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
                <div className="flex p-1 bg-[color:var(--color-paper)] border border-[color:var(--color-soft)]">
                  <button
                    type="button"
                    onClick={() => setClientEntityType("agency")}
                    className={cn(
                      "flex-1 py-1.5 text-[12px] font-bold transition-all",
                      clientEntityType === "agency"
                        ? "bg-white text-[color:var(--color-ink)] shadow-sm border border-[color:var(--color-soft)]"
                        : "text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)]",
                    )}
                  >
                    Agency / Biz
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientEntityType("freelancer")}
                    className={cn(
                      "flex-1 py-1.5 text-[12px] font-bold transition-all",
                      clientEntityType === "freelancer"
                        ? "bg-white text-[color:var(--color-ink)] shadow-sm border border-[color:var(--color-soft)]"
                        : "text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)]",
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
                      autoComplete="off"
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
              <div className="flex flex-wrap gap-4">
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>Terms</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={msaPaymentTermsDays}
                      onChange={(e) => setMsaPaymentTermsDays(Number(e.target.value))}
                      className={cn(fc({ hasValue: true }), "!w-20")}
                    />
                    <span className="text-[12px] text-[color:var(--color-ink-2)] shrink-0">days</span>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>Late Fee</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={msaLateFeeRate}
                      onChange={(e) => setMsaLateFeeRate(Number(e.target.value))}
                      className={cn(fc({ hasValue: true }), "!w-16")}
                    />
                    <span className="text-[12px] text-[color:var(--color-ink-2)] shrink-0">%</span>
                  </div>
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
                    className={cn(fc({ hasValue: Boolean(msaJurisdictionCity) }), "max-w-[200px]")}
                  />
                </div>
              </div>

              <div>
                {!showEffectiveDate ? (
                  <button
                    type="button"
                    onClick={() => setShowEffectiveDate(true)}
                    className="text-[12px] font-normal text-[color:var(--brand-indigo)] hover:underline"
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

              <FormSectionLabel title="REVISION POLICY" />
              <div className="flex flex-wrap gap-4">
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>Free Rounds</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={freeRevisionRounds}
                      onChange={(e) =>
                        setFreeRevisionRounds(Number(e.target.value))
                      }
                      className={cn(fc({ hasValue: true }), "!w-16")}
                    />
                    <span className="text-[12px] text-[color:var(--color-ink-2)] shrink-0">rounds</span>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className={appFieldLabelClass}>
                    Extra Fee Per Round
                  </label>
                  <p className="text-[10px] text-[color:var(--color-ink-2)] mb-1">
                    Example: With 2 free rounds and 15% fee, a ₹10,000 line item would cost ₹1,500 per extra revision round.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={extraRevisionFeePercent}
                      onChange={(e) =>
                        setExtraRevisionFeePercent(Number(e.target.value))
                      }
                      className={cn(fc({ hasValue: true }), "!w-20")}
                    />
                    <span className="text-[12px] text-[color:var(--color-ink-2)] shrink-0">% of line item</span>
                  </div>
                </div>
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
                      const revisionClause = `The quoted fee includes up to ${freeRevisionRounds} rounds of revisions per deliverable. Each additional round beyond the included ${freeRevisionRounds} will incur a surcharge of ${extraRevisionFeePercent}% of that specific line item's total.`;

                      const template = `Payment is due within ${msaPaymentTermsDays ?? 20} days. A late fee of ${msaLateFeeRate ?? 1.5}% ${unitLabel} applies to overdue balances. Intellectual Property rights transfer to the client ${ipLabel}. ${revisionClause}`;

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
        <div className="sticky bottom-0 border-t border-[color:var(--color-soft)] bg-white p-6 flex items-center justify-end gap-3">
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<SavedClient | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    let isActive = true;

    async function init() {
      const user = await withTimeoutFallback(getClientSessionUser(), 2000, null);
      if (!isActive) return;

      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      const { data, error } = await withTimeoutFallback(listClients(), 4000, {
        data: [] as SavedClient[],
        error: "Timed out while loading clients.",
      });
      if (!isActive) return;

      if (error && error !== "Not authenticated") {
        setLoadError(error);
      }

      setClients(data ?? []);
      setIsLoading(false);
    }

    void init();

    return () => {
      isActive = false;
    };
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

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      // TODO: replace with toast when the clients page gets app-wide notifications.
      console.warn(`Delete failed: ${error}`);
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
          <p className="text-[color:var(--color-ink-2)]">Loading clients…</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-black tracking-tight text-[color:var(--color-ink)]">
            Could not load your clients
          </p>
          <p className="max-w-md text-[13px] leading-6 text-[color:var(--color-ink-2)]">
            {loadError} Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={getAppButtonClass({ variant: "primary" })}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-black tracking-tight text-[color:var(--color-ink)]">
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

      <section className={`${appPageContainerClass} max-w-[1200px] mx-auto pt-8 pb-24 relative overflow-x-hidden`}>
        {/* Floating sticker */}
        <div className="absolute top-[80px] right-0 z-10 hidden lg:block">
          <Sticker rotate={-6} tone="butter">✦ {clients.length} active</Sticker>
        </div>

        {/* Header */}
        <div className="flex justify-between items-end mb-7">
          <div>
            <div className="flex gap-2 mb-3 items-center">
              <div className="px-3 py-1 bg-grass text-white text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">{clients.filter(c => c.invoice_count && c.invoice_count > 0).length} ACTIVE</div>
              <div className="px-3 py-1 bg-sky text-white text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">{clients.filter(c => c.client_type === 'international').length} INTL</div>
              <div className="px-3 py-1 bg-butter text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">{clients.filter(c => !c.gstin && c.client_type !== 'international').length} NO GSTIN</div>
            </div>
            <h1 className="font-display font-black text-[80px] leading-[0.8] mb-3 text-ink">
              Your roster
            </h1>
            <div className="text-[13px] font-extrabold uppercase tracking-widest text-ink/70">
              Every client, their MSA, their tax setup. One place.
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <button
              className="border-2 border-ink bg-white px-6 py-3.5 text-sm font-black uppercase tracking-widest text-ink transition-all hover:-translate-x-[2px] hover:-translate-y-[2px] shadow-[4px_4px_0_var(--color-rule)] hover:shadow-[6px_6px_0_var(--color-rule)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none whitespace-nowrap"
            >
              ↑ IMPORT CSV
            </button>
            <button
              onClick={handleAddNew}
              className="border-2 border-ink bg-ink px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_var(--color-rule)] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_var(--color-rule)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none whitespace-nowrap"
            >
              + ADD CLIENT
            </button>
          </div>
        </div>

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

        {/* Stat strip — calm tan (canonical: tan cards + one ink hero) */}
        <div className="flex flex-wrap gap-4 mb-6">
          {[
            { l: "Clients", v: `${clients.length}`, s: "in your roster", hero: true },
            { l: "MSAs signed", v: `${clients.filter(c => c.msa_effective_date).length} of ${clients.length}`, s: "contracts on file", hero: false },
            { l: "Repeat clients", v: `${clients.filter(c => c.invoice_count && c.invoice_count > 1).length}`, s: "billed more than once", hero: false },
          ].map((s, i) => (
            <div key={i} className={`p-5 border-2 border-ink shadow-[var(--elev-1)] ${s.hero ? 'flex-[1.5] bg-ink text-acc-ink' : 'flex-1 bg-paper text-ink'}`}>
              <div className={`text-[11px] font-extrabold uppercase tracking-widest mb-1 ${s.hero ? 'opacity-70' : 'opacity-85'}`}>{s.l}</div>
              <div className={`font-black mb-1 ${s.hero ? 'text-[34px] leading-none' : 'text-2xl'}`}>{s.v}</div>
              <div className={`text-[11px] font-extrabold uppercase tracking-widest ${s.hero ? 'opacity-70' : 'opacity-75'}`}>{s.s}</div>
            </div>
          ))}
        </div>

        {/* Filter / Search strip */}
        <div className="flex gap-3 mb-4">
          <div className="relative grow border-2 border-ink shadow-[3px_3px_0_var(--color-rule)] bg-white">
            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="⌕ Search clients by name, email or GSTIN…"
              className="w-full h-full pl-10 pr-4 py-3 bg-transparent font-bold text-sm focus:outline-none placeholder:text-ink/50"
            />
          </div>
          <div className="relative w-[180px] border-2 border-ink shadow-[3px_3px_0_var(--color-rule)] bg-white">
            <select className="w-full h-full px-4 py-3 bg-transparent font-bold text-sm focus:outline-none appearance-none uppercase text-[11px] tracking-widest">
              <option>Location · All ▼</option>
              <option>Domestic</option>
              <option>International</option>
            </select>
          </div>
          <div className="relative w-[180px] border-2 border-ink shadow-[3px_3px_0_var(--color-rule)] bg-white">
            <select className="w-full h-full px-4 py-3 bg-transparent font-bold text-sm focus:outline-none appearance-none uppercase text-[11px] tracking-widest">
              <option>Type · All ▼</option>
              <option>Agency</option>
              <option>Individual</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="border-2 border-ink shadow-[4px_4px_0_var(--color-rule)] bg-white overflow-hidden mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-paper-2 border-b-2 border-ink text-[10px] font-extrabold uppercase tracking-widest text-ink">
                <th className="py-3 px-6 w-[240px] border-r-2 border-ink">Client</th>
                <th className="py-3 px-6 border-r-2 border-ink">Email</th>
                <th className="py-3 px-6 border-r-2 border-ink">City</th>
                <th className="py-3 px-6 border-r-2 border-ink">GSTIN</th>
                <th className="py-3 px-6 border-r-2 border-ink">Type</th>
                <th className="py-3 px-6 w-[80px] text-right border-r-2 border-ink">Invoices</th>
                <th className="py-3 px-6 w-[120px] text-right border-r-2 border-ink">MSA</th>
                <th className="py-3 px-4 w-[100px] text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="text-[14px] font-bold text-ink/60 uppercase tracking-widest">No clients found. Add one above!</div>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, i) => {
                  const initial = (client.client_name || "U").slice(0, 2).toUpperCase();
                  const bgColors = ["bg-rose", "bg-grass", "bg-sky", "bg-lav", "bg-butter", "bg-coral"];
                  const avatarBg = bgColors[i % bgColors.length];
                  const msaOk = client.msa_effective_date;

                  return (
                    <tr key={client.id} className="border-b-2 border-ink last:border-b-0 hover:bg-paper-2 transition-colors cursor-pointer group" onClick={() => window.location.href = `/clients/${client.id}`}>
                      <td className="py-4 px-6 border-r-2 border-ink">
                        <div className="flex items-center gap-3">
                          <div className={`shrink-0 w-[32px] h-[32px] rounded-full border-[1.5px] border-ink flex items-center justify-center text-[11px] font-black ${avatarBg} text-ink shadow-[2px_2px_0_var(--color-rule)]`}>
                            {initial}
                          </div>
                          <div className="font-bold text-[13px] uppercase tracking-wide group-hover:underline">{client.client_name}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 border-r-2 border-ink">
                        <span className="text-[12px] font-bold uppercase tracking-widest text-ink/70">{client.client_email || "—"}</span>
                      </td>
                      <td className="py-4 px-6 border-r-2 border-ink">
                        <span className="text-[12px] font-bold uppercase tracking-widest text-ink/70">{client.city || client.state || "—"}</span>
                      </td>
                      <td className="py-4 px-6 border-r-2 border-ink">
                        {client.gstin ? (
                          <span className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest border border-ink bg-transparent text-ink">{client.gstin}</span>
                        ) : (
                          <span className="text-[12px] font-bold uppercase tracking-widest text-ink/40">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 border-r-2 border-ink">
                        <span className={`px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest border-2 border-ink ${client.client_type === "international" ? "bg-sky text-white" : "bg-transparent text-ink"}`}>
                          {client.client_type === "international" ? "INTL" : "INDIA"}
                        </span>
                      </td>
                      <td className="py-4 px-6 border-r-2 border-ink text-right">
                        <span className="font-black text-[14px] text-ink">{client.invoice_count || 0}</span>
                      </td>
                      <td className="py-4 px-6 border-r-2 border-ink text-right">
                        {msaOk ? (
                          <span className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest border-2 border-ink bg-grass text-white shadow-[2px_2px_0_var(--color-rule)]">✓ SIGNED</span>
                        ) : (
                          <span className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest border border-ink bg-butter text-ink">PENDING</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteRequest(client.id); }} 
                            className="p-1.5 border-2 border-transparent hover:border-coral hover:bg-coral hover:text-white text-coral transition-all"
                            title="Delete Client"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(client); }} 
                            className="p-1.5 border-2 border-transparent group-hover:border-ink group-hover:bg-white text-ink transition-all"
                            title="Edit Client"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination below table */}
        {filteredClients.length > 0 && (
          <div className="flex justify-between items-center mb-12">
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
                <option value={50}>50</option>
              </select>
            </div>
            <AppPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </section>

      {/* ── Delete Confirmation Dialog ── */}
      {deletingClientId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm border-[3px] border-black bg-white shadow-[6px_6px_0_#111118] p-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-[#111118] mb-2">Delete client?</h3>
            <p className="text-sm font-bold text-neutral-600 mb-5">
              This will permanently delete this client. Invoices associated with this client will not be deleted but they will lose the client association.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="border-2 border-black bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-[3px_3px_0_#111118] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="border-[3px] border-black bg-coral px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-[4px_4px_0_#111118] hover:bg-red-600 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
