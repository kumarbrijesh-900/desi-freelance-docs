const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SCHEDULED_TRIGGER_HOUR_UTC = "06";

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateInputValue(daysFromToday = 0, baseDate = new Date()): string {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + daysFromToday);

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function normalizeTriggerDateInput(value: string): string {
  const trimmed = value.trim();
  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return `${trimmed}T${SCHEDULED_TRIGGER_HOUR_UTC}:00:00.000Z`;
  }
  return trimmed;
}

export function dateInputToMilestoneTriggerIso(value: string): string {
  return new Date(normalizeTriggerDateInput(value)).toISOString();
}

export function parseScheduledMilestoneTriggerDate(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(normalizeTriggerDateInput(value));
  if (Number.isNaN(date.getTime())) return null;

  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);
  if (date.getTime() < startOfTodayUtc.getTime()) return null;

  return date;
}
