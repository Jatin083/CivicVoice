import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusDialog from '../../components/StatusDialog';
import { StatusBadge } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { formatDate, n, pct } from '../../utils/format';
import { AdminHeader, ListBody, StatusFilter, useAdminList } from './AdminLayout';
import { ALLOWED } from './transitions';

const FILTERS = [
  ['all', 'All'],
  ['published', 'Open'],
  ['under_review', 'Under review'],
  ['approved', 'Approved'],
  ['draft', 'Draft'],
  ['rejected', 'Rejected'],
  ['closed', 'Closed'],
];

export default function AdminPetitions() {
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = useAdminList('/admin/petitions', { status, q: search || undefined });
  const [acting, setActing] = useState(null);

  return (
    <>
      <AdminHeader title="Petitions" sub="Every petition, including drafts and rejected ones.">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} className="relative" role="search">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !min-h-[40px] w-64 !py-2 pl-9" placeholder="Title or creator" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search petitions" />
        </form>
      </AdminHeader>
      <StatusFilter value={status} onChange={setStatus} options={FILTERS} />

      <div className="mt-4">
        <ListBody list={list} empty="No petitions">
          {() => (
          <div className="card overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr><th>Petition</th><th>Status</th><th>Signatures</th><th>Created</th><th className="text-right">Action</th></tr>
              </thead>
              <tbody>
                {list.rows.map((p) => (
                  <tr key={p.petition_id}>
                    <td className="max-w-[340px]">
                      <Link to={`/petitions/${p.petition_id}`} className="font-medium hover:underline">{p.title}</Link>
                      <div className="mt-0.5 text-[13px] text-muted">{p.creator_name} · {p.category_name}</div>
                      {p.admin_note && <div className="mt-1 flex items-start gap-1 text-[13px] text-plum"><Icon name="shield" size={13} className="mt-0.5 shrink-0" />{p.admin_note}</div>}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="num whitespace-nowrap">{n(p.total_signatures)} <span className="text-muted">/ {n(p.target_signatures)}</span><div className="text-[12.5px] text-muted">{pct(p.progress_percentage)}</div></td>
                    <td className="whitespace-nowrap text-muted">{formatDate(p.created_at)}</td>
                    <td className="text-right">
                      {ALLOWED[p.status].length ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => setActing(p)}>Change status</button>
                      ) : (
                        <span className="text-[13px] text-muted">Final</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </ListBody>
      </div>

      <StatusDialog
        open={Boolean(acting)}
        onClose={() => setActing(null)}
        petition={acting}
        allowed={acting ? ALLOWED[acting.status] : []}
        isAdmin
        onDone={() => {
          setActing(null);
          list.reload();
        }}
      />
    </>
  );
}
