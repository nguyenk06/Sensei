import { describe, expect, it } from 'vitest';
import { addDays, dayIndex, formatLocalDate, nextWeekStart, weekStartFor } from './dates.js';

describe('household dates', () => {
  it('uses the Los Angeles household date around UTC midnight', () => {
    expect(formatLocalDate(new Date('2026-10-29T05:30:00Z'), 'America/Los_Angeles')).toBe('2026-10-28');
    expect(formatLocalDate(new Date('2026-10-29T08:30:00Z'), 'America/Los_Angeles')).toBe('2026-10-29');
  });

  it('uses Monday through Sunday weeks', () => {
    expect(weekStartFor('2026-10-26')).toBe('2026-10-26');
    expect(weekStartFor('2026-11-01')).toBe('2026-10-26');
    expect(nextWeekStart('2026-11-01')).toBe('2026-11-02');
  });

  it('handles month, year, leap-day, and weekday transitions as date-only arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(dayIndex('2026-11-01')).toBe(6);
  });
});
