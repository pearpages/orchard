import { describe, expect, it } from 'vitest';
import { buildSnapshot, diffSnapshots, loadSnapshot, takeSnapshot } from '../../src/lib/snapshot';
import { makeCookie, type ChromeMock } from '../chromeMock';

const mock = () => chrome as unknown as ChromeMock;

describe('diffSnapshots', () => {
  it('detects added, removed and changed cookies', () => {
    const before = buildSnapshot([
      makeCookie({ name: 'stays', domain: 'a.com', value: 'same' }),
      makeCookie({ name: 'goes', domain: 'a.com', value: 'x' }),
      makeCookie({ name: 'mutates', domain: 'b.com', value: 'old' }),
    ]);
    const after = buildSnapshot([
      makeCookie({ name: 'stays', domain: 'a.com', value: 'same' }),
      makeCookie({ name: 'mutates', domain: 'b.com', value: 'new' }),
      makeCookie({ name: 'appears', domain: 'c.com', value: 'hello' }),
    ]);
    const diff = diffSnapshots(before, after);
    expect(diff.added.map((e) => e.name)).toEqual(['appears']);
    expect(diff.removed.map((e) => e.name)).toEqual(['goes']);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].before.value).toBe('old');
    expect(diff.changed[0].after.value).toBe('new');
  });

  it('treats partitioned cookies as distinct entries (cookieKey identity)', () => {
    const plain = makeCookie({ name: 'sid', domain: 'embed.com', value: 'p' });
    const partitioned = makeCookie({
      name: 'sid',
      domain: 'embed.com',
      value: 'q',
      partitionKey: { topLevelSite: 'https://top.com' },
    });
    const diff = diffSnapshots(buildSnapshot([plain]), buildSnapshot([plain, partitioned]));
    expect(diff.added).toHaveLength(1);
    expect(diff.changed).toHaveLength(0);
  });

  it('returns empty diff for identical jars', () => {
    const snap = buildSnapshot([makeCookie({ name: 'a' })]);
    const diff = diffSnapshots(snap, snap);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
  });
});

describe('takeSnapshot / loadSnapshot', () => {
  it('captures the live jar into storage.session', async () => {
    mock()._seed([{ name: 'sid', domain: 'example.com', value: 'v1' }]);
    expect(await loadSnapshot()).toBeNull();
    const snap = await takeSnapshot();
    expect(Object.keys(snap.entries)).toHaveLength(1);
    expect(await loadSnapshot()).toEqual(snap);
  });
});
