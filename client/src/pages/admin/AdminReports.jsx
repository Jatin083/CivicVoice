import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Dialog from '../../components/Dialog';
import { StatusBadge, statusLabel } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { timeAgo } from '../../utils/format';
import { AdminHeader, ListBody, StatusFilter, useAdminList } from './AdminLayout';
import { CommentStateSwitch } from './AdminComments';

const FILTERS = [
  ['pending', 'Pending'],
  ['reviewed', 'Reviewed'],
  ['action_taken', 'Action taken'],
  ['dismissed', 'Dismissed'],
  ['all', 'All'],
];
const OUTCOMES = [
  ['action_taken', 'Action taken', 'You hid or removed the content, or changed the petition.'],
  ['reviewed', 'Reviewed', 'Looked at it; no change needed for now.'],
  ['dismissed', 'Dismissed', 'The report was not valid.'],
];

function ResolveDialog({ report, onClose, onDone }) {
  const toast = useToast();
  const [status, setStatus] = useState('action_taken');
  const [note, setNote] = useState('');
  const [commentState, setCommentState] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (report) {
      setStatus('action_taken');
      setNote(report.admin_note || '');
      setCommentState(report.comment_status || null);
    }
  }, [report]);

  const changeComment = async (s) => {
    const prev = commentState;
    setCommentState(s);
    try {
      await api.patch(`/admin/comments/${report.comment_id}`, { status: s });
      toast(`Comment ${statusLabel(s).toLowerCase()}`);
    } catch (err) {
      setCommentState(prev);
      toast(err.message, 'error');
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/reports/${report.report_id}`, { status, adminNote: note.trim() || null });
      toast(`Report marked ${statusLabel(status).toLowerCase()}`);
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(report)}
      onClose={onClose}
      title="Resolve report"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Resolve'}</button>
        </>
      }
    >
      {report && (
        <>
          <div className="rounded-md bg-[var(--surface)] p-4 text-[14.5px]">
            <div className="font-semibold">{report.reason}</div>
            {report.details && <p className="mt-1 text-muted">“{report.details}”</p>}
            <div className="mt-2 text-[13px] text-muted">Reported by {report.reporter_name} · {timeAgo(report.created_at)}</div>
          </div>
          {report.comment_id && (
            <div className="mt-4">
              <span className="label">The comment</span>
              <p className="rounded-md border border-[var(--line)] p-3 text-[15px]">
                <span className="font-semibold">{report.comment_author}:</span> {report.comment_text}
              </p>
              <div className="mt-2.5 flex items-center gap-3 text-[14px]">
                <span className="text-muted">Visibility</span>
                <CommentStateSwitch value={commentState} onChange={changeComment} />
              </div>
            </div>
          )}
          <fieldset className="mt-5 grid gap-2">
            <legend className="label">Outcome</legend>
            {OUTCOMES.map(([v, label, help]) => (
              <label key={v} className="flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3" style={{ borderColor: status === v ? 'var(--teal)' : 'var(--line-strong)', background: status === v ? 'var(--teal-soft)' : 'var(--card)' }}>
                <input type="radio" className="mt-1 accent-[var(--teal)]" checked={status === v} onChange={() => setStatus(v)} />
                <span><span className="block font-semibold">{label}</span><span className="block text-[14px] text-muted">{help}</span></span>
              </label>
            ))}
          </fieldset>
          <label className="label mt-4" htmlFor="report-note">Note <span className="font-normal text-muted">(internal)</span></label>
          <textarea id="report-note" className="input !min-h-[80px]" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}
    </Dialog>
  );
}

export default function AdminReports() {
  const [status, setStatus] = useState('pending');
  const list = useAdminList('/admin/reports', { status });
  const [open, setOpen] = useState(null);

  return (
    <>
      <AdminHeader title="Reports" sub="Content flagged by the community. Pending first." />
      <StatusFilter value={status} onChange={setStatus} options={FILTERS} />
      <div className="mt-4">
        <ListBody list={list} empty={status === 'pending' ? 'No pending reports' : 'No reports'}>
          {() => (
          <ul className="grid gap-3">
            {list.rows.map((r) => (
              <li key={r.report_id} className="card flex flex-col gap-4 p-5 md:flex-row md:items-start">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                  <Icon name={r.comment_id ? 'chat' : 'doc'} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.reason}</span>
                    <StatusBadge status={r.report_status} />
                    <span className="text-[13px] text-muted">{r.comment_id ? 'Comment' : 'Petition'} · by {r.reporter_name} · {timeAgo(r.created_at)}</span>
                  </div>
                  {r.details && <p className="mt-1 text-[14.5px] text-muted">“{r.details}”</p>}
                  {r.comment_id ? (
                    <p className="mt-2 rounded-md bg-[var(--surface)] px-3 py-2 text-[14.5px]">
                      <span className="font-semibold">{r.comment_author}:</span> {r.comment_text} <span className="ml-1 align-middle"><StatusBadge status={r.comment_status} /></span>
                    </p>
                  ) : null}
                  <Link to={`/petitions/${r.target_petition_id}`} className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-[var(--teal)] hover:underline">
                    {r.petition_title} <Icon name="arrow" size={14} />
                  </Link>
                  {r.admin_note && <div className="mt-2 text-[13.5px] text-plum">Note: {r.admin_note}</div>}
                </div>
                <button className={`btn btn-sm shrink-0 ${r.report_status === 'pending' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setOpen(r)}>
                  {r.report_status === 'pending' ? 'Resolve' : 'Update'}
                </button>
              </li>
            ))}
          </ul>
          )}
        </ListBody>
      </div>
      <ResolveDialog report={open} onClose={() => { setOpen(null); list.reload(); }} onDone={() => { setOpen(null); list.reload(); }} />
    </>
  );
}
