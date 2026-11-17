import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/client';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorState, Pagination } from '../../components/ui';
import { spring } from '../../utils/format';

const LINKS = [
  { to: '/admin', label: 'Overview', icon: 'grid', end: true },
  { to: '/admin/petitions', label: 'Petitions', icon: 'doc' },
  { to: '/admin/comments', label: 'Comments', icon: 'chat' },
  { to: '/admin/reports', label: 'Reports', icon: 'flag' },
  { to: '/admin/feedback', label: 'Feedback', icon: 'star' },
  { to: '/admin/users', label: 'Users', icon: 'users' },
];

export default function AdminLayout() {
  return (
    <div className="wrap grid grid-cols-[minmax(0,1fr)] gap-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-12">
      <aside>
        <div className="mb-4 hidden items-center gap-2 lg:flex">
          <span className="grid h-8 w-8 place-items-center rounded-md" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}><Icon name="shield" size={17} /></span>
          <span className="font-semibold">Moderation</span>
        </div>
        <nav className="-mx-[var(--gutter)] flex gap-1 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] lg:mx-0 lg:flex-col lg:px-0" aria-label="Admin">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="relative flex h-10 shrink-0 items-center gap-2.5 rounded-md px-3 text-[15px] font-medium">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="admin-nav" transition={spring} className="absolute inset-0 rounded-md" style={{ background: 'var(--plum-soft)' }} />}
                  <Icon name={l.icon} size={17} className={`relative ${isActive ? 'text-plum' : 'text-muted'}`} />
                  <span className={`relative ${isActive ? 'text-ink' : 'text-muted'}`}>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}

export function AdminHeader({ title, sub, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="h2">{title}</h1>
        {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

// Segmented status filter used by every admin list.
export function StatusFilter({ value, onChange, options }) {
  return (
    <div className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Filter by status">
      {options.map(([v, label]) => (
        <button key={v} className="chip" aria-pressed={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Loads a paginated admin list; reload() after an action.
export function useAdminList(path, params) {
  const [state, setState] = useState({ rows: null, meta: null, error: '' });
  const [page, setPage] = useState(1);
  const key = JSON.stringify(params);

  useEffect(() => setPage(1), [key]);

  const reload = useCallback(() => {
    api
      .get(path, { params: { ...JSON.parse(key), page, limit: 20 } })
      .then((r) => setState({ rows: r.data, meta: r.meta, error: '' }))
      .catch((e) => setState((s) => ({ ...s, error: e.message })));
  }, [path, key, page]);

  useEffect(reload, [reload]);

  // Update one row in place so the table doesn't flash while the server confirms.
  const patchRow = (idKey, id, patch) =>
    setState((s) => ({ ...s, rows: s.rows.map((r) => (r[idKey] === id ? { ...r, ...patch } : r)) }));

  return { ...state, page, setPage, reload, patchRow };
}

// children is a render function so rows are only read once they exist.
export function ListBody({ list, empty, children }) {
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (!list.rows) return <div className="grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}</div>;
  if (!list.rows.length) return <EmptyState title={empty}>Nothing here right now.</EmptyState>;
  return (
    <>
      {children()}
      <Pagination page={list.page} limit={list.meta.limit} total={list.meta.total} onChange={list.setPage} />
    </>
  );
}
