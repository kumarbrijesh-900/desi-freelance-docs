/**
 * ─── Client Detail + MSA Page ──────────────────────
 *
 * Single client view with editable details at top
 * and MSA (Master Service Agreement) management below.
 * MSAs are plain text documents with status tracking.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { MotionReveal, MotionButton, SuccessPulse } from "@/components/ui/motion-primitives";
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
  appSectionDescriptionClass,
  appFieldHelperTextClass,
  cn,
} from "@/lib/ui-foundation";
import { ChevronLeftIcon, SaveIcon } from "@/components/ui/app-icons";
import {
  getClient,
  upsertClient,
  type SavedClient,
} from "@/lib/supabase/clients";
import {
  listClientMsas,
  createMsa,
  updateMsa,
  deleteMsa,
  type ClientMsa,
  type MsaStatus,
} from "@/lib/supabase/msas";
import { supabase } from "@/lib/supabase/client";
import { playInteractionCue } from "@/lib/interaction-feedback";
import type { ClientDetails } from "@/types/invoice";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";

/* ─── MSA Card ────────────────────────────────────── */

function MsaCard({
  msa,
  onUpdate,
  onDelete,
}: {
  msa: ClientMsa;
  onUpdate: (updated: ClientMsa) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(msa.title);
  const [content, setContent] = useState(msa.content);
  const [status, setStatus] = useState<MsaStatus>(msa.status);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const { data, error } = await updateMsa(msa.id, { title, content, status });
    if (data) {
      onUpdate(data);
      playInteractionCue("saveSuccess");
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this MSA?")) return;
    const { error } = await deleteMsa(msa.id);
    if (!error) {
      playInteractionCue("saveSuccess");
      onDelete(msa.id);
    }
  };

  const statusColor = (s: MsaStatus) =>
    s === "active" ? "success" : s === "expired" ? "muted" : "default";

  const fc = getAppFieldClass;

  if (isEditing) {
    return (
      <div className={`${getAppPanelClass()} border-l-[3px] border-l-[color:var(--color-lime-400)]`}>
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_140px]">
          <div>
            <label className={appFieldLabelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fc({ hasValue: Boolean(title) })}
            />
          </div>
          <div>
            <label className={appFieldLabelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MsaStatus)}
              className={fc({ hasValue: true, isSelect: true })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
        <div>
          <label className={appFieldLabelClass}>Agreement Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="Paste or type your Master Service Agreement here…"
            className={fc({ hasValue: Boolean(content), multiline: true })}
          />
          <p className={appFieldHelperTextClass}>
            Supports plain text. This will be shown to your client when they open the shared invoice link.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <MotionButton
            onClick={handleSave}
            disabled={isSaving}
            className={getAppButtonClass({ variant: "primary", size: "sm" })}
          >
            {isSaving ? "Saving…" : "Save MSA"}
          </MotionButton>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className={getAppButtonClass({ variant: "ghost", size: "sm" })}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={getAppPanelClass()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[color:var(--text-primary)]">{msa.title}</h3>
            <span className={getAppStatusPillClass(statusColor(msa.status))}>
              {msa.status}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
            Updated {new Date(msa.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {msa.content && (
        <div className="mt-3 max-h-32 overflow-hidden rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-muted)] px-3 py-2">
          <p className="line-clamp-4 whitespace-pre-wrap text-[12px] leading-5 text-[color:var(--text-secondary)]">
            {msa.content}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={getAppButtonClass({ variant: "subtle", size: "sm" })}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={getAppButtonClass({ variant: "destructive-lite", size: "sm" })}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────── */

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<SavedClient | null>(null);
  const [msas, setMsas] = useState<ClientMsa[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [isAddingMsa, setIsAddingMsa] = useState(false);
  const [newMsaTitle, setNewMsaTitle] = useState("Master Service Agreement");
  const [newMsaContent, setNewMsaContent] = useState("");

  // Editable client fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientState, setClientState] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [clientLocation, setClientLocation] = useState("domestic");

  useEffect(() => {
    async function init() {
      if (!clientId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const [clientRes, msaRes] = await Promise.all([
        getClient(clientId),
        listClientMsas(clientId),
      ]);

      if (clientRes.data) {
        const c = clientRes.data;
        setClient(c);
        setClientName(c.client_name);
        setClientEmail(c.client_email);
        setClientAddress(c.client_address);
        setClientState(c.client_state);
        setClientGstin(c.client_gstin);
        setClientLocation(c.client_location);
      }
      setMsas(msaRes.data);
      setIsLoading(false);
    }
    init();
  }, [clientId]);

  const handleSaveClient = async () => {
    if (!client) return;
    setSaveState("saving");
    playInteractionCue("stepComplete");

    const details: ClientDetails = {
      clientName,
      clientEmail,
      clientAddress,
      clientAddressLine1: "",
      clientAddressLine2: "",
      clientCity: "",
      clientPinCode: "",
      clientPostalCode: "",
      clientState: clientState as ClientDetails["clientState"],
      clientCountry: "",
      clientCurrency: "",
      clientGstin,
      clientLocation: clientLocation as ClientDetails["clientLocation"],
      isClientSezUnit: "",
    };

    const { data, error } = await upsertClient(details, client.id);
    if (data) {
      setClient(data);
      setSaveState("saved");
      playInteractionCue("saveSuccess");
      setTimeout(() => setSaveState("idle"), 2500);
    } else {
      setSaveState("idle");
    }
  };

  const handleAddMsa = async () => {
    if (!clientId) return;
    const { data, error } = await createMsa({
      clientId,
      title: newMsaTitle,
      content: newMsaContent,
    });
    if (data) {
      setMsas((prev) => [data, ...prev]);
      setIsAddingMsa(false);
      setNewMsaTitle("Master Service Agreement");
      setNewMsaContent("");
      playInteractionCue("saveSuccess");
    }
  };

  const handleUpdateMsa = (updated: ClientMsa) => {
    setMsas((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleDeleteMsa = (id: string) => {
    setMsas((prev) => prev.filter((m) => m.id !== id));
  };

  const fc = getAppFieldClass;

  if (isLoading) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[color:var(--text-muted)]">Loading…</p>
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-[color:var(--text-muted)]">Client not found.</p>
          <Link href="/clients" className={getAppButtonClass({ variant: "secondary" })}>
            Back to Clients
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={appPageShellClass}>
      <AppHeader
        rightSlot={
          <MotionButton
            onClick={handleSaveClient}
            disabled={saveState === "saving"}
            className={getAppButtonClass({ variant: "primary" })}
          >
            {saveState === "saving" ? (
              "Saving…"
            ) : saveState === "saved" ? (
              <SuccessPulse>✓ Saved!</SuccessPulse>
            ) : (
              <>
                <SaveIcon className="h-4 w-4" />
                Save Client
              </>
            )}
          </MotionButton>
        }
      />

      <section className={`${appPageContainerClass} py-5 sm:py-8`}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-8 lg:col-start-3">
            {/* Header */}
            <MotionReveal preset="fade-up">
              <Link
                href="/clients"
                className="mb-3 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
                All Clients
              </Link>
              <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                {clientName || "Client"}
              </h1>
            </MotionReveal>

            {/* Client Details */}
            <MotionReveal preset="fade-up" delay={10}>
              <div className={`${getAppPanelClass()} mb-4 mt-5`}>
                <h2 className={appSectionTitleClass}>
                  <span className="mr-2">👤</span>
                  Client Details
                </h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={appFieldLabelClass}>Name</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className={fc({ hasValue: Boolean(clientName) })}
                    />
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className={fc({ hasValue: Boolean(clientEmail) })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={appFieldLabelClass}>Address</label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className={fc({ hasValue: Boolean(clientAddress) })}
                    />
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Location</label>
                    <select
                      value={clientLocation}
                      onChange={(e) => setClientLocation(e.target.value)}
                      className={fc({ hasValue: true, isSelect: true })}
                    >
                      <option value="domestic">Domestic (India)</option>
                      <option value="international">International</option>
                    </select>
                  </div>
                  {clientLocation === "domestic" && (
                    <>
                      <div>
                        <label className={appFieldLabelClass}>State</label>
                        <select
                          value={clientState}
                          onChange={(e) => setClientState(e.target.value)}
                          className={fc({ hasValue: Boolean(clientState), isSelect: true })}
                        >
                          <option value="">Select state</option>
                          {INDIA_STATE_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={appFieldLabelClass}>GSTIN</label>
                        <input
                          type="text"
                          value={clientGstin}
                          onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                          maxLength={15}
                          className={fc({ hasValue: Boolean(clientGstin) })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </MotionReveal>

            {/* MSA Section */}
            <MotionReveal preset="fade-up" delay={20}>
              <div className="mb-4">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className={appSectionTitleClass}>
                      <span className="mr-2">📄</span>
                      Service Agreements
                    </h2>
                    <p className={`mt-1 ${appSectionDescriptionClass}`}>
                      {msas.length} MSA{msas.length !== 1 ? "s" : ""} · Shown to clients on shared invoice links
                    </p>
                  </div>
                  {!isAddingMsa && (
                    <MotionButton
                      onClick={() => setIsAddingMsa(true)}
                      className={getAppButtonClass({ variant: "secondary", size: "sm" })}
                    >
                      + Add MSA
                    </MotionButton>
                  )}
                </div>

                {/* Add MSA form */}
                {isAddingMsa && (
                  <div className={`${getAppPanelClass()} mt-4 border-l-[3px] border-l-[color:var(--color-lime-400)]`}>
                    <div className="mb-3">
                      <label className={appFieldLabelClass}>Title</label>
                      <input
                        type="text"
                        value={newMsaTitle}
                        onChange={(e) => setNewMsaTitle(e.target.value)}
                        className={fc({ hasValue: Boolean(newMsaTitle) })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className={appFieldLabelClass}>Agreement Content</label>
                      <textarea
                        value={newMsaContent}
                        onChange={(e) => setNewMsaContent(e.target.value)}
                        rows={10}
                        placeholder="Paste or type your Master Service Agreement…"
                        className={fc({ hasValue: Boolean(newMsaContent), multiline: true })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <MotionButton
                        onClick={handleAddMsa}
                        className={getAppButtonClass({ variant: "primary", size: "sm" })}
                      >
                        Create MSA
                      </MotionButton>
                      <button
                        type="button"
                        onClick={() => setIsAddingMsa(false)}
                        className={getAppButtonClass({ variant: "ghost", size: "sm" })}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* MSA list */}
                <div className="mt-4 space-y-3">
                  {msas.map((msa) => (
                    <MsaCard
                      key={msa.id}
                      msa={msa}
                      onUpdate={handleUpdateMsa}
                      onDelete={handleDeleteMsa}
                    />
                  ))}
                  {msas.length === 0 && !isAddingMsa && (
                    <div className={`${getAppPanelClass("muted")} text-center`}>
                      <p className="text-[13px] text-[color:var(--text-muted)]">
                        No agreements yet. Add an MSA to gate invoice access for this client.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </MotionReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
