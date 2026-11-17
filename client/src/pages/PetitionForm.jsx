import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ErrorState, Field, PageLoader, StatusBadge, fieldErrors } from '../components/ui';
import { Icon } from '../components/Icon';
import { todayPlus } from '../utils/format';

const EMPTY = {
  title: '',
  categoryId: '',
  description: '',
  problemStatement: '',
  proposedSolution: '',
  location: '',
  endDate: '',
  targetSignatures: 100,
};

// Client-side checks mirror the API rules (Section 4, F3) so errors show inline before submit.
function validate(f) {
  const e = {};
  if (f.title.trim().length < 5 || f.title.trim().length > 200) e.title = 'Title must be 5–200 characters';
  if (!f.categoryId) e.categoryId = 'Choose a category';
  if (f.description.trim().length < 20) e.description = 'Description must be at least 20 characters';
  if (f.endDate && f.endDate <= todayPlus(0)) e.endDate = 'End date must be in the future';
  const t = Number(f.targetSignatures);
  if (!Number.isInteger(t) || t < 1 || t > 1000000) e.targetSignatures = 'Target must be between 1 and 1,000,000';
  return e;
}

export default function PetitionForm({ edit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(edit);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!edit) return;
    api
      .get(`/petitions/${id}`)
      .then(({ data: p }) => {
        setStatus(p.status);
        if (!p.canEdit) {
          setLoadError({ message: p.creator_id === user?.id ? `A ${p.status.replace('_', ' ')} petition can no longer be edited.` : 'You can only edit your own petitions.' });
          return;
        }
        setForm({
          title: p.title,
          categoryId: String(p.category_id),
          description: p.description,
          problemStatement: p.problem_statement || '',
          proposedSolution: p.proposed_solution || '',
          location: p.location || '',
          endDate: p.end_date || '',
          targetSignatures: p.target_signatures,
        });
      })
      .catch((e) => setLoadError(e))
      .finally(() => setLoading(false));
  }, [edit, id, user?.id]);

  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched[k]) setErrors((prev) => ({ ...prev, [k]: validate(next)[k] }));
  };
  const blur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((prev) => ({ ...prev, [k]: validate(form)[k] }));
  };

  const submit = async (saveAs) => {
    const v = validate(form);
    setErrors(v);
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (Object.keys(v).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setBusy(saveAs || 'save');
    const payload = {
      title: form.title.trim(),
      categoryId: Number(form.categoryId),
      description: form.description.trim(),
      problemStatement: form.problemStatement.trim() || null,
      proposedSolution: form.proposedSolution.trim() || null,
      location: form.location.trim() || null,
      endDate: form.endDate || (edit ? '' : undefined),
      targetSignatures: Number(form.targetSignatures),
    };
    try {
      if (edit) {
        await api.patch(`/petitions/${id}`, payload);
        if (saveAs === 'published' && status === 'draft') await api.patch(`/petitions/${id}/status`, { status: 'published' });
        toast(saveAs === 'published' && status === 'draft' ? 'Petition published' : 'Changes saved');
        navigate(`/petitions/${id}`);
      } else {
        const r = await api.post('/petitions', { ...payload, status: saveAs });
        toast(saveAs === 'draft' ? 'Draft saved. Only you can see it.' : 'Petition published');
        navigate(`/petitions/${r.data.petitionId}`);
      }
    } catch (err) {
      if (err.fields) setErrors(fieldErrors(err));
      else toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  if (loading) return <PageLoader />;
  if (loadError) {
    return (
      <div className="wrap max-w-xl py-16">
        <ErrorState message={loadError.message} />
        <div className="mt-4 text-center"><Link to={`/petitions/${id}`} className="btn btn-ghost">Back to petition</Link></div>
      </div>
    );
  }

  const input = (k, props = {}) => ({
    id: k,
    className: 'input',
    value: form[k],
    onChange: set(k),
    onBlur: blur(k),
    'aria-invalid': Boolean(errors[k]),
    ...props,
  });

  return (
    <div className="wrap max-w-3xl py-10 sm:py-14">
      <Link to={edit ? `/petitions/${id}` : '/'} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
        <Icon name="back" size={16} /> {edit ? 'Back to petition' : 'Back to petitions'}
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="h2">{edit ? 'Edit petition' : 'Start a petition'}</h1>
        {edit && status && <StatusBadge status={status} />}
      </div>
      <p className="lede mt-2">{edit ? 'You can edit while it is a draft or open. After that it is locked.' : 'Clear, specific petitions gather more support. Say what is wrong, where, and what should change.'}</p>

      <form className="mt-8 grid gap-6" onSubmit={(e) => { e.preventDefault(); submit(edit ? undefined : 'published'); }} noValidate>
        <section className="card grid gap-5 p-5 sm:p-7">
          <h2 className="eyebrow">The basics</h2>
          <Field label="Title" htmlFor="title" error={errors.title} counter={<span className="num text-[13px] text-muted">{form.title.length}/200</span>}>
            <input {...input('title', { maxLength: 200, placeholder: 'e.g. Clean the Sector 14 lake before the monsoon' })} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="categoryId" error={errors.categoryId}>
              <select {...input('categoryId')}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>
            </Field>
            <Field label="Location" htmlFor="location" error={errors.location} hint="City, area or campus">
              <input {...input('location', { maxLength: 150, placeholder: 'Gurugram, Haryana' })} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={errors.description} hint="At least 20 characters: a short summary people see first.">
            <textarea {...input('description', { rows: 4 })} />
          </Field>
        </section>

        <section className="card grid gap-5 p-5 sm:p-7">
          <h2 className="eyebrow">Problem and solution <span className="normal-case tracking-normal">(optional)</span></h2>
          <Field label="What is the problem?" htmlFor="problemStatement" error={errors.problemStatement}>
            <textarea {...input('problemStatement', { rows: 3, placeholder: 'Who is affected, how often, since when?' })} />
          </Field>
          <Field label="What should change?" htmlFor="proposedSolution" error={errors.proposedSolution}>
            <textarea {...input('proposedSolution', { rows: 3, placeholder: 'A concrete ask the authority can act on.' })} />
          </Field>
        </section>

        <section className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <h2 className="eyebrow sm:col-span-2">Goal</h2>
          <Field label="Signature target" htmlFor="targetSignatures" error={errors.targetSignatures} hint="Between 1 and 1,000,000">
            <input {...input('targetSignatures', { type: 'number', min: 1, max: 1000000, inputMode: 'numeric' })} />
          </Field>
          <Field label="End date" htmlFor="endDate" error={errors.endDate} hint="Leave empty to keep it open">
            <input {...input('endDate', { type: 'date', min: todayPlus(1) })} />
          </Field>
        </section>

        <div className="sticky bottom-0 -mx-[var(--gutter)] flex flex-col-reverse gap-2 border-t border-[var(--line)] px-[var(--gutter)] py-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:px-0" style={{ background: 'color-mix(in srgb, var(--page) 90%, transparent)', backdropFilter: 'blur(12px)' }}>
          {edit ? (
            <>
              <Link to={`/petitions/${id}`} className="btn btn-ghost">Cancel</Link>
              {status === 'draft' && (
                <button type="button" className="btn btn-ghost" disabled={Boolean(busy)} onClick={() => submit('published')}>
                  {busy === 'published' ? 'Publishing…' : 'Save and publish'}
                </button>
              )}
              <button className="btn btn-primary" disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save changes'}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" disabled={Boolean(busy)} onClick={() => submit('draft')}>
                {busy === 'draft' ? 'Saving…' : 'Save as draft'}
              </button>
              <button className="btn btn-hot" disabled={Boolean(busy)}>{busy === 'published' ? 'Publishing…' : 'Publish petition'}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
