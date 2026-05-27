import { useEffect } from "react";
import { ANONYMOUS_DRAFT_KEY } from "@/lib/invoice-editor-utils";
import type { InvoiceFormData } from "@/types/invoice";
import { getCurrentUserId, saveInvoice } from "@/lib/supabase/invoices";
import type { InvoiceStatus } from "@/lib/supabase/invoices";
import { syncProfileFromInvoice } from "@/lib/supabase/profiles";
import { playInteractionCue } from "@/lib/interaction-feedback";
import { announceInvoiceDataChanged } from "@/lib/invoice-events";
import { ReadonlyURLSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/AppToast";

interface UseInvoicePersistenceProps {
  formData: InvoiceFormData;
  isBootstrapped: boolean;
  isReadOnlyMode: boolean;
  searchParams: ReadonlyURLSearchParams;
  projectId: string | null;
  projectName: string;
}

export function useInvoicePersistence({
  formData,
  isBootstrapped,
  isReadOnlyMode,
  searchParams,
  projectId,
  projectName,
}: UseInvoicePersistenceProps) {
  const { push } = useToast();
  useEffect(() => {
    if (!isBootstrapped || !formData) return;
    if (isReadOnlyMode) return;
    localStorage.setItem(ANONYMOUS_DRAFT_KEY, JSON.stringify(formData));
    try {
      localStorage.setItem("lance_draft_invoice", JSON.stringify(formData));
      localStorage.setItem("lance_draft_timestamp", new Date().toISOString());
    } catch (e) {
      // localStorage might be full or unavailable
    }
  }, [formData, isBootstrapped, isReadOnlyMode]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isReadOnlyMode) return;

      // Only warn if there is unsaved data
      if (
        formData &&
        (formData.agency?.agencyName ||
          formData.client?.clientName ||
          formData.lineItems?.length > 0)
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, isReadOnlyMode]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (isReadOnlyMode) return;
    if (searchParams.get("restore") !== "1") return;

    async function autoCloudSave() {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await saveInvoice({
        formData,
        status: "draft" as InvoiceStatus,
        existingId: undefined,
        projectId,
        projectName: projectName.trim() || undefined,
      });

      if (!error) {
        await syncProfileFromInvoice(formData);
        push({ kind: "info", ttl: "Draft saved to cloud ☁ Welcome back!" });
        playInteractionCue("saveSuccess");
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
        announceInvoiceDataChanged({
          invoiceId: data?.id,
          action: "cloud_save_restore",
        });
      }
    }

    void autoCloudSave();
  }, [isBootstrapped, isReadOnlyMode]);
}
