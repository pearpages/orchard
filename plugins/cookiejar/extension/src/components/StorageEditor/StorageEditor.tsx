import { useEffect, useState } from 'react';
import type { MutationTarget, OriginStorage, StorageEntry } from '../../lib/pageStorage';
import './storage-editor.scss';

export type StorageEditorMode =
  | { kind: 'edit'; target: MutationTarget; entry: StorageEntry }
  | { kind: 'add'; group: OriginStorage };

interface StorageEditorProps {
  mode: StorageEditorMode;
  onSave: (target: MutationTarget, key: string, value: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

export function StorageEditor({ mode, onSave, onClose }: StorageEditorProps) {
  const isEdit = mode.kind === 'edit';
  const [key, setKey] = useState(isEdit ? mode.entry.key : '');
  const [value, setValue] = useState(isEdit ? mode.entry.value : '');
  // Add mode: 'local' or 'session:<tabId>'.
  const [areaChoice, setAreaChoice] = useState('local');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const resolveTarget = (): MutationTarget | null => {
    if (isEdit) return mode.target;
    if (areaChoice === 'local') {
      return mode.group.tabIds.length > 0 ? { tabId: mode.group.tabIds[0], area: 'local' } : null;
    }
    return { tabId: Number(areaChoice.slice('session:'.length)), area: 'session' };
  };

  const save = async () => {
    const target = resolveTarget();
    if (!target || !key.trim()) return;
    setSaving(true);
    setError(null);
    const result = await onSave(target, key, value);
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error ?? 'Could not write the key.');
  };

  return (
    <div className="storage-editor" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="storage-editor__panel" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit storage key' : 'Add storage key'}>
        <header className="storage-editor__header">
          <h2 className="storage-editor__title">{isEdit ? 'Edit storage key' : 'Add storage key'}</h2>
          <button type="button" className="storage-editor__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <form
          className="storage-editor__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) void save();
          }}
        >
          {!isEdit && (
            <label className="storage-editor__field">
              <span className="storage-editor__label">Area</span>
              <select
                className="storage-editor__input"
                value={areaChoice}
                onChange={(e) => setAreaChoice(e.target.value)}
              >
                <option value="local">Local storage</option>
                {mode.group.sessionTabs.map((tab) => (
                  <option key={tab.tabId} value={`session:${tab.tabId}`}>
                    Session — {tab.title}
                  </option>
                ))}
                {mode.group.sessionTabs.length === 0 &&
                  mode.group.tabIds.map((tabId) => (
                    <option key={tabId} value={`session:${tabId}`}>
                      Session — tab {tabId}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="storage-editor__field">
            <span className="storage-editor__label">Key</span>
            <input
              className="storage-editor__input storage-editor__input--mono"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              readOnly={isEdit}
              autoFocus={!isEdit}
            />
          </label>
          <label className="storage-editor__field">
            <span className="storage-editor__label">
              Value <em className="storage-editor__hint">{value.length} chars</em>
            </span>
            <textarea
              className="storage-editor__input storage-editor__input--mono storage-editor__textarea"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={5}
              spellCheck={false}
              autoFocus={isEdit}
            />
          </label>
          {error && <p className="storage-editor__error">{error}</p>}
          <footer className="storage-editor__footer">
            <button type="button" className="storage-editor__cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="storage-editor__save" disabled={saving || !key.trim()}>
              {saving ? 'Saving…' : isEdit ? 'Save value' : 'Add key'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
