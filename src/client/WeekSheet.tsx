import { useEffect, useMemo, useState } from 'react';
import type { AllowanceSummary, ChecklistDay, ChecklistOccurrence, ChecklistResponse } from '../shared/types';

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`));
}

function longDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`));
}

function statusText(item: ChecklistOccurrence): string {
  if (item.state === 'pending') return 'Waiting for review';
  if (item.state === 'approved') return 'Approved';
  if (item.state === 'rejected') return 'Rejected · $0 gained';
  if (item.future) return `Available ${longDate(item.date).split(',')[0]}`;
  return 'Ready to do';
}

function completedCount(day: ChecklistDay): number {
  return day.occurrences.filter((item) => item.claimed).length;
}

function dayOutcome(day: ChecklistDay): string {
  if (day.occurrences.length === 0) return 'Open day';
  const pending = day.occurrences.filter((item) => item.state === 'pending').length;
  const approved = day.occurrences.filter((item) => item.state === 'approved');
  const rejected = day.occurrences.filter((item) => item.state === 'rejected').length;
  if (pending) return `${pending} awaiting review`;
  if (rejected && approved.length === 0) return 'Rejected · $0 gained';
  if (approved.length) return `${money(approved.reduce((sum, item) => sum + item.rewardCents, 0))} approved`;
  if (day.isFuture) return `${money(day.occurrences.reduce((sum, item) => sum + item.rewardCents, 0))} available`;
  return `${completedCount(day)} of ${day.occurrences.length} complete`;
}

