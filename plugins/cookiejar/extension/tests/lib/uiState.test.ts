import { describe, expect, it } from 'vitest';
import { DEFAULT_UI_STATE, loadUiState, saveUiState } from '../../src/lib/uiState';

describe('uiState', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await loadUiState()).toEqual(DEFAULT_UI_STATE);
  });

  it('merges partial saves and round-trips', async () => {
    await saveUiState({ managerQuery: 'auth0' });
    expect(await loadUiState()).toEqual({ ...DEFAULT_UI_STATE, managerQuery: 'auth0' });

    await saveUiState({ managerView: 'timeline', selectedDomain: 'example.com' });
    expect(await loadUiState()).toEqual({
      managerQuery: 'auth0',
      managerView: 'timeline',
      selectedDomain: 'example.com',
    });
  });
});
