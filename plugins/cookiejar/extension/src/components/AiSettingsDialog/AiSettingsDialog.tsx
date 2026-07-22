import { useEffect, useState } from 'react';
import {
  builtInStatus,
  downloadBuiltIn,
  type BuiltInStatus,
} from '../../lib/ai/chromeAi';
import {
  CLAUDE_MODELS,
  DEFAULT_AI_SETTINGS,
  loadAiSettings,
  saveAiSettings,
  type AiSettings,
} from '../../lib/ai/settings';
import './ai-settings-dialog.scss';

interface AiSettingsDialogProps {
  onClose: () => void;
}

export function AiSettingsDialog({ onClose }: AiSettingsDialogProps) {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [status, setStatus] = useState<BuiltInStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    void loadAiSettings().then(setSettings);
    void builtInStatus().then(setStatus);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const patch = (partial: Partial<AiSettings>) => setSettings((prev) => ({ ...prev, ...partial }));

  const save = async () => {
    setSaving(true);
    await saveAiSettings(settings);
    setSaving(false);
    onClose();
  };

  const download = async () => {
    setDownloadError(null);
    setDownloadPct(0);
    try {
      await downloadBuiltIn((loaded) => setDownloadPct(Math.round(loaded * 100)));
      setStatus(await builtInStatus());
      setDownloadPct(null);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : String(error));
      setDownloadPct(null);
    }
  };

  return (
    <div className="ai-settings" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ai-settings__panel" role="dialog" aria-modal="true" aria-label="AI settings">
        <header className="ai-settings__header">
          <h2 className="ai-settings__title">AI settings</h2>
          <button type="button" className="ai-settings__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="ai-settings__body">
          <label className="ai-settings__field">
            <span className="ai-settings__label">Claude API key</span>
            <input
              className="ai-settings__input"
              type="password"
              value={settings.claudeApiKey}
              onChange={(e) => patch({ claudeApiKey: e.target.value })}
              placeholder="sk-ant-…"
              autoComplete="off"
            />
            <span className="ai-settings__hint">
              Stored only in this browser's extension storage. This is the reliable path — it works
              on any machine, regardless of on-device AI support.
            </span>
          </label>

          <label className="ai-settings__field">
            <span className="ai-settings__label">Claude model</span>
            <select
              className="ai-settings__input"
              value={settings.claudeModel}
              onChange={(e) => patch({ claudeModel: e.target.value })}
            >
              {CLAUDE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>

          <label className="ai-settings__check">
            <input
              type="checkbox"
              checked={settings.preferBuiltIn}
              onChange={(e) => patch({ preferBuiltIn: e.target.checked })}
            />
            Prefer Chrome's on-device AI when available
          </label>

          <div className="ai-settings__builtin">
            <span className="ai-settings__label">On-device AI (Chrome Gemini Nano)</span>
            {!status && <p className="ai-settings__builtin-text">Checking…</p>}

            {status?.reason === 'ready' && (
              <p className="ai-settings__builtin-text ai-settings__builtin-text--ok">Ready on this device ✓</p>
            )}

            {status?.reason === 'no-api' && (
              <p className="ai-settings__builtin-text">
                Not exposed in this Chrome. Needs Chrome 138+ on Windows 10+/macOS 13+/Linux with the
                flag <code className="ai-settings__code">chrome://flags/#prompt-api-for-gemini-nano</code>{' '}
                set to Enabled. Or just add a Claude API key above — it needs none of this.
              </p>
            )}

            {status?.reason === 'unavailable' && (
              <p className="ai-settings__builtin-text">
                This machine doesn't meet the requirements (a 4 GB+ VRAM GPU, ~22 GB free disk, and a
                supported desktop OS). Add a Claude API key above to use AI anywhere.
              </p>
            )}

            {status?.reason === 'downloadable' && (
              <div className="ai-settings__builtin-text">
                <p>Supported, but the on-device model (~2–4 GB) hasn't downloaded yet.</p>
                {downloadPct === null ? (
                  <button type="button" className="ai-settings__download" onClick={() => void download()}>
                    Download on-device model
                  </button>
                ) : (
                  <p className="ai-settings__builtin-text--ok">Downloading… {downloadPct}%</p>
                )}
                {downloadError && <p className="ai-settings__download-error">{downloadError}</p>}
              </div>
            )}
          </div>
        </div>

        <footer className="ai-settings__footer">
          <button type="button" className="ai-settings__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ai-settings__save" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
}
