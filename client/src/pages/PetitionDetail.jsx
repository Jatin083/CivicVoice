import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Comments from '../components/Comments';
import ReportDialog from '../components/ReportDialog';
import StatusDialog from '../components/StatusDialog';
import { Icon } from '../components/Icon';
import { Avatar, ErrorState, PageLoader, ProgressBar, StatusBadge, statusLabel } from '../components/ui';
import { daysLeft, daysLeftLabel, formatDate, isSignable, n, pct, spring, springBouncy } from '../utils/format';

// Counts up from the current on-screen value, never jumps.
function AnimatedNumber({ value }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('en-IN'));
  useEffect(() => {
    const c = animate(mv, value, spring);
    return c.stop;
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

function SignButton({ p, onSigned }) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  if (p.signedByMe) {
    return (
      <motion.div
        key="signed"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springBouncy}
        className="btn w-full !cursor-default"
        style={{ background: 'var(--success-soft)', color: 'var(--success)', borderColor: 'rgba(46,158,91,0.3)' }}
        role="status"
      >
        <Icon name="check" size={18} strokeWidth={2.2} /> Signed
      </motion.div>
    );
  }

  if (!isSignable(p)) {
    const d = daysLeft(p.end_date);
    const reason = d !== null && d < 0 && ['published', 'approved'].includes(p.status) ? 'This petition has ended' : `Signing is closed (${statusLabel(p.status).toLowerCase()})`;
    return (
      <button className="btn btn-ghost w-full" disabled>
        {reason}
      </button>
    );
  }

  if (!user) {
    return (
      <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="btn btn-hot w-full">
        Log in to sign
      </Link>
    );
  }

  const sign = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/petitions/${p.petition_id}/sign`);
      onSigned(r.data);
      navigator.vibrate?.(12);
      toast('Signature added. Thank you!');
    } catch (err) {
      if (err.code === '45409') onSigned({ signedByMe: true });
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="btn btn-hot w-full !min-h-[50px] text-[16px]" onClick={sign} disabled={busy} aria-busy={busy}>
      {busy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(43,20,0,0.25)] border-t-[var(--saffron-ink)]" /> Signing…
        </>
      ) : (
        <>
          <Icon name="pen" size={18} /> Sign this petition
        </>
      )}
    </button>
  );
}

export default function PetitionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .get(`/petitions/${id}`)
      .then((r) => setP(r.data))
      .catch((e) => setError(e));
  }, [id]);

  // reload when the viewer changes (login/logout) so signedByMe / canEdit are right
  useEffect(load, [load, user?.id]);

  const onSigned = (data) => setP((prev) => ({ ...prev, ...data }));

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied');
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  if (error) {
    return (
      <div className="wrap py-16">
        {error.status === 404 ? (
          <div className="mx-auto max-w-md text-center">
            <h1 className="h2">Petition not found</h1>
            <p className="mt-2 text-muted">It may have been removed, or it is not public yet.</p>
            <Link to="/" className="btn btn-primary mt-6">Browse petitions</Link>
          </div>
        ) : (
          <ErrorState message={error.message} onRetry={load} />
        )}
      </div>
    );
  }
  if (!p) return <PageLoader />;

  const left = daysLeft(p.end_date);
  const reached = p.progress_percentage >= 100;
  const canComment = ['published', 'under_review', 'approved', 'closed'].includes(p.status);
  const transitions = p.allowedTransitions || [];
  const isOwner = user && user.id === p.creator_id;

  return (
    <article>
      {/* Header on the deep band, fading into the page */}
      <header className="hero">
        <div className="wrap pb-20 pt-8 sm:pb-24 sm:pt-10">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="inline-flex items-center gap-1.5 text-[14px] text-[var(--deep-muted)] hover:text-white">
            <Icon name="back" size={16} /> Back
          </button>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="eyebrow !text-[var(--accent-deep)]">{p.category_name}</span>
            <span className="text-[var(--deep-muted)]">·</span>
            <span className="badge" style={{ background: 'rgba(238,246,244,0.1)', color: 'var(--deep-ink)' }}>{statusLabel(p.status)}</span>
          </div>
          <h1 className="h2 mt-4 max-w-4xl !text-[clamp(30px,2.4vw+20px,54px)]">{p.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14.5px] text-[var(--deep-muted)]">
            <span className="flex items-center gap-2"><Avatar name={p.creator_name} size={26} /> Started by <strong className="font-semibold text-[var(--deep-ink)]">{p.creator_name}</strong></span>
            {p.location && <span className="flex items-center gap-1.5"><Icon name="pin" size={16} /> {p.location}</span>}
            <span className="flex items-center gap-1.5"><Icon name="clock" size={16} /> {formatDate(p.created_at)}</span>
          </div>
        </div>
      </header>

      <div className="wrap relative z-10 -mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        {/* Right column first on phones: the count and the Sign button matter most */}
        <aside className="lg:order-2">
          <div className="card p-5 sm:p-6 lg:sticky lg:top-[calc(var(--nav-h)+20px)]">
            <div className="flex items-baseline gap-2">
              <span className="num text-[44px] font-medium leading-none tracking-[-0.04em]"><AnimatedNumber value={p.total_signatures} /></span>
              <span className="text-[15px] text-muted">signatures</span>
            </div>
            <div className="mt-4"><ProgressBar value={p.progress_percentage} size="lg" /></div>
            <div className="mt-2.5 flex justify-between text-[14px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={reached ? 'r' : 'p'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`num font-medium ${reached ? 'text-success' : ''}`}>
                  {reached ? 'Goal reached 🎉' : `${pct(p.progress_percentage)} of goal`}
                </motion.span>
              </AnimatePresence>
              <span className="num text-muted">Target {n(p.target_signatures)}</span>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-[14px]">
              <div>
                <dt className="eyebrow">Status</dt>
                <dd className="mt-1.5"><StatusBadge status={p.status} /></dd>
              </div>
              <div>
                <dt className="eyebrow">Time left</dt>
                <dd className={`num mt-1.5 font-medium ${left !== null && left >= 0 && left <= 7 ? 'text-[var(--hot-text)]' : ''}`}>{daysLeftLabel(p.end_date)}</dd>
              </div>
            </dl>

            <div className="mt-5"><SignButton p={p} onSigned={onSigned} /></div>
            {!p.signedByMe && isSignable(p) && <p className="hint mt-2.5 text-center">One signature per person. It can’t be withdrawn.</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn btn-ghost btn-sm" onClick={share}><Icon name="share" size={16} /> Share</button>
              {user && !isOwner ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setReportOpen(true)}><Icon name="flag" size={16} /> Report</button>
              ) : (
                <span />
              )}
            </div>

            {(p.canEdit || transitions.length > 0) && (
              <div className="mt-5 rounded-md border border-dashed border-[var(--line-strong)] p-3.5">
                <div className="eyebrow mb-2.5">{isOwner ? 'Your petition' : 'Moderation'}</div>
                <div className="flex flex-wrap gap-2">
                  {p.canEdit && <Link to={`/petitions/${p.petition_id}/edit`} className="btn btn-ghost btn-sm"><Icon name="pen" size={15} /> Edit</Link>}
                  {transitions.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setStatusOpen(true)}>Change status</button>}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 lg:order-1">
          <div className="card p-6 sm:p-8">
            {p.admin_note && (
              <div className="mb-7 flex gap-3 rounded-md p-4" style={{ background: 'var(--plum-soft)' }}>
                <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-plum" />
                <div>
                  <div className="text-[14px] font-semibold text-plum">Note from the moderators</div>
                  <p className="mt-0.5 text-[15px]">{p.admin_note}</p>
                </div>
              </div>
            )}
            <Section title="About this petition" text={p.description} />
            {p.problem_statement && <Section title="The problem" text={p.problem_statement} />}
            {p.proposed_solution && <Section title="Proposed solution" text={p.proposed_solution} />}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-[var(--line)] pt-5 text-[14px] text-muted">
              <span>Created {formatDate(p.created_at)}</span>
              {p.end_date && <span>Closes {formatDate(p.end_date)}</span>}
              {p.updated_at && p.updated_at !== p.created_at && <span>Updated {formatDate(p.updated_at)}</span>}
            </div>
          </div>

          {canComment && <Comments petitionId={p.petition_id} canComment={p.status !== 'rejected'} />}
        </div>
      </div>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} target={{ petitionId: p.petition_id }} />
      <StatusDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        petition={p}
        allowed={transitions}
        isAdmin={user?.role === 'admin'}
        onDone={() => {
          setStatusOpen(false);
          load();
        }}
      />
    </article>
  );
}

function Section({ title, text }) {
  return (
    <section className="mt-7 first:mt-0">
      <h2 className="eyebrow mb-2">{title}</h2>
      <p className="whitespace-pre-line text-[17px] leading-[1.65]">{text}</p>
    </section>
  );
}
