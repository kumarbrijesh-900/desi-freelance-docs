/**
 * ─── Template Renderer ─────────────────────────────
 *
 * Switchboard component that picks the correct invoice
 * template based on the selected template ID.
 * Receives raw InvoiceFormData and prepares it via
 * the shared data transformer.
 */

"use client";

import { useMemo, type ReactNode } from "react";
import type { InvoiceFormData } from "@/types/invoice";
import { prepareTemplateData } from "./template-data";
import { OfflineCopyMark } from "./Watermark";
import ClassicTemplate from "./classic";
import EditorialTemplate from "./editorial";
import NeonAtelierTemplate from "./neon-atelier";
import MidnightTemplate from "./midnight";
import TerracottaTemplate from "./terracotta";
import SwissGridTemplate from "./swiss-grid";
import MonoTemplate from "./mono";
import SakuraTemplate from "./sakura";
import BrutalistTemplate from "./brutalist";
import LedgerTemplate from "./ledger";
import CoastalTemplate from "./coastal";

interface TemplateRendererProps {
  formData: InvoiceFormData;
  templateId: string;
}

export default function TemplateRenderer({
  formData,
  templateId,
}: TemplateRendererProps) {
  const data = useMemo(() => prepareTemplateData(formData), [formData]);

  let template: ReactNode;
  switch (templateId) {
    case "editorial":
      template = <EditorialTemplate data={data} />;
      break;
    case "neon-atelier":
      template = <NeonAtelierTemplate data={data} />;
      break;
    case "midnight":
      template = <MidnightTemplate data={data} />;
      break;
    case "terracotta":
      template = <TerracottaTemplate data={data} />;
      break;
    case "swiss-grid":
      template = <SwissGridTemplate data={data} />;
      break;
    case "mono":
      template = <MonoTemplate data={data} />;
      break;
    case "sakura":
      template = <SakuraTemplate data={data} />;
      break;
    case "brutalist":
      template = <BrutalistTemplate data={data} />;
      break;
    case "ledger":
      template = <LedgerTemplate data={data} />;
      break;
    case "coastal":
      template = <CoastalTemplate data={data} />;
      break;
    case "classic":
    default:
      template = <ClassicTemplate data={data} />;
      break;
  }

  return (
    <div className="relative">
      {template}
      {data.isOffline && <OfflineCopyMark />}
    </div>
  );
}
