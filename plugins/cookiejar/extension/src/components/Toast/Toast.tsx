import './toast.scss';

export interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
  onUndo?: () => void;
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.kind}`}>
          <span className="toast__message">{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              className="toast__undo"
              onClick={() => {
                toast.onUndo?.();
                onDismiss(toast.id);
              }}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
