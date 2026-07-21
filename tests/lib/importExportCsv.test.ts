import { describe, expect, it } from 'vitest';
import {
  parseCsv,
  parseImport,
  parseImportAuto,
  serializeCookies,
  serializeCookiesCsv,
} from '../../src/lib/importExport';
import { makeCookie } from '../chromeMock';

describe('CSV round-trip', () => {
  it('re-imports every exported cookie with flags, expiry and partition intact', () => {
    const cookies = [
      makeCookie({
        name: 'sid',
        domain: '.example.com',
        path: '/auth',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        expirationDate: 2000000000,
      }),
      makeCookie({ name: 'sess', domain: 'app.example.com' }),
      makeCookie({
        name: 'part',
        domain: 'embed.com',
        partitionKey: { topLevelSite: 'https://top.com' },
      }),
    ];
    const { drafts, errors } = parseCsv(serializeCookiesCsv(cookies));
    expect(errors).toEqual([]);
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toMatchObject({
      name: 'sid',
      domain: '.example.com',
      path: '/auth',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      session: false,
      expirationDate: 2000000000,
      hostOnly: false,
    });
    expect(drafts[1]).toMatchObject({ name: 'sess', session: true, hostOnly: true });
    expect(drafts[2].partitionKey).toEqual({ topLevelSite: 'https://top.com' });
  });

  it('escapes commas, quotes, newlines and unicode', () => {
    const cookies = [
      makeCookie({ name: 'tricky', domain: 'x.com', value: 'a,b "quoted"\nnew línia ✓' }),
    ];
    const csv = serializeCookiesCsv(cookies);
    expect(csv).toContain('"a,b ""quoted""\nnew línia ✓"');
    const { drafts, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(drafts[0].value).toBe('a,b "quoted"\nnew línia ✓');
  });
});

describe('parseCsv errors', () => {
  it('rejects headerless or empty input', () => {
    expect(parseCsv('').errors[0].reason).toMatch(/header/i);
    expect(parseCsv('foo,bar\n1,2').errors[0].reason).toMatch(/name.*domain/i);
  });

  it('reports per-row errors with their index and keeps valid rows', () => {
    const csv = 'name,domain,value\nok,x.com,1\n,missing.com,2';
    const { drafts, errors } = parseCsv(csv);
    expect(drafts).toHaveLength(1);
    expect(errors).toEqual([{ index: 1, reason: expect.stringMatching(/name/i) }]);
  });
});

describe('parseImportAuto', () => {
  it('routes JSON to the JSON parser and CSV to the CSV parser', () => {
    const cookies = [makeCookie({ name: 'a', domain: 'x.com' })];
    expect(parseImportAuto(serializeCookies(cookies)).drafts).toHaveLength(1);
    expect(parseImportAuto(serializeCookiesCsv(cookies)).drafts).toHaveLength(1);
  });

  it('reports garbage cleanly', () => {
    const { drafts, errors } = parseImportAuto('complete nonsense');
    expect(drafts).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('EditThisCookie compatibility', () => {
  it('imports a realistic EditThisCookie export array', () => {
    const etc = JSON.stringify([
      {
        domain: '.example.com',
        expirationDate: 1785000000.123456,
        hostOnly: false,
        httpOnly: true,
        name: 'sid',
        path: '/',
        sameSite: 'no_restriction',
        secure: true,
        session: false,
        storeId: '0',
        value: 'abc123',
        id: 1,
      },
      {
        domain: 'app.example.com',
        hostOnly: true,
        httpOnly: false,
        name: 'theme',
        path: '/',
        sameSite: null,
        secure: false,
        session: true,
        storeId: '0',
        value: 'dark',
        id: 2,
      },
    ]);
    const { drafts, errors } = parseImport(etc);
    expect(errors).toEqual([]);
    expect(drafts[0]).toMatchObject({
      name: 'sid',
      domain: '.example.com',
      hostOnly: false,
      sameSite: 'no_restriction',
      secure: true,
      session: false,
    });
    // sameSite: null (ETC quirk) falls back to unspecified
    expect(drafts[1]).toMatchObject({ name: 'theme', hostOnly: true, sameSite: 'unspecified', session: true });
  });
});
