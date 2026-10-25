import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'default' | 'wide';
}

export function Modal({ title, description, onClose, children, size = 'default' }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const dirtyRef = useRef(false);
  onCloseRef.current = onClose;

  function requestClose() {
    if (dirtyRef.current && !window.confirm('Discard your unsaved changes?')) return;
    onCloseRef.current();
  }

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (!panel) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel) return;
      if (event.key === 'Escape') { requestClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const markDirty = () => { dirtyRef.current = true; };
    panel?.addEventListener('input', markDirty, true);
    panel?.addEventListener('change', markDirty, true);
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); panel?.removeEventListener('input', markDirty, true); panel?.removeEventListener('change', markDirty, true); previousFocus?.focus(); };
  }, []);

  return (
    <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={panelRef} tabIndex={-1} className={`modal-panel ${size === 'wide' ? 'modal-panel--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={requestClose}><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
