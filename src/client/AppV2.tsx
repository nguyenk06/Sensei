import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  AllowanceSummary,
  ApprovedWeekView,
  CalendarResponse,
  ChecklistOccurrence,
  ChecklistResponse,
  ChoreSummary,
  ParentStatus,
  ReviewOccurrence,
  ScheduleDefinition,
  ScheduleKind
} from '../shared/types';
import { CalendarSection } from './CalendarSection';
import { ChoreDetailDialog, type ChoreDecisionInput } from './ChoreDetailDialog';
import { OverworldScene } from './OverworldScene';
import { getDeviceThemeId, saveDeviceTheme, themes } from './themes';
import { useDialogFocus } from './useDialogFocus';
import { WeekSheet } from './WeekSheet';

const mutationHeaders = { 'x-sensei-request': '1' };
const jsonHeaders = { ...mutationHeaders, 'content-type': 'application/json' };
const claimHeaders = (viewDate: string | undefined) => ({ ...mutationHeaders, 'x-sensei-view-date': viewDate ?? '' });
const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function parseMoneyToCents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const cents = Number(value) * 100;
  return Number.isSafeInteger(cents) ? cents : null;
}

function createIdempotencyKey(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();
  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }
  return `sensei-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`));
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function householdMonth(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit'
  }).formatToParts(date);
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
}

function monthName(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`));
}

function monthYearName(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`));
}

function scheduleLabel(schedule: ScheduleDefinition): string {
  if (schedule.kind === 'daily') return 'Every day';
  if (schedule.kind === 'one_time') return `Once · ${schedule.date}`;
  const days = schedule.weekdays?.map((day) => weekdayNames[day]).join(', ') ?? '';
  return schedule.kind === 'weekly' ? `Weekly · ${days}` : days;
}

interface ChoreFormState {
  title: string;
  reward: string;
  kind: ScheduleKind;
  weekdays: number[];
  date: string;
}

const emptyForm: ChoreFormState = { title: '', reward: '1.00', kind: 'daily', weekdays: [0], date: '' };

interface BulkReview {
  weekStart: string;
  weekEnd: string;
  snapshotIds: string[];
  items: ReviewOccurrence[];
}

interface ReviewChoice {
  decision: 'approved' | 'rejected';
  note: string;
}

interface ReviewSummary {
  approvedCount: number;
  rejectedCount: number;
  totalCents: number;
}

