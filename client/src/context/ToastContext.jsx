import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '../utils/format';
import { Icon } from '../components/Icon';

const ToastContext = createContext(() => {});

// Toasts rise from the bottom and leave the same way they came (spatial consistency).
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, kind = 'success') => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, kind }]);
      setTimeout(() => dismiss(id), 3600);
    },
    [dismiss]
  );

  const api = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={spring}
              className="pointer-events-auto flex max-w-[min(440px,100%)] items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium shadow-[var(--shadow-sheet)]"
              style={{
                background: 'var(--deep-glass)',
                color: 'var(--deep-ink)',
                backdropFilter: 'blur(16px) saturate(160%)',
                WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              }}
              role="status"
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{ background: t.kind === 'error' ? 'var(--danger)' : 'var(--success)' }}
              >
                <Icon name={t.kind === 'error' ? 'x' : 'check'} size={14} />
              </span>
              <span>{t.message}</span>
              <button className="ml-1 rounded p-1 text-[var(--deep-muted)] hover:text-white" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <Icon name="x" size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
