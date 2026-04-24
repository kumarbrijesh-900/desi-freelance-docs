"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TEMPLATE_REGISTRY,
  getTemplateLockState,
  type TemplateMetadata,
} from "@/lib/templates/registry";

/* ─── Icons ────────────────────────────────────────── */

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}



function PanelIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

/* ─── Types ─────────────────────────────────────────── */

export interface TemplatePickerProps {
  selectedId: string;
  onSelect: (templateId: string) => void;
  userTier: "visitor" | "free" | "pro";
  /** "vertical" = 2-col grid (side panel), "horizontal" = scrollable row (inline) */
  layout?: "vertical" | "horizontal";
}

/* ─── Mini Invoice Thumbnail ──────────────────────── */

function MiniInvoiceThumbnail({ template }: { template: TemplateMetadata }) {
  const { primary, secondary, text } = template.palette;
  const isDark = template.id === "neon-atelier" || template.id === "midnight";
  const barText = isDark ? secondary : "#FFFFFF";

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-[2px]"
      style={{ backgroundColor: secondary }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-1.5 py-1"
        style={{ backgroundColor: primary }}
      >
        <div className="flex items-center gap-1">
          <div
            className="h-1.5 w-1.5 rounded-[1px]"
            style={{ backgroundColor: barText, opacity: 0.5 }}
          />
          <div
            className="h-[3px] w-5 rounded-full"
            style={{ backgroundColor: barText, opacity: 0.4 }}
          />
        </div>
        <div
          className="h-[3px] w-4 rounded-full"
          style={{ backgroundColor: barText, opacity: 0.3 }}
        />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col gap-[3px] px-1.5 py-1.5">
        <div
          className="h-[3px] w-8 rounded-full"
          style={{ backgroundColor: text, opacity: 0.6 }}
        />
        <div
          className="h-[2px] w-12 rounded-full"
          style={{ backgroundColor: text, opacity: 0.2 }}
        />
        <div className="my-[2px] h-px w-full" style={{ backgroundColor: text, opacity: 0.08 }} />
        {[0.7, 0.5, 0.6].map((w, i) => (
          <div key={i} className="flex items-center justify-between">
            <div
              className="h-[2px] rounded-full"
              style={{ backgroundColor: text, opacity: 0.15, width: `${w * 55}%` }}
            />
            <div
              className="h-[2px] w-3 rounded-full"
              style={{ backgroundColor: text, opacity: 0.2 }}
            />
          </div>
        ))}
        <div className="mt-auto h-px w-full" style={{ backgroundColor: text, opacity: 0.08 }} />
        <div className="flex items-center justify-between">
          <div className="h-[2px] w-4 rounded-full" style={{ backgroundColor: text, opacity: 0.25 }} />
          <div className="h-[3px] w-5 rounded-full" style={{ backgroundColor: primary, opacity: 0.7 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Thumbnail Card ──────────────────────────────── */

function ThumbnailCard({
  template,
  isSelected,
  lockState,
  onSelect,
}: {
  template: TemplateMetadata;
  isSelected: boolean;
  lockState: "unlocked" | "blurred" | "locked";
  onSelect: () => void;
}) {
  const isBlurred = lockState === "blurred";
  const isLocked = lockState === "locked";
  const isClickable = !isBlurred && !isLocked;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        group relative flex w-full flex-col overflow-hidden rounded-md border
        transition-all duration-200
        ${
          isSelected
            ? "border-[color:var(--color-lime-700)] ring-2 ring-[color:var(--color-lime-700)]/20 shadow-sm"
            : !isBlurred && !isLocked
              ? "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)] hover:shadow-sm"
              : "border-[color:var(--border-subtle)]"
        }
        cursor-pointer
      `}
      title={`${template.name}${lockState !== "unlocked" ? " (Requires Login)" : ""}`}
    >
      {/* Preview area — compact aspect ratio */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[color:var(--bg-surface-muted)]">
        <div className={`h-full w-full ${lockState === "blurred" ? "blur-[4px] scale-110" : ""}`}>
          <MiniInvoiceThumbnail template={template} />
        </div>

        {/* Visitor overlay (blurred) */}
        {lockState === "blurred" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 backdrop-blur-[1px]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow">
              <LockIcon className="h-3 w-3 text-gray-500" />
            </div>
          </div>
        )}

        {/* Free-tier overlay (visible but locked) */}
        {lockState === "locked" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow ring-1 ring-black/5">
              <LockIcon className="h-3 w-3 text-[color:var(--text-muted)]" />
            </div>
          </div>
        )}

        {/* Selected check */}
        {isSelected && (
          <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-lime-700)] shadow-sm">
            <CheckIcon className="h-2.5 w-2.5 text-white" />
          </div>
        )}


      </div>

      {/* Label — compact */}
      <div className="px-1.5 py-1.5">
        <p
          className={`text-[10px] font-semibold leading-tight ${
            isSelected
              ? "text-[color:var(--color-lime-700)]"
              : "text-[color:var(--text-primary)]"
          }`}
        >
          {template.name}
        </p>
      </div>
    </button>
  );
}

/* ─── Template Picker (Side Panel Mode) ───────────── */

export default function TemplatePicker({
  selectedId,
  onSelect,
  userTier,
  layout = "vertical",
}: TemplatePickerProps) {
  const router = useRouter();
  const sortedTemplates = [...TEMPLATE_REGISTRY].sort(
    (a, b) => a.order - b.order
  );

  const handleTemplateClick = (templateId: string, lockState: string) => {
    if (lockState === "blurred" || lockState === "locked") {
      // Redirect to login if user clicks a locked template
      const returnUrl = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }
    onSelect(templateId);
  };

  const isHorizontal = layout === "horizontal";

  return (
    <div className={isHorizontal ? "flex flex-col gap-2" : "flex flex-col gap-2"}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-1">
        <PanelIcon className="h-3.5 w-3.5 text-[color:var(--text-muted)]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Templates
        </span>
      </div>

      {/* Thumbnail Grid / Row */}
      <div
        className={
          isHorizontal
            ? "flex gap-2 overflow-x-auto pb-1"
            : "grid grid-cols-1 gap-3"
        }
      >
        {sortedTemplates.map((template) => {
          const lockState = getTemplateLockState(template.id, userTier);
          return (
            <div
              key={template.id}
              className={isHorizontal ? "w-[90px] shrink-0" : ""}
            >
              <ThumbnailCard
                template={template}
                isSelected={selectedId === template.id}
                lockState={lockState}
                onSelect={() => handleTemplateClick(template.id, lockState)}
              />
            </div>
          );
        })}
      </div>

      {/* Upgrade hint */}
      {userTier === "visitor" && (
        <div className={`rounded-md border border-amber-200/50 bg-amber-50/50 px-2 py-1.5 text-center ${isHorizontal ? "mt-0" : "mt-1"}`}>
          <p className="text-[9px] font-semibold text-amber-700">
            ✦ Sign in to unlock all templates
          </p>
        </div>
      )}
    </div>
  );
}
