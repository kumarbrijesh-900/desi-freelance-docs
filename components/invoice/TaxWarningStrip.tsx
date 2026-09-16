import type { MoneyWarning } from "@/lib/money/types";

/**
 * What the money engine noticed, shown where it can still be acted on.
 *
 * These are OPERATOR warnings, not client-facing ones - "your LUT expired" is
 * not something the recipient of the invoice can do anything about, so this
 * never renders on the document or the share page. It lives in the editor's
 * action bar, against the totals it concerns.
 *
 * Deliberately one tone. The engine does not rank its warnings, and inventing
 * a severity model here would be a display asserting something the rules do
 * not say.
 */
export default function TaxWarningStrip({
  warnings,
}: {
  warnings?: MoneyWarning[];
}) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div
      role="status"
      className="mx-auto mb-3 flex max-w-[1328px] flex-col gap-2"
    >
      {warnings.map((w) => (
        <p
          key={w.code}
          className="flex items-start gap-2 rounded-[var(--radius-chip)] border border-[color:var(--color-ochre-deep)] bg-[color:var(--state-warning-bg)] px-3 py-2 type-body text-[color:var(--state-warning-text)]"
        >
          <span aria-hidden="true" className="shrink-0 font-bold leading-5">
            !
          </span>
          <span className="min-w-0">{w.message}</span>
        </p>
      ))}
    </div>
  );
}
