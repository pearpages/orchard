import { describe, expect, it } from 'vitest';
import { applyImport, parseImport, serializeCookies } from '../../src/lib/importExport';
import { makeCookie, type ChromeMock } from '../chromeMock';

const mock = () => chrome as unknown as ChromeMock;

describe('serialize / parse round-trip', () => {
  it('re-imports every exported cookie', () => {
    const cookies = [
      makeCookie({ name: 'sid', domain: '.example.com', secure: true, expirationDate: 2000000000 }),
      makeCookie({
        name: 'part',
        domain: 'embed.com',
        partitionKey: { topLevelSite: 'https://top.com' },
      }),
    ];
    const { drafts, errors } = parseImport(serializeCookies(cookies));
    expect(errors).toEqual([]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].domain).toBe('.example.com');
    expect(drafts[0].session).toBe(false);
    expect(drafts[1].partitionKey).toEqual({ topLevelSite: 'https://top.com' });
  });
});

describe('parseImport', () => {
  it('rejects invalid JSON', () => {
    expect(parseImport('not json').errors[0].reason).toMatch(/JSON/);
  });

  it('rejects non-cookie payloads', () => {
    expect(parseImport('{"foo": 1}').errors[0].reason).toMatch(/Expected/);
  });

  it('accepts a bare array of cookie-shaped objects', () => {
    const { drafts, errors } = parseImport('[{"name": "a", "domain": "x.com", "value": "1"}]');
    expect(errors).toEqual([]);
    expect(drafts[0]).toMatchObject({ name: 'a', domain: 'x.com', session: true, path: '/' });
  });

  it('reports per-entry errors with their index and keeps valid entries', () => {
    const { drafts, errors } = parseImport(
      '[{"name": "ok", "domain": "x.com"}, {"domain": "no-name.com"}, 42]',
    );
    expect(drafts).toHaveLength(1);
    expect(errors).toEqual([
      { index: 1, reason: expect.stringMatching(/name/i) },
      { index: 2, reason: expect.stringMatching(/object/i) },
    ]);
  });
});

describe('applyImport', () => {
  it('sets cookies and reports failures individually', async () => {
    const { drafts } = parseImport(
      '[{"name": "good", "domain": "x.com"}, {"name": "bad", "domain": "x.com"}]',
    );
    mock()._rejectSetNames.add('bad');
    const result = await applyImport(drafts);
    expect(result.imported).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].draft.name).toBe('bad');
    expect(mock()._store.size).toBe(1);
  });
});
