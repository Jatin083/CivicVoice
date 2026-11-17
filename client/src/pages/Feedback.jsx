import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { Field, fieldErrors } from '../components/ui';
import { Icon } from '../components/Icon';
import { springBouncy } from '../utils/format';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Rating" onPointerLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((s) => (
          <motion.button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            aria-label={`${s} star${s > 1 ? 's' : ''}`}
            onPointerEnter={() => setHover(s)}
            onClick={() => onChange(value === s ? 0 : s)}
            whileTap={{ scale: 0.85 }}
            animate={{ scale: value === s ? [1, 1.18, 1] : 1 }}
            transition={springBouncy}
            className="grid h-11 w-11 place-items-center"
            style={{ color: s <= shown ? 'var(--saffron)' : 'var(--line-strong)' }}
          >
            <Icon name="star" size={30} filled={s <= shown} strokeWidth={1.4} />
          </motion.button>
        ))}
      </div>
      <span className="text-[15px] text-muted" aria-live="polite">{shown ? LABELS[shown] : 'Optional'}</span>
    </div>
  );
}

export default function Feedback() {
  const toast = useToast();
  const [f, setF] = useState({ subject: '', message: '', rating: 0 });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (f.subject.trim().length < 3 || f.subject.trim().length > 150) v.subject = 'Subject must be 3–150 characters';
    if (f.message.trim().length < 5) v.message = 'Message must be at least 5 characters';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await api.post('/feedback', { subject: f.subject.trim(), message: f.message.trim(), rating: f.rating || null });
      toast('Thanks for your feedback');
      setSent(true);
    } catch (err) {
      if (err.fields) setErrors(fieldErrors(err));
      else toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="wrap max-w-xl py-20 text-center">
        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springBouncy} className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
          <Icon name="check" size={26} strokeWidth={2.2} />
        </motion.span>
        <h1 className="h2 mt-5">Thank you</h1>
        <p className="lede mx-auto mt-2">The team reads every message. Your feedback shapes what we build next.</p>
        <button className="btn btn-ghost mt-7" onClick={() => { setF({ subject: '', message: '', rating: 0 }); setSent(false); }}>Send more feedback</button>
      </div>
    );
  }

  return (
    <div className="wrap max-w-2xl py-10 sm:py-14">
      <span className="eyebrow">Feedback</span>
      <h1 className="h2 mt-2">How is CivicVoice working for you?</h1>
      <p className="lede mt-2">Tell us what works, what doesn’t, and what you wish it did.</p>

      <form onSubmit={submit} className="card mt-8 grid gap-5 p-5 sm:p-7" noValidate>
        <div>
          <span className="label">Your rating</span>
          <StarRating value={f.rating} onChange={(rating) => setF({ ...f, rating })} />
        </div>
        <Field label="Subject" htmlFor="subject" error={errors.subject}>
          <input id="subject" className="input" maxLength={150} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} aria-invalid={Boolean(errors.subject)} placeholder="e.g. Search filters" />
        </Field>
        <Field label="Message" htmlFor="message" error={errors.message}>
          <textarea id="message" className="input" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} aria-invalid={Boolean(errors.message)} placeholder="Please add a filter by location." />
        </Field>
        <div className="flex justify-end">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
        </div>
      </form>
    </div>
  );
}
