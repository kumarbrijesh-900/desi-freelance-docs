export type SettlementTiming = 'early' | 'on_time' | 'late' | 'overdue';

export function computeSettlementTiming(
  settled_at: string | null,
  due_date: string | null
): { kind: SettlementTiming; days_diff: number; label: string } | null {
  if (!due_date) return null;

  const due = new Date(due_date);
  // normalize due to end of day if it has no time component to give benefit of doubt
  due.setUTCHours(23, 59, 59, 999);

  if (settled_at) {
    const settled = new Date(settled_at);
    // Difference in whole days
    const diffTime = settled.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // diffDays < 0 means settled before due date
    // diffDays > 0 means settled after due date

    if (diffDays <= -3) {
      return { kind: 'early', days_diff: diffDays, label: `${Math.abs(diffDays)}d early` };
    } else if (diffDays >= 3) {
      return { kind: 'late', days_diff: diffDays, label: `${diffDays}d late` };
    } else {
      return { kind: 'on_time', days_diff: diffDays, label: 'on time' };
    }
  } else {
    // Not settled yet
    const diffTime = Date.now() - due.getTime();
    if (diffTime > 0) {
      return { kind: 'overdue', days_diff: Math.floor(diffTime / (1000 * 60 * 60 * 24)), label: 'overdue' };
    }
    return null;
  }
}

export function projectNextMilestoneDate(
  previous_settled_at: string | null,
  payment_terms_days: number | null
): string | null {
  if (!previous_settled_at || payment_terms_days == null || payment_terms_days < 0) return null;
  const prevDate = new Date(previous_settled_at);
  prevDate.setDate(prevDate.getDate() + payment_terms_days);
  return prevDate.toISOString();
}

export function formatTimingPill(timing: SettlementTiming, days_diff?: number): string {
  const absDays = Math.abs(days_diff ?? 0);
  switch (timing) {
    case 'early':   return `${absDays}d early`;
    case 'on_time': return 'on time';
    case 'late':    return `${absDays}d late`;
    case 'overdue': return `${absDays}d overdue`;
  }
}

export function formatProjectedDate(value?: string | null): string {
  if (!value) return "Not set";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}

export function nextMilestoneStartLabel(m: { trigger_mode?: string | null; trigger_date?: string | null }): string {
  if (m.trigger_mode === 'scheduled' && m.trigger_date) return `STARTS ${formatProjectedDate(m.trigger_date)}`;
  return 'STARTS ON SETTLE';
}
