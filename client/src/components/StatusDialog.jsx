import { useEffect, useState } from 'react';
import Dialog from './Dialog';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge, statusLabel } from './ui';
import { Icon } from './Icon';

const VERB = {
  published: 'Publish',
  under_review: 'Move to review',
  approved: 'Approve',
  rejected: 'Reject',
  closed: 'Close',
};
const HELP = {
  published: 'Visible to everyone and open for signatures.',
  under_review: 'Stops new signatures while moderators look at it.',
  approved: 'Forwarded for action. Signing re-opens until the end date.',
  rejected: 'Hidden from the public. This is final.',
  closed: 'No more signatures or edits. This is final.',
};

// Pick the next state from the allowed transitions (Section 5.1), with an optional note for admins.
export default function StatusDialog({ open, onClose, petition, allowed, isAdmin, onDone }) {
  const toast = useToast();
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNext(allowed[0] || '');
      setNote(petition?.admin_note || '');
      setError('');
    }
  }, [open, allowed, petition]);

  if (!petition) return null;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/petitions/${petition.petition_id}/status`, { status: next, ...(isAdmin ? { adminNote: note.trim() || null } : {}) });
      toast(`Petition ${statusLabel(next).toLowerCase()}`);
      onDone?.(next);
    } catch (err) {
      setError(err.allowed ? `${err.message}. Allowed: ${err.allowed.map(statusLabel).join(', ') || 'none'}` : err.message);
    } finally {
      setBusy(false);
    }
  };

  const final = next === 'rejected' || next === 'closed';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change status"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${next === 'rejected' ? 'btn-danger' : next === 'approved' ? 'btn-success' : 'btn-primary'}`} onClick={submit} disabled={busy || !next}>
            {busy ? 'Saving…' : VERB[next] || 'Save'}
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2 text-[15px]">
        <span className="text-muted">Now</span> <StatusBadge status={petition.status} />
        <Icon name="arrow" size={16} className="text-muted" />
        {next && <StatusBadge status={next} />}
      </div>
      <div className="grid gap-2" role="radiogroup" aria-label="Next status">
        {allowed.map((s) => (
          <label
            key={s}
            className="flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 transition-colors"
            style={{ borderColor: next === s ? 'var(--teal)' : 'var(--line-strong)', background: next === s ? 'var(--teal-soft)' : 'var(--card)' }}
          >
            <input type="radio" name="next" className="mt-1 accent-[var(--teal)]" checked={next === s} onChange={() => setNext(s)} />
            <span>
              <span className="block font-semibold">{VERB[s]}</span>
              <span className="block text-[14px] text-muted">{HELP[s]}</span>
            </span>
          </label>
        ))}
      </div>
      {isAdmin && (
        <>
          <label className="label mt-5" htmlFor="admin-note">Note to the creator <span className="font-normal text-muted">(shown on the petition)</span></label>
          <textarea id="admin-note" className="input !min-h-[90px]" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Forwarded to the transport department." />
        </>
      )}
      {final && <p className="mt-3 flex items-center gap-2 text-[14px] text-[var(--hot-text)]"><Icon name="alert" size={16} /> This can’t be undone.</p>}
      {error && <p className="field-error">{error}</p>}
    </Dialog>
  );
}
