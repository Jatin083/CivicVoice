import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/client';
import { ErrorState, PageLoader, ProgressBar, StatCard, StatusBadge, statusLabel } from '../../components/ui';
import { Icon } from '../../components/Icon';
import StatusDialog from '../../components/StatusDialog';
import { ALLOWED } from './transitions';
import { n, pct, spring, timeAgo } from '../../utils/format';
import { AdminHeader } from './AdminLayout';

const ORDER = ['draft', 'published', 'under_review', 'approved', 'rejected', 'closed'];
const COLORS = {
  draft: '#94a3b8',
  published: 'var(--teal)',
  under_review: '#d69e2e',
  approved: 'var(--success)',
  rejected: 'var(--danger)',
  closed: '#7a8a8e',
};

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null);

  const load = useCallback(() => {
    setError('');
    api.get('/admin/stats').then((r) => setData(r.data)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;

  const { totals, byStatus, topPetitions, needsAction } = data;
  const totalPetitions = ORDER.reduce((s, k) => s + (byStatus[k] || 0), 0) || 1;

  return (
    <>
      <AdminHeader title="Overview" sub="Platform health at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={n(totals.users)} icon="users" />
        <StatCard label="Petitions" value={n(totals.petitions)} icon="doc" tone="plum" />
        <StatCard label="Signatures" value={n(totals.signatures)} icon="pen" tone="saffron" />
        <StatCard label="Comments" value={n(totals.comments)} icon="chat" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/reports" className="card card-link flex items-center justify-between p-4">
          <span className="flex items-center gap-2.5 font-medium"><Icon name="flag" size={18} className="text-danger" /> Pending reports</span>
          <span className="num rounded px-2 py-0.5 text-[15px] font-semibold" style={{ background: totals.pendingReports ? 'var(--danger-soft)' : 'var(--surface)', color: totals.pendingReports ? 'var(--danger)' : 'var(--muted)' }}>{totals.pendingReports}</span>
        </Link>
        <Link to="/admin/feedback" className="card card-link flex items-center justify-between p-4">
          <span className="flex items-center gap-2.5 font-medium"><Icon name="inbox" size={18} className="text-plum" /> New feedback</span>
          <span className="num rounded px-2 py-0.5 text-[15px] font-semibold" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>{totals.newFeedback}</span>
        </Link>
        <div className="card flex items-center justify-between p-4">
          <span className="flex items-center gap-2.5 font-medium"><Icon name="star" size={18} className="text-saffron" filled /> Average rating</span>
          <span className="num text-[18px] font-semibold">{totals.avgRating ?? '–'}<span className="text-[14px] font-normal text-muted"> / 5</span></span>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="h3">Petitions by status</h2>
          <span className="num text-[14px] text-muted">{totals.petitions} total</span>
        </div>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface)]">
          {ORDER.filter((k) => byStatus[k]).map((k, i) => (
            <motion.div
              key={k}
              initial={{ width: 0 }}
              animate={{ width: `${(byStatus[k] / totalPetitions) * 100}%` }}
              transition={{ ...spring, delay: i * 0.04 }}
              style={{ background: COLORS[k] }}
              className="h-full border-r-2 border-[var(--card)] last:border-r-0"
              title={`${statusLabel(k)}: ${byStatus[k]}`}
            />
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          {ORDER.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[k] }} />
              <span className="text-muted">{statusLabel(k)}</span>
              <span className="num font-semibold">{byStatus[k] || 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-baseline justify-between px-5 pb-2 pt-5">
            <h2 className="h3">Needs action</h2>
            <Link to="/admin/petitions" className="text-[14px] font-medium text-[var(--teal)] hover:underline">All petitions</Link>
          </div>
          {needsAction.length === 0 ? (
            <p className="px-5 pb-6 pt-2 text-[15px] text-muted">Nothing waiting. 🎉</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {needsAction.map((p) => (
                <li key={p.petition_id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link to={`/petitions/${p.petition_id}`} className="block truncate font-medium hover:underline">{p.title}</Link>
                    <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
                      <StatusBadge status={p.status} /> {p.creator_name} · {timeAgo(p.created_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {p.status === 'under_review' ? (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => setActing(p)}>Approve</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setActing(p)}>Reject</button>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setActing(p)}>Review</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="h3 px-5 pb-2 pt-5">Top petitions</h2>
          <ol className="divide-y divide-[var(--line)]">
            {topPetitions.map((p, i) => (
              <li key={p.petition_id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="num mono w-5 text-[13px] text-muted">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/petitions/${p.petition_id}`} className="block truncate font-medium hover:underline">{p.title}</Link>
                  <div className="mt-2"><ProgressBar value={p.progress_percentage} /></div>
                </div>
                <div className="num w-20 text-right text-[14px]">
                  <div className="font-semibold">{n(p.total_signatures)}</div>
                  <div className="text-[12.5px] text-muted">{pct(p.progress_percentage)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <StatusDialog
        open={Boolean(acting)}
        onClose={() => setActing(null)}
        petition={acting}
        allowed={acting ? ALLOWED[acting.status] : []}
        isAdmin
        onDone={() => {
          setActing(null);
          load();
        }}
      />
    </>
  );
}
