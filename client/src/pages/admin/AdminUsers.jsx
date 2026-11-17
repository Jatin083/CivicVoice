import { useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Dialog from '../../components/Dialog';
import { Avatar, StatusBadge } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { formatDate } from '../../utils/format';
import { AdminHeader, ListBody, StatusFilter, useAdminList } from './AdminLayout';

const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['suspended', 'Suspended'],
];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = useAdminList('/admin/users', { status, q: search || undefined });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const apply = async (u, next) => {
    setBusy(true);
    try {
      await api.patch(`/admin/users/${u.user_id}`, { accountStatus: next });
      list.patchRow('user_id', u.user_id, { account_status: next });
      toast(next === 'suspended' ? `${u.full_name} suspended` : `${u.full_name} reactivated`);
      setConfirm(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminHeader title="Users" sub="Suspension takes effect immediately, even for people already logged in.">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} className="relative" role="search">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !min-h-[40px] w-64 !py-2 pl-9" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        </form>
      </AdminHeader>
      <StatusFilter value={status} onChange={setStatus} options={FILTERS} />
      <div className="mt-4">
        <ListBody list={list} empty="No users found">
          {() => (
          <div className="card overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Activity</th><th>Joined</th><th className="text-right">Action</th></tr>
              </thead>
              <tbody>
                {list.rows.map((u) => (
                  <tr key={u.user_id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} size={32} />
                        <div className="min-w-0">
                          <div className="font-medium">{u.full_name} {u.user_id === me.id && <span className="text-[13px] text-muted">(you)</span>}</div>
                          <div className="truncate text-[13px] text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.role === 'admin' ? <span className="badge" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>Admin</span> : <span className="text-[14px] text-muted">User</span>}</td>
                    <td><StatusBadge status={u.account_status} /></td>
                    <td className="num whitespace-nowrap text-[13.5px] text-muted">{u.petitions_created} created · {u.petitions_signed} signed · {u.comments_posted} comments</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(u.created_at)}</td>
                    <td className="text-right">
                      {u.user_id === me.id ? (
                        <span className="text-[13px] text-muted">–</span>
                      ) : u.account_status === 'active' ? (
                        <button className="btn btn-ghost btn-sm !text-danger" onClick={() => setConfirm(u)}>Suspend</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => apply(u, 'active')}>Reactivate</button>
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

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Suspend this account?"
        width={440}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" disabled={busy} onClick={() => apply(confirm, 'suspended')}>{busy ? 'Suspending…' : 'Suspend'}</button>
          </>
        }
      >
        {confirm && (
          <p className="text-[15px] text-muted">
            <strong className="text-ink">{confirm.full_name}</strong> will be logged out and won’t be able to sign, comment or create petitions. Their existing signatures stay. You can reactivate them at any time.
          </p>
        )}
      </Dialog>
    </>
  );
}
