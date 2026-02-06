import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = uid();
    const ttlMs = toast.ttlMs ?? 3500;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => remove(id), ttlMs);
  }, [remove]);

  const api = useMemo(() => {
    return {
      success(message, opts) {
        push({ type: 'success', message, ...opts });
      },
      error(message, opts) {
        push({ type: 'error', message, ...opts });
      },
      info(message, opts) {
        push({ type: 'info', message, ...opts });
      },
    };
  }, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-message">{t.message}</div>
            <button className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

