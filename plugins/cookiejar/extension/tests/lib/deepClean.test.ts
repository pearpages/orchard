import { describe, expect, it } from 'vitest';
import { buildOriginList, deepClean, ALL_DEEP_CLEAN_TYPES } from '../../src/lib/deepClean';
import { makeCookie, type ChromeMock } from '../chromeMock';

const mock = () => chrome as unknown as ChromeMock;

describe('buildOriginList', () => {
  it('includes the domain, cookie subdomains and matching tab hosts with ports', () => {
    const cookies = [
      makeCookie({ domain: '.example.com' }),
      makeCookie({ domain: 'auth.example.com' }),
      makeCookie({ domain: 'other.io' }),
    ];
    const tabUrls = [
      'https://app.example.com:8443/dashboard',
      'https://unrelated.dev/',
      'chrome://extensions/',
      'not a url',
    ];
    const origins = buildOriginList('example.com', cookies, tabUrls);
    expect(origins).toEqual([
      'http://app.example.com:8443',
      'http://auth.example.com',
      'http://example.com',
      'https://app.example.com:8443',
      'https://auth.example.com',
      'https://example.com',
    ]);
  });

  it('normalizes leading dots and dedupes', () => {
    const origins = buildOriginList('.example.com', [makeCookie({ domain: 'example.com' })], [
      'https://example.com/',
    ]);
    expect(origins).toEqual(['http://example.com', 'https://example.com']);
  });

  it('does not match lookalike domains', () => {
    const origins = buildOriginList('example.com', [makeCookie({ domain: 'notexample.com' })], []);
    expect(origins).toEqual(['http://example.com', 'https://example.com']);
  });
});

describe('deepClean', () => {
  it('passes exact origins and only the enabled storage types — never cookies', async () => {
    await deepClean(['https://example.com', 'http://example.com'], {
      ...ALL_DEEP_CLEAN_TYPES,
      serviceWorkers: false,
    });
    expect(mock()._browsingDataCalls).toHaveLength(1);
    const call = mock()._browsingDataCalls[0];
    expect(call.options).toEqual({ origins: ['https://example.com', 'http://example.com'] });
    expect(call.dataTypes).toEqual({ localStorage: true, indexedDB: true, cacheStorage: true });
    expect(call.dataTypes).not.toHaveProperty('cookies');
    expect(call.dataTypes).not.toHaveProperty('serviceWorkers');
  });

  it('is a no-op when nothing is selected or no origins exist', async () => {
    await deepClean([], ALL_DEEP_CLEAN_TYPES);
    await deepClean(['https://example.com'], {
      localStorage: false,
      indexedDB: false,
      serviceWorkers: false,
      cacheStorage: false,
    });
    expect(mock()._browsingDataCalls).toHaveLength(0);
  });
});
