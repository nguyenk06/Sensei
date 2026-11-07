import { randomUUID } from 'node:crypto';
import type {
  AllowanceActivity,
  AllowanceSummary,
  ApprovalLineView,
  ApprovedWeekView,
  CalendarResponse,
  ChoreApprovalSource,
  ChoreApprovalState,
  ReviewOccurrence,
  ReviewWeek
} from '../shared/types.js';
import type { SenseiDatabase } from './database.js';
import { addDays, assertDate, compareDates, dayIndex, formatLocalDate, weekStartFor } from './dates.js';

interface TransactionRow {
  id: string;
  kind: AllowanceActivity['kind'];
  nominal_cents: number;
  balance_effect_cents: number;
  description: string;
  parent_label: string;
  created_at: string;
  week_start: string | null;
}

function activity(row: TransactionRow): AllowanceActivity {
  return {
    id: row.id,
    kind: row.kind,
    nominalCents: row.nominal_cents,
    balanceEffectCents: row.balance_effect_cents,
    description: row.description,
    parentLabel: row.parent_label,
    createdAt: row.created_at,
    weekStart: row.week_start
  };
}

interface OccurrenceDecisionRow {
  id: string;
  weekStart: string;
  date: string;
  title: string;
  rewardCents: number;
  scheduleSnapshot: string;
  claimed: number;
  decision: 'approved' | 'rejected' | 'corrected' | null;
  approvalSource: ChoreApprovalSource;
  approvalLineId: string | null;
  approvedRewardCents: number | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

function stateFor(claimed: number | boolean, decision: OccurrenceDecisionRow['decision']): ChoreApprovalState {
  if (decision === 'rejected') return 'rejected';
  if (decision === 'approved' || decision === 'corrected') return 'approved';
  return claimed ? 'pending' : 'unclaimed';
}

function occurrenceDecisionRow(db: SenseiDatabase, occurrenceId: string): OccurrenceDecisionRow | undefined {
  return db.prepare(`SELECT o.id, o.week_start AS weekStart, o.occurrence_date AS date,
    o.title_snapshot AS title, o.reward_cents_snapshot AS rewardCents,
    o.schedule_snapshot AS scheduleSnapshot, o.claimed, l.decision,
    l.source AS approvalSource, l.id AS approvalLineId,
    l.approved_reward_cents AS approvedRewardCents, l.created_at AS decidedAt, l.note AS decisionNote
    FROM chore_occurrences o LEFT JOIN approval_lines l ON l.occurrence_id = o.id
    WHERE o.id = ?`).get(occurrenceId) as OccurrenceDecisionRow | undefined;
}

export function pendingOccurrences(db: SenseiDatabase, weekStart: string): ReviewOccurrence[] {
  assertDate(weekStart);
  return (db.prepare(`SELECT o.id, o.occurrence_date AS date, o.title_snapshot AS title,
    o.reward_cents_snapshot AS rewardCents, o.claimed
    FROM chore_occurrences o LEFT JOIN approval_lines l ON l.occurrence_id = o.id
    WHERE o.week_start = ? AND o.claimed = 1 AND l.id IS NULL
    ORDER BY o.occurrence_date, o.created_at`).all(weekStart) as Array<{
      id: string; date: string; title: string; rewardCents: number; claimed: number;
    }>).map((row) => ({ ...row, rewardCents: Number(row.rewardCents), claimed: true,
      state: 'pending', approvalSource: null }));
}

type DecisionMode = 'approve' | 'bulk_approve' | 'reject' | 'override' | 'parent_direct';

function ensureApprovalGroup(db: SenseiDatabase, weekStart: string, parentLabel: string, createdAt: string): string {
  const existing = db.prepare('SELECT id FROM weekly_approvals WHERE week_start = ?').get(weekStart) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare(`INSERT INTO weekly_approvals(id, week_start, total_cents, approved_at, approved_by_label)
    VALUES(?, ?, 0, ?, ?)`).run(id, weekStart, createdAt, parentLabel);
  return id;
}

function decideOccurrenceWithin(
  db: SenseiDatabase,
  occurrenceId: string,
  mode: DecisionMode,
  parentLabel: string,
  now: Date,
  today: string,
  optionalNote?: string,
  requestedRewardCents?: number
): { occurrenceId: string; state: ChoreApprovalState; creditedCents: number; decidedAt: string; idempotent: boolean } {
  const row = occurrenceDecisionRow(db, occurrenceId);
  if (!row) throw new Error('Occurrence not found');
  const desiredDecision = mode === 'reject' ? 'rejected' : 'approved';
  if (row.decision) {
    const existingState = stateFor(row.claimed, row.decision);
    if (existingState === desiredDecision) {
      return { occurrenceId, state: existingState, creditedCents: Number(row.approvedRewardCents ?? 0),
        decidedAt: row.decidedAt!, idempotent: true };
    }
    throw new Error('This chore already has a final parent decision');
  }
  if (compareDates(row.date, today) > 0) throw new Error('Future chores cannot be decided');
  if (mode === 'approve' || mode === 'bulk_approve' || mode === 'reject') {
    if (!row.claimed) throw new Error('Only pending claims can be approved or rejected');
  } else if (mode === 'override') {
    if (row.claimed) throw new Error('Only an unclaimed historical chore can be overridden');
    if (compareDates(row.date, addDays(today, -1)) >= 0) throw new Error('Historical override is only available after the child claim window');
  } else {
    const schedule = JSON.parse(row.scheduleSnapshot) as { kind?: string };
    if (schedule.kind !== 'one_time' || row.claimed) throw new Error('Direct completion requires an unclaimed one-time chore');
  }
  const createdAt = now.toISOString();
  const source: Exclude<ChoreApprovalSource, null> = mode === 'override' ? 'parent_override'
    : mode === 'parent_direct' ? 'parent_direct' : 'child_claim';
  const amount = desiredDecision === 'approved' ? requestedRewardCents ?? row.rewardCents : 0;
  if (mode === 'approve') {
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
      throw new Error('Approved reward must be between $0.25 and $1,000.00');
    }
    if (amount !== row.rewardCents && amount % 25 !== 0) {
      throw new Error('Adjusted reward must be in $0.25 increments');
    }
    if (amount < row.rewardCents && !optionalNote?.trim()) {
      throw new Error('A parent explanation is required when reducing the reward');
    }
  }
  const approvalId = ensureApprovalGroup(db, row.weekStart, parentLabel, createdAt);
  const lineId = randomUUID();
  const note = mode === 'approve' || mode === 'reject' ? optionalNote?.trim() || null
    : source === 'parent_override' ? 'Parent historical override'
      : source === 'parent_direct' ? 'Parent direct completion' : null;
  db.prepare(`INSERT INTO approval_lines
    (id, approval_id, occurrence_id, decision, claimed_snapshot, title_snapshot, occurrence_date,
     original_reward_cents, approved_reward_cents, note, created_at, source)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(lineId, approvalId, row.id, desiredDecision,
      row.claimed ? 1 : 0, row.title, row.date, row.rewardCents, amount, note, createdAt, source);
  if (mode === 'override' || mode === 'parent_direct') {
    db.prepare('UPDATE chore_occurrences SET claimed = 1, claimed_updated_at = ? WHERE id = ?').run(createdAt, row.id);
  }
  if (amount > 0) {
    db.prepare(`INSERT INTO allowance_transactions
      (id, kind, nominal_cents, balance_effect_cents, week_start, approval_id, approval_line_id,
       description, parent_label, created_at, idempotency_key)
      VALUES(?, 'earning', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), amount, amount, row.weekStart, approvalId, lineId,
        `${row.title} approved for ${row.date}`, parentLabel, createdAt, `earning:${row.id}`);
    db.prepare('UPDATE weekly_approvals SET total_cents = total_cents + ? WHERE id = ?').run(amount, approvalId);
  }
  db.prepare(`INSERT INTO audit_events(id, event_type, entity_type, entity_id, details_json, parent_label, created_at)
    VALUES(?, ?, 'occurrence', ?, ?, ?, ?)`).run(randomUUID(),
      mode === 'reject' ? 'occurrence_rejected' : source === 'parent_override' ? 'occurrence_overridden'
        : source === 'parent_direct' ? 'one_time_directly_approved' : 'occurrence_approved',
      row.id, JSON.stringify({ date: row.date, amountCents: amount, source, note }), parentLabel, createdAt);
  return { occurrenceId, state: desiredDecision, creditedCents: amount, decidedAt: createdAt, idempotent: false };
}

