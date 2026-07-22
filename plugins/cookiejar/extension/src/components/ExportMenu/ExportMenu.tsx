import { useEffect, useRef, useState } from 'react';
import './export-menu.scss';

export interface ExportMenuItem {
  label: string;
  onSelect: () => void;
}

interface ExportMenuProps {
  label: string;
  items: ExportMenuItem[];
  disabled?: boolean;
  /** Icon-only trigger for tight spots (domain group headers). */
  compact?: boolean;
  title?: string;
}

export function ExportMenu({ label, items, disabled, compact, title }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className={`export-menu__button${compact ? ' export-menu__button--compact' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? label : undefined}
        title={title ?? label}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {compact ? '⇩' : `${label} ▾`}
      </button>
      {open && (
        <ul className="export-menu__list" role="menu">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className="export-menu__item"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
