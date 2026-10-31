import { randomUUID } from 'node:crypto';
import type { ChoreSummary, ScheduleDefinition } from '../shared/types.js';
import type { SenseiDatabase } from './database.js';
import { ensureWeek } from './database.js';
import { addDays, assertDate, compareDates, nextWeekStart, weekStartFor } from './dates.js';
import { normalizeSchedule } from './schedule.js';

export interface ChoreInput {
  title: string;
  rewardCents: number;
  schedule: ScheduleDefinition;
}

function normalizeInput(input: ChoreInput): ChoreInput {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 1 || title.length > 80) throw new Error('Chore title must be 1 to 80 characters');
  if (!Number.isInteger(input.rewardCents) || input.rewardCents < 0 || input.rewardCents > 100000) {
    throw new Error('Reward must be a whole number of cents between 0 and 100000');
  }
  const schedule = normalizeSchedule(input.schedule);
  if (schedule.date) assertDate(schedule.date);
  return { title, rewardCents: input.rewardCents, schedule };
}

export function createChore(db: SenseiDatabase, raw: ChoreInput, today: string, now: Date): string {
  const input = normalizeInput(raw);
  const currentWeek = weekStartFor(today);
  const effectiveFrom = input.schedule.kind === 'one_time' ? input.schedule.date! : nextWeekStart(today);
  if (compareDates(effectiveFrom, currentWeek) < 0) throw new Error('A one-time chore cannot be added to a previous week');
  const choreId = randomUUID();
  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO chores(id, is_default, created_at) VALUES(?, 0, ?)')
      .run(choreId, now.toISOString());
    db.prepare(`INSERT INTO chore_revisions
      (id, chore_id, title, reward_cents, schedule_json, effective_from, archived, created_at)
      VALUES(?, ?, ?, ?, ?, ?, 0, ?)`)
      .run(randomUUID(), choreId, input.title, input.rewardCents, JSON.stringify(input.schedule), effectiveFrom, now.toISOString());
  });
  transaction();
  if (weekStartFor(effectiveFrom) === currentWeek) ensureWeek(db, currentWeek);
  return choreId;
}

interface RevisionRow {
  id: string;
  chore_id: string;
  title: string;
  reward_cents: number;
  schedule_json: string;
  effective_from: string;
  effective_to: string | null;
  archived: number;
  is_default: number;
}

function revisionsForChore(db: SenseiDatabase, choreId: string): RevisionRow[] {
  return db.prepare(`SELECT r.*, c.is_default FROM chore_revisions r
    JOIN chores c ON c.id = r.chore_id WHERE r.chore_id = ? ORDER BY r.effective_from`)
    .all(choreId) as RevisionRow[];
}

export function editChore(db: SenseiDatabase, choreId: string, raw: ChoreInput, today: string, now: Date): void {
  const input = normalizeInput(raw);
  const effectiveFrom = nextWeekStart(today);
  if (input.schedule.kind === 'one_time' && compareDates(input.schedule.date!, effectiveFrom) < 0) {
    throw new Error('An edited one-time chore must be scheduled for next week or later');
  }
  const revisions = revisionsForChore(db, choreId);
  if (revisions.length === 0) throw new Error('Chore not found');
  const current = [...revisions].reverse().find((row) => row.effective_from <= today);
  const pending = revisions.find((row) => row.effective_from === effectiveFrom);
  const transaction = db.transaction(() => {
    if (pending) {
      db.prepare(`UPDATE chore_revisions SET title = ?, reward_cents = ?, schedule_json = ?, archived = 0
        WHERE id = ?`).run(input.title, input.rewardCents, JSON.stringify(input.schedule), pending.id);
      return;
    }
    if (current) {
      db.prepare('UPDATE chore_revisions SET effective_to = ? WHERE id = ?')
        .run(addDays(effectiveFrom, -1), current.id);
    }
    db.prepare(`INSERT INTO chore_revisions
      (id, chore_id, title, reward_cents, schedule_json, effective_from, archived, created_at)
      VALUES(?, ?, ?, ?, ?, ?, 0, ?)`)
      .run(randomUUID(), choreId, input.title, input.rewardCents, JSON.stringify(input.schedule), effectiveFrom, now.toISOString());
  });
  transaction();
}

export function archiveChore(db: SenseiDatabase, choreId: string, today: string, now: Date): void {
  const effectiveFrom = nextWeekStart(today);
  const revisions = revisionsForChore(db, choreId);
  if (revisions.length === 0) throw new Error('Chore not found');
  const current = [...revisions].reverse().find((row) => row.effective_from <= today) ?? revisions[0];
  const pending = revisions.find((row) => row.effective_from === effectiveFrom);
  const transaction = db.transaction(() => {
    if (pending) {
      db.prepare('UPDATE chore_revisions SET archived = 1 WHERE id = ?').run(pending.id);
      return;
    }
    if (current.effective_from <= today) {
      db.prepare('UPDATE chore_revisions SET effective_to = ? WHERE id = ?')
        .run(addDays(effectiveFrom, -1), current.id);
    }
    db.prepare(`INSERT INTO chore_revisions
      (id, chore_id, title, reward_cents, schedule_json, effective_from, archived, created_at)
      VALUES(?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(randomUUID(), choreId, current.title, current.reward_cents, current.schedule_json, effectiveFrom, now.toISOString());
  });
  transaction();
}

export function listChores(db: SenseiDatabase, today: string): ChoreSummary[] {
  const choreIds = db.prepare('SELECT id FROM chores ORDER BY created_at').all() as Array<{ id: string }>;
  const nextMonday = nextWeekStart(today);
  return choreIds.map(({ id }) => {
    const revisions = revisionsForChore(db, id);
    const current = [...revisions].reverse().find((row) => row.effective_from <= today) ?? revisions[0];
    const pending = revisions.find((row) => row.effective_from === nextMonday);
    const display = pending ?? current;
    return {
      id,
      title: display.title,
      rewardCents: display.reward_cents,
      schedule: JSON.parse(display.schedule_json) as ScheduleDefinition,
      effectiveFrom: current.effective_from,
      pendingEffectiveFrom: pending?.effective_from ?? null,
      archived: Boolean(display.archived),
      isDefault: Boolean(display.is_default)
    };
  });
}
