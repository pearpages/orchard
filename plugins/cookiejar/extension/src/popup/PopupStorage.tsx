import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { StorageEditor, type StorageEditorMode } from '../components/StorageEditor/StorageEditor';
import { StorageRow } from '../components/StorageRow/StorageRow';
import { useToast } from '../hooks/useToast';
import {
  readTabStorage,
  removeStorageItem,
  setStorageItem,
  type MutationTarget,
  type StorageArea,
  type StorageEntry,
} from '../lib/pageStorage';
import './popup-storage.scss';

/** The current tab's localStorage / sessionStorage, shown inside the popup. */
export function PopupStorage() {
  const toast = useToast();
  const [tabId, setTabId] = useState<number | null>(null);
  const [available, setAvailable] = useState(true);
  const [local, setLocal] = useState<StorageEntry[]>([]);
  const [session, setSession] = useState<StorageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<StorageEditorMode | null>(null);

  const refresh = useCallback(async (id: number) => {
    const data = await readTabStorage(id);
    setAvailable(data.available);
    setLocal([...data.local].sort((a, b) => a.key.localeCompare(b.key)));
    setSession([...data.session].sort((a, b) => a.key.localeCompare(b.key)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id !== undefined) {
        setTabId(tab.id);
        void refresh(tab.id);
      } else {
        setAvailable(false);
        setLoading(false);
      }
    });
  }, [refresh]);

  const deleteEntry = async (area: StorageArea, entry: StorageEntry) => {
    if (tabId === null) return;
    const target: MutationTarget = { tabId, area };
    await removeStorageItem(target, entry.key);
    await refresh(tabId);
    toast.undoable(`Deleted "${entry.key}"`, () => {
      void setStorageItem(target, entry.key, entry.value).then(() => refresh(tabId));
    });
  };

  const save = async (target: MutationTarget, key: string, value: string) => {
    const result = await setStorageItem(target, key, value);
    if (result.ok && tabId !== null) {
      toast.success(`Saved "${key}"`);
      await refresh(tabId);
    }
    return result;
  };

  if (loading) {
    return <p className="popup-storage__loading">Reading this page's storage…</p>;
  }

  if (!available || tabId === null) {
    return (
      <EmptyState
        title="Can't inspect this page"
        hint="Chrome pages, the Web Store and sleeping tabs don't allow storage access."
      />
    );
  }

  const renderArea = (label: string, area: StorageArea, entries: StorageEntry[]) => (
    <section className="popup-storage__area">
      <h3 className="popup-storage__label">{label}</h3>
      {entries.length === 0 ? (
        <p className="popup-storage__empty">No keys.</p>
      ) : (
        <ul className="popup-storage__list">
          {entries.map((entry) => (
            <StorageRow
              key={entry.key}
              entry={entry}
              onEdit={(e) => setEditor({ kind: 'edit', target: { tabId, area }, entry: e })}
              onDelete={(e) => void deleteEntry(area, e)}
            />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="popup-storage">
      {renderArea('Local storage', 'local', local)}
      {renderArea('Session storage', 'session', session)}
      {editor && <StorageEditor mode={editor} onSave={save} onClose={() => setEditor(null)} />}
    </div>
  );
}
