import { describe, expect, it } from 'vitest';
import { cookieKey } from '../../src/lib/cookies';
import {
  EMPTY_PROTECTION,
  isCookieProtected,
  isDomainProtected,
  loadProtection,
  partitionForBulkDelete,
  saveProtection,
  toggleEntry,
} from '../../src/lib/protection';
import { makeCookie } from '../chromeMock';

describe('isDomainProtected', () => {
  it('matches the domain itself and its subdomains, ignoring leading dots', () => {
    const state = { ...EMPTY_PROTECTION, protectedDomains: ['example.com'] };
    expect(isDomainProtected('example.com', state)).toBe(true);
    expect(isDomainProtected('.example.com', state)).toBe(true);
    expect(isDomainProtected('auth.example.com', state)).toBe(true);
    expect(isDomainProtected('notexample.com', state)).toBe(false);
  });
});

describe('isCookieProtected', () => {
  it('protects by exact cookie key', () => {
    const cookie = makeCookie({ name: 'sid', domain: 'a.com' });
    const state = { ...EMPTY_PROTECTION, protectedCookies: [cookieKey(cookie)] };
    expect(isCookieProtected(cookie, state)).toBe(true);
    expect(isCookieProtected(makeCookie({ name: 'other', domain: 'a.com' }), state)).toBe(false);
  });
});

describe('partitionForBulkDelete', () => {
  it('splits deletable from protected cookies', () => {
    const keep = makeCookie({ name: 'keep', domain: 'safe.com' });
    const drop = makeCookie({ name: 'drop', domain: 'other.com' });
    const state = { ...EMPTY_PROTECTION, protectedDomains: ['safe.com'] };
    const { deletable, skipped } = partitionForBulkDelete([keep, drop], state);
    expect(deletable).toEqual([drop]);
    expect(skipped).toEqual([keep]);
  });
});

describe('toggleEntry', () => {
  it('adds a missing entry and removes an existing one', () => {
    expect(toggleEntry([], 'a')).toEqual(['a']);
    expect(toggleEntry(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('persistence', () => {
  it('round-trips through chrome.storage.local and fills defaults', async () => {
    expect(await loadProtection()).toEqual(EMPTY_PROTECTION);
    const state = { ...EMPTY_PROTECTION, pinnedDomains: ['auth0.com'] };
    await saveProtection(state);
    expect(await loadProtection()).toEqual(state);
  });
});
