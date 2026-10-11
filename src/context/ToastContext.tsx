import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string, d?: number) => toast(msg, 'success', d), [toast]);
  const error = useCallback((msg: string, d?: number) => toast(msg, 'error', d), [toast]);
  const info = useCallback((msg: string, d?: number) => toast(msg, 'info', d), [toast]);
  const warning = useCallback((msg: string, d?: number) => toast(msg, 'warning', d), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, removeToast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const bgColors = {
            success: 'bg-tea-800 border-tea-600 text-tea-100',
            error: 'bg-rust-900 border-rust-700 text-rust-100',
            warning: 'bg-marigold-950 border-marigold-700 text-marigold-100',
            info: 'bg-ink-800 border-ink-600 text-white',
          }[t.type];

          const Icon = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertTriangle,
            info: Info,
          }[t.type];

          const iconColors = {
            success: 'text-tea-400',
            error: 'text-rust-400',
            warning: 'text-marigold-400',
            info: 'text-river-400',
          }[t.type];

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-200 animate-slide-up ${bgColors}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors}`} />
              <div className="flex-1 text-sm font-medium leading-snug">{t.message}</div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-white/60 hover:text-white p-0.5 rounded transition shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
