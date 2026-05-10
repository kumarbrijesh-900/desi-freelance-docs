/**
 * ─── Template Registry ─────────────────────────────────────
 *
 * Central registry for all invoice templates.
 * Each template is a React component that receives InvoiceFormData
 * and renders a printable invoice sheet.
 *
 * Access tiers:
 * - "free"    → available to everyone
 * - "pro"    → locked for visitors (blurred), unlocked for all registered users (Free or Pro)
 */

export type TemplateTier = "free" | "pro";

export interface TemplateMetadata {
  /** Unique template identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description for the picker */
  description: string;
  /** Access tier */
  tier: TemplateTier;
  /** Preview color tokens for the picker thumbnail */
  palette: {
    primary: string; // Header / accent
    secondary: string; // Background / surface
    text: string; // Text color
  };
  /** Sort order in the picker */
  order: number;
}

export const TEMPLATE_REGISTRY: TemplateMetadata[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean black & white — the safe, professional default",
    tier: "free",
    palette: { primary: "#111118", secondary: "#FFFFFF", text: "#111118" },
    order: 1,
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-inspired with Syne typography and editorial flair",
    tier: "pro",
    palette: { primary: "#27272F", secondary: "#F8F7F4", text: "#27272F" },
    order: 2,
  },
  {
    id: "neon-atelier",
    name: "Studio Pro",
    description: "Contemporary geometric design with architectural accents",
    tier: "pro",
    palette: { primary: "#2D5BFF", secondary: "#FAF9F6", text: "#111118" },
    order: 3,
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Full dark mode with crisp white text on charcoal",
    tier: "pro",
    palette: { primary: "#6C63FF", secondary: "#1A1A2E", text: "#F0F0F5" },
    order: 4,
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description: "Warm earth tones with an artisan, craft-studio feel",
    tier: "pro",
    palette: { primary: "#C75B39", secondary: "#FFF8F3", text: "#3D2517" },
    order: 5,
  },
  {
    id: "swiss-grid",
    name: "Swiss Grid",
    description: "Strict grid, Helvetica-inspired precision typography",
    tier: "pro",
    palette: { primary: "#E63946", secondary: "#F1FAEE", text: "#1D3557" },
    order: 6,
  },
  {
    id: "mono",
    name: "Mono",
    description: "Developer-grade precision with monospace typography",
    tier: "pro" as TemplateTier,
    palette: { primary: "#111111", secondary: "#f5f5f0", text: "#00cc66" },
    order: 7,
  },
  {
    id: "sakura",
    name: "Sakura",
    description: "Elegant Japanese-inspired minimalism with rose accents",
    tier: "pro" as TemplateTier,
    palette: { primary: "#E11D48", secondary: "#FFFFFF", text: "#2D2024" },
    order: 8,
  },
  {
    id: "brutalist",
    name: "Brutalist",
    description: "Raw concrete aesthetic with heavy borders and bold type",
    tier: "pro" as TemplateTier,
    palette: { primary: "#000000", secondary: "#FFFFFF", text: "#000000" },
    order: 9,
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "Traditional accounting style with serif type and ruled lines",
    tier: "pro" as TemplateTier,
    palette: { primary: "#8B7355", secondary: "#FDFBF7", text: "#1a1a1a" },
    order: 10,
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Ocean-inspired clarity with deep blue accents and airy spacing",
    tier: "pro" as TemplateTier,
    palette: { primary: "#0369A1", secondary: "#FFFFFF", text: "#1E293B" },
    order: 11,
  },
];

export const DEFAULT_TEMPLATE_ID = "classic";

export function getTemplateById(id: string): TemplateMetadata | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.id === id);
}

export function getTemplatesByTier(tier: TemplateTier): TemplateMetadata[] {
  return TEMPLATE_REGISTRY.filter((t) => t.tier === tier).sort(
    (a, b) => a.order - b.order,
  );
}

export function isTemplateLocked(
  templateId: string,
  userTier: "visitor" | "free" | "pro",
): boolean {
  const template = getTemplateById(templateId);
  if (!template) return true;
  if (template.tier === "free") return false;
  return userTier === "visitor";
}

export function getTemplateLockState(
  templateId: string,
  userTier: "visitor" | "free" | "pro",
): "unlocked" | "blurred" | "locked" {
  const template = getTemplateById(templateId);
  if (!template) return "locked";
  if (template.tier === "free") return "unlocked";

  switch (userTier) {
    case "pro":
    case "free":
      return "unlocked";
    case "visitor":
      return "blurred"; // blurred preview
    default:
      return "locked";
  }
}
