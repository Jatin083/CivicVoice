import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, ErrorState } from './ui';
import { Icon } from './Icon';
import ReportDialog from './ReportDialog';
import { spring, timeAgo } from '../utils/format';

const MAX = 1000;

export function CommentForm({ petitionId, onPosted }) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px] text-muted">Log in to join the discussion.</p>
        <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="btn btn-ghost btn-sm">Log in to comment</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return setError('Write something first');
    setBusy(true);
    setError('');
    try {
      await api.post(`/petitions/${petitionId}/comments`, { text: t });
      setText('');
      toast('Comment posted');
      onPosted?.();
    } catch (err) {
      setError(err.fields?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const left = MAX - text.length;
  return (
    <form onSubmit={submit} className="card p-4">
      <div className="flex gap-3">
        <Avatar name={user.fullName} size={34} />
        <div className="flex-1">
          <label htmlFor="comment" className="sr-only">Your comment</label>
          <textarea
            id="comment"
            className="input !min-h-[88px]"
            placeholder="Add your voice: why does this matter to you?"
            value={text}
            maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="field-error">{error}</p>}
          <div className="mt-2.5 flex items-center justify-between">
            <span className={`num text-[13px] ${left < 50 ? 'text-danger' : 'text-muted'}`}>{left.toLocaleString()} characters left</span>
            <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post comment'}</button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function Comments({ petitionId, canComment }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');
  const [reportId, setReportId] = useState(null);

  const load = useCallback(() => {
    setError('');
    api
      .get(`/petitions/${petitionId}/comments`)
      .then((r) => setComments(r.data))
      .catch((e) => setError(e.message));
  }, [petitionId]);

  useEffect(load, [load]);

  const visibleCount = comments?.filter((c) => c.comment_status === 'visible').length ?? 0;

  return (
    <section aria-labelledby="comments-title" className="mt-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="comments-title" className="h3">Discussion</h2>
        {comments && <span className="num text-[14px] text-muted">{visibleCount} comment{visibleCount === 1 ? '' : 's'}</span>}
      </div>

      {canComment && <CommentForm petitionId={petitionId} onPosted={load} />}

      <div className="mt-4">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !comments ? (
          <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="skeleton h-20" />)}</div>
        ) : comments.length === 0 ? (
          <p className="card px-5 py-8 text-center text-[15px] text-muted">No comments yet. Start the conversation.</p>
        ) : (
          <ul className="card divide-y divide-[var(--line)]">
            <AnimatePresence initial={false}>
              {comments.map((c) => (
                <motion.li
                  key={c.comment_id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                  className="group flex gap-3 px-4 py-4 sm:px-5"
                >
                  <Avatar name={c.full_name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{c.full_name}</span>
                      <span className="text-[13px] text-muted">{timeAgo(c.created_at)}</span>
                    </div>
                    {c.comment_status === 'removed' ? (
                      <p className="mt-1 text-[15px] italic text-muted">Comment removed by moderator</p>
                    ) : (
                      <p className="mt-1 whitespace-pre-line break-words text-[15.5px]">{c.comment_text}</p>
                    )}
                  </div>
                  {user && c.comment_status === 'visible' && c.user_id !== user.id && (
                    <button
                      className="btn btn-quiet btn-sm h-8 !px-2 opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => setReportId(c.comment_id)}
                      aria-label={`Report comment by ${c.full_name}`}
                      title="Report"
                    >
                      <Icon name="flag" size={15} />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <ReportDialog open={reportId !== null} onClose={() => setReportId(null)} target={{ commentId: reportId }} />
    </section>
  );
}
