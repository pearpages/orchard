import { useMemo, useState } from 'react';
import { truncate } from '../../lib/format';
import { detectToken } from '../../lib/token';
import type { StorageEntry } from '../../lib/pageStorage';
import { TokenPanel } from '../TokenPanel/TokenPanel';
import './storage-row.scss';

interface StorageRowProps {
  entry: StorageEntry;
  onEdit: (entry: StorageEntry) => void;
  onDelete: (entry: StorageEntry) => void;
}

export function StorageRow({ entry, onEdit, onDelete }: StorageRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const token = useMemo(() => detectToken(entry.value), [entry.value]);

  const copyValue = async () => {
    await navigator.clipboard.writeText(entry.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li className={`storage-row${expanded ? ' storage-row--expanded' : ''}`}>
      <div
        className="storage-row__summary"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <code className="storage-row__key" title={entry.key}>
          {entry.key}
        </code>
        <code className="storage-row__value">{truncate(entry.value, 60)}</code>
        <span className="storage-row__badges">
          {token?.kind === 'jwt' && (
            <span className="storage-row__badge" title="Value contains a JWT">
              JWT
            </span>
          )}
        </span>
        <span className="storage-row__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="storage-row__action"
            title="Edit"
            aria-label={`Edit ${entry.key}`}
            onClick={() => onEdit(entry)}
          >
            ✎
          </button>
          <button
            type="button"
            className="storage-row__action storage-row__action--danger"
            title="Delete"
            aria-label={`Delete ${entry.key}`}
            onClick={() => onDelete(entry)}
          >
            ×
          </button>
        </span>
      </div>
      {expanded && (
        <div className="storage-row__detail">
          <div className="storage-row__detail-value">
            <code>{entry.value || '(empty value)'}</code>
            <button type="button" className="storage-row__copy" onClick={copyValue}>
              {copied ? 'Copied ✓' : 'Copy value'}
            </button>
          </div>
          {token && <TokenPanel value={entry.value} />}
        </div>
      )}
    </li>
  );
}
