import { useState } from 'react';
import { useTabStorage } from '../../hooks/useTabStorage';
import { useToast } from '../../hooks/useToast';
import { downloadText } from '../../lib/download';
import {
  clearStorage,
  removeStorageItem,
  serializeOriginStorage,
  setStorageItem,
  type MutationTarget,
  type OriginStorage,
  type StorageEntry,
} from '../../lib/pageStorage';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { EmptyState } from '../EmptyState/EmptyState';
import { StorageEditor, type StorageEditorMode } from '../StorageEditor/StorageEditor';
import { StorageGroup } from '../StorageGroup/StorageGroup';
import './storage-view.scss';

export function StorageView() {
  const { origins, loading, stale, refresh, refreshTab } = useTabStorage();
  const toast = useToast();
  const [editor, setEditor] = useState<StorageEditorMode | null>(null);
  const [clearing, setClearing] = useState<OriginStorage | null>(null);

  const save = async (target: MutationTarget, key: string, value: string) => {
    const result = await setStorageItem(target, key, value);
    if (result.ok) {
      toast.success(`Saved "${key}"`);
      await refreshTab(target.tabId);
    }
    return result;
  };

  const deleteEntry = async (target: MutationTarget, entry: StorageEntry) => {
    await removeStorageItem(target, entry.key);
    await refreshTab(target.tabId);
    toast.undoable(`Deleted "${entry.key}"`, () => {
      void setStorageItem(target, entry.key, entry.value).then(() => refreshTab(target.tabId));
    });
  };

  const exportGroup = (group: OriginStorage) => {
    const host = new URL(group.origin).hostname;
    downloadText(`cookiejar-storage-${host}.json`, serializeOriginStorage(group));
  };

  const clearGroup = async (group: OriginStorage) => {
    setClearing(null);
    // Capture everything for undo before clearing.
    const restore: { target: MutationTarget; entries: StorageEntry[] }[] = [];
    if (group.tabIds.length > 0) {
      restore.push({ target: { tabId: group.tabIds[0], area: 'local' }, entries: group.localEntries });
    }
    for (const tab of group.sessionTabs) {
      restore.push({ target: { tabId: tab.tabId, area: 'session' }, entries: tab.entries });
    }
    for (const tabId of group.tabIds) {
      await clearStorage(tabId, 'both');
      await refreshTab(tabId);
    }
    const total = restore.reduce((sum, r) => sum + r.entries.length, 0);
    toast.undoable(`Cleared ${total} key${total === 1 ? '' : 's'} for ${group.origin}`, () => {
      void (async () => {
        for (const { target, entries } of restore) {
          for (const entry of entries) {
            await setStorageItem(target, entry.key, entry.value);
          }
          await refreshTab(target.tabId);
        }
      })();
    });
  };

  return (
    <div className="storage-view">
      <div className="storage-view__toolbar">
        <span className="storage-view__summary">
          {origins.length} origin{origins.length === 1 ? '' : 's'} across your open tabs
        </span>
        {stale && <span className="storage-view__stale">Tabs changed —</span>}
        <button type="button" className="storage-view__refresh" onClick={() => void refresh()}>
          ⟳ Refresh
        </button>
      </div>
      <div className="storage-view__content">
        {loading ? (
          <p className="storage-view__loading">Reading storage from open tabs…</p>
        ) : origins.length === 0 ? (
          <EmptyState
            title="No inspectable tabs"
            hint="Open a website in a tab and its localStorage / sessionStorage will show up here. Chrome pages and sleeping tabs can't be inspected."
          />
        ) : (
          origins.map((group) => (
            <StorageGroup
              key={group.origin}
              group={group}
              onAddKey={(g) => setEditor({ kind: 'add', group: g })}
              onEdit={(target, entry) => setEditor({ kind: 'edit', target, entry })}
              onDelete={(target, entry) => void deleteEntry(target, entry)}
              onExport={exportGroup}
              onClear={setClearing}
            />
          ))
        )}
      </div>
      {editor && <StorageEditor mode={editor} onSave={save} onClose={() => setEditor(null)} />}
      {clearing && (
        <ConfirmDialog
          title={`Clear storage for ${clearing.origin}?`}
          body="localStorage and sessionStorage of this origin's open tabs will be emptied. You can undo right after."
          confirmLabel="Clear storage"
          onConfirm={() => void clearGroup(clearing)}
          onCancel={() => setClearing(null)}
        />
      )}
    </div>
  );
}
