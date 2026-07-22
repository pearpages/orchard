import { describe, expect, it } from 'vitest';
import {
  cookieKey,
  cookieUrl,
  cookiesForHost,
  draftFromCookie,
  listAll,
  removeCookie,
  setFromCookie,
  updateCookie,
  validateDraft,
  type CookieDraft,
} from '../../src/lib/cookies';
import { makeCookie, type ChromeMock } from '../chromeMock';

const mock = () => chrome as unknown as ChromeMock;

function draft(partial: Partial<CookieDraft> = {}): CookieDraft {
  return {
    name: 'token',
    value: 'abc',
    domain: 'example.com',
    hostOnly: true,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    session: true,
    ...partial,
  };
}

describe('cookieUrl', () => {
  it('strips the leading dot of domain cookies', () => {
    expect(cookieUrl({ domain: '.example.com', path: '/', secure: false })).toBe('http://example.com/');
  });

  it('uses https for secure cookies and keeps the path', () => {
    expect(cookieUrl({ domain: 'api.example.com', path: '/auth', secure: true })).toBe(
      'https://api.example.com/auth',
    );
  });
});

describe('cookieKey', () => {
  it('distinguishes cookies that differ only by partition', () => {
    const plain = makeCookie({ name: 'sid', domain: '.example.com' });
    const partitioned = makeCookie({
      name: 'sid',
      domain: '.example.com',
      partitionKey: { topLevelSite: 'https://other.site' },
    });
    expect(cookieKey(plain)).not.toBe(cookieKey(partitioned));
  });

  it('distinguishes host-only from dot-domain cookies', () => {
    expect(cookieKey(makeCookie({ domain: 'example.com' }))).not.toBe(
      cookieKey(makeCookie({ domain: '.example.com' })),
    );
  });
});

describe('listAll', () => {
  it('returns cookies from all stores including partitioned ones', async () => {
    mock()._seed([
      { name: 'a', domain: 'one.com' },
      { name: 'b', domain: 'two.com', partitionKey: { topLevelSite: 'https://embedder.com' } },
    ]);
    const all = await listAll();
    expect(all.map((c) => c.name).sort()).toEqual(['a', 'b']);
  });
});

describe('cookiesForHost', () => {
  it('matches exact host, parent-domain cookies and subdomain cookies', () => {
    const cookies = [
      makeCookie({ name: 'exact', domain: 'app.example.com' }),
      makeCookie({ name: 'parent', domain: '.example.com' }),
      makeCookie({ name: 'sibling', domain: 'auth.example.com' }),
      makeCookie({ name: 'unrelated', domain: 'other.io' }),
    ];
    const forHost = cookiesForHost(cookies, 'example.com').map((c) => c.name);
    expect(forHost).toContain('parent');
    expect(forHost).toContain('exact');
    expect(forHost).toContain('sibling');
    expect(forHost).not.toContain('unrelated');
  });
});

describe('setFromCookie', () => {
  it('omits domain for host-only cookies', async () => {
    await setFromCookie(draft({ hostOnly: true }));
    expect(mock()._setCalls[0].domain).toBeUndefined();
    expect(mock()._setCalls[0].url).toBe('http://example.com/');
  });

  it('passes domain for domain cookies', async () => {
    await setFromCookie(draft({ hostOnly: false, domain: '.example.com' }));
    expect(mock()._setCalls[0].domain).toBe('.example.com');
  });

  it('omits expirationDate for session cookies', async () => {
    await setFromCookie(draft({ session: true, expirationDate: 123 }));
    expect(mock()._setCalls[0]).not.toHaveProperty('expirationDate');
  });

  it('sends expirationDate for persistent cookies', async () => {
    await setFromCookie(draft({ session: false, expirationDate: 2000000000 }));
    expect(mock()._setCalls[0].expirationDate).toBe(2000000000);
  });

  it('echoes storeId and partitionKey', async () => {
    await setFromCookie(
      draft({ storeId: '1', partitionKey: { topLevelSite: 'https://embedder.com' }, secure: true }),
    );
    expect(mock()._setCalls[0].storeId).toBe('1');
    expect(mock()._setCalls[0].partitionKey).toEqual({ topLevelSite: 'https://embedder.com' });
  });

  it('throws when chrome rejects the cookie', async () => {
    mock()._rejectSetNames.add('token');
    await expect(setFromCookie(draft())).rejects.toThrow(/rejected/);
  });
});

describe('validateDraft', () => {
  it('rejects SameSite=None without Secure', () => {
    expect(validateDraft(draft({ sameSite: 'no_restriction', secure: false }))).toContainEqual(
      expect.stringContaining('Secure'),
    );
    expect(validateDraft(draft({ sameSite: 'no_restriction', secure: true }))).toEqual([]);
  });

  it('enforces __Host- rules: secure, host-only, path /', () => {
    const errors = validateDraft(
      draft({ name: '__Host-sid', secure: false, hostOnly: false, path: '/app' }),
    );
    expect(errors).toHaveLength(3);
    expect(
      validateDraft(draft({ name: '__Host-sid', secure: true, hostOnly: true, path: '/' })),
    ).toEqual([]);
  });

  it('enforces __Secure- prefix', () => {
    expect(validateDraft(draft({ name: '__Secure-sid', secure: false }))).toContainEqual(
      expect.stringContaining('__Secure-'),
    );
  });

  it('requires an expiry for persistent cookies', () => {
    expect(validateDraft(draft({ session: false, expirationDate: undefined }))).toContainEqual(
      expect.stringContaining('expiry'),
    );
  });
});

describe('removeCookie', () => {
  it('targets the exact url, name, storeId and partitionKey', async () => {
    const [cookie] = mock()._seed([
      {
        name: 'sid',
        domain: '.example.com',
        path: '/auth',
        secure: true,
        partitionKey: { topLevelSite: 'https://embedder.com' },
      },
    ]);
    await removeCookie(cookie);
    expect(mock()._removeCalls[0]).toEqual({
      url: 'https://example.com/auth',
      name: 'sid',
      storeId: '0',
      partitionKey: { topLevelSite: 'https://embedder.com' },
    });
    expect(mock()._store.size).toBe(0);
  });

  it('throws when the cookie cannot be found', async () => {
    await expect(removeCookie(makeCookie({ name: 'ghost' }))).rejects.toThrow(/Could not delete/);
  });
});

describe('updateCookie', () => {
  it('removes the old cookie and sets the new one', async () => {
    const [old] = mock()._seed([{ name: 'sid', domain: 'example.com', value: 'old' }]);
    await updateCookie(old, { ...draftFromCookie(old), value: 'new' });
    const remaining = [...mock()._store.values()];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].value).toBe('new');
  });

  it('restores the old cookie when the new one is rejected', async () => {
    const [old] = mock()._seed([{ name: 'sid', domain: 'example.com', value: 'old' }]);
    mock()._rejectSetNames.add('renamed');
    await expect(
      updateCookie(old, { ...draftFromCookie(old), name: 'renamed' }),
    ).rejects.toThrow();
    const remaining = [...mock()._store.values()];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('sid');
    expect(remaining[0].value).toBe('old');
  });
});
