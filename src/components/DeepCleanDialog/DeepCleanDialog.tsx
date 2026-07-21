import { useEffect, useState } from 'react';
import { ALL_DEEP_CLEAN_TYPES, type DeepCleanTypes } from '../../lib/deepClean';
import './deep-clean-dialog.scss';

interface DeepCleanDialogProps {
  domain: string;
  origins: string[];
  cookieCount: number;
  protectedCount: number;
  onConfirm: (types: DeepCleanTypes, deleteCookies: boolean) => void;
  onCancel: () => void;
}

const TYPE_LABELS: { key: keyof DeepCleanTypes; label: string }[] = [
  { key: 'localStorage', label: 'Local storage' },
  { key: 'indexedDB', label: 'IndexedDB' },
  { key: 'serviceWorkers', label: 'Service workers' },
  { key: 'cacheStorage', label: 'Cache storage' },
];

export function DeepCleanDialog({
  domain,
  origins,
  cookieCount,
  protectedCount,
  onConfirm,
  onCancel,
}: DeepCleanDialogProps) {
  const [types, setTypes] = useState<DeepCleanTypes>(ALL_DEEP_CLEAN_TYPES);
  const [deleteCookies, setDeleteCookies] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const nothingSelected = !deleteCookies && !Object.values(types).some(Boolean);

  return (
    <div className="deep-clean" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="deep-clean__panel" role="alertdialog" aria-modal="true" aria-label={`Deep clean ${domain}`}>
        <h2 className="deep-clean__title">Deep clean {domain}?</h2>
        <fieldset className="deep-clean__fieldset">
          <legend className="deep-clean__legend">Site data to wipe</legend>
          {TYPE_LABELS.map(({ key, label }) => (
            <label key={key} className="deep-clean__check">
              <input
                type="checkbox"
                checked={types[key]}
                onChange={(e) => setTypes((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="deep-clean__check deep-clean__check--cookies">
          <input
            type="checkbox"
            checked={deleteCookies}
            onChange={(e) => setDeleteCookies(e.target.checked)}
          />
          Also delete {cookieCount} cookie{cookieCount === 1 ? '' : 's'}
          {protectedCount > 0 ? ` (${protectedCount} protected kept)` : ''}
        </label>
        <div className="deep-clean__origins">
          <p className="deep-clean__origins-label">Origins that will be wiped:</p>
          <ul className="deep-clean__origin-list">
            {origins.map((origin) => (
              <li key={origin}>
                <code>{origin}</code>
              </li>
            ))}
          </ul>
          <p className="deep-clean__limitation">
            Only origins seen in cookies or open tabs are listed — unknown subdomains are not touched.
          </p>
        </div>
        <p className="deep-clean__warning">Site data removal cannot be undone.</p>
        <div className="deep-clean__actions">
          <button type="button" className="deep-clean__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="deep-clean__confirm"
            disabled={nothingSelected}
            onClick={() => onConfirm(types, deleteCookies)}
          >
            Deep clean
          </button>
        </div>
      </div>
    </div>
  );
}
