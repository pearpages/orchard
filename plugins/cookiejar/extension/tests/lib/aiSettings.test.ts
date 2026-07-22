import { describe, expect, it } from 'vitest';
import { DEFAULT_AI_SETTINGS, loadAiSettings, saveAiSettings } from '../../src/lib/ai/settings';

describe('AI settings', () => {
  it('defaults to Opus 4.8, on-device preference on, empty key', async () => {
    expect(await loadAiSettings()).toEqual(DEFAULT_AI_SETTINGS);
    expect(DEFAULT_AI_SETTINGS.claudeModel).toBe('claude-opus-4-8');
    expect(DEFAULT_AI_SETTINGS.preferBuiltIn).toBe(true);
    expect(DEFAULT_AI_SETTINGS.claudeApiKey).toBe('');
  });

  it('merges partial saves and round-trips', async () => {
    await saveAiSettings({ claudeApiKey: 'sk-ant-test' });
    expect(await loadAiSettings()).toEqual({ ...DEFAULT_AI_SETTINGS, claudeApiKey: 'sk-ant-test' });
    await saveAiSettings({ claudeModel: 'claude-haiku-4-5', preferBuiltIn: false });
    expect(await loadAiSettings()).toEqual({
      claudeApiKey: 'sk-ant-test',
      claudeModel: 'claude-haiku-4-5',
      preferBuiltIn: false,
    });
  });
});
