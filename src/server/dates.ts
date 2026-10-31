const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatLocalDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function assertDate(value: string): string {
  if (!DATE_PATTERN.test(value)) throw new Error('Invalid ISO date');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid calendar date');
  }
  return value;
}

export function addDays(value: string, days: number): string {
  assertDate(value);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function dayIndex(value: string): number {
  const sundayBased = new Date(`${assertDate(value)}T00:00:00.000Z`).getUTCDay();
  return (sundayBased + 6) % 7;
}

export function weekStartFor(value: string): string {
  return addDays(value, -dayIndex(value));
}

export function nextWeekStart(value: string): string {
  return addDays(weekStartFor(value), 7);
}

export function compareDates(left: string, right: string): number {
  assertDate(left);
  assertDate(right);
  return left.localeCompare(right);
}

export function isMonday(value: string): boolean {
  return dayIndex(value) === 0;
}

export function dayLabel(index: number): string {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index] ?? '';
}
