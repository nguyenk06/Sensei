import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { ChecklistResponse, OverworldWeatherResponse, ScheduleDefinition } from '../shared/types.js';
import {
  credentialConfigured,
  createSession,
  revokeSession,
  sessionForRequest,
  setSessionCookie,
  setupCredential,
  verifyPin
} from './auth.js';
import { archiveChore, createChore, editChore, listChores, type ChoreInput } from './chores.js';
import { checklistRows, checklistRowsForDate, ensureWeek, labelsForWeek, openDatabase, type SenseiDatabase } from './database.js';
import { addDays, compareDates, formatLocalDate, weekStartFor } from './dates.js';
import {
  adjustApprovalLine,
  allowanceSummary,
  approvedWeeks,
  bulkApprovePending,
  calendarMonth,
  completePendingReview,
  decideOccurrence,
  pendingOccurrences,
  recordPayment,
  reviewOccurrences
} from './allowance.js';
import { createOverworldWeatherService } from './overworld.js';

interface BuildAppOptions {
  databasePath: string;
  timezone?: string;
  host?: string;
  port?: number;
  staticDir?: string;
  now?: () => Date;
  logger?: boolean;
  weatherFetch?: typeof fetch;
}

interface PinBody { pin: string }
interface ChoreBody { title: string; rewardCents: number; schedule: ScheduleDefinition; completeAndApprove?: boolean }
interface BulkApprovalBody { snapshotIds: string[]; selectedIds: string[] }
interface PendingReviewBody {
  snapshotIds: string[];
  decisions: Array<{ occurrenceId: string; decision: 'approved' | 'rejected'; note?: string }>;
}
interface DecisionBody { note?: string }
interface PaymentBody { amountCents: number; note?: string; idempotencyKey: string }
interface AdjustmentBody { correctedRewardCents: number; note: string; idempotencyKey: string }

const pinSchema = {
  body: {
    type: 'object', additionalProperties: false, required: ['pin'],
    properties: { pin: { type: 'string', pattern: '^\\d{4,12}$' } }
  }
} as const;

const choreSchema = {
  body: {
    type: 'object', additionalProperties: false, required: ['title', 'rewardCents', 'schedule'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 80 },
      rewardCents: { type: 'integer', minimum: 0, maximum: 100000 },
      schedule: {
        type: 'object', additionalProperties: false, required: ['kind'],
        properties: {
          kind: { type: 'string', enum: ['daily', 'weekdays', 'weekly', 'one_time'] },
          weekdays: { type: 'array', uniqueItems: true, items: { type: 'integer', minimum: 0, maximum: 6 } },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
        }
      },
      completeAndApprove: { type: 'boolean' }
    }
  }
} as const;

function publicHost(request: FastifyRequest): string {
  return (request.headers.host ?? '').toLowerCase();
}

