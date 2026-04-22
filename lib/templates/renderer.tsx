/**
 * ─── Template Renderer ─────────────────────────────
 *
 * Switchboard component that picks the correct invoice
 * template based on the selected template ID.
 * Receives raw InvoiceFormData and prepares it via
 * the shared data transformer.
 */

"use client";

import { useMemo } from "react";
import type { InvoiceFormData } from "@/types/invoice";
import { prepareTemplateData } from "./template-data";
import ClassicTemplate from "./classic";
import EditorialTemplate from "./editorial";
import NeonAtelierTemplate from "./neon-atelier";
import MidnightTemplate from "./midnight";
import TerracottaTemplate from "./terracotta";
import SwissGridTemplate from "./swiss-grid";

interface TemplateRendererProps {
  formData: InvoiceFormData;
  templateId: string;
}

export default function TemplateRenderer({
  formData,
  templateId,
}: TemplateRendererProps) {
  const data = useMemo(() => prepareTemplateData(formData), [formData]);

  switch (templateId) {
    case "editorial":
      return <EditorialTemplate data={data} />;
    case "neon-atelier":
      return <NeonAtelierTemplate data={data} />;
    case "midnight":
      return <MidnightTemplate data={data} />;
    case "terracotta":
      return <TerracottaTemplate data={data} />;
    case "swiss-grid":
      return <SwissGridTemplate data={data} />;
    case "classic":
    default:
      return <ClassicTemplate data={data} />;
  }
}
