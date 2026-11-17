// Dates from the API are 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS' strings (dateStrings: true).
const parse = (s) => (s ? new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(' ', 'T')) : null);

export function daysLeft(endDate) {
  if (!endDate) return null;
  const end = parse(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

export function daysLeftLabel(endDate) {
  const d = daysLeft(endDate);
  if (d === null) return 'No end date';
  if (d < 0) return 'Ended';
  if (d === 0) return 'Last day';
  return `${d} day${d === 1 ? '' : 's'} left`;
}

export function formatDate(s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = parse(s);
  return d ? d.toLocaleDateString('en-IN', opts) : '';
}

export function timeAgo(s) {
  const d = parse(s);
  if (!d) return '';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} d ago`;
  return formatDate(s);
}

export const pct = (v) => `${Number(v || 0).toFixed(2)}%`;
export const n = (v) => Number(v || 0).toLocaleString('en-IN');

export const isSignable = (p) =>
  ['published', 'approved'].includes(p.status) && (daysLeft(p.end_date) === null || daysLeft(p.end_date) >= 0);

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const todayPlus = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// One spring for the whole app: critically damped, no overshoot.
export const spring = { type: 'spring', bounce: 0, duration: 0.4 };
// Only for things the user threw or that land with momentum.
export const springBouncy = { type: 'spring', bounce: 0.2, duration: 0.45 };
