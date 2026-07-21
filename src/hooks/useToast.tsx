import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastViewport, type ToastItem } from '../components/Toast/Toast';

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
  /** Success toast with an Undo action; stays visible longer. */
  undoable(message: string, onUndo: () => void): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DISMISS_MS = 4000;
const DISMISS_UNDO_MS = 8000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, 'id'>, ttl: number) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push({ kind: 'success', message }, DISMISS_MS),
      error: (message) => push({ kind: 'error', message }, DISMISS_MS),
      undoable: (message, onUndo) => push({ kind: 'success', message, onUndo }, DISMISS_UNDO_MS),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside a ToastProvider');
  return api;
}
