import { useEffect, useMemo, useState } from 'react';
import {
  draftFromCookie,
  setFromCookie,
  updateCookie,
  validateDraft,
  type Cookie,
  type CookieDraft,
  type SameSite,
} from '../../lib/cookies';
import { useToast } from '../../hooks/useToast';
import './cookie-editor.scss';

export type EditorMode = { kind: 'edit'; cookie: Cookie } | { kind: 'create'; domain?: string };

interface CookieEditorProps {
  mode: EditorMode;
  onClose: () => void;
}

const HOUR = 3600;
const DAY = 24 * HOUR;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function epochToLocalInput(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToEpoch(value: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : Math.round(ms / 1000);
}

function emptyDraft(domain?: string): CookieDraft {
  return {
    name: '',
    value: '',
    domain: domain ?? '',
    hostOnly: true,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    session: true,
  };
}

export function CookieEditor({ mode, onClose }: CookieEditorProps) {
  const toast = useToast();
  const [draft, setDraft] = useState<CookieDraft>(() =>
    mode.kind === 'edit' ? draftFromCookie(mode.cookie) : emptyDraft(mode.domain),
  );
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const errors = useMemo(() => validateDraft(draft), [draft]);
  const isEdit = mode.kind === 'edit';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const patch = (partial: Partial<CookieDraft>) => setDraft((prev) => ({ ...prev, ...partial }));

  const bumpExpiry = (seconds: number) => {
    patch({
      session: false,
      expirationDate: Math.round(Date.now() / 1000) + seconds,
    });
  };

  const save = async () => {
    setSaving(true);
    setApiError(null);
    try {
      if (isEdit) {
        await updateCookie(mode.cookie, draft);
      } else {
        await setFromCookie(draft);
      }
      toast.success(isEdit ? `Saved "${draft.name}"` : `Created "${draft.name}"`);
      onClose();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cookie-editor" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="cookie-editor__drawer" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit cookie' : 'New cookie'}>
        <header className="cookie-editor__header">
          <h2 className="cookie-editor__title">{isEdit ? 'Edit cookie' : 'New cookie'}</h2>
          <button type="button" className="cookie-editor__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <form
          className="cookie-editor__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (errors.length === 0 && !saving) void save();
          }}
        >
          <label className="cookie-editor__field">
            <span className="cookie-editor__label">Name</span>
            <input
              className="cookie-editor__input cookie-editor__input--mono"
              type="text"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="session_id"
              autoFocus={!isEdit}
            />
          </label>

          <label className="cookie-editor__field">
            <span className="cookie-editor__label">
              Value <em className="cookie-editor__hint">{draft.value.length} chars</em>
            </span>
            <textarea
              className="cookie-editor__input cookie-editor__input--mono cookie-editor__textarea"
              value={draft.value}
              onChange={(e) => patch({ value: e.target.value })}
              rows={4}
              spellCheck={false}
            />
          </label>

          <div className="cookie-editor__row">
            <label className="cookie-editor__field cookie-editor__field--grow">
              <span className="cookie-editor__label">Domain</span>
              <input
                className="cookie-editor__input cookie-editor__input--mono"
                type="text"
                value={draft.domain}
                onChange={(e) => patch({ domain: e.target.value })}
                placeholder="example.com"
                disabled={isEdit}
              />
            </label>
            <label className="cookie-editor__check">
              <input
                type="checkbox"
                checked={draft.hostOnly}
                onChange={(e) => patch({ hostOnly: e.target.checked })}
                disabled={isEdit}
              />
              Host-only
            </label>
          </div>

          <label className="cookie-editor__field">
            <span className="cookie-editor__label">Path</span>
            <input
              className="cookie-editor__input cookie-editor__input--mono"
              type="text"
              value={draft.path}
              onChange={(e) => patch({ path: e.target.value })}
            />
          </label>

          <fieldset className="cookie-editor__fieldset">
            <legend className="cookie-editor__label">Expiry</legend>
            <label className="cookie-editor__check">
              <input
                type="checkbox"
                checked={draft.session}
                onChange={(e) => patch({ session: e.target.checked })}
              />
              Session cookie (expires when the browser closes)
            </label>
            {!draft.session && (
              <div className="cookie-editor__expiry">
                <input
                  className="cookie-editor__input"
                  type="datetime-local"
                  value={draft.expirationDate ? epochToLocalInput(draft.expirationDate) : ''}
                  onChange={(e) => patch({ expirationDate: localInputToEpoch(e.target.value) })}
                />
                <div className="cookie-editor__chips">
                  <button type="button" className="cookie-editor__chip" onClick={() => bumpExpiry(HOUR)}>
                    +1 h
                  </button>
                  <button type="button" className="cookie-editor__chip" onClick={() => bumpExpiry(DAY)}>
                    +1 day
                  </button>
                  <button type="button" className="cookie-editor__chip" onClick={() => bumpExpiry(30 * DAY)}>
                    +30 days
                  </button>
                </div>
              </div>
            )}
          </fieldset>

          <fieldset className="cookie-editor__fieldset">
            <legend className="cookie-editor__label">Flags</legend>
            <div className="cookie-editor__row">
              <label className="cookie-editor__check">
                <input
                  type="checkbox"
                  checked={draft.secure}
                  onChange={(e) => patch({ secure: e.target.checked })}
                />
                Secure
              </label>
              <label className="cookie-editor__check">
                <input
                  type="checkbox"
                  checked={draft.httpOnly}
                  onChange={(e) => patch({ httpOnly: e.target.checked })}
                />
                HttpOnly
              </label>
              <label className="cookie-editor__check">
                SameSite
                <select
                  className="cookie-editor__input"
                  value={draft.sameSite}
                  onChange={(e) => patch({ sameSite: e.target.value as SameSite })}
                >
                  <option value="unspecified">Unspecified</option>
                  <option value="lax">Lax</option>
                  <option value="strict">Strict</option>
                  <option value="no_restriction">None</option>
                </select>
              </label>
            </div>
          </fieldset>

          {(errors.length > 0 || apiError) && (
            <ul className="cookie-editor__errors">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
              {apiError && <li>{apiError}</li>}
            </ul>
          )}

          <footer className="cookie-editor__footer">
            <button type="button" className="cookie-editor__cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cookie-editor__save" disabled={errors.length > 0 || saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create cookie'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
