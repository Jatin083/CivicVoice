import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { Icon } from './Icon';
import { spring } from '../utils/format';

// Apple's momentum projection: where a flick would come to rest.
const project = (v, d = 0.998) => ((v / 1000) * d) / (1 - d);

function useIsPhone() {
  const q = '(max-width: 639px)';
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setPhone(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

/*
  A modal task: dims the page to focus, Escape closes, focus moves in and back.
  Phone: a bottom sheet you can drag down; the release velocity is projected forward
  to decide close vs. snap back, and the spring inherits that velocity.
  Desktop: a centred card that grows in and shrinks back out along the same path.
*/
export default function Dialog({ open, onClose, title, children, footer, width = 520 }) {
  const phone = useIsPhone();
  const panelRef = useRef(null);
  const lastFocus = useRef(null);
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.querySelector('input, textarea, select, button[data-autofocus]')?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const sheetMotion = phone
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { type: 'spring', bounce: 0.15, duration: 0.35 } }
    : { initial: { opacity: 0, scale: 0.96, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 8 }, transition: spring };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="sheet relative z-[61] flex max-h-[92svh] w-full flex-col rounded-b-none sm:rounded-b-[12px]"
            style={{ maxWidth: phone ? '100%' : width }}
            {...sheetMotion}
            drag={phone ? 'y' : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 1 }}
            onDragEnd={(e, info) => {
              const h = panelRef.current?.offsetHeight || 400;
              if (info.offset.y + project(info.velocity.y) > h * 0.45) onClose();
            }}
          >
            {phone && (
              <div className="flex cursor-grab touch-none justify-center pb-1 pt-2.5" onPointerDown={(e) => drag.start(e)}>
                <span className="h-1.5 w-10 rounded-full bg-[var(--line-strong)]" />
              </div>
            )}
            <div
              className="flex items-center justify-between gap-4 px-5 pb-3 pt-3 sm:px-6 sm:pt-5"
              onPointerDown={(e) => phone && drag.start(e)}
              style={{ touchAction: phone ? 'none' : undefined }}
            >
              <h2 className="h3">{title}</h2>
              <button className="btn btn-quiet btn-sm -mr-2 !px-2" onClick={onClose} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
