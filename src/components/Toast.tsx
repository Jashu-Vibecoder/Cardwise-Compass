import { useCallback, useMemo, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';
import { ToastContext, type ToastKind, type ToastMessage } from '../lib/toast-context';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const notify = useCallback((text: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setMessages((current) => [...current.slice(-2), { id, kind, text }]);
    window.setTimeout(() => setMessages((current) => current.filter((message) => message.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => (
          <div key={message.id} className={`toast toast--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            {message.kind === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
            <span>{message.text}</span>
            <button aria-label="Dismiss notification" className="toast-close" onClick={() => setMessages((items) => items.filter((item) => item.id !== message.id))}><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