async function mutationGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.headers['x-sensei-request'] !== '1') {
    await reply.code(403).send({ error: 'Sensei request header required' });
    return;
  }
  const origin = request.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== publicHost(request)) {
        await reply.code(403).send({ error: 'Cross-origin request rejected' });
      }
    } catch {
      await reply.code(403).send({ error: 'Invalid request origin' });
    }
  }
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const timezone = options.timezone ?? 'America/Los_Angeles';
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 3000;
  const clock = options.now ?? (() => new Date());
  const db = openDatabase(options.databasePath, timezone, clock());
  const app = Fastify({ logger: options.logger ?? false, trustProxy: false });
  const loadOverworldWeather = createOverworldWeatherService({ fetchImpl: options.weatherFetch, now: clock });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  const allowedHosts = new Set([host.toLowerCase(), '127.0.0.1', 'localhost']);
  app.addHook('onRequest', async (request, reply) => {
    const requestHost = publicHost(request).split(':')[0];
    if (!allowedHosts.has(requestHost)) {
      await reply.code(421).send({ error: 'Unexpected host' });
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const pathname = new URL(request.url, 'http://sensei.local').pathname;
    if (pathname.startsWith('/api/')) {
      reply.header('cache-control', 'no-store, private');
      reply.header('pragma', 'no-cache');
      reply.header('expires', '0');
    } else if (request.method === 'GET' && (pathname === '/' || !path.extname(pathname))) {
      reply.header('cache-control', 'no-store, no-cache, must-revalidate');
      reply.header('pragma', 'no-cache');
      reply.header('expires', '0');
    }
    return payload;
  });

  app.addHook('onClose', async () => { db.close(); });

  const requireParent = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!sessionForRequest(db, request, clock())) {
      await reply.code(401).send({ error: 'Parent authorization required' });
    }
  };

  const requireCurrentClaimView = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const viewDate = request.headers['x-sensei-view-date'];
    const today = formatLocalDate(clock(), timezone);
    if (typeof viewDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(viewDate)) {
      await reply.code(409).send({ code: 'stale_client', error: 'Refresh Sensei before changing a chore' });
      return;
    }
    if (viewDate !== today) {
      await reply.code(409).send({ code: 'stale_client', error: 'This page is from a previous day. Refresh Sensei and try again' });
    }
  };

  app.get('/api/health', async () => ({ status: 'ok', timezone }));

  app.get('/api/overworld/weather', async (): Promise<OverworldWeatherResponse> => loadOverworldWeather());

  app.get('/api/preferences', async () => {
    const row = db.prepare("SELECT value FROM household_settings WHERE key = 'theme'").get() as { value: string } | undefined;
    return { theme: row?.value ?? 'novapay' };
  });

  app.get('/api/checklist', async (): Promise<ChecklistResponse> => {
    const today = formatLocalDate(clock(), timezone);
    const weekStart = weekStartFor(today);
    ensureWeek(db, weekStart);
    const yesterday = addDays(today, -1);
    if (weekStartFor(yesterday) !== weekStart) ensureWeek(db, weekStartFor(yesterday));
    const rows = checklistRows(db, weekStart);
    const mapOccurrences = (date: string, dateRows: Array<Record<string, unknown>>) => dateRows.map((row) => {
      const decision = row.decision as string | null;
      const state = decision === 'rejected' ? 'rejected' as const
        : decision ? 'approved' as const : row.claimed ? 'pending' as const : 'unclaimed' as const;
      return {
        id: String(row.id), date, title: String(row.title), rewardCents: Number(row.rewardCents),
        claimed: Boolean(row.claimed), state, approvalSource: (row.approvalSource ?? null) as ChecklistResponse['days'][number]['occurrences'][number]['approvalSource'],
        eligible: !decision && compareDates(date, today) <= 0 && compareDates(date, yesterday) >= 0,
        future: compareDates(date, today) > 0,
        locked: Boolean(decision), decisionNote: typeof row.decisionNote === 'string' ? row.decisionNote : null
      };
    });
    const days = labelsForWeek(weekStart).map(({ date, label }) => ({
      date,
      label,
      isToday: date === today,
      isFuture: compareDates(date, today) > 0,
      occurrences: mapOccurrences(date, rows.filter((row) => row.date === date))
    }));
    const lateRows = weekStartFor(yesterday) === weekStart ? [] : checklistRowsForDate(db, yesterday);
    const lateClaimDay = lateRows.length ? { date: yesterday, label: 'Yesterday', isToday: false, isFuture: false,
      occurrences: mapOccurrences(yesterday, lateRows) } : null;
    return { weekStart, weekEnd: addDays(weekStart, 6), today, timezone, weekApproved: false, days, lateClaimDay };
  });

  app.get<{ Querystring: { month?: string } }>('/api/calendar', async (request, reply) => {
    const today = formatLocalDate(clock(), timezone);
    const month = request.query.month ?? today.slice(0, 7);
    try { return calendarMonth(db, month, today); }
    catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
  });

  app.get('/api/allowance', async () => allowanceSummary(db, formatLocalDate(clock(), timezone)));

  const updateClaim = (dbRef: SenseiDatabase, occurrenceId: string, claimed: boolean): { claimed: boolean } => {
    const today = formatLocalDate(clock(), timezone);
    const row = dbRef.prepare(`SELECT o.occurrence_date AS date, o.claimed, l.id AS decisionId
      FROM chore_occurrences o LEFT JOIN approval_lines l ON l.occurrence_id = o.id
      WHERE o.id = ?`).get(occurrenceId) as { date: string; claimed: number; decisionId: string | null } | undefined;
    if (!row) throw new Error('Occurrence not found');
    if (row.decisionId) throw new Error('Approved and rejected chores are final');
    if (compareDates(row.date, today) > 0) throw new Error('Future chores cannot be claimed');
    if (compareDates(row.date, addDays(today, -1)) < 0) throw new Error('The child claim window includes only today and yesterday');
    const transaction = dbRef.transaction(() => {
      const result = dbRef.prepare(`UPDATE chore_occurrences SET claimed = ?, claimed_updated_at = ?
        WHERE id = ? AND claimed = ?`).run(claimed ? 1 : 0, clock().toISOString(), occurrenceId, claimed ? 0 : 1);
      if (result.changes === 1) {
        dbRef.prepare('INSERT INTO claim_events(occurrence_id, action, created_at) VALUES(?, ?, ?)')
          .run(occurrenceId, claimed ? 'claim' : 'undo', clock().toISOString());
      }
    });
    transaction();
    return { claimed };
  };

  app.post<{ Params: { id: string } }>('/api/occurrences/:id/claim', { preHandler: [mutationGuard, requireCurrentClaimView] }, async (request, reply) => {
    try { return updateClaim(db, request.params.id, true); }
    catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });
  app.delete<{ Params: { id: string } }>('/api/occurrences/:id/claim', { preHandler: [mutationGuard, requireCurrentClaimView] }, async (request, reply) => {
    try { return updateClaim(db, request.params.id, false); }
    catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });

  app.get('/api/parent/status', async (request) => {
    const session = sessionForRequest(db, request, clock());
    return { configured: credentialConfigured(db), authorized: Boolean(session), expiresAt: session?.expiresAt ?? null,
      parentLabel: session?.parentLabel ?? null };
  });

  app.post<{ Body: PinBody }>('/api/parent/setup', { schema: pinSchema, preHandler: mutationGuard }, async (request, reply) => {
    try {
      const credential = await setupCredential(db, request.body.pin, clock());
      const session = createSession(db, clock(), credential);
      setSessionCookie(reply, session.token);
      return { authorized: true, expiresAt: session.expiresAt };
    } catch (error) {
      return reply.code(409).send({ error: (error as Error).message });
    }
  });

  app.post<{ Body: PinBody }>('/api/parent/login', {
    schema: pinSchema,
    preHandler: mutationGuard,
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } }
  }, async (request, reply) => {
    if (!credentialConfigured(db)) return reply.code(409).send({ error: 'Set up the parent PIN first' });
    const credential = await verifyPin(db, request.body.pin);
    if (!credential) return reply.code(401).send({ error: 'Incorrect PIN' });
    const session = createSession(db, clock(), credential);
    setSessionCookie(reply, session.token);
    return { authorized: true, expiresAt: session.expiresAt };
  });

  app.post('/api/parent/logout', { preHandler: mutationGuard }, async (request, reply) => {
    revokeSession(db, request, reply, clock());
    return { authorized: false };
  });

  app.get('/api/parent/chores', { preHandler: requireParent }, async () => {
    const today = formatLocalDate(clock(), timezone);
    return { chores: listChores(db, today), nextEffectiveDate: addDays(weekStartFor(today), 7) };
  });

  app.post<{ Body: ChoreBody }>('/api/parent/chores', {
    schema: choreSchema, preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    try {
      const today = formatLocalDate(clock(), timezone);
      const parent = sessionForRequest(db, request, clock());
      const create = db.transaction(() => {
        const id = createChore(db, request.body as ChoreInput, today, clock());
        if (!request.body.completeAndApprove) return { id, approved: false };
        if (request.body.schedule.kind !== 'one_time') throw new Error('Direct completion is available only for one-time chores');
        if (!request.body.schedule.date || compareDates(request.body.schedule.date, today) > 0) {
          throw new Error('A directly completed one-time chore must be scheduled for today or earlier');
        }
        const occurrence = db.prepare('SELECT id FROM chore_occurrences WHERE chore_id = ? AND occurrence_date = ?')
          .get(id, request.body.schedule.date) as { id: string } | undefined;
        if (!occurrence) throw new Error('One-time chore occurrence was not created');
        const result = decideOccurrence(db, occurrence.id, 'parent_direct', parent?.parentLabel ?? 'Parent', clock(), today);
        return { id, approved: true, occurrenceId: occurrence.id, creditedCents: result.creditedCents };
      });
      return reply.code(201).send(create());
    } catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
  });

  app.put<{ Params: { id: string }; Body: ChoreBody }>('/api/parent/chores/:id', {
    schema: choreSchema, preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    try {
      editChore(db, request.params.id, request.body as ChoreInput, formatLocalDate(clock(), timezone), clock());
      return { updated: true };
    } catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
  });

  app.post<{ Params: { id: string } }>('/api/parent/chores/:id/archive', {
    preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    try {
      archiveChore(db, request.params.id, formatLocalDate(clock(), timezone), clock());
      return { archived: true, effectiveFrom: addDays(weekStartFor(formatLocalDate(clock(), timezone)), 7) };
    } catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
  });

  app.put<{ Body: { theme: string } }>('/api/parent/preferences', {
    preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    const theme = request.body?.theme;
    if (typeof theme !== 'string' || !/^[a-z0-9-]{1,40}$/.test(theme)) {
      return reply.code(400).send({ error: 'Invalid theme identifier' });
    }
    db.prepare(`INSERT INTO household_settings(key, value) VALUES('theme', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(theme);
    return { theme };
  });

  app.get<{ Params: { weekStart: string } }>('/api/parent/reviews/:weekStart', {
    preHandler: requireParent
  }, async (request, reply) => {
    try {
      return { weekStart: request.params.weekStart, occurrences: reviewOccurrences(db, request.params.weekStart) };
    } catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
  });

  app.get<{ Params: { weekStart: string } }>('/api/parent/reviews/:weekStart/pending', {
    preHandler: requireParent
  }, async (request, reply) => {
    try {
      const items = pendingOccurrences(db, request.params.weekStart);
      return { weekStart: request.params.weekStart, weekEnd: addDays(request.params.weekStart, 6),
        snapshotIds: items.map((item) => item.id), items };
    } catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
  });

  app.post<{ Params: { weekStart: string }; Body: BulkApprovalBody }>('/api/parent/reviews/:weekStart/approve-pending', {
    preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    try {
      if (!Array.isArray(request.body?.snapshotIds) || !Array.isArray(request.body?.selectedIds)) {
        throw new Error('Review snapshot and selected claims are required');
      }
      const parent = sessionForRequest(db, request, clock());
      return bulkApprovePending(db, request.params.weekStart, request.body.snapshotIds, request.body.selectedIds,
        parent?.parentLabel ?? 'Parent', clock(), formatLocalDate(clock(), timezone));
    } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });

  app.post<{ Params: { weekStart: string }; Body: PendingReviewBody }>('/api/parent/reviews/:weekStart/complete-pending', {
    preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    try {
      if (!Array.isArray(request.body?.snapshotIds) || !Array.isArray(request.body?.decisions)) {
        throw new Error('Review snapshot and decisions are required');
      }
      const parent = sessionForRequest(db, request, clock());
      return completePendingReview(db, request.params.weekStart, request.body.snapshotIds, request.body.decisions,
        parent?.parentLabel ?? 'Parent', clock(), formatLocalDate(clock(), timezone));
    } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });

  for (const [pathSuffix, mode] of [['approve', 'approve'], ['reject', 'reject'], ['override', 'override']] as const) {
    app.post<{ Params: { id: string }; Body: DecisionBody }>(`/api/parent/occurrences/:id/${pathSuffix}`, {
      preHandler: [mutationGuard, requireParent]
    }, async (request, reply) => {
      try {
        const note = request.body?.note;
        if (note !== undefined && (typeof note !== 'string' || note.trim().length > 240)) {
          throw new Error('Rejection notes must be 240 characters or fewer');
        }
        const parent = sessionForRequest(db, request, clock());
        return decideOccurrence(db, request.params.id, mode, parent?.parentLabel ?? 'Parent', clock(),
          formatLocalDate(clock(), timezone), mode === 'reject' ? note : undefined);
      } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
    });
  }

  app.get('/api/parent/approved-weeks', { preHandler: requireParent }, async () => ({ weeks: approvedWeeks(db) }));

  app.post<{ Body: PaymentBody }>('/api/parent/payments', {
    preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    try {
      const parent = sessionForRequest(db, request, clock());
      return recordPayment(db, request.body?.amountCents, request.body?.note, request.body?.idempotencyKey,
        parent?.parentLabel ?? 'Parent', clock());
    } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });

  app.post<{ Params: { lineId: string }; Body: AdjustmentBody }>('/api/parent/approval-lines/:lineId/adjust', {
    preHandler: [mutationGuard, requireParent]
  }, async (request, reply) => {
    try {
      const parent = sessionForRequest(db, request, clock());
      return adjustApprovalLine(db, request.params.lineId, request.body?.correctedRewardCents,
        request.body?.note, request.body?.idempotencyKey, parent?.parentLabel ?? 'Parent', clock());
    } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });

  app.get('/api/parent/export', { preHandler: requireParent }, async (_request, reply) => {
    const today = formatLocalDate(clock(), timezone);
    const exportPath = path.join(os.tmpdir(), `sensei-export-${today}-${Date.now()}.sqlite`);
    await db.backup(exportPath);
    const stream = fs.createReadStream(exportPath);
    stream.on('close', () => { fs.rm(exportPath, { force: true }, () => undefined); });
    reply.header('content-type', 'application/vnd.sqlite3');
    reply.header('content-disposition', `attachment; filename="sensei-${today}.sqlite"`);
    return reply.send(stream);
  });

  if (options.staticDir && fs.existsSync(options.staticDir)) {
    await app.register(fastifyStatic, { root: path.resolve(options.staticDir) });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html');
      return reply.code(404).send({ error: 'Not found' });
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    const appError = error as { statusCode?: number; message?: string };
    const status = appError.statusCode && appError.statusCode >= 400 ? appError.statusCode : 500;
    reply.code(status).send({ error: status === 500 ? 'Unexpected server error' : (appError.message ?? 'Request failed') });
  });

  app.decorate('senseiRuntime', { db, host, port });
  return app;
}
