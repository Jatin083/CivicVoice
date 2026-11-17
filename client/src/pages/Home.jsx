import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import PetitionCard from '../components/PetitionCard';
import { CardSkeleton, EmptyState, ErrorState, Pagination } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { spring } from '../utils/format';

const SORTS = [
  { v: 'newest', label: 'Newest' },
  { v: 'popular', label: 'Most signed' },
  { v: 'ending', label: 'Ending soon' },
];
const STATUSES = [
  { v: 'published', label: 'Open' },
  { v: 'under_review', label: 'Under review' },
  { v: 'approved', label: 'Approved' },
  { v: 'closed', label: 'Closed' },
  { v: 'all', label: 'All' },
];

export default function Home() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const status = params.get('status') || 'published';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);

  const [query, setQuery] = useState(q);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => setQuery(q), [q]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/petitions', { params: { q: q || undefined, category: category || undefined, status, sort, page, limit: 9 } })
      .then((r) => setResult(r))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, category, status, sort, page]);

  useEffect(load, [load]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: !('page' in patch) });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    update({ q: query.trim() });
    document.getElementById('petitions')?.scrollIntoView({ behavior: 'smooth' });
  };

  const total = result?.meta.total ?? 0;

  return (
    <>
      <section className="hero">
        <div className="wrap pb-24 pt-16 sm:pb-32 sm:pt-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="max-w-3xl">
            <span className="eyebrow !text-[var(--deep-muted)]">Gurugram · and every neighbourhood like it</span>
            <h1 className="h1 mt-4">
              Raise your voice for <span className="grad-text">your community.</span>
            </h1>
            <p className="lede mt-5 !text-[var(--deep-muted)]">
              Turn scattered complaints into verified, trackable public demand. One person, one signature, progress everyone can see.
            </p>
          </motion.div>

          <motion.form
            onSubmit={submitSearch}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 }}
            className="mt-9 flex max-w-2xl flex-col gap-2 rounded-lg p-1.5 sm:flex-row"
            style={{ background: 'rgba(238,246,244,0.1)', border: '1px solid var(--deep-line)', backdropFilter: 'blur(12px)' }}
            role="search"
          >
            <label htmlFor="q" className="sr-only">Search petitions</label>
            <div className="relative flex-1">
              <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--deep-muted)]" />
              <input
                id="q"
                className="h-12 w-full rounded-md border-0 bg-transparent pl-11 pr-3 text-[16px] text-white placeholder:text-[var(--deep-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]"
                placeholder="Search by issue, place or keyword"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-hot h-12">Search</button>
          </motion.form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-[var(--deep-muted)]">
            <span className="flex items-center gap-2"><Icon name="shield" size={16} className="text-[var(--accent-deep)]" /> One signature per verified account</span>
            <span className="flex items-center gap-2"><Icon name="eye" size={16} className="text-[var(--accent-deep)]" /> Live, public progress</span>
            <span className="flex items-center gap-2"><Icon name="chat" size={16} className="text-[var(--accent-deep)]" /> Moderated discussion</span>
          </motion.div>
        </div>
      </section>

      <section id="petitions" className="wrap relative z-10 -mt-6 scroll-mt-24">
        {/* Category chips */}
        <div className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-2 [scrollbar-width:none]" role="group" aria-label="Category">
          <button className="chip" aria-pressed={!category} onClick={() => update({ category: '' })}>All topics</button>
          {categories.map((c) => (
            <button key={c.category_id} className="chip" aria-pressed={String(c.category_id) === category} onClick={() => update({ category: String(c.category_id) })}>
              {c.category_name}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="h2">{q ? <>Results for “{q}”</> : 'Petitions'}</h2>
            <p className="num mt-1 text-[15px] text-muted" aria-live="polite">
              {loading ? 'Loading…' : `${total} petition${total === 1 ? '' : 's'}`}
              {q && (
                <button className="ml-2 font-medium text-[var(--teal)] hover:underline" onClick={() => update({ q: '' })}>Clear search</button>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="status">Status</label>
            <select id="status" className="input !min-h-[40px] !w-auto !py-2 text-[15px]" value={status} onChange={(e) => update({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" className="input !min-h-[40px] !w-auto !py-2 text-[15px]" value={sort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : loading && !result ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
          ) : result.data.length === 0 ? (
            <EmptyState
              icon="search"
              title="No petitions match your search"
              action={user ? <Link to="/petitions/new" className="btn btn-primary"><Icon name="plus" size={16} /> Start one</Link> : <Link to="/register" className="btn btn-primary">Join and start one</Link>}
            >
              Try a different word, topic or status, or be the first to raise this issue.
            </EmptyState>
          ) : (
            <div className={`grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-50' : ''}`}>
              {result.data.map((p, i) => (
                <motion.div key={p.petition_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: Math.min(i, 8) * 0.03 }}>
                  <PetitionCard p={p} showStatus={status !== 'published'} />
                </motion.div>
              ))}
            </div>
          )}
          {result && <Pagination page={page} limit={result.meta.limit} total={total} onChange={(p) => { update({ page: String(p) }); document.getElementById('petitions')?.scrollIntoView({ behavior: 'smooth' }); }} />}
        </div>
      </section>

      <section className="wrap mt-20">
        <div className="panel px-6 py-12 sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="h2">Seen something that needs fixing?</h2>
              <p className="lede mt-3 !text-[var(--deep-muted)]">Write the problem, propose a solution, set a target. Neighbours sign once, and moderators forward what gathers support.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/petitions/new" className="btn btn-hot">
                <Icon name="plus" size={17} /> Start a petition
              </Link>
              {!user && <Link to="/register" className="btn btn-on-deep">Create an account</Link>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
