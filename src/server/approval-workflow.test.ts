import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import Database from 'better-sqlite3';
import type { ChecklistResponse } from '../shared/types.js';
import { buildApp } from './app.js';
import { formatLocalDate } from './dates.js';

const mutationHeaders = { 'x-sensei-request': '1' };
const jsonHeaders = { ...mutationHeaders, 'content-type': 'application/json' };

function cookieFrom(response: LightMyRequestResponse): string {
  const value = response.headers['set-cookie'];
  const line = Array.isArray(value) ? value[0] : value;
  if (!line) throw new Error('No session cookie returned');
  return line.split(';')[0];
}

describe('rolling chore approval workflow', () => {
  let tempDir: string;
  let databasePath: string;
  let app: FastifyInstance;
  let now: Date;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sensei-approval-'));
    databasePath = path.join(tempDir, 'sensei.sqlite');
    now = new Date('2026-10-28T19:00:00.000Z');
    app = await buildApp({ databasePath, now: () => now });
  });

  afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function checklist(): Promise<ChecklistResponse> {
    const response = await app.inject({ method: 'GET', url: '/api/checklist' });
    expect(response.statusCode).toBe(200);
    return response.json<ChecklistResponse>();
  }

  function claimRequestHeaders() {
    return { ...mutationHeaders, 'x-sensei-view-date': formatLocalDate(now, 'America/Los_Angeles') };
  }

  async function parentCookie(): Promise<string> {
    const response = await app.inject({ method: 'POST', url: '/api/parent/setup', headers: jsonHeaders, payload: { pin: '739154' } });
    expect(response.statusCode).toBe(200);
    return cookieFrom(response);
  }

  async function claim(id: string) {
    return app.inject({ method: 'POST', url: `/api/occurrences/${id}/claim`, headers: claimRequestHeaders() });
  }

  it('allows today and yesterday only while preserving a pending claim after cutoff', async () => {
    const current = await checklist();
    const monday = current.days[0].occurrences[0];
    const yesterday = current.days[1].occurrences[0];
    const today = current.days[2].occurrences[0];
    const future = current.days[3].occurrences[0];
    expect((await claim(today.id)).statusCode).toBe(200);
    expect((await claim(yesterday.id)).statusCode).toBe(200);
    expect((await claim(monday.id)).statusCode).toBe(409);
    expect((await claim(future.id)).statusCode).toBe(409);

    now = new Date('2026-10-30T19:00:00.000Z');
    const staleUndo = await app.inject({ method: 'DELETE', url: `/api/occurrences/${today.id}/claim`, headers: claimRequestHeaders() });
    expect(staleUndo.statusCode).toBe(409);
    const refreshed = await checklist();
    expect(refreshed.days[2].occurrences[0]).toMatchObject({ claimed: true, state: 'pending', eligible: false });
  });

  it('makes individual approval and rejection final without duplicate credit', async () => {
    const current = await checklist();
    const yesterday = current.days[1].occurrences[0];
    const today = current.days[2].occurrences[0];
    await claim(yesterday.id);
    await claim(today.id);
    const cookie = await parentCookie();
    const approve = () => app.inject({ method: 'POST', url: `/api/parent/occurrences/${today.id}/approve`,
      headers: { ...jsonHeaders, cookie }, payload: { note: 'Nice work' } });
    expect((await approve()).statusCode).toBe(200);
    expect((await approve()).json()).toMatchObject({ idempotent: true, creditedCents: 100 });
    expect((await app.inject({ method: 'POST', url: `/api/parent/occurrences/${today.id}/reject`, headers: { ...mutationHeaders, cookie } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'DELETE', url: `/api/occurrences/${today.id}/claim`, headers: claimRequestHeaders() })).statusCode).toBe(409);

    expect((await app.inject({ method: 'POST', url: `/api/parent/occurrences/${yesterday.id}/reject`, headers: { ...mutationHeaders, cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/parent/occurrences/${yesterday.id}/approve`, headers: { ...mutationHeaders, cookie } })).statusCode).toBe(409);
    expect((await checklist()).days[2].occurrences[0]).toMatchObject({ decisionNote: 'Nice work', approvedRewardCents: 100 });
    const summary = await app.inject({ method: 'GET', url: '/api/allowance' });
    expect(summary.json<{ approvedBalanceCents: number; totalApprovedCents: number; lifetimeEarnedCents: number;
      monthlyEarnedCents: number; earningsMonth: string }>()).toMatchObject({ approvedBalanceCents: 100,
      totalApprovedCents: 100, lifetimeEarnedCents: 100, monthlyEarnedCents: 100, earningsMonth: '2026-10' });
    now = new Date('2026-11-02T20:00:00.000Z');
    expect((await app.inject({ method: 'GET', url: '/api/allowance' })).json()).toMatchObject({
      lifetimeEarnedCents: 100, monthlyEarnedCents: 0, earningsMonth: '2026-11'
    });
    const calendar = (await app.inject({ method: 'GET', url: '/api/calendar?month=2026-10' }))
      .json<{ days: Array<{ date: string; approvedCents: number | null; missedCount: number }> }>();
    expect(calendar.days.find((day) => day.date === yesterday.date)).toMatchObject({ approvedCents: null, missedCount: 1 });
    expect(calendar.days.find((day) => day.date === today.date)).toMatchObject({ approvedCents: 100, missedCount: 0 });
  });

  it('completes an exact pending review atomically and stores optional rejection notes outside the ledger', async () => {
    const current = await checklist();
    const yesterday = current.days[1].occurrences[0];
    const today = current.days[2].occurrences[0];
    await claim(yesterday.id);
    await claim(today.id);
    const cookie = await parentCookie();
    const pending = (await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } }))
      .json<{ snapshotIds: string[] }>();
    const payload = {
      snapshotIds: pending.snapshotIds,
      decisions: [
        { occurrenceId: yesterday.id, decision: 'rejected', note: 'Discussed in person' },
        { occurrenceId: today.id, decision: 'approved' }
      ]
    };
    const submit = () => app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/complete-pending`,
      headers: { ...jsonHeaders, cookie }, payload });
    expect((await submit()).json()).toMatchObject({ approvedCount: 1, rejectedCount: 1, totalCents: 100, idempotent: false });
    expect((await submit()).json()).toMatchObject({ approvedCount: 1, rejectedCount: 1, totalCents: 100, idempotent: true });

    const refreshed = await checklist();
    expect(refreshed.days[1].occurrences[0]).toMatchObject({ state: 'rejected', decisionNote: 'Discussed in person' });
    const summary = (await app.inject({ method: 'GET', url: '/api/allowance' }))
      .json<{ approvedBalanceCents: number; recentActivity: unknown[] }>();
    expect(summary.approvedBalanceCents).toBe(100);
    expect(summary.recentActivity).toHaveLength(1);
  });

  it('rejects duplicate and stale pending-review decisions while allowing a note-free exact retry', async () => {
    const current = await checklist();
    const yesterday = current.days[1].occurrences[0];
    const today = current.days[2].occurrences[0];
    await claim(yesterday.id);
    const cookie = await parentCookie();
    const first = (await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } }))
      .json<{ snapshotIds: string[] }>();

    const duplicate = await app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/complete-pending`,
      headers: { ...jsonHeaders, cookie }, payload: {
        snapshotIds: first.snapshotIds,
        decisions: [
          { occurrenceId: yesterday.id, decision: 'approved' },
          { occurrenceId: yesterday.id, decision: 'rejected' }
        ]
      } });
    expect(duplicate.statusCode).toBe(409);

    await claim(today.id);
    const stale = await app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/complete-pending`,
      headers: { ...jsonHeaders, cookie }, payload: {
        snapshotIds: first.snapshotIds,
        decisions: [{ occurrenceId: yesterday.id, decision: 'rejected' }]
      } });
    expect(stale.statusCode).toBe(409);
    expect((await app.inject({ method: 'GET', url: '/api/allowance' })).json<{ approvedBalanceCents: number }>().approvedBalanceCents).toBe(0);

    const fresh = (await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } }))
      .json<{ snapshotIds: string[] }>();
    const payload = { snapshotIds: fresh.snapshotIds, decisions: [
      { occurrenceId: yesterday.id, decision: 'rejected' },
      { occurrenceId: today.id, decision: 'approved' }
    ] };
    const submit = () => app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/complete-pending`,
      headers: { ...jsonHeaders, cookie }, payload });
    expect((await submit()).json()).toMatchObject({ approvedCount: 1, rejectedCount: 1, totalCents: 100, idempotent: false });
    expect((await submit()).json()).toMatchObject({ approvedCount: 1, rejectedCount: 1, totalCents: 100, idempotent: true });
    const refreshed = await checklist();
    expect(refreshed.days[1].occurrences[0]).toMatchObject({ state: 'rejected', decisionNote: null });
  });

  it('keeps individual review protected and removes its claim from bulk review without duplicate earnings', async () => {
    const current = await checklist();
    const yesterday = current.days[1].occurrences[0];
    const today = current.days[2].occurrences[0];
    await claim(yesterday.id);
    await claim(today.id);

    const unauthorized = await app.inject({ method: 'POST', url: `/api/parent/occurrences/${yesterday.id}/approve`,
      headers: mutationHeaders });
    expect(unauthorized.statusCode).toBe(401);

    const cookie = await parentCookie();
    const staleSnapshot = (await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } }))
      .json<{ snapshotIds: string[] }>();
    expect(staleSnapshot.snapshotIds).toEqual(expect.arrayContaining([yesterday.id, today.id]));

    const approve = () => app.inject({ method: 'POST', url: `/api/parent/occurrences/${yesterday.id}/approve`,
      headers: { ...mutationHeaders, cookie } });
    expect((await approve()).json()).toMatchObject({ creditedCents: 100, idempotent: false });
    expect((await approve()).json()).toMatchObject({ creditedCents: 100, idempotent: true });

    const staleBulk = await app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/complete-pending`,
      headers: { ...jsonHeaders, cookie }, payload: {
        snapshotIds: staleSnapshot.snapshotIds,
        decisions: staleSnapshot.snapshotIds.map((occurrenceId) => ({ occurrenceId, decision: 'approved' }))
      } });
    expect(staleBulk.statusCode).toBe(409);

    const fresh = (await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } }))
      .json<{ snapshotIds: string[] }>();
    expect(fresh.snapshotIds).toEqual([today.id]);
    const finish = await app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/complete-pending`,
      headers: { ...jsonHeaders, cookie }, payload: {
        snapshotIds: fresh.snapshotIds,
        decisions: [{ occurrenceId: today.id, decision: 'rejected' }]
      } });
    expect(finish.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/allowance' })).json<{ approvedBalanceCents: number }>().approvedBalanceCents).toBe(100);
  });

  it('stores optional approval comments and adjusted awards without changing the scheduled snapshot', async () => {
    const current = await checklist();
    const today = current.days[2].occurrences[0];
    await claim(today.id);
    const cookie = await parentCookie();
    const payload = { note: 'Excellent extra effort', approvedRewardCents: 175 };
    const decide = () => app.inject({ method: 'POST', url: `/api/parent/occurrences/${today.id}/approve`,
      headers: { ...jsonHeaders, cookie }, payload });
    expect((await decide()).json()).toMatchObject({ creditedCents: 175, idempotent: false });
    expect((await decide()).json()).toMatchObject({ creditedCents: 175, idempotent: true });

    const refreshed = await checklist();
    expect(refreshed.days[2].occurrences[0]).toMatchObject({
      rewardCents: 100, approvedRewardCents: 175, decisionNote: 'Excellent extra effort', state: 'approved'
    });
    const history = (await app.inject({ method: 'GET', url: '/api/parent/approved-weeks', headers: { cookie } }))
      .json<{ weeks: Array<{ lines: Array<{ originalRewardCents: number; approvedRewardCents: number; note: string | null }> }> }>();
    expect(history.weeks[0].lines[0]).toMatchObject({
      originalRewardCents: 100, approvedRewardCents: 175, note: 'Excellent extra effort'
    });
    const ledger = (await app.inject({ method: 'GET', url: '/api/allowance' }))
      .json<{ approvedBalanceCents: number; recentActivity: unknown[] }>();
    expect(ledger).toMatchObject({ approvedBalanceCents: 175 });
    expect(ledger.recentActivity).toHaveLength(1);
  });

  it('requires an explanation for reductions and rejects invalid individual award amounts', async () => {
    const current = await checklist();
    const today = current.days[2].occurrences[0];
    await claim(today.id);
    const cookie = await parentCookie();
    const approve = (approvedRewardCents: number, note?: string) => app.inject({ method: 'POST',
      url: `/api/parent/occurrences/${today.id}/approve`, headers: { ...jsonHeaders, cookie },
      payload: { approvedRewardCents, note } });
    expect((await approve(50)).statusCode).toBe(409);
    expect((await approve(90, 'Reduced')).statusCode).toBe(409);
    expect((await approve(0, 'Use rejection')).statusCode).toBe(409);
    expect((await approve(-25, 'Invalid')).statusCode).toBe(409);
    expect((await approve(50, 'Only part of the chore was completed')).json()).toMatchObject({ creditedCents: 50 });
    expect((await checklist()).days[2].occurrences[0]).toMatchObject({
      rewardCents: 100, approvedRewardCents: 50, decisionNote: 'Only part of the chore was completed'
    });
  });

  it('accepts a note-free standard approval and preserves an unchanged legacy non-quarter snapshot', async () => {
    const current = await checklist();
    const today = current.days[2].occurrences[0];
    const legacy = new Database(databasePath);
    legacy.prepare('UPDATE chore_occurrences SET reward_cents_snapshot = 110 WHERE id = ?').run(today.id);
    legacy.close();
    await claim(today.id);
    const cookie = await parentCookie();
    const response = await app.inject({ method: 'POST', url: `/api/parent/occurrences/${today.id}/approve`,
      headers: { ...jsonHeaders, cookie }, payload: { approvedRewardCents: 110 } });
    expect(response.json()).toMatchObject({ creditedCents: 110, idempotent: false });
    expect((await checklist()).days[2].occurrences[0]).toMatchObject({
      rewardCents: 110, approvedRewardCents: 110, decisionNote: null
    });
  });

  it('bulk-approves an exact snapshot, leaves deselected claims pending, and handles retries', async () => {
    now = new Date('2026-10-27T19:00:00.000Z');
    const current = await checklist();
    const monday = current.days[0].occurrences[0];
    const tuesday = current.days[1].occurrences[0];
    await claim(monday.id);
    await claim(tuesday.id);
    const cookie = await parentCookie();
    const firstReview = await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } });
    const first = firstReview.json<{ snapshotIds: string[]; items: Array<{ id: string; date: string; rewardCents: number }> }>();
    expect(first.items).toHaveLength(2);
    expect(first.items.every((item) => item.rewardCents === 100 && item.date <= '2026-10-27')).toBe(true);

    now = new Date('2026-10-28T19:00:00.000Z');
    const wednesday = (await checklist()).days[2].occurrences[0];
    await claim(wednesday.id);
    const stale = await app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/approve-pending`,
      headers: { ...jsonHeaders, cookie }, payload: { snapshotIds: first.snapshotIds, selectedIds: first.snapshotIds } });
    expect(stale.statusCode).toBe(409);

    const fresh = (await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } }))
      .json<{ snapshotIds: string[] }>();
    const selectedIds = fresh.snapshotIds.filter((id) => id !== wednesday.id);
    const payload = { snapshotIds: fresh.snapshotIds, selectedIds };
    const approved = await app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/approve-pending`, headers: { ...jsonHeaders, cookie }, payload });
    expect(approved.json()).toMatchObject({ approvedCount: 2, totalCents: 200, idempotent: false });
    const retry = await app.inject({ method: 'POST', url: `/api/parent/reviews/${current.weekStart}/approve-pending`, headers: { ...jsonHeaders, cookie }, payload });
    expect(retry.json()).toMatchObject({ approvedCount: 2, totalCents: 200, idempotent: true });
    const remaining = (await app.inject({ method: 'GET', url: `/api/parent/reviews/${current.weekStart}/pending`, headers: { cookie } }))
      .json<{ snapshotIds: string[] }>();
    expect(remaining.snapshotIds).toEqual([wednesday.id]);
  });

  it('supports a historical parent override and a directly approved one-time chore', async () => {
    const current = await checklist();
    const monday = current.days[0].occurrences[0];
    const cookie = await parentCookie();
    const override = await app.inject({ method: 'POST', url: `/api/parent/occurrences/${monday.id}/override`, headers: { ...mutationHeaders, cookie } });
    expect(override.json()).toMatchObject({ state: 'approved', creditedCents: 100 });
    expect((await app.inject({ method: 'POST', url: `/api/parent/occurrences/${monday.id}/override`, headers: { ...mutationHeaders, cookie } })).json())
      .toMatchObject({ idempotent: true });

    const direct = await app.inject({ method: 'POST', url: '/api/parent/chores', headers: { ...jsonHeaders, cookie }, payload: {
      title: 'Bonus tidy', rewardCents: 225, schedule: { kind: 'one_time', date: current.today }, completeAndApprove: true
    } });
    expect(direct.statusCode).toBe(201);
    expect(direct.json()).toMatchObject({ approved: true, creditedCents: 225 });
    const history = await app.inject({ method: 'GET', url: '/api/parent/approved-weeks', headers: { cookie } });
    const sources = history.json<{ weeks: Array<{ lines: Array<{ source: string }> }> }>().weeks.flatMap((week) => week.lines.map((line) => line.source));
    expect(sources).toEqual(expect.arrayContaining(['parent_override', 'parent_direct']));
    const summary = await app.inject({ method: 'GET', url: '/api/allowance' });
    expect(summary.json<{ approvedBalanceCents: number }>().approvedBalanceCents).toBe(325);
  });

  it('keeps Sunday pending across Monday rollover and payments separate from approval', async () => {
    now = new Date('2026-11-01T20:00:00.000Z');
    const sundayWeek = await checklist();
    const dishes = sundayWeek.days[6].occurrences.find((item) => item.title === 'Clear dishes')!;
    await claim(dishes.id);
    now = new Date('2026-11-02T20:00:00.000Z');
    const mondayWeek = await checklist();
    expect(mondayWeek.weekStart).toBe('2026-11-02');
    expect(mondayWeek.lateClaimDay?.occurrences.find((item) => item.id === dishes.id)).toMatchObject({ state: 'pending', claimed: true });
    const cookie = await parentCookie();
    await app.inject({ method: 'POST', url: `/api/parent/occurrences/${dishes.id}/approve`, headers: { ...mutationHeaders, cookie } });
    const payment = await app.inject({ method: 'POST', url: '/api/parent/payments', headers: { ...jsonHeaders, cookie },
      payload: { amountCents: 40, note: 'Partial payment', idempotencyKey: 'rollover-payment' } });
    expect(payment.json()).toMatchObject({ balanceCents: 60 });
    const summary = await app.inject({ method: 'GET', url: '/api/allowance' });
    expect(summary.json<{ approvedBalanceCents: number; totalPaidCents: number }>()).toMatchObject({ approvedBalanceCents: 60, totalPaidCents: 40 });
  });
});
