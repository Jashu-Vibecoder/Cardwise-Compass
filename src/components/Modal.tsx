import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'default' | 'wide';
}

export function Modal({ title, description, onClose, children, size = 'default' }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-panel ${size === 'wide' ? 'modal-panel--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
