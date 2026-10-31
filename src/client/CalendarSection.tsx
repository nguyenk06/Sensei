import { useEffect, useMemo, useState } from 'react';
import type { CalendarResponse } from '../shared/types';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function monthTitle(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`));
}

export function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`));
}

export function CalendarSection({ calendar, month, onMonthChange, currentWeekStart, parentAuthorized, busy,
  onToggleClaim, onDecision, onApproveWeek }: {
  calendar: CalendarResponse | null;
  month: string;
  onMonthChange: (month: string) => void;
  currentWeekStart: string | null;
  parentAuthorized: boolean;
  busy: boolean;
  onToggleClaim: (id: string, claimed: boolean) => void;
  onDecision: (id: string, action: 'approve' | 'reject' | 'override') => void;
  onApproveWeek: (weekStart: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => { if (!weekStart && currentWeekStart) setWeekStart(currentWeekStart); }, [currentWeekStart, weekStart]);
  const weekEnd = weekStart ? shiftDate(weekStart, 6) : null;
  const weekDaysInView = useMemo(() => calendar?.days.filter((day) => weekStart && weekEnd
    && day.date >= weekStart && day.date <= weekEnd) ?? [], [calendar, weekEnd, weekStart]);
  const pendingCount = weekDaysInView.reduce((sum, day) => sum + day.pendingCount, 0);
  const selectedDay = selectedDate ? calendar?.days.find((day) => day.date === selectedDate) ?? null : null;

  function moveWeek(days: number) {
    if (!weekStart) return;
    const next = shiftDate(weekStart, days);
    setWeekStart(next);
    if (!calendar?.days.some((day) => day.date === next)) onMonthChange(next.slice(0, 7));
  }

  return <section className="calendar-section" aria-labelledby="calendar-title">
    <div className="section-heading">
      <div><p className="eyebrow">HISTORY</p><h2 id="calendar-title">Household calendar</h2>
        <p>Claims and approved earnings stay attached to their original dates.</p></div>
      <div className="month-controls">
        <button aria-label="Previous month" onClick={() => onMonthChange(shiftMonth(month, -1))}>←</button>
        <strong>{monthTitle(month)}</strong>
        <button aria-label="Next month" onClick={() => onMonthChange(shiftMonth(month, 1))}>→</button>
      </div>
    </div>
    {weekStart && weekEnd && <div className="week-approval-controls">
      <button aria-label="Previous approval week" onClick={() => moveWeek(-7)}>←</button>
      <div><strong>{shortDate(weekStart)} – {shortDate(weekEnd)}</strong><span>{pendingCount} pending</span></div>
      <button aria-label="Next approval week" onClick={() => moveWeek(7)}>→</button>
      {parentAuthorized && <button className="approve-pending-button" disabled={busy || pendingCount === 0}
        onClick={() => onApproveWeek(weekStart)}>Approve All Pending ({pendingCount})</button>}
    </div>}
    <div className="calendar-grid" aria-busy={!calendar}>
      {weekDays.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
      {calendar?.days.map((day) => <button type="button" key={day.date}
        className={`calendar-day ${day.inMonth ? '' : 'outside'} ${day.approvedCents !== null ? 'approved' : ''} ${day.missedCount > 0 ? 'missed' : ''}`}
        disabled={day.occurrenceCount === 0} onClick={() => setSelectedDate(day.date)}>
        <header><time dateTime={day.date}>{Number(day.date.slice(-2))}</time></header>
        {day.occurrenceCount > 0 ? <>
          <strong>{day.claimedCount}/{day.occurrenceCount} done</strong>
          <p>{day.titles.slice(0, 2).join(' · ')}</p>
          <div className="calendar-day-statuses">
            {day.approvedCents !== null && <span className="calendar-day-status earned">
              <span aria-hidden="true">$</span>{(day.approvedCents / 100).toFixed(2)}<span className="sr-only"> approved</span>
            </span>}
            {day.pendingCount > 0 && <span className="calendar-day-status pending">
              <span className="status-icon" aria-hidden="true">◷</span><span className="badge-label">Pending</span>{day.pendingCount}<span className="sr-only"> pending</span>
            </span>}
            {day.missedCount > 0 && <span className="calendar-day-status missed">
              <span className="status-icon" aria-hidden="true">✕</span><span className="badge-label">Missed</span>{day.missedCount > 1 ? day.missedCount : ''}<span className="sr-only"> {day.missedCount} missed</span>
            </span>}
          </div>
        </> : <p className="calendar-empty">—</p>}
      </button>)}
    </div>
    {selectedDay && <div className="centered-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDate(null); }}>
      <section className="day-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="day-detail-title">
        <header><div><p className="eyebrow">{selectedDay.date}</p><h2 id="day-detail-title">Chores for {shortDate(selectedDay.date)}</h2></div>
          <button className="icon-button" aria-label="Close day details" onClick={() => setSelectedDate(null)}>×</button></header>
        <div className="day-detail-list">{selectedDay.occurrences.map((item) => <article key={item.id}>
          <label><input type="checkbox" checked={item.claimed} disabled={busy || !item.childEligible}
            onChange={() => onToggleClaim(item.id, item.claimed)} /><span><strong>{item.title}</strong>
              <small>${(item.rewardCents / 100).toFixed(2)} · {item.state === 'pending' ? 'Pending approval' : item.state}</small></span></label>
          {parentAuthorized && item.state === 'pending' && <div className="inline-approval-actions">
            <button className="approve" onClick={() => onDecision(item.id, 'approve')}>Approve</button>
            <button className="reject" onClick={() => onDecision(item.id, 'reject')}>Reject</button>
          </div>}
          {parentAuthorized && item.overrideEligible && <button className="override-button" onClick={() => onDecision(item.id, 'override')}>Complete & approve</button>}
        </article>)}</div>
      </section>
    </div>}
  </section>;
}
