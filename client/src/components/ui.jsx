// Small shared pieces: StatusBadge, ProgressBar, StatCard, EmptyState, ErrorState,
// Pagination, Field, Avatar, Skeleton cards.
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { initials, pct, spring } from '../utils/format';

const STATUS = {
  published: { label: 'Open', color: 'var(--teal)', bg: 'var(--teal-soft)' },
  under_review: { label: 'Under review', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  approved: { label: 'Approved', color: 'var(--success)', bg: 'var(--success-soft)' },
  rejected: { label: 'Rejected', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  closed: { label: 'Closed', color: '#5f6b6e', bg: 'rgba(95,107,110,0.12)' },
  draft: { label: 'Draft', color: '#475569', bg: 'rgba(71,85,105,0.12)' },
  // comments / reports / feedback / users
  visible: { label: 'Visible', color: 'var(--teal)', bg: 'var(--teal-soft)' },
  hidden: { label: 'Hidden', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  removed: { label: 'Removed', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  pending: { label: 'Pending', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  reviewed: { label: 'Reviewed', color: 'var(--teal)', bg: 'var(--teal-soft)' },
  dismissed: { label: 'Dismissed', color: '#5f6b6e', bg: 'rgba(95,107,110,0.12)' },
  action_taken: { label: 'Action taken', color: 'var(--success)', bg: 'var(--success-soft)' },
  new: { label: 'New', color: 'var(--plum)', bg: 'var(--plum-soft)' },
  resolved: { label: 'Resolved', color: 'var(--success)', bg: 'var(--success-soft)' },
  active: { label: 'Active', color: 'var(--success)', bg: 'var(--success-soft)' },
  suspended: { label: 'Suspended', color: 'var(--danger)', bg: 'var(--danger-soft)' },
};

export const statusLabel = (s) => STATUS[s]?.label || s;

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, color: 'var(--muted)', bg: 'var(--surface)' };
  return (
    <span className="badge" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

// Width springs to the new value (from wherever it is now), clamps at 100%.
export function ProgressBar({ value, size = 'md', onDeep = false }) {
  const v = Number(value || 0);
  const done = v >= 100;
  const h = size === 'lg' ? 10 : 6;
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height: h, background: onDeep ? 'rgba(238,246,244,0.12)' : 'var(--surface)' }}
      role="progressbar"
      aria-valuenow={Math.min(100, v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${pct(v)} of target`}
    >
      <motion.div
        className="h-full rounded-full"
        initial={false}
        animate={{ width: `${Math.max(Math.min(100, v), v > 0 ? 1.5 : 0)}%` }}
        transition={spring}
        style={{ background: done ? 'var(--success)' : 'linear-gradient(90deg, var(--teal), var(--teal-2))' }}
      />
    </div>
  );
}

export function StatCard({ label, value, icon, tone = 'teal', hint }) {
  const tones = {
    teal: ['var(--teal)', 'var(--teal-soft)'],
    plum: ['var(--plum)', 'var(--plum-soft)'],
    saffron: ['var(--hot-text)', 'var(--hot-soft)'],
    amber: ['var(--amber)', 'var(--amber-soft)'],
  };
  const [c, bg] = tones[tone] || tones.teal;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {icon && (
          <span className="grid h-8 w-8 place-items-center rounded-md" style={{ color: c, background: bg }}>
            <Icon name={icon} size={17} />
          </span>
        )}
      </div>
      <div className="num mt-3 text-[34px] font-medium leading-none tracking-[-0.03em]">{value}</div>
      {hint && <div className="hint mt-2">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: 'var(--mint)', color: 'var(--teal)' }}>
        <Icon name={icon} size={22} />
      </span>
      <h3 className="h3 mt-4">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-[15px] text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center" role="alert">
      <span className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
        <Icon name="alert" size={22} />
      </span>
      <h3 className="h3 mt-4">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-[15px] text-muted">{message}</p>
      {onRetry && (
        <button className="btn btn-ghost mt-5" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Try again
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, limit, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button className="btn btn-quiet btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronL" size={16} />
      </button>
      {nums.map((x, i) =>
        x === '…' ? (
          <span key={`e${i}`} className="px-2 text-muted">…</span>
        ) : (
          <button
            key={x}
            className={`btn btn-sm num min-w-[36px] ${x === page ? 'btn-primary' : 'btn-quiet'}`}
            aria-current={x === page ? 'page' : undefined}
            onClick={() => onChange(x)}
          >
            {x}
          </button>
        )
      )}
      <button className="btn btn-quiet btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <Icon name="chevronR" size={16} />
      </button>
    </nav>
  );
}

export function Field({ label, error, hint, htmlFor, children, counter }) {
  return (
    <div>
      {label && (
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor={htmlFor}>
            {label}
          </label>
          {counter}
        </div>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint mt-1.5">{hint}</p> : null}
    </div>
  );
}

export function Avatar({ name, size = 32 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38, background: 'var(--mint)', color: 'var(--deep)' }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-5 w-24" />
      <div className="skeleton mt-4 h-6 w-4/5" />
      <div className="skeleton mt-2 h-4 w-full" />
      <div className="skeleton mt-1.5 h-4 w-2/3" />
      <div className="skeleton mt-6 h-1.5 w-full" />
      <div className="skeleton mt-3 h-4 w-1/2" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid flex-1 place-items-center py-24" aria-busy="true" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--teal)]" />
    </div>
  );
}

// Collects 422 field errors into { field: message }.
export const fieldErrors = (err) => Object.fromEntries((err?.fields || []).map((f) => [f.field, f.message]));
