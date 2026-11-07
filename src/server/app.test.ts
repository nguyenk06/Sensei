import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import type { ChecklistResponse, ChoreSummary } from '../shared/types.js';
import { SESSION_SECONDS, setCredential } from './auth.js';
import { buildApp } from './app.js';
import { openDatabase } from './database.js';
import { formatLocalDate } from './dates.js';

const mutationHeaders = { 'x-sensei-request': '1' };
const jsonHeaders = { ...mutationHeaders, 'content-type': 'application/json' };

function cookieFrom(response: LightMyRequestResponse): string {
  const value = response.headers['set-cookie'];
  const line = Array.isArray(value) ? value[0] : value;
  if (!line) throw new Error('No session cookie returned');
  return line.split(';')[0];
}

describe('Sensei API', () => {
  let tempDir: string;
  let databasePath: string;
  let app: FastifyInstance;
  let now: Date;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sensei-test-'));
    databasePath = path.join(tempDir, 'sensei.sqlite');
    now = new Date('2026-10-28T19:00:00.000Z');
    app = await buildApp({ databasePath, now: () => now });
  });

  afterEach(async () => {
    if (app) await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function checklist(): Promise<ChecklistResponse> {
    const response = await app.inject({ method: 'GET', url: '/api/checklist' });
    expect(response.statusCode).toBe(200);
    return response.json<ChecklistResponse>();
  }

  function claimRequestHeaders(viewDate = formatLocalDate(now, 'America/Los_Angeles')) {
    return { ...mutationHeaders, 'x-sensei-view-date': viewDate };
  }

  async function setupParent(): Promise<string> {
    const response = await app.inject({
      method: 'POST', url: '/api/parent/setup', headers: jsonHeaders, payload: { pin: '739154' }
    });
    expect(response.statusCode).toBe(200);
    return cookieFrom(response);
  }

  async function approveOneClaimedChore(): Promise<{ cookie: string; occurrenceId: string }> {
    now = new Date('2026-11-01T20:00:00.000Z');
    const current = await checklist();
    const occurrence = current.days[6].occurrences.find((item) => item.title === 'Clear dishes')!;
    expect((await app.inject({ method: 'POST', url: `/api/occurrences/${occurrence.id}/claim`, headers: claimRequestHeaders() })).statusCode).toBe(200);
    const cookie = await setupParent();
    const approval = await app.inject({
      method: 'POST', url: `/api/parent/occurrences/${occurrence.id}/approve`,
      headers: { ...mutationHeaders, cookie }
    });
    expect(approval.statusCode).toBe(200);
    return { cookie, occurrenceId: occurrence.id };
  }

  it('generates daily dishes and a Sunday room chore exactly once under concurrent requests', async () => {
    await Promise.all(Array.from({ length: 8 }, () => app.inject({ method: 'GET', url: '/api/checklist' })));
    const result = await checklist();
    const occurrences = result.days.flatMap((day) => day.occurrences);
    expect(occurrences.filter((item) => item.title === 'Clear dishes')).toHaveLength(7);
    expect(occurrences.filter((item) => item.title === 'Clean room')).toHaveLength(1);
    expect(result.days[6].occurrences.some((item) => item.title === 'Clean room')).toBe(true);
  });

  it('persists a single claim event across concurrent requests, refresh, and restart', async () => {
    const result = await checklist();
    const todayItem = result.days.find((day) => day.date === result.today)!.occurrences[0];
    const responses = await Promise.all(Array.from({ length: 5 }, () => app.inject({
      method: 'POST', url: `/api/occurrences/${todayItem.id}/claim`, headers: claimRequestHeaders()
    })));
    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    expect((await checklist()).days.find((day) => day.date === result.today)!.occurrences[0].claimed).toBe(true);
    await app.close();
    app = await buildApp({ databasePath, now: () => now });
    expect((await checklist()).days.find((day) => day.date === result.today)!.occurrences[0].claimed).toBe(true);
    const db = new Database(databasePath, { readonly: true });
    expect((db.prepare('SELECT COUNT(*) AS count FROM claim_events').get() as { count: number }).count).toBe(1);
    db.close();
  });

  it('supports undo while rejecting future and previous-week mutations', async () => {
    const result = await checklist();
    const todayItem = result.days.find((day) => day.date === result.today)!.occurrences[0];
    const futureItem = result.days.find((day) => day.date > result.today)!.occurrences[0];
    expect((await app.inject({ method: 'POST', url: `/api/occurrences/${futureItem.id}/claim`, headers: claimRequestHeaders() })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `/api/occurrences/${todayItem.id}/claim`, headers: claimRequestHeaders() })).statusCode).toBe(200);
    expect((await app.inject({ method: 'DELETE', url: `/api/occurrences/${todayItem.id}/claim`, headers: claimRequestHeaders() })).statusCode).toBe(200);
    now = new Date('2026-11-02T20:00:00.000Z');
    expect((await app.inject({ method: 'POST', url: `/api/occurrences/${todayItem.id}/claim`, headers: claimRequestHeaders() })).statusCode).toBe(409);
  });

  it('prevents cached API responses and rejects claims submitted from a previous-day page', async () => {
    const first = await app.inject({ method: 'GET', url: '/api/checklist' });
    expect(first.headers['cache-control']).toBe('no-store, private');
    const oldView = first.json<ChecklistResponse>();
    const yesterdayItem = oldView.days.find((day) => day.date === oldView.today)!.occurrences[0];
    const missingViewDate = await app.inject({
      method: 'POST', url: `/api/occurrences/${yesterdayItem.id}/claim`, headers: mutationHeaders
    });
    expect(missingViewDate.statusCode).toBe(409);
    expect(missingViewDate.json()).toMatchObject({ code: 'stale_client' });
    now = new Date('2026-10-29T19:00:00.000Z');
    const stale = await app.inject({
      method: 'POST', url: `/api/occurrences/${yesterdayItem.id}/claim`, headers: claimRequestHeaders(oldView.today)
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: 'stale_client' });
    expect((await app.inject({
      method: 'POST', url: `/api/occurrences/${yesterdayItem.id}/claim`, headers: claimRequestHeaders()
    })).statusCode).toBe(200);
  });

  it('opens Monday on demand without deleting the previous week', async () => {
    await checklist();
    now = new Date('2026-11-02T20:00:00.000Z');
    const next = await checklist();
    expect(next.weekStart).toBe('2026-11-02');
    const db = new Database(databasePath, { readonly: true });
    expect((db.prepare('SELECT COUNT(*) AS count FROM weeks').get() as { count: number }).count).toBe(2);
    expect((db.prepare("SELECT COUNT(*) AS count FROM chore_occurrences WHERE week_start = '2026-10-26'").get() as { count: number }).count).toBe(8);
    db.close();
  });

  it('protects parent routes and preserves current snapshots across recurring edits', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/parent/chores' })).statusCode).toBe(401);
    const cookie = await setupParent();
    const choresResponse = await app.inject({ method: 'GET', url: '/api/parent/chores', headers: { cookie } });
    const dishes = choresResponse.json<{ chores: ChoreSummary[] }>().chores.find((chore) => chore.title === 'Clear dishes')!;
    expect((await app.inject({
      method: 'PUT', url: `/api/parent/chores/${dishes.id}`,
      headers: { ...jsonHeaders, cookie },
      payload: { title: 'Clear dishes carefully', rewardCents: 250, schedule: { kind: 'daily' } }
    })).statusCode).toBe(200);
    expect((await checklist()).days.flatMap((day) => day.occurrences).every((item) => item.title !== 'Clear dishes' || item.rewardCents === 100)).toBe(true);
    now = new Date('2026-11-02T20:00:00.000Z');
    const next = await checklist();
    expect(next.days.flatMap((day) => day.occurrences).filter((item) => item.title === 'Clear dishes carefully')).toHaveLength(7);
    expect(next.days[0].occurrences.find((item) => item.title === 'Clear dishes carefully')!.rewardCents).toBe(250);
  });

  it('creates all custom recurrence patterns and a current-week one-time chore', async () => {
    const cookie = await setupParent();
    const create = (payload: unknown) => app.inject({ method: 'POST', url: '/api/parent/chores', headers: { ...jsonHeaders, cookie }, payload });
    expect((await create({ title: 'Daily practice', rewardCents: 50, schedule: { kind: 'daily' } })).statusCode).toBe(201);
    expect((await create({ title: 'Plant days', rewardCents: 75, schedule: { kind: 'weekdays', weekdays: [0, 2, 4] } })).statusCode).toBe(201);
    expect((await create({ title: 'Saturday sweep', rewardCents: 125, schedule: { kind: 'weekly', weekdays: [5] } })).statusCode).toBe(201);
    expect((await create({ title: 'One-time tidy', rewardCents: 200, schedule: { kind: 'one_time', date: '2026-10-28' } })).statusCode).toBe(201);
    expect((await checklist()).days[2].occurrences.some((item) => item.title === 'One-time tidy')).toBe(true);
    now = new Date('2026-11-02T20:00:00.000Z');
    const next = await checklist();
    const all = next.days.flatMap((day) => day.occurrences);
    expect(all.filter((item) => item.title === 'Daily practice')).toHaveLength(7);
    expect(all.filter((item) => item.title === 'Plant days')).toHaveLength(3);
    expect(all.filter((item) => item.title === 'Saturday sweep')).toHaveLength(1);
  });

  it('requires quarter-dollar increments for newly entered scheduled rewards', async () => {
    const cookie = await setupParent();
    const invalid = await app.inject({ method: 'POST', url: '/api/parent/chores', headers: { ...jsonHeaders, cookie },
      payload: { title: 'Invalid reward', rewardCents: 110, schedule: { kind: 'daily' } } });
    expect(invalid.statusCode).toBe(400);
    const valid = await app.inject({ method: 'POST', url: '/api/parent/chores', headers: { ...jsonHeaders, cookie },
      payload: { title: 'Quarter reward', rewardCents: 125, schedule: { kind: 'daily' } } });
    expect(valid.statusCode).toBe(201);
    const chores = (await app.inject({ method: 'GET', url: '/api/parent/chores', headers: { cookie } }))
      .json<{ chores: ChoreSummary[] }>().chores;
    const dishes = chores.find((chore) => chore.title === 'Clear dishes')!;
    const invalidEdit = await app.inject({ method: 'PUT', url: `/api/parent/chores/${dishes.id}`,
      headers: { ...jsonHeaders, cookie }, payload: {
        title: dishes.title, rewardCents: 110, schedule: dishes.schedule
      } });
    expect(invalidEdit.statusCode).toBe(400);
  });

  it('expires the parent session at exactly seven days and revokes it on sign-out', async () => {
    const cookie = await setupParent();
    let status = await app.inject({ method: 'GET', url: '/api/parent/status', headers: { cookie } });
    expect(status.json<{ authorized: boolean }>().authorized).toBe(true);
    now = new Date(now.valueOf() + SESSION_SECONDS * 1000 - 1);
    status = await app.inject({ method: 'GET', url: '/api/parent/status', headers: { cookie } });
    expect(status.json<{ authorized: boolean }>().authorized).toBe(true);
    now = new Date(now.valueOf() + 1);
    status = await app.inject({ method: 'GET', url: '/api/parent/status', headers: { cookie } });
    expect(status.json<{ authorized: boolean }>().authorized).toBe(false);

    now = new Date('2026-10-28T19:00:00.000Z');
    const login = await app.inject({ method: 'POST', url: '/api/parent/login', headers: jsonHeaders, payload: { pin: '739154' } });
    const freshCookie = cookieFrom(login);
    await app.inject({ method: 'POST', url: '/api/parent/logout', headers: { ...mutationHeaders, cookie: freshCookie } });
    status = await app.inject({ method: 'GET', url: '/api/parent/status', headers: { cookie: freshCookie } });
    expect(status.json<{ authorized: boolean }>().authorized).toBe(false);
  });

  it('throttles repeated PIN guessing', async () => {
    await setupParent();
    const attempts = [];
    for (let index = 0; index < 6; index += 1) {
      attempts.push(await app.inject({ method: 'POST', url: '/api/parent/login', headers: jsonHeaders, payload: { pin: '000000' } }));
    }
    expect(attempts.slice(0, 5).every((response) => response.statusCode === 401)).toBe(true);
    expect(attempts[5].statusCode).toBe(429);
  });

  it('accepts two labeled four-digit parent PINs for the same Parent Mode', async () => {
    const maintenanceDb = openDatabase(databasePath, 'America/Los_Angeles', now);
    await setCredential(maintenanceDb, 'First parent', '2468', now);
    await setCredential(maintenanceDb, 'Second parent', '8642', now);
    maintenanceDb.close();

    for (const [pin, label] of [['2468', 'First parent'], ['8642', 'Second parent']]) {
      const login = await app.inject({ method: 'POST', url: '/api/parent/login', headers: jsonHeaders, payload: { pin } });
      expect(login.statusCode).toBe(200);
      const status = await app.inject({ method: 'GET', url: '/api/parent/status', headers: { cookie: cookieFrom(login) } });
      expect(status.json<{ authorized: boolean; parentLabel: string }>() ).toMatchObject({ authorized: true, parentLabel: label });
    }
  });

  it('approves one claim exactly once, makes its decision final, and exposes calendar history', async () => {
    const { cookie, occurrenceId } = await approveOneClaimedChore();
    const current = await checklist();
    expect(current.weekApproved).toBe(false);
    expect(current.days.flatMap((day) => day.occurrences).find((item) => item.id === occurrenceId)?.locked).toBe(true);
    expect((await app.inject({ method: 'DELETE', url: `/api/occurrences/${occurrenceId}/claim`, headers: claimRequestHeaders() })).statusCode).toBe(409);

    const approvedRows = await app.inject({ method: 'GET', url: '/api/parent/approved-weeks', headers: { cookie } });
    expect(approvedRows.json<{ weeks: Array<{ totalCents: number }> }>().weeks[0].totalCents).toBe(100);
    const duplicate = await app.inject({
      method: 'POST', url: `/api/parent/occurrences/${occurrenceId}/approve`, headers: { ...mutationHeaders, cookie }
    });
    expect(duplicate.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/parent/occurrences/${occurrenceId}/reject`,
      headers: { ...mutationHeaders, cookie } })).statusCode).toBe(409);

    const calendar = await app.inject({ method: 'GET', url: '/api/calendar?month=2026-10' });
    const sunday = calendar.json<{ days: Array<{ date: string; locked: boolean; approvedCents: number | null; missedCount: number }> }>()
      .days.find((day) => day.date === '2026-11-01')!;
    expect(sunday).toMatchObject({ locked: true, approvedCents: 100, missedCount: 0 });
  });

  it('records idempotent partial payments and prevents overpayment', async () => {
    const { cookie } = await approveOneClaimedChore();
    const payment = { amountCents: 40, note: 'Cash', idempotencyKey: 'payment-test-1' };
    expect((await app.inject({ method: 'POST', url: '/api/parent/payments', headers: { ...jsonHeaders, cookie }, payload: payment })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/parent/payments', headers: { ...jsonHeaders, cookie }, payload: payment })).statusCode).toBe(200);
    const overpayment = await app.inject({ method: 'POST', url: '/api/parent/payments', headers: { ...jsonHeaders, cookie },
      payload: { amountCents: 61, note: '', idempotencyKey: 'payment-test-2' } });
    expect(overpayment.statusCode).toBe(409);
    const summary = await app.inject({ method: 'GET', url: '/api/allowance' });
    expect(summary.json<{ approvedBalanceCents: number; totalPaidCents: number; payments: unknown[] }>()).toMatchObject({
      approvedBalanceCents: 60, totalPaidCents: 40, payments: [{}]
    });
  });

  it('preserves historical correction value while clamping balance at zero after payment', async () => {
    const { cookie } = await approveOneClaimedChore();
    await app.inject({ method: 'POST', url: '/api/parent/payments', headers: { ...jsonHeaders, cookie },
      payload: { amountCents: 60, note: 'Paid early', idempotencyKey: 'payment-before-correction' } });
    const history = await app.inject({ method: 'GET', url: '/api/parent/approved-weeks', headers: { cookie } });
    const line = history.json<{ weeks: Array<{ lines: Array<{ id: string; approvedRewardCents: number }> }> }>()
      .weeks[0].lines.find((item) => item.approvedRewardCents === 100)!;
    const correction = await app.inject({ method: 'POST', url: `/api/parent/approval-lines/${line.id}/adjust`,
      headers: { ...jsonHeaders, cookie }, payload: { correctedRewardCents: 0, note: 'Verified incomplete', idempotencyKey: 'correction-test-1' } });
    expect(correction.json()).toMatchObject({ balanceCents: 0, nominalDeltaCents: -100, balanceEffectCents: -40 });
    const summary = await app.inject({ method: 'GET', url: '/api/allowance' });
    expect(summary.json<{ approvedBalanceCents: number }>().approvedBalanceCents).toBe(0);
    const updated = await app.inject({ method: 'GET', url: '/api/parent/approved-weeks', headers: { cookie } });
    expect(updated.json<{ weeks: Array<{ lines: Array<{ currentHistoricalCents: number }> }> }>().weeks[0].lines
      .some((item) => item.currentHistoricalCents === 0)).toBe(true);
  });

  it('exports a consistent SQLite database for an authorized parent', async () => {
    const cookie = await setupParent();
    const response = await app.inject({ method: 'GET', url: '/api/parent/export', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/vnd.sqlite3');
    expect(response.rawPayload.subarray(0, 15).toString()).toBe('SQLite format 3');
  });
});
