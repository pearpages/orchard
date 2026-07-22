/** AI backend settings, stored locally in chrome.storage.local. */

export interface AiSettings {
  /** Anthropic API key (BYOK). Stored only in extension storage. */
  claudeApiKey: string;
  claudeModel: string;
  /** Try Chrome's on-device AI before falling back to Claude. */
  preferBuiltIn: boolean;
}

export const CLAUDE_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (best)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (balanced)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (cheapest)' },
] as const;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  claudeApiKey: '',
  claudeModel: 'claude-opus-4-8',
  preferBuiltIn: true,
};

const STORAGE_KEY = 'aiSettings';

export async function loadAiSettings(): Promise<AiSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_AI_SETTINGS, ...(stored[STORAGE_KEY] as Partial<AiSettings> | undefined) };
}

export async function saveAiSettings(partial: Partial<AiSettings>): Promise<void> {
  const current = await loadAiSettings();
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, ...partial } });
}
