import { describe, expect, it } from 'vitest';
import { decodeJwt, detectToken, isExpired, jwtTimes } from '../../src/lib/token';

function b64url(obj: unknown): string {
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload: unknown, header: unknown = { alg: 'HS256', typ: 'JWT' }, sig = 'fakesig'): string {
  return `${b64url(header)}.${b64url(payload)}.${sig}`;
}

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 300;

describe('decodeJwt', () => {
  it('decodes header and payload', () => {
    const jwt = decodeJwt(makeJwt({ sub: 'user-1', exp: FUTURE }));
    expect(jwt?.header).toMatchObject({ alg: 'HS256' });
    expect(jwt?.payload).toMatchObject({ sub: 'user-1', exp: FUTURE });
    expect(jwt?.signatureB64).toBe('fakesig');
  });

  it('handles segments that need base64 padding', () => {
    // "a" → payload length forces padding on decode
    const jwt = decodeJwt(makeJwt({ a: 1 }));
    expect(jwt?.payload).toEqual({ a: 1 });
  });

  it('decodes unicode claims', () => {
    const jwt = decodeJwt(makeJwt({ name: 'Pere Pagès — ✓' }));
    expect(jwt?.payload).toEqual({ name: 'Pere Pagès — ✓' });
  });

  it('keeps a non-JSON payload as payloadRaw', () => {
    const raw = `${b64url({ alg: 'none' })}.${b64url('not-json-at-all')}.`;
    const jwt = decodeJwt(raw);
    expect(jwt).not.toBeNull();
    expect(jwt?.payload).toBeNull();
    expect(jwt?.payloadRaw).toBe('not-json-at-all');
  });

  it('rejects candidates whose header is not a JWT header', () => {
    const raw = `${b64url({ foo: 'bar' })}.${b64url({ a: 1 })}.sig`;
    expect(decodeJwt(raw)).toBeNull();
  });
});

describe('detectToken', () => {
  it('finds a bare JWT', () => {
    const token = detectToken(makeJwt({ exp: FUTURE }));
    expect(token?.kind).toBe('jwt');
  });

  it('finds a JWT embedded in a larger value', () => {
    const token = detectToken(`Bearer ${makeJwt({ sub: 'x' })}; other=1`);
    expect(token?.kind).toBe('jwt');
  });

  it('finds a JWT inside a URL-encoded wrapper', () => {
    const wrapped = encodeURIComponent(JSON.stringify({ access_token: makeJwt({ sub: 'enc' }) }));
    const token = detectToken(wrapped);
    expect(token?.kind).toBe('jwt');
    if (token?.kind === 'jwt') expect(token.jwt.payload).toEqual({ sub: 'enc' });
  });

  it('finds a JWT inside a JSON wrapper', () => {
    const token = detectToken(JSON.stringify({ id_token: makeJwt({ sub: 'json' }) }));
    expect(token?.kind).toBe('jwt');
  });

  it('returns the first JWT when there are two', () => {
    const first = makeJwt({ n: 1 });
    const second = makeJwt({ n: 2 });
    const token = detectToken(`${first} ${second}`);
    if (token?.kind !== 'jwt') throw new Error('expected jwt');
    expect(token.jwt.payload).toEqual({ n: 1 });
  });

  it('rejects eyJ-prefixed garbage', () => {
    expect(detectToken('eyJhbGciOi.eyJzdWIiOi.sig')).toBeNull();
  });

  it('detects a whole-value base64 JSON blob', () => {
    const token = detectToken(btoa(JSON.stringify({ theme: 'dark' })));
    expect(token?.kind).toBe('base64-json');
    if (token?.kind === 'base64-json') expect(token.json).toEqual({ theme: 'dark' });
  });

  it('returns null for plain values', () => {
    expect(detectToken('')).toBeNull();
    expect(detectToken('hello world')).toBeNull();
    expect(detectToken('12345678')).toBeNull();
  });
});

describe('jwtTimes / isExpired', () => {
  it('converts exp/iat/nbf to dates', () => {
    const times = jwtTimes({ exp: FUTURE, iat: PAST, nbf: PAST });
    expect(times.exp?.getTime()).toBe(FUTURE * 1000);
    expect(times.iat?.getTime()).toBe(PAST * 1000);
    expect(times.nbf?.getTime()).toBe(PAST * 1000);
  });

  it('flags expiry correctly', () => {
    expect(isExpired({ exp: PAST })).toBe(true);
    expect(isExpired({ exp: FUTURE })).toBe(false);
    expect(isExpired({})).toBeUndefined();
    expect(isExpired(null)).toBeUndefined();
  });
});
