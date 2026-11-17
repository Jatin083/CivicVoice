import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EmptyState, ErrorState, PageLoader, ProgressBar, StatCard, StatusBadge } from '../components/ui';
import { Icon } from '../components/Icon';
import { daysLeftLabel, formatDate, n, pct, spring } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('mine');

  const load = useCallback(() => {
    setError('');
    api.get('/users/me/dashboard').then((r) => setData(r.data)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <div className="wrap py-16"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return <PageLoader />;

  const { counts, myPetitions, signed } = data;
  const list = tab === 'mine' ? myPetitions : signed;

  return (
    <div className="wrap py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">My activity</span>
          <h1 className="h2 mt-2">Hi, {user.fullName.split(' ')[0]}</h1>
        </div>
        <Link to="/petitions/new" className="btn btn-hot self-start"><Icon name="plus" size={17} /> Start a petition</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Petitions created" value={counts.petitions_created} icon="doc" />
        <StatCard label="Petitions signed" value={counts.petitions_signed} icon="pen" tone="saffron" />
        <StatCard label="Comments posted" value={counts.comments_posted} icon="chat" tone="plum" />
      </div>

      <div className="mt-10 inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1" role="tablist">
        {[
          ['mine', `My petitions (${myPetitions.length})`],
          ['signed', `Signed (${signed.length})`],
        ].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="relative h-9 rounded-md px-4 text-[14.5px] font-medium">
            {tab === k && <motion.span layoutId="dash-tab" transition={spring} className="absolute inset-0 rounded-md bg-[var(--card)] shadow-[var(--shadow-card)]" />}
            <span className={`relative ${tab === k ? 'text-ink' : 'text-muted'}`}>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {list.length === 0 ? (
          tab === 'mine' ? (
            <EmptyState icon="doc" title="You haven’t started a petition yet" action={<Link to="/petitions/new" className="btn btn-primary">Start your first</Link>}>
              Raise an issue in your area and track the support it gets.
            </EmptyState>
          ) : (
            <EmptyState icon="pen" title="No signatures yet" action={<Link to="/" className="btn btn-primary">Explore petitions</Link>}>
              Petitions you sign will show up here.
            </EmptyState>
          )
        ) : (
          <ul className="card divide-y divide-[var(--line)]">
            {list.map((p) => (
              <li key={p.petition_id}>
                <Link to={`/petitions/${p.petition_id}`} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[rgba(11,60,73,0.025)] sm:grid-cols-[1fr_220px] sm:items-center sm:gap-8">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span className="eyebrow">{p.category_name}</span>
                    </div>
                    <div className="mt-1.5 truncate font-semibold">{p.title}</div>
                    <div className="mt-0.5 text-[13.5px] text-muted">
                      {tab === 'signed' ? `Signed ${formatDate(p.signed_at)}` : `Created ${formatDate(p.created_at)}`} · {daysLeftLabel(p.end_date)}
                    </div>
                    {p.admin_note && tab === 'mine' && (
                      <div className="mt-2 flex items-start gap-1.5 text-[13.5px] text-plum"><Icon name="shield" size={15} className="mt-0.5 shrink-0" /> {p.admin_note}</div>
                    )}
                  </div>
                  <div>
                    <ProgressBar value={p.progress_percentage} />
                    <div className="num mt-1.5 flex justify-between text-[13px] text-muted">
                      <span><strong className="font-semibold text-ink">{n(p.total_signatures)}</strong> / {n(p.target_signatures)}</span>
                      <span>{pct(p.progress_percentage)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
