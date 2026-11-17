import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { GithubIcon, Icon, Logo } from './Icon';
import { GITHUB_URL } from '../config';
import { Avatar } from './ui';
import PaletteSwitcher from './PaletteSwitcher';
import { spring } from '../utils/format';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [menu, setMenu] = useState(false); // account menu (desktop)
  const [mobile, setMobile] = useState(false); // nav drawer (phone)
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    setMenu(false);
    setMobile(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    const esc = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const doLogout = () => {
    logout();
    navigate('/');
  };

  const links = [
    { to: '/', label: 'Explore', end: true },
    { to: '/petitions/new', label: 'Start a petition' },
    ...(user ? [{ to: '/dashboard', label: 'My activity' }, { to: '/feedback', label: 'Feedback' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Moderation' }] : []),
  ];

  return (
    <header className="nav">
      <div className="wrap flex h-full items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]" aria-label="CivicVoice home">
          <Logo />
          <span className="text-[17px]">CivicVoice</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-[14px] h-[2px] rounded-full bg-[var(--saffron)]"
                      transition={spring}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 place-items-center rounded-md text-[var(--deep-muted)] transition-[background-color,color,transform] hover:bg-white/10 hover:text-[var(--deep-ink)] active:scale-95"
            aria-label="Source code on GitHub"
            title="Source code on GitHub"
          >
            <GithubIcon size={19} />
          </a>
          <PaletteSwitcher />
          {user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2.5 transition-colors hover:bg-white/10 active:scale-[0.97]"
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                aria-haspopup="menu"
              >
                <Avatar name={user.fullName} size={30} />
                <span className="max-w-[140px] truncate text-[15px] font-medium">{user.fullName.split(' ')[0]}</span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={spring}
                    style={{ transformOrigin: 'top right' }}
                    className="sheet absolute right-0 top-[calc(100%+8px)] w-60 p-1.5 text-ink"
                  >
                    <div className="px-3 py-2.5">
                      <div className="truncate font-semibold">{user.fullName}</div>
                      <div className="truncate text-[13px] text-muted">{user.email}</div>
                    </div>
                    <div className="divider my-1" />
                    <MenuItem to="/dashboard" icon="grid">My activity</MenuItem>
                    <MenuItem to="/petitions/new" icon="plus">Start a petition</MenuItem>
                    <MenuItem to="/feedback" icon="star">Give feedback</MenuItem>
                    {isAdmin && <MenuItem to="/admin" icon="shield">Moderation</MenuItem>}
                    <div className="divider my-1" />
                    <button role="menuitem" onClick={doLogout} className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-[15px] hover:bg-[var(--surface)]">
                      <Icon name="logout" size={17} className="text-muted" /> Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="nav-link">Log in</Link>
              <Link to="/register" className="btn btn-hot btn-sm">Sign up</Link>
            </div>
          )}
          <button className="btn btn-on-deep btn-sm !px-2.5 md:hidden" onClick={() => setMobile((m) => !m)} aria-expanded={mobile} aria-label="Menu">
            <Icon name={mobile ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {/* Phone: the drawer drops from the bar that opened it, and returns there. */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="absolute inset-x-0 top-full border-b border-[var(--deep-line)] md:hidden"
            style={{ background: 'var(--deep-glass)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
          >
            <nav className="wrap flex flex-col gap-1 py-3" aria-label="Mobile">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link !h-11 ${isActive ? 'active bg-white/10' : ''}`}>
                  {l.label}
                </NavLink>
              ))}
              <div className="my-2 h-px bg-[var(--deep-line)]" />
              {user ? (
                <button onClick={doLogout} className="nav-link !h-11 text-left">Log out ({user.fullName.split(' ')[0]})</button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" className="btn btn-on-deep">Log in</Link>
                  <Link to="/register" className="btn btn-hot">Sign up</Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuItem({ to, icon, children }) {
  return (
    <Link role="menuitem" to={to} className="flex items-center gap-2.5 rounded px-3 py-2 text-[15px] hover:bg-[var(--surface)]">
      <Icon name={icon} size={17} className="text-muted" /> {children}
    </Link>
  );
}