export function WeekSheet({ checklist, allowance, busy, claimCelebration, parentAuthorized, onToggleClaim,
  onOpenReview, onRequestParent }: {
  checklist: ChecklistResponse | null;
  allowance: AllowanceSummary | null;
  busy: boolean;
  claimCelebration: string | null;
  parentAuthorized: boolean;
  onToggleClaim: (id: string, claimed: boolean) => void;
  onOpenReview: (weekStart: string) => void;
  onRequestParent: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showWholeWeek, setShowWholeWeek] = useState(false);
  useEffect(() => {
    if (checklist?.today) setSelectedDate(checklist.today);
  }, [checklist?.today]);

  const occurrences = useMemo(() => checklist?.days.flatMap((day) => day.occurrences) ?? [], [checklist]);
  const pendingCount = occurrences.filter((item) => item.state === 'pending').length;
  const selectedDay = checklist?.days.find((day) => day.date === selectedDate)
    ?? checklist?.days.find((day) => day.isToday) ?? checklist?.days[0] ?? null;

  function choreRow(item: ChecklistOccurrence, compact = false) {
    return <li key={item.id} className={`weeksheet-chore state-${item.state} ${compact ? 'compact' : ''}`}>
      <label className={`${item.claimed ? 'checked' : ''} ${claimCelebration === item.id ? 'celebrating' : ''}`}>
        <input type="checkbox" checked={item.claimed} disabled={busy || !item.eligible}
          onChange={() => onToggleClaim(item.id, item.claimed)} />
        <span className="weeksheet-check" aria-hidden="true">{item.claimed ? '✓' : ''}</span>
        <span className="weeksheet-chore-copy"><strong>{item.title}</strong><small>{statusText(item)}</small>
          {item.state === 'rejected' && item.decisionNote && <em>{item.decisionNote}</em>}</span>
        <b>{item.state === 'rejected' ? '$0' : money(item.rewardCents)}</b>
      </label>
    </li>;
  }

  if (!checklist) return <section className="weeksheet loading" aria-busy="true">Loading this week…</section>;

  return <section className="weeksheet" aria-labelledby="week-title">
    <header className="weeksheet-heading">
      <div><p className="eyebrow">THIS WEEK</p><h1 id="week-title">{shortDate(checklist.weekStart)}–{shortDate(checklist.weekEnd)}</h1>
        <p>Small jobs, one day at a time.</p></div>
      <div className="weeksheet-heading-actions">
        <div className="allowance-ribbon" aria-label="Allowance summary">
          <div><span>Claimed this week</span><strong>{money(allowance?.claimedThisWeekCents ?? 0)}</strong><small>Waiting for review</small></div>
          <div><span>Available balance</span><strong>{money(allowance?.approvedBalanceCents ?? 0)}</strong><small>Approved and unpaid</small></div>
        </div>
        {pendingCount > 0 && <button className="review-entry" onClick={() => parentAuthorized
          ? onOpenReview(checklist.weekStart) : onRequestParent()}>
          Review {pendingCount} pending
        </button>}
      </div>
    </header>

    <nav className="mobile-day-rail" aria-label="Choose a day">
      {checklist.days.map((day) => <button key={day.date} className={selectedDay?.date === day.date ? 'active' : ''}
        aria-current={day.isToday ? 'date' : undefined} onClick={() => { setSelectedDate(day.date); setShowWholeWeek(false); }}>
        <span>{day.label.slice(0, 3)}</span><b>{Number(day.date.slice(-2))}</b>
        <i className={`rail-state ${day.occurrences.some((item) => item.state === 'pending') ? 'pending'
          : day.occurrences.some((item) => item.state === 'rejected') ? 'rejected'
            : completedCount(day) > 0 ? 'complete' : ''}`} aria-hidden="true" />
      </button>)}
    </nav>

    <div className="desktop-week-grid">
      {checklist.days.map((day) => <article key={day.date} className={`week-day-column ${day.isToday ? 'today' : ''}
        ${day.isFuture ? 'future' : ''} ${day.occurrences.length === 0 ? 'empty' : ''}`}>
        <header><strong>{day.label}</strong><time dateTime={day.date}>{day.isToday ? 'Today' : shortDate(day.date)}</time></header>
        {day.occurrences.length ? <ul>{day.occurrences.map((item) => choreRow(item, true))}</ul>
          : <p className="empty-day-copy">Nothing scheduled</p>}
        <footer><span>{day.occurrences.length ? `${completedCount(day)} of ${day.occurrences.length} done` : 'Open day'}</span>
          <strong>{dayOutcome(day)}</strong></footer>
      </article>)}
    </div>

    <div className="mobile-week-content">
      {!showWholeWeek && selectedDay && <section className="mobile-selected-day" aria-labelledby="selected-day-title">
        <header><div><p className="eyebrow">{selectedDay.isToday ? 'TODAY' : selectedDay.label.toUpperCase()}</p>
          <h2 id="selected-day-title">{longDate(selectedDay.date)}</h2></div>
          <span>{selectedDay.occurrences.length} chore{selectedDay.occurrences.length === 1 ? '' : 's'}</span></header>
        {selectedDay.occurrences.length ? <ul>{selectedDay.occurrences.map((item) => choreRow(item))}</ul>
          : <div className="mobile-empty-day"><strong>Nothing scheduled</strong><span>Enjoy the open day.</span></div>}
        <button className="view-week-button" onClick={() => setShowWholeWeek(true)}>View entire week <span aria-hidden="true">→</span></button>
      </section>}
      {showWholeWeek && <section className="mobile-week-overview" aria-labelledby="whole-week-title">
        <header><div><p className="eyebrow">ENTIRE WEEK</p><h2 id="whole-week-title">Choose a day</h2></div>
          <span>{occurrences.filter((item) => item.claimed).length} of {occurrences.length} done</span></header>
        <div>{checklist.days.map((day) => <button key={day.date} className={`${day.isToday ? 'today' : ''}
          ${day.occurrences.length === 0 ? 'quiet' : ''}`} onClick={() => { setSelectedDate(day.date); setShowWholeWeek(false); }}>
          <span><strong>{day.label.slice(0, 3)} {Number(day.date.slice(-2))}{day.isToday ? ' · Today' : ''}</strong>
            <small>{day.occurrences.length ? `${completedCount(day)} of ${day.occurrences.length} complete` : 'Nothing scheduled'}</small></span>
          <b>{dayOutcome(day)}</b>
        </button>)}</div>
      </section>}
    </div>
  </section>;
}
