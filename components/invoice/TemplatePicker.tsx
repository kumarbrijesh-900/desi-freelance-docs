"use client";

import { useState } from "react";
import {
  TEMPLATE_REGISTRY,
  getTemplateLockState,
  type TemplateMetadata,
} from "@/lib/templates/registry";

/* ─── Icons ────────────────────────────────────────── */

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function StarIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/* ─── Types ─────────────────────────────────────────── */

export interface TemplatePickerProps {
  /** Currently selected template ID */
  selectedId: string;
  /** Callback when user selects a template */
  onSelect: (templateId: string) => void;
  /** User's current tier for access gating */
  userTier: "visitor" | "free" | "pro";
}

/* ─── Mini Invoice Preview ────────────────────────── */

function MiniInvoicePreview({
  template,
}: {
  template: TemplateMetadata;
}) {
  const { primary, secondary, text } = template.palette;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-[3px]"
      style={{ backgroundColor: secondary }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: primary }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rounded-[2px]"
            style={{
              backgroundColor:
                template.id === "neon-atelier" ? "#111118" : secondary,
              opacity: 0.6,
            }}
          />
          <div
            className="h-1.5 w-10 rounded-full"
            style={{
              backgroundColor:
                template.id === "neon-atelier" ? "#111118" : secondary,
              opacity: 0.5,
            }}
          />
        </div>
        <div
          className="h-1.5 w-8 rounded-full"
          style={{
            backgroundColor:
              template.id === "neon-atelier" ? "#111118" : secondary,
            opacity: 0.4,
          }}
        />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col gap-2 px-3 py-2.5">
        {/* Title line */}
        <div
          className="h-2 w-16 rounded-full"
          style={{ backgroundColor: text, opacity: 0.7 }}
        />
        <div
          className="h-1.5 w-24 rounded-full"
          style={{ backgroundColor: text, opacity: 0.25 }}
        />

        {/* Divider */}
        <div
          className="my-1 h-px w-full"
          style={{ backgroundColor: text, opacity: 0.1 }}
        />

        {/* Table rows */}
        {[0.6, 0.8, 0.5].map((w, i) => (
          <div key={i} className="flex items-center justify-between">
            <div
              className="h-1.5 rounded-full"
              style={{
                backgroundColor: text,
                opacity: 0.2,
                width: `${w * 60}%`,
              }}
            />
            <div
              className="h-1.5 w-6 rounded-full"
              style={{ backgroundColor: text, opacity: 0.3 }}
            />
          </div>
        ))}

        {/* Total */}
        <div
          className="mt-auto h-px w-full"
          style={{ backgroundColor: text, opacity: 0.1 }}
        />
        <div className="flex items-center justify-between">
          <div
            className="h-1.5 w-8 rounded-full"
            style={{ backgroundColor: text, opacity: 0.35 }}
          />
          <div
            className="h-2 w-10 rounded-full"
            style={{ backgroundColor: primary, opacity: 0.8 }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Template Card ───────────────────────────────── */

function TemplateCard({
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
  const isClickable = lockState === "unlocked";

  return (
    <button
      type="button"
      onClick={isClickable ? onSelect : undefined}
      className={`
        group relative flex w-full flex-col overflow-hidden rounded-lg border
        transition-all duration-200
        ${
          isSelected
            ? "border-[color:var(--color-lime-700)] ring-2 ring-[color:var(--color-lime-700)]/20 shadow-md"
            : isClickable
              ? "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)] hover:shadow-sm"
              : "border-[color:var(--border-subtle)] opacity-90"
        }
        ${isClickable ? "cursor-pointer" : "cursor-default"}
      `}
    >
      {/* Preview area */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[color:var(--bg-surface-muted)]">
        <div className={`h-full w-full ${lockState === "blurred" ? "blur-[6px] scale-105" : ""}`}>
          <MiniInvoicePreview template={template} />
        </div>

        {/* Lock overlay for visitors (blurred) */}
        {lockState === "blurred" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <LockIcon className="h-5 w-5 text-gray-600" />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-white drop-shadow-md">
              Sign up to preview
            </p>
          </div>
        )}

        {/* Lock badge for free-tier registered users */}
        {lockState === "locked" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-black/5">
              <LockIcon className="h-5 w-5 text-[color:var(--text-muted)]" />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-[color:var(--text-secondary)] drop-shadow-sm">
              Upgrade to Pro
            </p>
          </div>
        )}

        {/* Selected check */}
        {isSelected && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-lime-700)] shadow-sm">
            <CheckIcon className="h-3.5 w-3.5 text-white" />
          </div>
        )}

        {/* Pro badge */}
        {template.tier === "pro" && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            <StarIcon className="h-2.5 w-2.5" />
            Pro
          </div>
        )}
      </div>

      {/* Label area */}
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p
          className={`text-[13px] font-semibold tracking-[-0.01em] ${
            isSelected
              ? "text-[color:var(--color-lime-700)]"
              : "text-[color:var(--text-primary)]"
          }`}
        >
          {template.name}
        </p>
        <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
          {template.description}
        </p>
      </div>
    </button>
  );
}

/* ─── Template Picker ─────────────────────────────── */

export default function TemplatePicker({
  selectedId,
  onSelect,
  userTier,
}: TemplatePickerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedTemplates = [...TEMPLATE_REGISTRY].sort(
    (a, b) => a.order - b.order
  );

  const freeCount = sortedTemplates.filter((t) => t.tier === "free").length;
  const proCount = sortedTemplates.filter((t) => t.tier === "pro").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Choose Template
          </h3>
          <p className="mt-0.5 text-sm text-[color:var(--text-muted)]">
            {freeCount} free · {proCount} premium
          </p>
        </div>

        {userTier !== "pro" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-3 py-1 text-[11px] font-semibold text-amber-700">
            <StarIcon className="h-3 w-3" />
            Upgrade to unlock all
          </span>
        )}
      </div>

      {/* Template Grid */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        onMouseLeave={() => setHoveredId(null)}
      >
        {sortedTemplates.map((template) => {
          const lockState = getTemplateLockState(template.id, userTier);
          const isSelected = selectedId === template.id;

          return (
            <div
              key={template.id}
              onMouseEnter={() => setHoveredId(template.id)}
            >
              <TemplateCard
                template={template}
                isSelected={isSelected}
                lockState={lockState}
                onSelect={() => onSelect(template.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
