import { useEffect, useState } from 'react';
import Dialog from './Dialog';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const REASONS = ['Spam', 'Abusive or hateful', 'Misleading', 'Duplicate petition', 'Other'];

// target: { petitionId } or { commentId } — never both.
export default function ReportDialog({ open, onClose, target }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setDetails('');
      setError('');
    }
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!reason) return setError('Choose a reason');
    setBusy(true);
    try {
      await api.post('/reports', { ...target, reason, details: details.trim() || undefined });
      toast('Report sent. A moderator will review it.');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const what = target?.commentId ? 'comment' : 'petition';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Report this ${what}`}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <p className="mb-4 text-[15px] text-muted">Reports are private. Moderators see who sent them but the author does not.</p>
        <fieldset className="grid gap-2">
          <legend className="label">Reason</legend>
          {REASONS.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-[15px] transition-colors"
              style={{
                borderColor: reason === r ? 'var(--teal)' : 'var(--line-strong)',
                background: reason === r ? 'var(--teal-soft)' : 'var(--card)',
              }}
            >
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => { setReason(r); setError(''); }} className="accent-[var(--teal)]" />
              {r}
            </label>
          ))}
        </fieldset>
        <label className="label mt-4" htmlFor="report-details">Details <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="report-details" className="input !min-h-[90px]" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What should the moderator know?" />
        {error && <p className="field-error">{error}</p>}
      </form>
    </Dialog>
  );
}
