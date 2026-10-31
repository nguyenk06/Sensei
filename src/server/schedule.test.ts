import { describe, expect, it } from 'vitest';
import { normalizeSchedule, occursOn } from './schedule.js';

describe('recurrence rules', () => {
  it('supports daily, selected weekday, weekly, and one-time schedules', () => {
    expect(occursOn({ kind: 'daily' }, '2026-10-27')).toBe(true);
    expect(occursOn({ kind: 'weekdays', weekdays: [0, 2, 4] }, '2026-10-28')).toBe(true);
    expect(occursOn({ kind: 'weekdays', weekdays: [0, 2, 4] }, '2026-10-29')).toBe(false);
    expect(occursOn({ kind: 'weekly', weekdays: [6] }, '2026-11-01')).toBe(true);
    expect(occursOn({ kind: 'one_time', date: '2026-10-29' }, '2026-10-29')).toBe(true);
  });

  it('rejects invalid selected-day schedules', () => {
    expect(() => normalizeSchedule({ kind: 'weekdays', weekdays: [] })).toThrow();
    expect(() => normalizeSchedule({ kind: 'weekly', weekdays: [0, 1] })).toThrow();
  });
});
