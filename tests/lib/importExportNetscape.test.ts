import { describe, expect, it } from 'vitest';
import {
  cookieHeaderString,
  curlCommand,
  parseImportAuto,
  parseNetscape,
  serializeCookies,
  serializeCookiesCsv,
  serializeNetscape,
} from '../../src/lib/importExport';
import { makeCookie } from '../chromeMock';

const jar = [
  makeCookie({
    name: 'sid',
    domain: '.example.com',
    path: '/auth',
    secure: true,
    httpOnly: true,
    expirationDate: 2000000000.7,
  }),
  makeCookie({ name: 'theme', domain: 'app.example.com', value: 'dark' }),
];

describe('serializeNetscape', () => {
  it('renders the exact 7-field TSV lines with the curl HttpOnly convention', () => {
    const text = serializeNetscape(jar);
    const lines = text.split('\n');
    expect(lines[0]).toBe('# Netscape HTTP Cookie File');
    expect(lines).toContain('#HttpOnly_.example.com\tTRUE\t/auth\tTRUE\t2000000000\tsid\tvalue');
    expect(lines).toContain('app.example.com\tFALSE\t/\tFALSE\t0\ttheme\tdark');
  });
});

describe('parseNetscape', () => {
  it('round-trips a mixed jar', () => {
    const { drafts, errors } = parseNetscape(serializeNetscape(jar));
    expect(errors).toEqual([]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      name: 'sid',
      domain: '.example.com',
      path: '/auth',
      secure: true,
      httpOnly: true,
      hostOnly: false,
      session: false,
      expirationDate: 2000000000,
    });
    expect(drafts[1]).toMatchObject({
      name: 'theme',
      domain: 'app.example.com',
      hostOnly: true,
      session: true,
      httpOnly: false,
    });
  });

  it('skips comments and blanks, reports malformed lines with their index', () => {
    const text = [
      '# Netscape HTTP Cookie File',
      '',
      '# a comment',
      'example.com\tFALSE\t/\tFALSE\t0\tok\t1',
      'broken line without tabs',
    ].join('\n');
    const { drafts, errors } = parseNetscape(text);
    expect(drafts).toHaveLength(1);
    expect(errors).toEqual([{ index: 4, reason: expect.stringMatching(/7 tab-separated/) }]);
  });

  it('rejects files with no cookie lines', () => {
    expect(parseNetscape('# just comments\n').errors[0].reason).toMatch(/No cookie lines/);
  });
});

describe('parseImportAuto format detection', () => {
  it('routes each format to its parser', () => {
    expect(parseImportAuto(serializeCookies(jar)).drafts).toHaveLength(2);
    expect(parseImportAuto(serializeCookiesCsv(jar)).drafts).toHaveLength(2);
    expect(parseImportAuto(serializeNetscape(jar)).drafts).toHaveLength(2);
    // headerless cookies.txt (some tools omit the banner) still detected by tab count
    const headerless = serializeNetscape(jar).split('\n').slice(3).join('\n');
    expect(parseImportAuto(headerless).drafts).toHaveLength(2);
  });
});

describe('cookieHeaderString / curlCommand', () => {
  it('builds a Cookie header in order', () => {
    expect(cookieHeaderString(jar)).toBe('sid=value; theme=dark');
  });

  it('builds a runnable curl command with escaped single quotes', () => {
    const tricky = [makeCookie({ name: 'q', domain: '.example.com', value: "it's" })];
    expect(curlCommand('.example.com', tricky)).toBe(
      `curl 'https://example.com/' -H 'Cookie: q=it'\\''s'`,
    );
  });
});
