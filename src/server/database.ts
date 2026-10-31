import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { ScheduleDefinition } from '../shared/types.js';
import { addDays, dayLabel, formatLocalDate, weekStartFor } from './dates.js';
import { occursOn } from './schedule.js';

export type SenseiDatabase = Database.Database;

const MIGRATION = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS household_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS parent_credentials (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS parent_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  credential_id TEXT REFERENCES parent_credentials(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS parent_sessions_token_idx ON parent_sessions(token_hash);
CREATE TABLE IF NOT EXISTS chores (
  id TEXT PRIMARY KEY,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chore_revisions (
  id TEXT PRIMARY KEY,
  chore_id TEXT NOT NULL REFERENCES chores(id),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  reward_cents INTEGER NOT NULL CHECK (reward_cents BETWEEN 0 AND 100000),
  schedule_json TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE(chore_id, effective_from),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX IF NOT EXISTS chore_revisions_effective_idx ON chore_revisions(effective_from, effective_to);
CREATE TABLE IF NOT EXISTS weeks (
  week_start TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chore_occurrences (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL REFERENCES weeks(week_start),
  chore_id TEXT NOT NULL REFERENCES chores(id),
  revision_id TEXT NOT NULL REFERENCES chore_revisions(id),
  occurrence_date TEXT NOT NULL,
  title_snapshot TEXT NOT NULL,
  reward_cents_snapshot INTEGER NOT NULL CHECK (reward_cents_snapshot BETWEEN 0 AND 100000),
  schedule_snapshot TEXT NOT NULL,
  claimed INTEGER NOT NULL DEFAULT 0 CHECK (claimed IN (0, 1)),
  claimed_updated_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(chore_id, occurrence_date)
);
CREATE INDEX IF NOT EXISTS chore_occurrences_week_idx ON chore_occurrences(week_start, occurrence_date);
CREATE TABLE IF NOT EXISTS claim_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurrence_id TEXT NOT NULL REFERENCES chore_occurrences(id),
  action TEXT NOT NULL CHECK (action IN ('claim', 'undo')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS weekly_approvals (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL UNIQUE REFERENCES weeks(week_start),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  approved_at TEXT NOT NULL,
  approved_by_label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS approval_lines (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL REFERENCES weekly_approvals(id),
  occurrence_id TEXT NOT NULL UNIQUE REFERENCES chore_occurrences(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'corrected')),
  claimed_snapshot INTEGER NOT NULL CHECK (claimed_snapshot IN (0, 1)),
  title_snapshot TEXT NOT NULL,
  occurrence_date TEXT NOT NULL,
  original_reward_cents INTEGER NOT NULL CHECK (original_reward_cents >= 0),
  approved_reward_cents INTEGER NOT NULL CHECK (approved_reward_cents >= 0),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS approval_lines_approval_idx ON approval_lines(approval_id);
CREATE TABLE IF NOT EXISTS allowance_transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('earning', 'adjustment', 'payment')),
  nominal_cents INTEGER NOT NULL,
  balance_effect_cents INTEGER NOT NULL,
  week_start TEXT,
  approval_id TEXT REFERENCES weekly_approvals(id),
  approval_line_id TEXT REFERENCES approval_lines(id),
  description TEXT NOT NULL,
  parent_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  idempotency_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS allowance_transactions_created_idx ON allowance_transactions(created_at DESC);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT NOT NULL,
  parent_label TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at DESC);
`;

export function openDatabase(databasePath: string, timezone: string, nowDate = new Date()): SenseiDatabase {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  db.pragma('busy_timeout = 5000');
  db.exec(MIGRATION);
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(1, ?)').run(new Date().toISOString());
  migrateCredentialSchema(db);
  migrateApprovalWorkflowSchema(db);
  db.prepare('INSERT OR IGNORE INTO household_settings(key, value) VALUES(?, ?)').run('timezone', timezone);
  db.prepare('INSERT OR IGNORE INTO household_settings(key, value) VALUES(?, ?)').run('theme', 'novapay');
  seedDefaults(db, timezone, nowDate);
  return db;
}

function migrateApprovalWorkflowSchema(db: SenseiDatabase): void {
  const columns = db.pragma('table_info(approval_lines)') as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'source')) {
    db.exec("ALTER TABLE approval_lines ADD COLUMN source TEXT NOT NULL DEFAULT 'legacy_weekly'");
  }
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(4, ?)').run(new Date().toISOString());
}

function migrateCredentialSchema(db: SenseiDatabase): void {
  const credentialColumns = db.pragma('table_info(parent_credentials)') as Array<{ name: string }>;
  if (!credentialColumns.some((column) => column.name === 'label')) {
    const migrate = db.transaction(() => {
      db.exec(`
        ALTER TABLE parent_credentials RENAME TO parent_credentials_v1;
        CREATE TABLE parent_credentials (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL UNIQUE COLLATE NOCASE,
          pin_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO parent_credentials(id, label, pin_hash, created_at, updated_at)
          SELECT 'legacy-parent', 'Parent', pin_hash, created_at, updated_at FROM parent_credentials_v1;
        DROP TABLE parent_credentials_v1;
      `);
    });
    migrate();
  }
  const sessionColumns = db.pragma('table_info(parent_sessions)') as Array<{ name: string }>;
  if (!sessionColumns.some((column) => column.name === 'credential_id')) {
    db.exec('ALTER TABLE parent_sessions ADD COLUMN credential_id TEXT');
  }
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(2, ?)').run(new Date().toISOString());
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(3, ?)').run(new Date().toISOString());
}

function seedDefaults(db: SenseiDatabase, timezone: string, nowDate: Date): void {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM chores').get() as { count: number };
  if (existing.count > 0) return;
  const now = nowDate.toISOString();
  const today = formatLocalDate(nowDate, timezone);
  const effectiveFrom = weekStartFor(today);
  const insertChore = db.prepare('INSERT INTO chores(id, is_default, created_at) VALUES(?, 1, ?)');
  const insertRevision = db.prepare(`INSERT INTO chore_revisions
    (id, chore_id, title, reward_cents, schedule_json, effective_from, archived, created_at)
    VALUES(?, ?, ?, ?, ?, ?, 0, ?)`);
  const transaction = db.transaction(() => {
    const dishesId = randomUUID();
    insertChore.run(dishesId, now);
    insertRevision.run(randomUUID(), dishesId, 'Clear dishes', 100, JSON.stringify({ kind: 'daily' }), effectiveFrom, now);
    const roomId = randomUUID();
    insertChore.run(roomId, now);
    insertRevision.run(randomUUID(), roomId, 'Clean room', 500, JSON.stringify({ kind: 'weekly', weekdays: [6] }), effectiveFrom, now);
  });
  transaction();
}

interface RevisionRow {
  id: string;
  chore_id: string;
  title: string;
  reward_cents: number;
  schedule_json: string;
}

export function ensureWeek(db: SenseiDatabase, weekStart: string): void {
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO weeks(week_start, created_at) VALUES(?, ?)').run(weekStart, now);
    const revisions = db.prepare(`SELECT id, chore_id, title, reward_cents, schedule_json
      FROM chore_revisions
      WHERE archived = 0 AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)`)
      .all(addDays(weekStart, 6), weekStart) as RevisionRow[];
    const insert = db.prepare(`INSERT OR IGNORE INTO chore_occurrences
      (id, week_start, chore_id, revision_id, occurrence_date, title_snapshot, reward_cents_snapshot, schedule_snapshot, created_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(weekStart, offset);
      for (const revision of revisions) {
        const schedule = JSON.parse(revision.schedule_json) as ScheduleDefinition;
        if (occursOn(schedule, date)) {
          insert.run(randomUUID(), weekStart, revision.chore_id, revision.id, date, revision.title,
            revision.reward_cents, revision.schedule_json, now);
        }
      }
    }
  });
  transaction();
}

export function checklistRows(db: SenseiDatabase, weekStart: string): Array<Record<string, unknown>> {
  return db.prepare(`SELECT o.id AS id, o.occurrence_date AS date, o.title_snapshot AS title,
    o.reward_cents_snapshot AS rewardCents, o.claimed, l.decision, l.source AS approvalSource
    FROM chore_occurrences o LEFT JOIN approval_lines l ON l.occurrence_id = o.id
    WHERE o.week_start = ? ORDER BY o.occurrence_date, o.created_at`).all(weekStart) as Array<Record<string, unknown>>;
}

export function checklistRowsForDate(db: SenseiDatabase, date: string): Array<Record<string, unknown>> {
  return db.prepare(`SELECT o.id, o.occurrence_date AS date, o.title_snapshot AS title,
    o.reward_cents_snapshot AS rewardCents, o.claimed, l.decision, l.source AS approvalSource
    FROM chore_occurrences o LEFT JOIN approval_lines l ON l.occurrence_id = o.id
    WHERE o.occurrence_date = ? ORDER BY o.created_at`).all(date) as Array<Record<string, unknown>>;
}

export function labelsForWeek(weekStart: string): Array<{ date: string; label: string }> {
  return Array.from({ length: 7 }, (_, index) => ({ date: addDays(weekStart, index), label: dayLabel(index) }));
}