export function decideOccurrence(
  db: SenseiDatabase,
  occurrenceId: string,
  mode: DecisionMode,
  parentLabel: string,
  now: Date,
  today: string,
  note?: string,
  approvedRewardCents?: number
) {
  return db.transaction(() => decideOccurrenceWithin(db, occurrenceId, mode, parentLabel, now, today, note, approvedRewardCents))();
}

export function bulkApprovePending(
  db: SenseiDatabase,
  weekStart: string,
  snapshotIds: string[],
  selectedIds: string[],
  parentLabel: string,
  now: Date,
  today: string
): { approvedCount: number; totalCents: number; idempotent: boolean } {
  assertDate(weekStart);
  const snapshot = [...new Set(snapshotIds)].sort();
  const selected = [...new Set(selectedIds)].sort();
  if (snapshot.length === 0) throw new Error('The review snapshot has no pending claims');
  if (selected.some((id) => !snapshot.includes(id))) throw new Error('Selected claims must belong to the review snapshot');
  return db.transaction(() => {
    const current = pendingOccurrences(db, weekStart).map((item) => item.id).sort();
    const expectedAfterRetry = snapshot.filter((id) => !selected.includes(id)).sort();
    const same = (left: string[], right: string[]) => left.length === right.length && left.every((id, index) => id === right[index]);
    if (!same(current, snapshot)) {
      const selectedAreApproved = selected.every((id) => stateFor(
        occurrenceDecisionRow(db, id)?.claimed ?? 0, occurrenceDecisionRow(db, id)?.decision ?? null) === 'approved');
      if (same(current, expectedAfterRetry) && selectedAreApproved) {
        const totalCents = selected.reduce((sum, id) => sum + Number(occurrenceDecisionRow(db, id)?.approvedRewardCents ?? 0), 0);
        return { approvedCount: selected.length, totalCents, idempotent: true };
      }
      throw new Error('Pending claims changed. Refresh the review before approving.');
    }
    let totalCents = 0;
    for (const id of selected) totalCents += decideOccurrenceWithin(db, id, 'bulk_approve', parentLabel, now, today).creditedCents;
    return { approvedCount: selected.length, totalCents, idempotent: false };
  })();
}

