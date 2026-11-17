import { useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, statusLabel } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { formatDate } from '../../utils/format';
import { AdminHeader, ListBody, StatusFilter, useAdminList } from './AdminLayout';

const FILTERS = [
  ['all', 'All'],
  ['new', 'New'],
  ['reviewed', 'Reviewed'],
  ['resolved', 'Resolved'],
];

function Stars({ rating }) {
  if (!rating) return <span className="text-[13px] text-muted">No rating</span>;
  return (
    <span className="flex items-center gap-0.5 text-saffron" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={15} filled={s <= rating} strokeWidth={1.4} className={s <= rating ? '' : 'text-[var(--line-strong)]'} />)}
    </span>
  );
}

export default function AdminFeedback() {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const list = useAdminList('/admin/feedback', { status });

  const mark = async (f, next) => {
    const prev = f.feedback_status;
    list.patchRow('feedback_id', f.feedback_id, { feedback_status: next });
    try {
      await api.patch(`/admin/feedback/${f.feedback_id}`, { status: next });
      toast(`Marked ${statusLabel(next).toLowerCase()}`);
    } catch (err) {
      list.patchRow('feedback_id', f.feedback_id, { feedback_status: prev });
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <AdminHeader title="Feedback" sub="What people say about the platform." />
      <StatusFilter value={status} onChange={setStatus} options={FILTERS} />
      <div className="mt-4">
        <ListBody list={list} empty="No feedback">
          {() => (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.rows.map((f) => (
              <li key={f.feedback_id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{f.subject}</div>
                    <div className="mt-1"><Stars rating={f.rating} /></div>
                  </div>
                  <StatusBadge status={f.feedback_status} />
                </div>
                <p className="mt-3 flex-1 whitespace-pre-line text-[15px]">{f.message}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                  <span className="text-[13px] text-muted">{f.full_name || 'Deleted user'} · {formatDate(f.created_at)}</span>
                  <div className="flex gap-2">
                    {f.feedback_status === 'new' && <button className="btn btn-ghost btn-sm" onClick={() => mark(f, 'reviewed')}>Mark reviewed</button>}
                    {f.feedback_status !== 'resolved' && <button className="btn btn-primary btn-sm" onClick={() => mark(f, 'resolved')}>Resolve</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          )}
        </ListBody>
      </div>
    </>
  );
}
