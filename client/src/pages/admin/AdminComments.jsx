import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, statusLabel } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { timeAgo } from '../../utils/format';
import { AdminHeader, ListBody, StatusFilter, useAdminList } from './AdminLayout';

const FILTERS = [
  ['all', 'All'],
  ['visible', 'Visible'],
  ['hidden', 'Hidden'],
  ['removed', 'Removed'],
];

// Visible / hidden / removed is a three-way switch, not a destructive delete: always reversible.
export function CommentStateSwitch({ value, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-md border border-[var(--line-strong)] p-0.5" role="radiogroup" aria-label="Comment visibility">
      {['visible', 'hidden', 'removed'].map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={value === s}
          disabled={disabled}
          onClick={() => value !== s && onChange(s)}
          className="h-7 rounded px-2.5 text-[13px] font-medium transition-colors"
          style={value === s ? { background: s === 'visible' ? 'var(--teal)' : s === 'hidden' ? 'var(--amber)' : 'var(--danger)', color: '#fff' } : { color: 'var(--muted)' }}
        >
          {statusLabel(s)}
        </button>
      ))}
    </div>
  );
}

export default function AdminComments() {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const list = useAdminList('/admin/comments', { status });

  const setState = async (c, next) => {
    const prev = c.comment_status;
    list.patchRow('comment_id', c.comment_id, { comment_status: next });
    try {
      await api.patch(`/admin/comments/${c.comment_id}`, { status: next });
      toast(`Comment ${statusLabel(next).toLowerCase()}`);
    } catch (err) {
      list.patchRow('comment_id', c.comment_id, { comment_status: prev });
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <AdminHeader title="Comments" sub="Hide is reversible and quiet; Removed leaves a “removed by moderator” placeholder." />
      <StatusFilter value={status} onChange={setStatus} options={FILTERS} />
      <div className="mt-4">
        <ListBody list={list} empty="No comments">
          {() => (
          <ul className="card divide-y divide-[var(--line)]">
            {list.rows.map((c) => (
              <li key={c.comment_id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
                    <span className="font-semibold">{c.full_name}</span>
                    <span className="text-muted">on</span>
                    <Link to={`/petitions/${c.petition_id}`} className="truncate font-medium text-[var(--teal)] hover:underline">{c.petition_title}</Link>
                    <span className="text-muted">· {timeAgo(c.created_at)}</span>
                    {c.pending_reports > 0 && (
                      <span className="badge" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{c.pending_reports} report{c.pending_reports > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <p className={`mt-1.5 whitespace-pre-line break-words text-[15px] ${c.comment_status !== 'visible' ? 'text-muted line-through decoration-[var(--line-strong)]' : ''}`}>{c.comment_text}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="md:hidden"><StatusBadge status={c.comment_status} /></span>
                  <CommentStateSwitch value={c.comment_status} onChange={(s) => setState(c, s)} />
                </div>
              </li>
            ))}
          </ul>
          )}
        </ListBody>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted"><Icon name="eye" size={14} /> Only visible comments appear on petitions.</p>
    </>
  );
}
