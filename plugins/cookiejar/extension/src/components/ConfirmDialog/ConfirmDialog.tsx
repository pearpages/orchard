import { useEffect, useRef, useState } from 'react';
import './confirm-dialog.scss';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  /** When set, the user must type this text to enable the confirm button. */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, body, confirmLabel, requireText, onConfirm, onCancel }: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const confirmDisabled = requireText !== undefined && typed !== requireText;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="confirm-dialog" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-dialog__panel" role="alertdialog" aria-modal="true" aria-label={title} ref={dialogRef}>
        <h2 className="confirm-dialog__title">{title}</h2>
        <p className="confirm-dialog__body">{body}</p>
        {requireText !== undefined && (
          <label className="confirm-dialog__challenge">
            Type <code>{requireText}</code> to confirm
            <input
              className="confirm-dialog__input"
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
            />
          </label>
        )}
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="confirm-dialog__confirm"
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
