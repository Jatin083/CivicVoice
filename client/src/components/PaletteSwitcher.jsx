import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '../utils/format';
import { Icon } from './Icon';

// Swatch = [deep, primary, hot]. The colours themselves live in index.css / palettes.css.
export const PALETTES = [
  { id: 'civic', name: 'Civic', swatch: ['#0b3c49', '#137c6b', '#f2994a'] },
  { id: 'indigo', name: 'Indigo', swatch: ['#17153b', '#4f46e5', '#ff7a59'] },
  { id: 'forest', name: 'Forest', swatch: ['#12291d', '#1f7a4d', '#c5f03c'] },
  { id: 'klein', name: 'Klein', swatch: ['#1b2bf5', '#ffffff', '#ffc53d'] },
  { id: 'terracotta', name: 'Terracotta', swatch: ['#3b1f16', '#b85042', '#f2c14e'] },
  { id: 'noir', name: 'Noir', swatch: ['#0c0c0c', '#f5f5f4', '#ff5a1f'] },
];

const KEY = 'cv-palette';

const read = () => {
  try {
    return localStorage.getItem(KEY) || 'civic';
  } catch {
    return 'civic';
  }
};

export function applyPalette(id) {
  const root = document.documentElement;
  if (id === 'civic') delete root.dataset.palette;
  else root.dataset.palette = id;
  const deep = PALETTES.find((p) => p.id === id)?.swatch[0];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', deep || '#0b3c49');
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
}

// Three overlapping dots: deep, primary, hot. Each has a white ring so light colours still read.
function Swatch({ colors, size = 18 }) {
  return (
    <span className="inline-flex shrink-0 items-center" aria-hidden="true">
      {colors.map((c, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: c,
            marginLeft: i ? -size * 0.38 : 0,
            boxShadow: '0 0 0 2px var(--card), inset 0 0 0 1px rgba(0,0,0,0.12)',
            zIndex: 3 - i,
          }}
        />
      ))}
    </span>
  );
}

// Navbar picker: a swatch button; the menu grows down from it and closes on Escape or outside click.
export default function PaletteSwitcher() {
  const [current, setCurrent] = useState(read);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => applyPalette(current), [current]);

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    const away = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', esc);
    document.addEventListener('pointerdown', away);
    return () => {
      document.removeEventListener('keydown', esc);
      document.removeEventListener('pointerdown', away);
    };
  }, [open]);

  const active = PALETTES.find((p) => p.id === current) || PALETTES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Colour palette: ${active.name}`}
        title="Colour palette"
        className="relative grid h-9 w-9 place-items-center rounded-md text-[var(--deep-muted)] transition-[background-color,color,transform] hover:bg-white/10 hover:text-[var(--deep-ink)] active:scale-95"
      >
        <Icon name="palette" size={20} />
        {/* dot in the current palette's hot colour */}
        <span
          className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--saffron)', boxShadow: '0 0 0 2px var(--deep)' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="radiogroup"
            aria-label="Colour palette"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={spring}
            style={{ transformOrigin: 'top right' }}
            className="sheet absolute right-0 top-[calc(100%+10px)] w-56 p-1.5 text-ink"
          >
            <div className="eyebrow px-2.5 pb-1.5 pt-2">Colour palette</div>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={current === p.id}
                onClick={() => setCurrent(p.id)}
                className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-[15px] transition-colors hover:bg-[var(--surface)]"
              >
                <Swatch colors={p.swatch} />
                <span className="flex-1">{p.name}</span>
                {current === p.id && <span className="h-2 w-2 rounded-full bg-[var(--teal)]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
