// Single source of truth for status pill colors across the dashboard
// (project rail, lifecycle stepper, invoices ledger, drilldown).
//
// Design: quiet semantic *tints* (light bg + colored text + hairline) so each
// status reads as a distinct hue, with ONE bold "live" hero for the genuinely
// in-progress item. This replaces the previous wall of near-identical filled
// dark-green pills (live/locked/settled/complete all looked the same).

export type StatusKind =
  | "unanswered"
  | "live"
  | "active"
  | "locked"
  | "settled"
  | "complete"
  | "awaiting"
  | "viewed"
  | "partial"
  | "scheduled"
  | "draft"
  | "revision"
  | "overdue"
  | "cancelled"
  | "neutral";

export interface StatusTint {
  /** background color (CSS value) */
  bg: string;
  /** foreground / text color (CSS value) */
  fg: string;
  /** border color (CSS value) — pills always render a 1px hairline */
  bd: string;
  /** render the hairline dashed (used for not-started / draft) */
  dashed?: boolean;
  /** strike the label (cancelled) */
  strikethrough?: boolean;
}

export function getStatusTint(kind: StatusKind): StatusTint {
  switch (kind) {
    case "live":
      return { bg: "var(--color-acid)", fg: "var(--color-acc-ink)", bd: "var(--color-acid)" }; // bold hero
    case "active":
    case "complete":
      return { bg: "#e7efe7", fg: "#1e3d33", bd: "#d2e0d2" }; // soft green
    case "settled":
      return { bg: "#e4f1ea", fg: "#157a54", bd: "#c7e4d4" }; // emerald
    case "locked":
      return { bg: "#e6edeb", fg: "#33655b", bd: "#cfe0db" }; // muted teal — distinct from live
    case "unanswered":
      // Was a literal cream background with a TOKENISED foreground — the only
      // mixed pair in this table, and the reason it resolved to 1.85:1 in
      // cockpit where --color-ochre-deep goes bright. Both halves now come
      // from the same per-theme family.
      return { bg: "var(--state-warning-bg)", fg: "var(--state-warning-text)", bd: "var(--state-warning-bd)", dashed: true };
    case "awaiting":
      return { bg: "var(--state-warning-bg)", fg: "var(--state-warning-text)", bd: "var(--state-warning-bd)" }; // ochre
    case "viewed":
    case "partial":
      return { bg: "#efece2", fg: "#6f6757", bd: "#ddd3bd" }; // taupe
    case "scheduled":
      return { bg: "transparent", fg: "#8c8270", bd: "#c9bb9d", dashed: true }; // stone, dashed
    case "draft":
      return { bg: "transparent", fg: "var(--color-ink-2)", bd: "var(--color-soft)" }; // stone outline
    case "revision":
      return { bg: "var(--state-danger-bg)", fg: "var(--state-danger-text)", bd: "var(--state-danger-bd)" }; // rust
    case "overdue":
      return { bg: "#f7dada", fg: "#9e2b2b", bd: "#edbcbc" }; // deep red
    case "cancelled":
      return { bg: "var(--color-soft)", fg: "var(--color-ink-2)", bd: "var(--color-soft)", strikethrough: true };
    default:
      return { bg: "var(--color-soft)", fg: "var(--color-ink-2)", bd: "var(--color-soft)" };
  }
}

/** Map a project-rail summary string ("LIVE · M1", "AWAITING ...", etc.) to a status kind. */
export function statusKindFromSummary(summary: string): StatusKind {
  const s = (summary || "").toUpperCase();
  if (s.startsWith("LIVE")) return "live";
  if (s === "COMPLETE") return "complete";
  if (s.startsWith("REVISION")) return "revision";
  if (s.startsWith("UNANSWERED")) return "unanswered";
  if (s.startsWith("AWAITING")) return "awaiting";
  if (s.startsWith("LOCKED")) return "locked";
  if (s.startsWith("SETTLED")) return "settled";
  if (s.startsWith("OVERDUE")) return "overdue";
  if (s.startsWith("VIEWED")) return "viewed";
  if (s.startsWith("SCHEDULED")) return "scheduled";
  if (s.startsWith("DRAFT")) return "draft";
  if (s.startsWith("ACTIVE")) return "active";
  return "neutral";
}
