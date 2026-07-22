import { describe, expect, it } from 'vitest';
import { filterCookies, groupByDomain, parseQuery } from '../../src/lib/filter';
import { makeCookie } from '../chromeMock';

const cookies = [
  makeCookie({ name: 'session', domain: 'example.com', value: 'abc' }),
  makeCookie({ name: 'theme', domain: '.example.com', value: 'dark' }),
  makeCookie({ name: 'ga_id', domain: 'analytics.io', value: 'xyz-example' }),
  makeCookie({ name: 'auth0_state', domain: 'tenant.auth0.com', value: 'tok' }),
];

describe('parseQuery', () => {
  it('extracts domain: and name: prefixes and free text', () => {
    expect(parseQuery('domain:auth0 name:state token')).toEqual({
      domain: 'auth0',
      name: 'state',
      text: ['token'],
    });
  });
});

describe('filterCookies', () => {
  it('returns everything for an empty query', () => {
    expect(filterCookies(cookies, '  ')).toHaveLength(4);
  });

  it('matches substrings across domain, name and value', () => {
    expect(filterCookies(cookies, 'dark').map((c) => c.name)).toEqual(['theme']);
    expect(filterCookies(cookies, 'auth0').map((c) => c.name)).toEqual(['auth0_state']);
  });

  it('scopes domain: to the domain only', () => {
    // "example" appears in analytics.io's value but domain: must not match it
    expect(filterCookies(cookies, 'domain:example').map((c) => c.name)).toEqual([
      'session',
      'theme',
    ]);
  });

  it('is case-insensitive', () => {
    expect(filterCookies(cookies, 'SESSION')).toHaveLength(1);
  });
});

describe('groupByDomain', () => {
  it('merges dot-domain and bare-domain cookies into one group', () => {
    const groups = groupByDomain(cookies);
    const example = groups.find((g) => g.domain === 'example.com');
    expect(example?.cookies).toHaveLength(2);
  });

  it('sorts pinned domains first, then alphabetically', () => {
    const groups = groupByDomain(cookies, ['tenant.auth0.com']);
    expect(groups[0].domain).toBe('tenant.auth0.com');
    expect(groups[0].pinned).toBe(true);
    expect(groups.slice(1).map((g) => g.domain)).toEqual(['analytics.io', 'example.com']);
  });
});
