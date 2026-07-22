import { useState } from 'react';
import type { MutationTarget, OriginStorage, StorageEntry } from '../../lib/pageStorage';
import { StorageRow } from '../StorageRow/StorageRow';
import './storage-group.scss';

interface StorageGroupProps {
  group: OriginStorage;
  onAddKey: (group: OriginStorage) => void;
  onEdit: (target: MutationTarget, entry: StorageEntry) => void;
  onDelete: (target: MutationTarget, entry: StorageEntry) => void;
  onExport: (group: OriginStorage) => void;
  onClear: (group: OriginStorage) => void;
}

export function StorageGroup({ group, onAddKey, onEdit, onDelete, onExport, onClear }: StorageGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const localTarget: MutationTarget | null =
    group.tabIds.length > 0 ? { tabId: group.tabIds[0], area: 'local' } : null;
  const keyCount =
    group.localEntries.length + group.sessionTabs.reduce((sum, tab) => sum + tab.entries.length, 0);

  return (
    <section className={`storage-group${collapsed ? ' storage-group--collapsed' : ''}`}>
      <header className="storage-group__header">
        <button
          type="button"
          className="storage-group__toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span className="storage-group__chevron" aria-hidden="true">
            {collapsed ? '▸' : '▾'}
          </span>
          <span className="storage-group__origin">{group.origin}</span>
          <span className="storage-group__count">{keyCount}</span>
        </button>
        <div className="storage-group__actions">
          <button
            type="button"
            className="storage-group__action"
            title="Add key"
            onClick={() => onAddKey(group)}
          >
            +
          </button>
          <button
            type="button"
            className="storage-group__action"
            title="Export this origin's storage as JSON"
            onClick={() => onExport(group)}
          >
            ⇩
          </button>
          <button
            type="button"
            className="storage-group__action storage-group__action--danger"
            title="Clear storage for this origin"
            onClick={() => onClear(group)}
          >
            ×
          </button>
        </div>
      </header>
      {!collapsed && (
        <div className="storage-group__body">
          <h3 className="storage-group__area-label">Local storage</h3>
          {localTarget && group.localEntries.length > 0 ? (
            <ul className="storage-group__list">
              {group.localEntries.map((entry) => (
                <StorageRow
                  key={entry.key}
                  entry={entry}
                  onEdit={(e) => onEdit(localTarget, e)}
                  onDelete={(e) => onDelete(localTarget, e)}
                />
              ))}
            </ul>
          ) : (
            <p className="storage-group__empty">No localStorage keys.</p>
          )}
          {group.sessionTabs.map((tab) => (
            <div key={tab.tabId}>
              <h3 className="storage-group__area-label" title={tab.title}>
                Session — {tab.title}
              </h3>
              <ul className="storage-group__list">
                {tab.entries.map((entry) => (
                  <StorageRow
                    key={`${tab.tabId}:${entry.key}`}
                    entry={entry}
                    onEdit={(e) => onEdit({ tabId: tab.tabId, area: 'session' }, e)}
                    onDelete={(e) => onDelete({ tabId: tab.tabId, area: 'session' }, e)}
                  />
                ))}
              </ul>
            </div>
          ))}
          {group.unavailableTabs.length > 0 && (
            <p className="storage-group__unavailable">
              {group.unavailableTabs.length} sleeping tab
              {group.unavailableTabs.length === 1 ? '' : 's'} — wake them to inspect their storage.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