export interface PendingReviewDecision {
  occurrenceId: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

export function completePendingReview(
  db: SenseiDatabase,
  weekStart: string,
  snapshotIds: string[],
  decisions: PendingReviewDecision[],
  parentLabel: string,
  now: Date,
  today: string
): { approvedCount: number; rejectedCount: number; totalCents: number; idempotent: boolean } {
  assertDate(weekStart);
  const snapshot = [...new Set(snapshotIds)].sort();
  const supplied = new Map(decisions.map((decision) => [decision.occurrenceId, decision]));
  if (snapshot.length === 0) throw new Error('The review snapshot has no pending claims');
  if (decisions.length !== snapshot.length || supplied.size !== decisions.length
    || supplied.size !== snapshot.length || snapshot.some((id) => !supplied.has(id))) {
    throw new Error('Every pending claim must have exactly one review decision');
  }
  for (const decision of supplied.values()) {
    if (!snapshot.includes(decision.occurrenceId) || !['approved', 'rejected'].includes(decision.decision)) {
      throw new Error('Invalid pending review decision');
    }
    if (decision.note !== undefined && (typeof decision.note !== 'string' || decision.note.trim().length > 240)) {
      throw new Error('Rejection notes must be 240 characters or fewer');
    }
  }
  return db.transaction(() => {
    const current = pendingOccurrences(db, weekStart).map((item) => item.id).sort();
    const same = (left: string[], right: string[]) => left.length === right.length
      && left.every((id, index) => id === right[index]);
    if (!same(current, snapshot)) {
      const matchesCompletedReview = snapshot.every((id) => {
        const expected = supplied.get(id)!;
        return occurrenceDecisionRow(db, id)?.decision === expected.decision;
      });
      if (current.length === 0 && matchesCompletedReview) {
        const approved = snapshot.filter((id) => supplied.get(id)!.decision === 'approved');
        return {
          approvedCount: approved.length,
          rejectedCount: snapshot.length - approved.length,
          totalCents: approved.reduce((sum, id) => sum + Number(occurrenceDecisionRow(db, id)?.approvedRewardCents ?? 0), 0),
          idempotent: true
        };
      }
      throw new Error('Pending claims changed. Refresh the review before submitting.');
    }
    let approvedCount = 0;
    let rejectedCount = 0;
    let totalCents = 0;
    for (const id of snapshot) {
      const decision = supplied.get(id)!;
      const result = decideOccurrenceWithin(db, id, decision.decision === 'approved' ? 'bulk_approve' : 'reject',
        parentLabel, now, today, decision.note);
      if (decision.decision === 'approved') {
        approvedCount += 1;
        totalCents += result.creditedCents;
      } else {
        rejectedCount += 1;
      }
    }
    return { approvedCount, rejectedCount, totalCents, idempotent: false };
  })();
}

export function allowanceBalance(db: SenseiDatabase): number {
  return Number((db.prepare('SELECT COALESCE(SUM(balance_effect_cents), 0) AS amount FROM allowance_transactions')
    .get() as { amount: number }).amount);
}

export function allowanceSummary(db: SenseiDatabase, today: string): AllowanceSummary {
  const weekStart = weekStartFor(today);
  const claimed = db.prepare(`SELECT COALESCE(SUM(reward_cents_snapshot), 0) AS amount
    FROM chore_occurrences o LEFT JOIN approval_lines l ON l.occurrence_id = o.id
    WHERE o.week_start = ? AND o.claimed = 1 AND l.id IS NULL`).get(weekStart) as { amount: number };
  const totals = db.prepare(`SELECT
    COALESCE(SUM(CASE WHEN kind = 'earning' THEN nominal_cents ELSE 0 END), 0) AS approved,
    COALESCE(SUM(CASE WHEN kind = 'payment' THEN -nominal_cents ELSE 0 END), 0) AS paid
    FROM allowance_transactions`).get() as { approved: number; paid: number };
  const recentRows = db.prepare(`SELECT id, kind, nominal_cents, balance_effect_cents, description,
    parent_label, created_at, week_start FROM allowance_transactions ORDER BY created_at DESC LIMIT 30`)
    .all() as TransactionRow[];
  return {
    claimedThisWeekCents: Number(claimed.amount),
    approvedBalanceCents: allowanceBalance(db),
    totalApprovedCents: Number(totals.approved),
    totalPaidCents: Number(totals.paid),
    payments: recentRows.filter((row) => row.kind === 'payment').map(activity),
    recentActivity: recentRows.map(activity)
  };
}

export function reviewWeeks(db: SenseiDatabase): ReviewWeek[] {
  return (db.prepare(`SELECT w.week_start AS weekStart, a.total_cents AS approvedTotal,
    COUNT(o.id) AS occurrenceCount,
    COALESCE(SUM(CASE WHEN o.claimed = 1 THEN 1 ELSE 0 END), 0) AS claimedCount,
    COALESCE(SUM(CASE WHEN o.claimed = 1 THEN o.reward_cents_snapshot ELSE 0 END), 0) AS claimedCents
    FROM weeks w
    LEFT JOIN chore_occurrences o ON o.week_start = w.week_start
    LEFT JOIN weekly_approvals a ON a.week_start = w.week_start
    GROUP BY w.week_start, a.total_cents ORDER BY w.week_start DESC`).all() as Array<{
      weekStart: string; approvedTotal: number | null; occurrenceCount: number; claimedCount: number; claimedCents: number;
    }>).map((row) => ({
      weekStart: row.weekStart,
      weekEnd: addDays(row.weekStart, 6),
      approved: row.approvedTotal !== null,
      claimedCount: Number(row.claimedCount),
      occurrenceCount: Number(row.occurrenceCount),
      claimedCents: Number(row.claimedCents),
      approvedTotalCents: row.approvedTotal === null ? null : Number(row.approvedTotal)
    }));
}

export function reviewOccurrences(db: SenseiDatabase, weekStart: string): ReviewOccurrence[] {
  assertDate(weekStart);
  return (db.prepare(`SELECT o.id, o.occurrence_date AS date, o.title_snapshot AS title,
    o.reward_cents_snapshot AS rewardCents, o.claimed, l.decision, l.source AS approvalSource
    FROM chore_occurrences o LEFT JOIN approval_lines l ON l.occurrence_id = o.id
    WHERE o.week_start = ? ORDER BY o.occurrence_date, o.created_at`).all(weekStart) as Array<{
      id: string; date: string; title: string; rewardCents: number; claimed: number;
      decision: OccurrenceDecisionRow['decision']; approvalSource: ChoreApprovalSource;
    }>).map((row) => ({ id: row.id, date: row.date, title: row.title, rewardCents: Number(row.rewardCents),
      claimed: Boolean(row.claimed), state: stateFor(row.claimed, row.decision), approvalSource: row.approvalSource ?? null }));
}

interface ApprovalInputLine {
  occurrenceId: string;
  decision: 'approved' | 'rejected' | 'corrected';
  approvedRewardCents: number;
  note?: string;
}

export function approveWeek(
  db: SenseiDatabase,
  weekStart: string,
  inputLines: ApprovalInputLine[],
  parentLabel: string,
  now: Date
): { approvalId: string; totalCents: number } {
  assertDate(weekStart);
  if (db.prepare('SELECT 1 FROM weekly_approvals WHERE week_start = ?').get(weekStart)) {
    throw new Error('This week is already approved');
  }
  const occurrences = reviewOccurrences(db, weekStart);
  if (occurrences.length === 0) throw new Error('This week has no chore occurrences');
  const supplied = new Map(inputLines.map((line) => [line.occurrenceId, line]));
  if (supplied.size !== occurrences.length || occurrences.some((item) => !supplied.has(item.id))) {
    throw new Error('Every occurrence must have exactly one review decision');
  }
  const normalized = occurrences.map((occurrence) => {
    const line = supplied.get(occurrence.id)!;
    if (!['approved', 'rejected', 'corrected'].includes(line.decision)) throw new Error('Invalid review decision');
    let amount = line.approvedRewardCents;
    if (!Number.isInteger(amount) || amount < 0 || amount > 100000) throw new Error('Invalid approved reward');
    if (line.decision === 'approved') {
      if (!occurrence.claimed) throw new Error('An unclaimed chore must be corrected or rejected');
      amount = occurrence.rewardCents;
    }
    if (line.decision === 'rejected') amount = 0;
    if (line.decision === 'corrected' && !(line.note?.trim())) throw new Error('Corrected claims require a note');
    return { occurrence, ...line, approvedRewardCents: amount, note: line.note?.trim() || null };
  });
  const totalCents = normalized.reduce((sum, line) => sum + line.approvedRewardCents, 0);
  const approvalId = randomUUID();
  const createdAt = now.toISOString();
  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO weekly_approvals(id, week_start, total_cents, approved_at, approved_by_label)
      VALUES(?, ?, ?, ?, ?)`).run(approvalId, weekStart, totalCents, createdAt, parentLabel);
    const insertLine = db.prepare(`INSERT INTO approval_lines
      (id, approval_id, occurrence_id, decision, claimed_snapshot, title_snapshot, occurrence_date,
       original_reward_cents, approved_reward_cents, note, created_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const line of normalized) {
      insertLine.run(randomUUID(), approvalId, line.occurrence.id, line.decision, line.occurrence.claimed ? 1 : 0,
        line.occurrence.title, line.occurrence.date, line.occurrence.rewardCents,
        line.approvedRewardCents, line.note, createdAt);
    }
    db.prepare(`INSERT INTO allowance_transactions
      (id, kind, nominal_cents, balance_effect_cents, week_start, approval_id, description,
       parent_label, created_at, idempotency_key)
      VALUES(?, 'earning', ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), totalCents, totalCents, weekStart, approvalId,
        `Approved earnings for week of ${weekStart}`, parentLabel, createdAt, `approval:${weekStart}`);
    db.prepare(`INSERT INTO audit_events(id, event_type, entity_type, entity_id, details_json, parent_label, created_at)
      VALUES(?, 'week_approved', 'week', ?, ?, ?, ?)`)
      .run(randomUUID(), weekStart, JSON.stringify({ totalCents, lineCount: normalized.length }), parentLabel, createdAt);
  });
  transaction();
  return { approvalId, totalCents };
}

export function approvedWeeks(db: SenseiDatabase): ApprovedWeekView[] {
  const approvals = db.prepare(`SELECT id, week_start AS weekStart, total_cents AS totalCents,
    approved_at AS approvedAt, approved_by_label AS approvedByLabel
    FROM weekly_approvals ORDER BY week_start DESC`).all() as Array<{
      id: string; weekStart: string; totalCents: number; approvedAt: string; approvedByLabel: string;
    }>;
  const lineStatement = db.prepare(`SELECT l.id, l.occurrence_id AS occurrenceId, l.occurrence_date AS date,
    l.title_snapshot AS title, l.decision, l.claimed_snapshot AS claimed,
    l.original_reward_cents AS originalRewardCents, l.approved_reward_cents AS approvedRewardCents,
    l.note, l.source, l.approved_reward_cents + COALESCE(SUM(CASE WHEN t.kind = 'adjustment' THEN t.nominal_cents ELSE 0 END), 0) AS currentHistoricalCents
    FROM approval_lines l LEFT JOIN allowance_transactions t ON t.approval_line_id = l.id
    WHERE l.approval_id = ? GROUP BY l.id ORDER BY l.occurrence_date, l.created_at`);
  return approvals.map((approval) => ({
    ...approval,
    totalCents: Number(approval.totalCents),
    lines: (lineStatement.all(approval.id) as Array<{
      id: string; occurrenceId: string; date: string; title: string;
      decision: ApprovalLineView['decision']; claimed: number;
      originalRewardCents: number; approvedRewardCents: number;
      currentHistoricalCents: number; note: string | null; source: ChoreApprovalSource;
    }>).map((line) => ({
      ...line,
      claimed: Boolean(line.claimed),
      originalRewardCents: Number(line.originalRewardCents),
      approvedRewardCents: Number(line.approvedRewardCents),
      currentHistoricalCents: Number(line.currentHistoricalCents)
    }))
  }));
}

export function recordPayment(
  db: SenseiDatabase,
  amountCents: number,
  note: string | undefined,
  idempotencyKey: string,
  parentLabel: string,
  now: Date
): { balanceCents: number } {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Payment must be a positive whole number of cents');
  if (!idempotencyKey || idempotencyKey.length > 100) throw new Error('A valid idempotency key is required');
  const transaction = db.transaction(() => {
    const existing = db.prepare('SELECT 1 FROM allowance_transactions WHERE idempotency_key = ?').get(idempotencyKey);
    if (existing) return allowanceBalance(db);
    const balance = allowanceBalance(db);
    if (amountCents > balance) throw new Error('Payment cannot exceed the approved unpaid balance');
    const createdAt = now.toISOString();
    const description = note?.trim() || 'Allowance payment';
    const id = randomUUID();
    db.prepare(`INSERT INTO allowance_transactions
      (id, kind, nominal_cents, balance_effect_cents, description, parent_label, created_at, idempotency_key)
      VALUES(?, 'payment', ?, ?, ?, ?, ?, ?)`)
      .run(id, -amountCents, -amountCents, description, parentLabel, createdAt, idempotencyKey);
    db.prepare(`INSERT INTO audit_events(id, event_type, entity_type, entity_id, details_json, parent_label, created_at)
      VALUES(?, 'payment_recorded', 'transaction', ?, ?, ?, ?)`)
      .run(randomUUID(), id, JSON.stringify({ amountCents }), parentLabel, createdAt);
    return balance - amountCents;
  });
  return { balanceCents: transaction() };
}

export function adjustApprovalLine(
  db: SenseiDatabase,
  lineId: string,
  correctedRewardCents: number,
  note: string,
  idempotencyKey: string,
  parentLabel: string,
  now: Date
): { balanceCents: number; nominalDeltaCents: number; balanceEffectCents: number } {
  if (!Number.isInteger(correctedRewardCents) || correctedRewardCents < 0 || correctedRewardCents > 100000) {
    throw new Error('Corrected reward is invalid');
  }
  if (!note?.trim()) throw new Error('A correction reason is required');
  if (!idempotencyKey || idempotencyKey.length > 100) throw new Error('A valid idempotency key is required');
  const transaction = db.transaction(() => {
    const duplicate = db.prepare('SELECT nominal_cents, balance_effect_cents FROM allowance_transactions WHERE idempotency_key = ?')
      .get(idempotencyKey) as { nominal_cents: number; balance_effect_cents: number } | undefined;
    if (duplicate) return {
      balanceCents: allowanceBalance(db), nominalDeltaCents: duplicate.nominal_cents,
      balanceEffectCents: duplicate.balance_effect_cents
    };
    const line = db.prepare(`SELECT l.approved_reward_cents AS originalApproved, l.title_snapshot AS title,
      a.week_start AS weekStart, l.approved_reward_cents + COALESCE(SUM(CASE WHEN t.kind = 'adjustment' THEN t.nominal_cents ELSE 0 END), 0) AS currentHistorical
      FROM approval_lines l JOIN weekly_approvals a ON a.id = l.approval_id
      LEFT JOIN allowance_transactions t ON t.approval_line_id = l.id
      WHERE l.id = ? GROUP BY l.id`).get(lineId) as {
        originalApproved: number; title: string; weekStart: string; currentHistorical: number;
      } | undefined;
    if (!line) throw new Error('Approval line not found');
    const delta = correctedRewardCents - Number(line.currentHistorical);
    if (delta === 0) throw new Error('The corrected reward is unchanged');
    const balance = allowanceBalance(db);
    const balanceEffect = delta < 0 ? -Math.min(-delta, balance) : delta;
    const createdAt = now.toISOString();
    const id = randomUUID();
    db.prepare(`INSERT INTO allowance_transactions
      (id, kind, nominal_cents, balance_effect_cents, week_start, approval_line_id, description,
       parent_label, created_at, idempotency_key)
      VALUES(?, 'adjustment', ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, delta, balanceEffect, line.weekStart, lineId, note.trim(), parentLabel, createdAt, idempotencyKey);
    db.prepare(`INSERT INTO audit_events(id, event_type, entity_type, entity_id, details_json, parent_label, created_at)
      VALUES(?, 'approval_corrected', 'approval_line', ?, ?, ?, ?)`)
      .run(randomUUID(), lineId, JSON.stringify({ correctedRewardCents, nominalDeltaCents: delta,
        balanceEffectCents: balanceEffect, unappliedCents: delta - balanceEffect }), parentLabel, createdAt);
    return { balanceCents: balance + balanceEffect, nominalDeltaCents: delta, balanceEffectCents: balanceEffect };
  });
  return transaction();
}

