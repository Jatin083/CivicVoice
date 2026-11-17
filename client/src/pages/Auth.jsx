import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field, fieldErrors } from '../components/ui';
import { Icon, Logo } from '../components/Icon';
import { spring } from '../utils/format';

const DEMO = [
  { label: 'Citizen', email: 'priya@gmail.com' },
  { label: 'Admin', email: 'admin@civicvoice.com' },
];

function Shell({ title, sub, children, footer }) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <div className="panel m-3 hidden !rounded-[20px] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo size={36} />
        <div>
          <h2 className="h2 max-w-md">One person. One signature. <span className="grad-text">Real numbers.</span></h2>
          <p className="lede mt-4 !text-[var(--deep-muted)]">Every signature on CivicVoice belongs to a registered account, so the support you see is support that counts.</p>
        </div>
        <p className="text-[14px] text-[var(--deep-muted)]">Gurugram · Online Petition & Community Feedback Platform</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="w-full max-w-[420px]">
          <h1 className="h2">{title}</h1>
          <p className="mt-2 text-muted">{sub}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-[15px] text-muted">{footer}</p>
        </motion.div>
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, invalid, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} className="input pr-12" value={value} onChange={onChange} aria-invalid={invalid} autoComplete={autoComplete} />
      <button type="button" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}

const useNext = () => {
  const [params] = useSearchParams();
  const next = params.get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
};

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const next = useNext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setErrors({});
    try {
      const u = await login(email.trim(), password);
      toast(`Welcome back, ${u.fullName.split(' ')[0]}`);
      navigate(next === '/' && u.role === 'admin' ? '/admin' : next, { replace: true });
    } catch (err) {
      if (err.fields) setErrors(fieldErrors(err));
      else setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Log in" sub="Sign petitions, join discussions and track what you started." footer={<>New here? <Link className="font-semibold text-[var(--teal)] hover:underline" to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></>}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {message && <div role="alert" className="flex items-center gap-2 rounded-md px-3.5 py-3 text-[15px]" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><Icon name="alert" size={17} /> {message}</div>}
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={Boolean(errors.password)} autoComplete="current-password" />
        </Field>
        <button className="btn btn-primary mt-2 w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="mt-6 rounded-md border border-dashed border-[var(--line-strong)] p-4">
        <div className="eyebrow">Demo accounts · password Password@123</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button key={d.email} type="button" className="chip" onClick={() => { setEmail(d.email); setPassword('Password@123'); }}>
              {d.label}: {d.email}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const next = useNext();
  const [f, setF] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (f.fullName.trim().length < 2) v.fullName = 'Name must be 2–100 characters';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) v.email = 'Enter a valid email';
    if (f.password.length < 8) v.password = 'Password must be at least 8 characters';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const u = await register({ fullName: f.fullName.trim(), email: f.email.trim(), password: f.password, phone: f.phone.trim() || undefined });
      toast(`Welcome to CivicVoice, ${u.fullName.split(' ')[0]}`);
      navigate(next, { replace: true });
    } catch (err) {
      if (err.fields) setErrors(fieldErrors(err));
      else if (err.status === 409) setErrors({ email: err.message });
      else toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Create your account" sub="It takes a minute. Your signature only counts once, so make it yours." footer={<>Already have an account? <Link className="font-semibold text-[var(--teal)] hover:underline" to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Log in</Link></>}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <input id="fullName" className="input" value={f.fullName} onChange={set('fullName')} aria-invalid={Boolean(errors.fullName)} autoComplete="name" maxLength={100} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" className="input" value={f.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters">
          <PasswordInput id="password" value={f.password} onChange={set('password')} invalid={Boolean(errors.password)} autoComplete="new-password" />
        </Field>
        <Field label={<>Phone <span className="font-normal text-muted">(optional)</span></>} htmlFor="phone" error={errors.phone}>
          <input id="phone" type="tel" className="input" value={f.phone} onChange={set('phone')} aria-invalid={Boolean(errors.phone)} autoComplete="tel" inputMode="tel" />
        </Field>
        <button className="btn btn-primary mt-2 w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </Shell>
  );
}
