import { describe, expect, it } from 'vitest';
import {
  clearStorage,
  groupByOrigin,
  isInjectableTab,
  readAllTabStorage,
  removeStorageItem,
  setStorageItem,
  type TabStorageResult,
} from '../../src/lib/pageStorage';
import { makeTab, type ChromeMock } from '../chromeMock';

const mock = () => chrome as unknown as ChromeMock;

function result(partial: Partial<TabStorageResult>): TabStorageResult {
  return {
    tabId: 1,
    title: 'Tab',
    url: 'https://example.com/',
    origin: 'https://example.com',
    available: true,
    local: [],
    session: [],
    ...partial,
  };
}

describe('isInjectableTab', () => {
  it('accepts normal http(s) tabs and rejects chrome pages and sleeping tabs', () => {
    expect(isInjectableTab(makeTab({ url: 'https://example.com/' }))).toBe(true);
    expect(isInjectableTab(makeTab({ url: 'http://localhost:3000/' }))).toBe(true);
    expect(isInjectableTab(makeTab({ url: 'chrome://extensions/' }))).toBe(false);
    expect(isInjectableTab(makeTab({ url: 'about:blank' }))).toBe(false);
    expect(isInjectableTab(makeTab({ url: 'https://example.com/', discarded: true }))).toBe(false);
    expect(isInjectableTab(makeTab({ url: 'https://example.com/', status: 'unloaded' }))).toBe(false);
  });
});

describe('groupByOrigin', () => {
  it('dedupes localStorage across tabs of the same origin (first available wins)', () => {
    const groups = groupByOrigin([
      result({ tabId: 1, local: [{ key: 'b', value: '1' }, { key: 'a', value: '2' }] }),
      result({ tabId: 2, local: [{ key: 'a', value: 'stale' }] }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].localEntries.map((e) => e.key)).toEqual(['a', 'b']);
    expect(groups[0].tabIds).toEqual([1, 2]);
  });

  it('keeps sessionStorage per tab', () => {
    const groups = groupByOrigin([
      result({ tabId: 1, title: 'One', session: [{ key: 's1', value: 'x' }] }),
      result({ tabId: 2, title: 'Two', session: [{ key: 's2', value: 'y' }] }),
    ]);
    expect(groups[0].sessionTabs).toHaveLength(2);
    expect(groups[0].sessionTabs[0]).toMatchObject({ tabId: 1, title: 'One' });
  });

  it('tracks unavailable tabs separately and sorts origins', () => {
    const groups = groupByOrigin([
      result({ origin: 'https://zeta.io', tabId: 3 }),
      result({ origin: 'https://alpha.io', tabId: 4, available: false, title: 'Sleeping' }),
    ]);
    expect(groups.map((g) => g.origin)).toEqual(['https://alpha.io', 'https://zeta.io']);
    expect(groups[0].unavailableTabs).toEqual([{ tabId: 4, title: 'Sleeping' }]);
    expect(groups[0].tabIds).toEqual([]);
  });
});

describe('readAllTabStorage', () => {
  it('reads storage from injectable tabs and marks failures unavailable', async () => {
    mock()._setTabs([
      { url: 'https://a.com/', title: 'A' },
      { url: 'https://b.com/', title: 'B' },
      { url: 'chrome://extensions/', title: 'Chrome' },
    ]);
    mock()._seedTabStorage(1, { theme: 'dark' }, { tok: 't1' });
    mock()._uninjectableTabIds.add(2);
    const results = await readAllTabStorage();
    expect(results).toHaveLength(2); // chrome:// excluded entirely
    const a = results.find((r) => r.origin === 'https://a.com');
    expect(a?.available).toBe(true);
    expect(a?.local).toEqual([{ key: 'theme', value: 'dark' }]);
    expect(a?.session).toEqual([{ key: 'tok', value: 't1' }]);
    expect(results.find((r) => r.origin === 'https://b.com')?.available).toBe(false);
  });
});

describe('mutations', () => {
  it('sets, removes and clears keys in the right tab and area', async () => {
    mock()._seedTabStorage(1, { keep: '1' }, { s: 'x' });
    await setStorageItem({ tabId: 1, area: 'local' }, 'added', 'v');
    expect(mock()._tabStorage.get(1)?.local.get('added')).toBe('v');

    await removeStorageItem({ tabId: 1, area: 'session' }, 's');
    expect(mock()._tabStorage.get(1)?.session.size).toBe(0);

    await clearStorage(1, 'both');
    expect(mock()._tabStorage.get(1)?.local.size).toBe(0);
  });

  it('reports injection failures from setStorageItem', async () => {
    mock()._uninjectableTabIds.add(7);
    const result = await setStorageItem({ tabId: 7, area: 'local' }, 'k', 'v');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Cannot access/);
  });
});