export function calendarMonth(db: SenseiDatabase, month: string, today: string): CalendarResponse {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Invalid calendar month');
  const first = assertDate(`${month}-01`);
  const nextMonthDate = new Date(`${first}T00:00:00.000Z`);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const nextMonth = nextMonthDate.toISOString().slice(0, 10);
  const last = addDays(nextMonth, -1);
  const gridStart = addDays(first, -dayIndex(first));
  const gridEnd = addDays(last, 6 - dayIndex(last));
  const occurrences = db.prepare(`SELECT o.id, o.occurrence_date AS date, o.title_snapshot AS title,
    o.reward_cents_snapshot AS rewardCents, o.claimed, l.decision, l.note AS decisionNote, l.source AS approvalSource,
    l.approved_reward_cents AS approvedCents, CASE WHEN l.id IS NULL THEN 0 ELSE 1 END AS locked
    FROM chore_occurrences o
    LEFT JOIN approval_lines l ON l.occurrence_id = o.id
    WHERE o.occurrence_date BETWEEN ? AND ? ORDER BY o.occurrence_date, o.created_at`)
    .all(gridStart, gridEnd) as Array<{ id: string; date: string; title: string; rewardCents: number;
      claimed: number; decision: OccurrenceDecisionRow['decision']; decisionNote: string | null; approvalSource: ChoreApprovalSource;
      approvedCents: number | null; locked: number }>;
  const days = [];
  for (let date = gridStart; compareDates(date, gridEnd) <= 0; date = addDays(date, 1)) {
    const rows = occurrences.filter((row) => row.date === date);
    const approvedRows = rows.filter((row) => row.decision === 'approved' || row.decision === 'corrected');
    const missedRows = rows.filter((row) => row.decision === 'rejected'
      || (!row.decision && !row.claimed && compareDates(row.date, addDays(today, -1)) < 0));
    days.push({
      date,
      inMonth: date.startsWith(month),
      occurrenceCount: rows.length,
      claimedCount: rows.filter((row) => row.claimed).length,
      approvedCents: approvedRows.length ? approvedRows.reduce((sum, row) => sum + Number(row.approvedCents ?? 0), 0) : null,
      locked: approvedRows.length > 0,
      titles: rows.map((row) => row.title),
      pendingCount: rows.filter((row) => stateFor(row.claimed, row.decision) === 'pending').length,
      missedCount: missedRows.length,
      occurrences: rows.map((row) => {
        const state = stateFor(row.claimed, row.decision);
        return {
          id: row.id, date: row.date, title: row.title, rewardCents: Number(row.rewardCents),
          claimed: Boolean(row.claimed), state, approvalSource: row.approvalSource ?? null, decisionNote: row.decisionNote ?? null,
          approvedRewardCents: row.approvedCents === null ? null : Number(row.approvedCents),
          childEligible: !row.decision && compareDates(row.date, today) <= 0 && compareDates(row.date, addDays(today, -1)) >= 0,
          overrideEligible: !row.decision && !row.claimed && compareDates(row.date, addDays(today, -1)) < 0
        };
      })
    });
  }
  return { month, days };
}

export function isWeekApproved(db: SenseiDatabase, weekStart: string): boolean {
  return Boolean(db.prepare('SELECT 1 FROM weekly_approvals WHERE week_start = ?').get(weekStart));
}
