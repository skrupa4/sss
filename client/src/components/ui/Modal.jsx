import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icons';

const SIZES = { sm: 'md:max-w-sm', md: 'md:max-w-lg', lg: 'md:max-w-3xl' };
const EXIT_MS = 230;

/**
 * Плавное модальное окно: затемнение с размытием, шторка снизу на телефоне и карточка по центру на ПК.
 * Закрывается по Esc, клику на фон и кнопке. Окно остаётся в DOM на время анимации выхода.
 */
export default function Modal({ open, onClose, title, children, size = 'md', padded = true }) {
  const [mounted, setMounted] = useState(open);
  const panelRef = useRef(null);
  const returnFocus = useRef(null);

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) return undefined;
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    returnFocus.current = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;
  const state = open ? 'open' : 'closed';

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end justify-center md:items-center md:p-6">
      <div
        data-state={state}
        onClick={onClose}
        className="modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-state={state}
        className={`modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl shadow-black/60 outline-none md:rounded-3xl ${SIZES[size]}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/15 md:hidden" aria-hidden="true" />
        {title && (
          <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4 md:pt-5">
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Закрыть" className="rounded-xl p-2 text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink">
              <Icon name="close" className="h-5 w-5" />
            </button>
          </header>
        )}
        <div className={`scroll-thin min-h-0 flex-1 overflow-y-auto ${padded ? 'px-5 pb-5 pt-2' : ''}`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