export function App() {
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
  const [allowance, setAllowance] = useState<AllowanceSummary | null>(null);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(householdMonth);
  const [themeId, setThemeId] = useState(getDeviceThemeId);
  const [parent, setParent] = useState<ParentStatus>({ configured: false, authorized: false, expiresAt: null });
  const [chores, setChores] = useState<ChoreSummary[]>([]);
  const [approved, setApproved] = useState<ApprovedWeekView[]>([]);
  const [bulkReview, setBulkReview] = useState<BulkReview | null>(null);
  const [reviewChoices, setReviewChoices] = useState<Record<string, ReviewChoice>>({});
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentTab, setParentTab] = useState<'chores' | 'allowance'>('chores');
  const [pin, setPin] = useState('');
  const [form, setForm] = useState<ChoreFormState>(emptyForm);
  const [completeOneTime, setCompleteOneTime] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [correctionLine, setCorrectionLine] = useState<string | null>(null);
  const [correctionAmount, setCorrectionAmount] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimCelebration, setClaimCelebration] = useState<string | null>(null);
  const [approvalCelebration, setApprovalCelebration] = useState(false);
  const [detailOccurrenceId, setDetailOccurrenceId] = useState<string | null>(null);
  const [decisionConfirmation, setDecisionConfirmation] = useState<string | null>(null);
  const parentDialogRef = useDialogFocus<HTMLElement>(parentOpen);
  const reviewDialogRef = useDialogFocus<HTMLElement>(Boolean(bulkReview));
  const reviewSummaryDialogRef = useDialogFocus<HTMLElement>(Boolean(reviewSummary));
  const activityDialogRef = useDialogFocus<HTMLElement>(activityOpen);
  const calendarMonthInitialized = useRef(false);

  const loadChecklist = useCallback(async () => {
    const result = await api<ChecklistResponse>('/api/checklist');
    setChecklist(result);
    if (!calendarMonthInitialized.current) {
      calendarMonthInitialized.current = true;
      setCalendarMonth(result.today.slice(0, 7));
    }
  }, []);
  const loadAllowance = useCallback(async () => setAllowance(await api<AllowanceSummary>('/api/allowance')), []);
  const loadCalendar = useCallback(async (month: string) => setCalendar(await api<CalendarResponse>(`/api/calendar?month=${month}`)), []);

  const loadParent = useCallback(async () => {
    const status = await api<ParentStatus>('/api/parent/status');
    setParent(status);
    if (!status.authorized) {
      setChores([]); setApproved([]);
      return;
    }
    const [choreResult, approvedResult] = await Promise.all([
      api<{ chores: ChoreSummary[] }>('/api/parent/chores'),
      api<{ weeks: ApprovedWeekView[] }>('/api/parent/approved-weeks')
    ]);
    setChores(choreResult.chores);
    setApproved(approvedResult.weeks);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadChecklist(), loadAllowance(), loadCalendar(calendarMonth), loadParent()]);
  }, [calendarMonth, loadAllowance, loadCalendar, loadChecklist, loadParent]);

  useEffect(() => {
    Promise.all([loadChecklist(), loadAllowance(), loadCalendar(calendarMonth), loadParent()])
      .catch((reason: Error) => setError(reason.message));
  }, [calendarMonth, loadAllowance, loadCalendar, loadChecklist, loadParent]);

  useEffect(() => {
    if (!parentOpen && !bulkReview && !reviewSummary && !activityOpen && !detailOccurrenceId) return;
    const closeTopLayer = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (detailOccurrenceId) setDetailOccurrenceId(null);
      else if (reviewSummary) setReviewSummary(null);
      else if (bulkReview) setBulkReview(null);
      else if (activityOpen) setActivityOpen(false);
      else setParentOpen(false);
    };
    document.addEventListener('keydown', closeTopLayer);
    return () => document.removeEventListener('keydown', closeTopLayer);
  }, [activityOpen, bulkReview, detailOccurrenceId, parentOpen, reviewSummary]);

  const bulkTotal = useMemo(() => bulkReview?.items.filter((item) => reviewChoices[item.id]?.decision === 'approved')
    .reduce((sum, item) => sum + item.rewardCents, 0) ?? 0, [bulkReview, reviewChoices]);
  const detailOccurrence = useMemo(() => {
    if (!detailOccurrenceId || !checklist) return null;
    return [...checklist.days.flatMap((day) => day.occurrences), ...(checklist.lateClaimDay?.occurrences ?? [])]
      .find((item) => item.id === detailOccurrenceId) ?? null;
  }, [checklist, detailOccurrenceId]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await action(); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  async function runResult(action: () => Promise<void>): Promise<boolean> {
    setBusy(true); setError(null);
    try { await action(); return true; }
    catch (reason) { setError((reason as Error).message); return false; }
    finally { setBusy(false); }
  }

  async function toggleClaim(id: string, claimed: boolean) {
    await run(async () => {
      await api(`/api/occurrences/${id}/claim`, {
        method: claimed ? 'DELETE' : 'POST', headers: claimHeaders(checklist?.today)
      });
      await Promise.all([loadChecklist(), loadAllowance(), loadCalendar(calendarMonth)]);
      if (!claimed) {
        setClaimCelebration(id);
        window.setTimeout(() => setClaimCelebration((current) => current === id ? null : current), 750);
      }
    });
  }

  async function authenticatePin(value: string): Promise<boolean> {
    return runResult(async () => {
      await api(parent.configured ? '/api/parent/login' : '/api/parent/setup', {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ pin: value })
      });
      await loadParent();
    });
  }

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (await authenticatePin(pin)) setPin('');
  }

  async function signOut() {
    await run(async () => {
      await api('/api/parent/logout', { method: 'POST', headers: mutationHeaders });
      setEditingId(null); setForm(emptyForm); setBulkReview(null); setReviewSummary(null); await loadParent();
    });
  }

  function beginEdit(chore: ChoreSummary) {
    setEditingId(chore.id);
    setCompleteOneTime(false);
    setForm({ title: chore.title, reward: (chore.rewardCents / 100).toFixed(2), kind: chore.schedule.kind,
      weekdays: chore.schedule.weekdays ?? [0], date: chore.schedule.date ?? '' });
  }

  async function saveChore(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const rewardCents = parseMoneyToCents(form.reward);
      if (rewardCents === null || rewardCents % 25 !== 0) {
        throw new Error('Scheduled rewards must use $0.25 increments');
      }
      const schedule: ScheduleDefinition = form.kind === 'daily' ? { kind: 'daily' }
        : form.kind === 'one_time' ? { kind: 'one_time', date: form.date }
        : { kind: form.kind, weekdays: form.kind === 'weekly' ? [form.weekdays[0] ?? 0] : form.weekdays };
      await api(editingId ? `/api/parent/chores/${editingId}` : '/api/parent/chores', {
        method: editingId ? 'PUT' : 'POST', headers: jsonHeaders,
        body: JSON.stringify({ title: form.title, rewardCents, schedule,
          completeAndApprove: !editingId && form.kind === 'one_time' && completeOneTime })
      });
      setForm(emptyForm); setEditingId(null); setCompleteOneTime(false); await refreshAll();
    });
  }

  async function archiveChore(id: string) {
    if (!window.confirm('Archive this chore starting next Monday?')) return;
    await run(async () => {
      await api(`/api/parent/chores/${id}/archive`, { method: 'POST', headers: mutationHeaders });
      await loadParent();
    });
  }

  function toggleWeekday(day: number) {
    setForm((current) => ({ ...current, weekdays: current.weekdays.includes(day)
      ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day].sort() }));
  }

  async function decideOccurrenceAction(id: string, action: 'approve' | 'reject' | 'override', suppliedNote?: string,
    approvedRewardCents?: number): Promise<boolean> {
    if (!parent.authorized) { setParentOpen(true); return false; }
    if (action === 'override' && !window.confirm('Complete and approve this historical chore? This is final.')) return false;
    let note = suppliedNote;
    if (action === 'reject' && note === undefined) {
      const response = window.prompt('Optional rejection note (leave blank for none):', '');
      if (response === null) return false;
      note = response;
    }
    return runResult(async () => {
      await api(`/api/parent/occurrences/${id}/${action}`, {
        method: 'POST', headers: action === 'override' ? mutationHeaders : jsonHeaders,
        body: action === 'override' ? undefined : JSON.stringify({ note, approvedRewardCents })
      });
      await refreshAll();
      if (action !== 'reject') {
        setApprovalCelebration(true);
        window.setTimeout(() => setApprovalCelebration(false), 1200);
      }
    });
  }

  async function decideFromDetails(id: string, decision: ChoreDecisionInput): Promise<boolean> {
    const completed = await decideOccurrenceAction(id, decision.action, decision.note, decision.approvedRewardCents);
    if (completed) {
      setDecisionConfirmation(decision.action === 'approve' ? 'Chore approved and allowance updated.' : 'Chore rejected. No allowance was added.');
      window.setTimeout(() => setDecisionConfirmation(null), 2200);
    }
    return completed;
  }

  async function openBulkReview(weekStart: string) {
    if (!parent.authorized) { setParentOpen(true); return; }
    await run(async () => {
      const result = await api<BulkReview>(`/api/parent/reviews/${weekStart}/pending`);
      setBulkReview(result);
      setReviewSummary(null);
      setReviewChoices(Object.fromEntries(result.items.map((item) => [item.id, { decision: 'approved', note: '' }])));
    });
  }

  async function approveBulkReview() {
    if (!bulkReview) return;
    await run(async () => {
      const result = await api<ReviewSummary>(`/api/parent/reviews/${bulkReview.weekStart}/complete-pending`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ snapshotIds: bulkReview.snapshotIds, decisions: bulkReview.items.map((item) => ({
          occurrenceId: item.id,
          decision: reviewChoices[item.id]?.decision ?? 'approved',
          note: reviewChoices[item.id]?.decision === 'rejected' ? reviewChoices[item.id]?.note : undefined
        })) })
      });
      setReviewSummary(result); setBulkReview(null); setReviewChoices({}); await refreshAll();
      setApprovalCelebration(true);
      window.setTimeout(() => setApprovalCelebration(false), 1200);
    });
  }

  async function recordPayment(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api('/api/parent/payments', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({
        amountCents: Math.round(Number(paymentAmount) * 100), note: paymentNote,
        idempotencyKey: createIdempotencyKey()
      }) });
      setPaymentAmount(''); setPaymentNote(''); await refreshAll();
    });
  }

  async function saveCorrection(event: FormEvent) {
    event.preventDefault();
    if (!correctionLine) return;
    await run(async () => {
      await api(`/api/parent/approval-lines/${correctionLine}/adjust`, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({
          correctedRewardCents: Math.round(Number(correctionAmount) * 100), note: correctionNote,
          idempotencyKey: createIdempotencyKey()
        })
      });
      setCorrectionLine(null); setCorrectionAmount(''); setCorrectionNote(''); await refreshAll();
    });
  }

  function selectTheme(theme: string) {
    const selected = saveDeviceTheme(theme);
    setThemeId(selected.id);
  }

  async function exportDatabase() {
    await run(async () => {
      const response = await fetch('/api/parent/export');
      if (!response.ok) throw new Error('Database export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `sensei-${checklist?.today ?? 'export'}.sqlite`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    });
  }

  function occurrenceRow(item: ChecklistOccurrence) {
    return <div key={item.id} className={`chore-entry state-${item.state}`}>
      <label className={`chore-row-checkbox ${item.claimed ? 'checked' : ''} ${claimCelebration === item.id ? 'celebrating' : ''} ${!item.eligible ? 'locked' : ''}`}
        aria-label={`${item.claimed ? 'Undo' : 'Claim'} ${item.title}`}>
        <input type="checkbox" checked={item.claimed} disabled={busy || !item.eligible}
          onChange={() => void toggleClaim(item.id, item.claimed)} />
        <span className="custom-check" aria-hidden="true">{item.claimed ? '✓' : ''}</span>
      </label>
      <button type="button" className="chore-row-detail" data-chore-detail-id={item.id}
        onClick={() => setDetailOccurrenceId(item.id)} aria-label={`View details for ${item.title}`}>
        <span className="chore-title">{item.title}</span><span className="reward">{money(item.approvedRewardCents ?? item.rewardCents)}</span>
        <span className={`chore-state ${item.state}`}>{item.state === 'pending' ? 'Pending approval' : item.state}</span>
      </button>
    </div>;
  }

  return <div className="app-shell">
    <a className="skip-link" href="#sensei-main">Skip to weekly chores</a>
    <header className="topbar">
      <div className="brand-mark" aria-hidden="true">整</div>
      <div className="brand-copy"><strong>Sensei</strong><span>Household rhythm, one week at a time</span></div>
      <div className="header-actions">
        <label className="theme-quick-control"><span>Theme</span><select aria-label="Device theme" value={themeId}
          onChange={(event) => selectTheme(event.target.value)}>
          {themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.id === 'minecraft' ? 'Overworld' : theme.id === 'classic' ? 'Classic' : theme.name}</option>)}
        </select></label>
        <button className="parent-button" onClick={() => setParentOpen(true)}>Parent Mode</button>
      </div>
    </header>

    {themeId === 'minecraft' && <OverworldScene />}

    <main id="sensei-main">
      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError(null)}>Dismiss</button></div>}

      {checklist?.lateClaimDay && <section className="late-claim-section">
        <div><p className="eyebrow">GRACE PERIOD</p><h2>Yesterday</h2><p>Yesterday remains available for one day.</p></div>
        <div className="late-claim-list">{checklist.lateClaimDay.occurrences.map(occurrenceRow)}</div>
      </section>}
      <WeekSheet checklist={checklist} allowance={allowance} busy={busy} claimCelebration={claimCelebration}
        parentAuthorized={parent.authorized} onToggleClaim={(id, claimed) => void toggleClaim(id, claimed)}
        onOpenReview={(weekStart) => void openBulkReview(weekStart)} onRequestParent={() => setParentOpen(true)}
        onOpenDetails={(item) => setDetailOccurrenceId(item.id)} />

      <section className={`history-disclosure ${historyOpen ? 'open' : ''}`}>
        <button className="history-summary" aria-expanded={historyOpen} onClick={() => setHistoryOpen((value) => !value)}>
          <span><span className="eyebrow">HISTORY</span><strong>{monthName(calendarMonth)} at a glance</strong>
            <small>{money(allowance?.totalApprovedCents ?? 0)} approved · {money(allowance?.totalPaidCents ?? 0)} paid</small></span>
          <span className="history-chevron" aria-hidden="true">⌄</span>
        </button>
        {historyOpen && <div className="history-body">
          <div className="history-toolbar"><p>Calendar outcomes stay attached to their original dates.</p>
            <button onClick={() => setActivityOpen(true)}>View detailed activity</button></div>
          <CalendarSection calendar={calendar} month={calendarMonth} onMonthChange={setCalendarMonth}
            currentWeekStart={checklist?.weekStart ?? null} householdToday={checklist?.today ?? null}
            parentAuthorized={parent.authorized} busy={busy}
            onToggleClaim={(id, claimed) => void toggleClaim(id, claimed)}
            onAuthenticate={authenticatePin} onDecision={decideFromDetails}
            onOverride={(id) => void decideOccurrenceAction(id, 'override')}
            onApproveWeek={(weekStart) => void openBulkReview(weekStart)} />
        </div>}
      </section>
    </main>

    {parentOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setParentOpen(false); }}>
      <section ref={parentDialogRef} tabIndex={-1} className="parent-panel" role="dialog" aria-modal="true" aria-labelledby="parent-title">
        <header className="panel-header"><div><p className="eyebrow">PARENT MODE</p><h2 id="parent-title">Household controls</h2></div>
          <button className="icon-button" aria-label="Close Parent Mode" onClick={() => setParentOpen(false)}>×</button></header>

        {!parent.authorized ? <form className="pin-form" onSubmit={authenticate}>
          <div className="security-note"><strong>{parent.configured ? 'Enter your parent PIN' : 'Create the parent PIN'}</strong>
            <p>Use a unique 4–12 digit PIN. This local HTTP connection does not encrypt the PIN or session.</p></div>
          <label>Parent PIN<input inputMode="numeric" autoComplete="current-password" name="parent-pin" pattern="[0-9]{4,12}" minLength={4} maxLength={12}
            type="password" value={pin} onChange={(event) => setPin(event.target.value)} required /></label>
          <button className="primary" disabled={busy}>{parent.configured ? 'Open Parent Mode' : 'Set PIN & continue'}</button>
        </form> : <>
          <div className="authorized-bar"><span>Authorized · {parent.parentLabel ?? 'Parent'}</span><button onClick={() => void signOut()}>Sign out</button></div>
          <nav className="parent-tabs" aria-label="Parent sections">
            {(['chores', 'allowance'] as const).map((tab) => <button key={tab}
              className={parentTab === tab ? 'active' : ''} onClick={() => setParentTab(tab)}>{tab}</button>)}
          </nav>

          {parentTab === 'chores' && <section className="parent-section">
            <form id="chore-form" className="chore-form" onSubmit={saveChore}>
              <h3>{editingId ? 'Edit chore' : 'Add a chore'}</h3>
              <div className="form-grid">
                <label className="wide">Chore name<input value={form.title} maxLength={80} required onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label>Reward ($)<input type="number" min="0" max="1000" step="0.25" value={form.reward} required onChange={(event) => setForm({ ...form, reward: event.target.value })} /></label>
                <label>Schedule<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as ScheduleKind })}>
                  <option value="daily">Daily</option><option value="weekdays">Selected weekdays</option><option value="weekly">Weekly</option><option value="one_time">One time</option>
                </select></label>
              </div>
              {(form.kind === 'weekdays' || form.kind === 'weekly') && <fieldset className="weekday-picker"><legend>Days</legend>
                {weekdayNames.map((name, day) => <button type="button" key={name} className={form.weekdays.includes(day) ? 'selected' : ''}
                  onClick={() => form.kind === 'weekly' ? setForm({ ...form, weekdays: [day] }) : toggleWeekday(day)}>{name}</button>)}</fieldset>}
              {form.kind === 'one_time' && <label>Chore date<input type="date" value={form.date} required onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>}
              {!editingId && form.kind === 'one_time' && <label className="direct-complete-option">
                <input type="checkbox" checked={completeOneTime} onChange={(event) => setCompleteOneTime(event.target.checked)} />
                Complete and approve now
              </label>}
              <p className="form-note">New recurring chores and edits begin next Monday. One-time chores can appear this week.</p>
              <div className="form-actions"><button className="primary" disabled={busy}>{editingId ? 'Save for next Monday' : 'Add chore'}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setCompleteOneTime(false); }}>Cancel</button>}</div>
            </form>
            <div className="managed-list"><h3>Managed chores</h3>{chores.map((chore) => <article key={chore.id} className={chore.archived ? 'archived' : ''}>
              <div><strong>{chore.title}</strong><span>{money(chore.rewardCents)} · {scheduleLabel(chore.schedule)}</span>
                {chore.pendingEffectiveFrom && <small>Change scheduled for {chore.pendingEffectiveFrom}</small>}</div>
              <div className="row-actions"><button onClick={() => beginEdit(chore)}>Edit</button>{!chore.archived && <button className="danger" onClick={() => void archiveChore(chore.id)}>Archive</button>}</div>
            </article>)}</div>
          </section>}

          {parentTab === 'allowance' && <section className="parent-section">
            <div className="balance-panel"><small>Approved unpaid balance</small><strong>{money(allowance?.approvedBalanceCents ?? 0)}</strong></div>
            <form className="payment-form" onSubmit={recordPayment}><h3>Record payment</h3>
              <div className="form-grid"><label>Amount ($)<input type="number" min="0.01" step="0.01" max={(allowance?.approvedBalanceCents ?? 0) / 100}
                value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required /></label>
                <label>Note<input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Cash, transfer…" /></label></div>
              <button className="primary" disabled={busy || (allowance?.approvedBalanceCents ?? 0) <= 0}>Record payment</button>
            </form>
            <div className="approved-history"><h3>Approved history</h3>{approved.map((week) => <article className="approved-week" key={week.id}>
              <header><div><strong>Week of {shortDate(week.weekStart)}</strong><span>{money(week.totalCents)} · {week.approvedByLabel}</span></div></header>
              {week.lines.map((line) => <details className="approval-line" key={line.id}>
                <summary><span><strong>{line.title}</strong><small>{shortDate(line.date)} · {line.decision === 'rejected' ? 'Rejected · $0' : `${money(line.approvedRewardCents)} awarded`}</small></span></summary>
                <dl className="approval-line-details">
                  <div><dt>Outcome</dt><dd>{line.decision}</dd></div>
                  <div><dt>Scheduled reward</dt><dd>{money(line.originalRewardCents)}</dd></div>
                  <div><dt>Final awarded amount</dt><dd>{money(line.approvedRewardCents)}</dd></div>
                  {line.currentHistoricalCents !== line.approvedRewardCents && <div><dt>Current historical record</dt><dd>{money(line.currentHistoricalCents)}</dd></div>}
                  {line.note && <div><dt>Parent comment</dt><dd>{line.note}</dd></div>}
                  <div><dt>Decision source</dt><dd>{line.source?.replaceAll('_', ' ') ?? 'legacy weekly'}</dd></div>
                </dl>
                {line.decision !== 'rejected' && <button onClick={() => { setCorrectionLine(line.id); setCorrectionAmount((line.currentHistoricalCents / 100).toFixed(2)); setCorrectionNote(''); }}>Correct</button>}
              </details>)}
            </article>)}</div>
            {correctionLine && <form className="correction-form" onSubmit={saveCorrection}><h3>Historical correction</h3>
              <label>Corrected reward ($)<input type="number" min="0" step="0.01" value={correctionAmount} onChange={(event) => setCorrectionAmount(event.target.value)} required /></label>
              <label>Reason<input value={correctionNote} onChange={(event) => setCorrectionNote(event.target.value)} required /></label>
              <p>Corrections never create debt. Amounts already paid remain historical.</p>
              <div className="form-actions"><button className="primary" disabled={busy}>Save correction</button><button type="button" onClick={() => setCorrectionLine(null)}>Cancel</button></div>
            </form>}
            <button className="export-button" onClick={() => void exportDatabase()}>Download database export</button>
          </section>}

        </>}
      </section>
    </div>}
    {bulkReview && <div className="centered-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setBulkReview(null); }}>
      <section ref={reviewDialogRef} tabIndex={-1} className="bulk-review-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-review-title">
        <header><div><p className="eyebrow">PARENT REVIEW</p><h2 id="bulk-review-title">{bulkReview.items.length} claims need a decision</h2>
          <p>{shortDate(bulkReview.weekStart)} – {shortDate(bulkReview.weekEnd)} · Amounts are credited only after approval.</p></div>
          <button className="icon-button" aria-label="Close approval review" onClick={() => setBulkReview(null)}>×</button></header>
        <div className="bulk-review-list">{bulkReview.items.map((item) => {
          const choice = reviewChoices[item.id] ?? { decision: 'approved' as const, note: '' };
          return <article key={item.id} className={choice.decision}>
            <div className="review-item-copy"><strong>{item.title}</strong><small>{shortDate(item.date)} · {money(item.rewardCents)}</small></div>
            <div className="review-decision" role="group" aria-label={`Decision for ${item.title} on ${shortDate(item.date)}`}>
              <button aria-pressed={choice.decision === 'approved'} className={choice.decision === 'approved' ? 'selected approve' : 'approve'} onClick={() => setReviewChoices((current) => ({
                ...current, [item.id]: { ...choice, decision: 'approved' }
              }))}>Approve</button>
              <button aria-pressed={choice.decision === 'rejected'} className={choice.decision === 'rejected' ? 'selected reject' : 'reject'} onClick={() => setReviewChoices((current) => ({
                ...current, [item.id]: { ...choice, decision: 'rejected' }
              }))}>Reject</button>
            </div>
            {choice.decision === 'rejected' && <label className="rejection-note">Optional note
              <input maxLength={240} value={choice.note} placeholder="Discussed in person"
                onChange={(event) => setReviewChoices((current) => ({
                  ...current, [item.id]: { ...choice, note: event.target.value }
                }))} />
            </label>}
          </article>;
        })}</div>
        <footer><div><strong>{Object.values(reviewChoices).filter((item) => item.decision === 'approved').length} approved · {Object.values(reviewChoices).filter((item) => item.decision === 'rejected').length} rejected</strong>
          <span>{money(bulkTotal)} to credit</span></div>
          <div className="form-actions"><button onClick={() => setBulkReview(null)}>Cancel</button>
            <button className="primary" disabled={busy} onClick={() => void approveBulkReview()}>Finish review</button></div></footer>
      </section>
    </div>}
    {reviewSummary && <div className="centered-modal-backdrop">
      <section ref={reviewSummaryDialogRef} tabIndex={-1} className="review-complete-dialog" role="dialog" aria-modal="true" aria-labelledby="review-complete-title">
        <span className="review-complete-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">REVIEW COMPLETE</p><h2 id="review-complete-title">This week is reviewed</h2>
        <p>{reviewSummary.approvedCount} approved for {money(reviewSummary.totalCents)}. {reviewSummary.rejectedCount} rejected.</p>
        <button className="primary" onClick={() => setReviewSummary(null)}>Done</button>
      </section>
    </div>}
    {activityOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActivityOpen(false); }}>
      <section ref={activityDialogRef} tabIndex={-1} className="activity-panel" role="dialog" aria-modal="true" aria-labelledby="activity-title">
        <header className="panel-header"><div><p className="eyebrow">ALLOWANCE ACTIVITY</p><h2 id="activity-title">Money history</h2>
          <p>Only earnings, corrections, and payments affect this ledger.</p></div>
          <button className="icon-button" aria-label="Close allowance activity" onClick={() => setActivityOpen(false)}>×</button></header>
        <div className="activity-totals" aria-label="Money history totals">
          <div><span>{monthYearName(allowance?.earningsMonth ?? calendarMonth)} earned</span>
            <strong>{money(allowance?.monthlyEarnedCents ?? 0)}</strong></div>
          <div><span>Lifetime earned</span><strong>{money(allowance?.lifetimeEarnedCents ?? 0)}</strong></div>
          <div><span>Lifetime paid</span><strong>{money(allowance?.totalPaidCents ?? 0)}</strong></div>
        </div>
        <div className="activity-list">
          {allowance?.recentActivity.length ? allowance.recentActivity.map((item) => <article key={item.id}>
            <span className={`activity-icon ${item.kind}`}>{item.kind === 'earning' ? '+' : item.kind === 'payment' ? '−' : '±'}</span>
            <div><strong>{item.description}</strong><small>{dateTime(item.createdAt)} · {item.parentLabel}</small></div>
            <b className={item.balanceEffectCents < 0 ? 'negative' : ''}>{item.balanceEffectCents >= 0 ? '+' : ''}{money(item.balanceEffectCents)}</b>
          </article>) : <div className="empty-state">Approved earnings and payments will appear here.</div>}
        </div>
        <footer className="activity-balance"><span>Available balance</span><strong>{money(allowance?.approvedBalanceCents ?? 0)}</strong></footer>
      </section>
    </div>}
    {detailOccurrence && <ChoreDetailDialog item={detailOccurrence} parentAuthorized={parent.authorized} busy={busy}
      onAuthenticate={authenticatePin} onDecision={decideFromDetails} onClose={() => setDetailOccurrenceId(null)} />}
    {decisionConfirmation && <div className="decision-confirmation" role="status">{decisionConfirmation}</div>}
    {approvalCelebration && <div className="approval-celebration" role="status">✦ Chores approved! ✦</div>}
  </div>;
}
