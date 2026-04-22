/**
 * ─── Template Registry ─────────────────────────────────────
 *
 * Central registry for all invoice templates.
 * Each template is a React component that receives InvoiceFormData
 * and renders a printable invoice sheet.
 *
 * Access tiers:
 * - "free"    → available to everyone
 * - "pro"     → locked for visitors (blurred), visible but locked for
 *               free-tier registered users, unlocked for pro subscribers
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
    primary: string;      // Header / accent
    secondary: string;    // Background / surface
    text: string;         // Text color
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
    name: "Neon Atelier",
    description: "Fluorescent lime on dark — the signature Lance look",
    tier: "pro",
    palette: { primary: "#BEFF00", secondary: "#111118", text: "#F8F8FA" },
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
];

export const DEFAULT_TEMPLATE_ID = "classic";

export function getTemplateById(id: string): TemplateMetadata | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.id === id);
}

export function getTemplatesByTier(tier: TemplateTier): TemplateMetadata[] {
  return TEMPLATE_REGISTRY.filter((t) => t.tier === tier).sort(
    (a, b) => a.order - b.order
  );
}

export function isTemplateLocked(
  templateId: string,
  userTier: "visitor" | "free" | "pro"
): boolean {
  const template = getTemplateById(templateId);
  if (!template) return true;
  if (template.tier === "free") return false;
  return userTier !== "pro";
}

export function getTemplateLockState(
  templateId: string,
  userTier: "visitor" | "free" | "pro"
): "unlocked" | "blurred" | "locked" {
  const template = getTemplateById(templateId);
  if (!template) return "locked";
  if (template.tier === "free") return "unlocked";

  switch (userTier) {
    case "pro":
      return "unlocked";
    case "free":
      return "locked"; // visible but locked (can see but not use)
    case "visitor":
      return "blurred"; // blurred preview
    default:
      return "locked";
  }
}
