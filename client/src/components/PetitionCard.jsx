import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { ProgressBar, StatusBadge } from './ui';
import { daysLeftLabel, n, pct } from '../utils/format';

export default function PetitionCard({ p, showStatus = true }) {
  const reached = p.progress_percentage >= 100;
  return (
    <Link to={`/petitions/${p.petition_id}`} className="card card-link group flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow truncate !text-[var(--teal)]">{p.category_name}</span>
        {showStatus && <StatusBadge status={p.status} />}
      </div>
      <h3 className="h3 mt-3 line-clamp-2 group-hover:text-[var(--deep)]">{p.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-[15px] text-muted">{p.description}</p>

      <div className="mt-auto pt-5">
        <ProgressBar value={p.progress_percentage} />
        <div className="mt-2.5 flex items-baseline justify-between gap-2 text-[14px]">
          <span>
            <strong className="num font-semibold">{n(p.total_signatures)}</strong>
            <span className="text-muted"> of {n(p.target_signatures)} signatures</span>
          </span>
          <span className={`num font-medium ${reached ? 'text-success' : 'text-muted'}`}>{reached ? 'Goal reached' : pct(p.progress_percentage)}</span>
        </div>
        <div className="mt-3 flex items-center gap-4 border-t border-[var(--line)] pt-3 text-[13px] text-muted">
          {p.location && (
            <span className="flex min-w-0 items-center gap-1">
              <Icon name="pin" size={14} className="shrink-0" /> <span className="truncate">{p.location}</span>
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Icon name="clock" size={14} /> {daysLeftLabel(p.end_date)}
          </span>
        </div>
      </div>
    </Link>
  );
}
