import type { ScheduleDefinition } from '../shared/types.js';
import { dayIndex } from './dates.js';

export function normalizeSchedule(input: ScheduleDefinition): ScheduleDefinition {
  if (input.kind === 'daily') return { kind: 'daily' };
  if (input.kind === 'one_time') {
    if (!input.date) throw new Error('A one-time chore requires a date');
    return { kind: 'one_time', date: input.date };
  }
  const weekdays = [...new Set(input.weekdays ?? [])].sort((a, b) => a - b);
  if (weekdays.length === 0 || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error('Select at least one valid weekday');
  }
  if (input.kind === 'weekly' && weekdays.length !== 1) {
    throw new Error('A weekly chore requires exactly one weekday');
  }
  return { kind: input.kind, weekdays };
}

export function occursOn(schedule: ScheduleDefinition, date: string): boolean {
  if (schedule.kind === 'daily') return true;
  if (schedule.kind === 'one_time') return schedule.date === date;
  return Boolean(schedule.weekdays?.includes(dayIndex(date)));
}
