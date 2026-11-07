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
}

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function longDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`));
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
  onDecision: (id: string, action: 'approve' | 'reject', note?: string) => Promise<boolean>;
}) {
  const [stage, setStage] = useState<'details' | 'auth' | 'review'>('details');
  const [pin, setPin] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const dialogRef = useDialogFocus<HTMLElement>(true);

  useEffect(() => {
    setStage('details');
    setPin('');
    setRejectionNote('');
  }, [item.id]);

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
    const completed = await onDecision(item.id, action, action === 'reject' ? rejectionNote : undefined);
    if (completed) onClose();
  }

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
    {item.state === 'rejected' && item.decisionNote && <p className="detail-note"><strong>Parent note</strong>{item.decisionNote}</p>}

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
      <div><strong>Review {item.title}</strong><p>Approval adds {money(item.rewardCents)} to the available allowance balance.</p></div>
      <label>Optional rejection note<input maxLength={240} value={rejectionNote}
        onChange={(event) => setRejectionNote(event.target.value)} /></label>
      <div className="review-decision-actions">
        <button className="reject" disabled={busy} onClick={() => void decide('reject')}>Reject · $0</button>
        <button className="approve primary" disabled={busy} onClick={() => void decide('approve')}>Approve · {money(item.rewardCents)}</button>
      </div>
    </div>}
  </section>;

  return <div className="centered-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {content}
  </div>;
}
