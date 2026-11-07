import { useEffect, useState, type FormEvent } from 'react';
import type { ChoreApprovalState } from '../shared/types';
import { useDialogFocus } from './useDialogFocus';

export interface ChoreDetailItem {
  id: string;
  date: string;
  title: string;
  rewardCents: number;
  claimed: boolean;
  state: ChoreApprovalState;
  eligible: boolean;
  future: boolean;
  decisionNote: string | null;
  approvedRewardCents: number | null;
}

export interface ChoreDecisionInput {
  action: 'approve' | 'reject';
  note?: string;
  approvedRewardCents?: number;
}

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function longDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`));
}

function parseMoneyToCents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const cents = Number(value) * 100;
  return Number.isSafeInteger(cents) ? cents : null;
}

function stateLabel(item: ChoreDetailItem): string {
  if (item.state === 'pending') return 'Waiting for parent review';
  if (item.state === 'approved') return 'Approved';
  if (item.state === 'rejected') return 'Rejected · $0 gained';
  if (item.future) return 'Not available yet';
  if (!item.eligible) return 'Missed · unavailable';
  return 'Ready to do';
}

export function ChoreDetailDialog({ item, parentAuthorized, busy, onClose,
  onAuthenticate, onDecision }: {
  item: ChoreDetailItem;
  parentAuthorized: boolean;
  busy: boolean;
  onClose: () => void;
  onAuthenticate: (pin: string) => Promise<boolean>;
  onDecision: (id: string, decision: ChoreDecisionInput) => Promise<boolean>;
}) {
  const [stage, setStage] = useState<'details' | 'auth' | 'review'>('details');
  const [pin, setPin] = useState('');
  const [parentComment, setParentComment] = useState('');
  const [awardAmount, setAwardAmount] = useState((item.rewardCents / 100).toFixed(2));
  const [validationMessage, setValidationMessage] = useState('');
  const dialogRef = useDialogFocus<HTMLElement>(true);

  useEffect(() => {
    setStage('details');
    setPin('');
    setParentComment('');
    setAwardAmount((item.rewardCents / 100).toFixed(2));
    setValidationMessage('');
  }, [item.id, item.rewardCents]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function authorize(event: FormEvent) {
    event.preventDefault();
    if (await onAuthenticate(pin)) {
      setPin('');
      setStage('review');
    }
  }

  async function decide(action: 'approve' | 'reject') {
    const note = parentComment.trim() || undefined;
    if (action === 'reject') {
      const completed = await onDecision(item.id, { action, note });
      if (completed) onClose();
      return;
    }
    const approvedRewardCents = parseMoneyToCents(awardAmount);
    if (approvedRewardCents === null || approvedRewardCents <= 0 || approvedRewardCents > 100000) {
      setValidationMessage('Enter an award between $0.25 and $1,000.00. Use Reject for $0.');
      return;
    }
    if (approvedRewardCents !== item.rewardCents && approvedRewardCents % 25 !== 0) {
      setValidationMessage('Adjusted awards must use $0.25 increments.');
      return;
    }
    if (approvedRewardCents < item.rewardCents && !note) {
      setValidationMessage('Explain why the award is lower than the scheduled reward.');
      return;
    }
    setValidationMessage('');
    const completed = await onDecision(item.id, { action, note, approvedRewardCents });
    if (completed) onClose();
  }

  const adjusted = item.state === 'approved' && item.approvedRewardCents !== null
    && item.approvedRewardCents !== item.rewardCents;
  const enteredCents = parseMoneyToCents(awardAmount);
  const reduction = enteredCents !== null && enteredCents < item.rewardCents;

  const content = <section ref={dialogRef} tabIndex={-1}
    className="chore-detail-dialog" role="dialog"
    aria-modal="true" aria-labelledby={`chore-detail-title-${item.id}`}>
    <header>
      <div><p className="eyebrow">CHORE DETAILS</p><h2 id={`chore-detail-title-${item.id}`}>{item.title}</h2></div>
      <button className="icon-button" aria-label="Close chore details" onClick={onClose}>×</button>
    </header>
    <dl className="chore-detail-facts">
      <div><dt>Date</dt><dd>{longDate(item.date)}</dd></div>
      <div><dt>Scheduled reward</dt><dd>{money(item.rewardCents)}</dd></div>
      <div><dt>Status</dt><dd className={`detail-state ${item.state}`}>{stateLabel(item)}</dd></div>
    </dl>
    {adjusted && <dl className="chore-detail-award">
      <div><dt>Final awarded amount</dt><dd>{money(item.approvedRewardCents!)}</dd></div>
    </dl>}
    {(item.state === 'rejected' || item.state === 'approved') && item.decisionNote
      && <p className="detail-note"><strong>Parent comment</strong>{item.decisionNote}</p>}

    {item.state === 'pending' && stage === 'details' && <div className="chore-detail-review-entry">
      <p>This claim can be approved or rejected without reviewing the rest of the week.</p>
      <button className="primary" onClick={() => setStage(parentAuthorized ? 'review' : 'auth')}>Review claim</button>
    </div>}

    {item.state === 'pending' && stage === 'auth' && <form className="detail-pin-form" onSubmit={authorize}>
      <div><strong>Parent authorization required</strong><p>Enter a parent PIN to review this chore.</p></div>
      <label>Parent PIN<input autoFocus inputMode="numeric" autoComplete="current-password" name="chore-parent-pin"
        pattern="[0-9]{4,12}" minLength={4} maxLength={12} type="password" value={pin}
        onChange={(event) => setPin(event.target.value)} required /></label>
      <div className="form-actions"><button type="button" onClick={() => setStage('details')}>Cancel</button>
        <button className="primary" disabled={busy}>Continue</button></div>
    </form>}

    {item.state === 'pending' && stage === 'review' && <div className="chore-detail-decision">
      <div><strong>Review {item.title}</strong><p>Adjusting this award affects only this chore occurrence.</p></div>
      <label>Award amount ($)<input type="number" min="0.25" max="1000" step="0.25" inputMode="decimal"
        value={awardAmount} onChange={(event) => { setAwardAmount(event.target.value); setValidationMessage(''); }} /></label>
      <label>{reduction ? 'Parent explanation (required)' : 'Parent comment (optional)'}
        <input maxLength={240} value={parentComment} placeholder={reduction ? 'Why was the reward reduced?' : 'Optional note for this decision'}
          onChange={(event) => { setParentComment(event.target.value); setValidationMessage(''); }} /></label>
      {validationMessage && <p className="detail-validation" role="alert">{validationMessage}</p>}
      <div className="review-decision-actions">
        <button className="reject" disabled={busy} onClick={() => void decide('reject')}>Reject · $0</button>
        <button className="approve primary" disabled={busy} onClick={() => void decide('approve')}>Approve · {enteredCents !== null ? money(enteredCents) : '—'}</button>
      </div>
    </div>}
  </section>;

  return <div className="centered-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {content}
  </div>;
}
