import { describe, expect, it } from 'vitest';
import { buildCookieContext, buildInitialQuestion, SYSTEM_PROMPT } from '../../src/lib/ai/context';
import { makeCookie } from '../chromeMock';

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('buildCookieContext', () => {
  it('includes name, domain, path, flags and expiry', () => {
    const cookie = makeCookie({
      name: '_ga',
      domain: '.example.com',
      path: '/app',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expirationDate: 2000000000,
    });
    const context = buildCookieContext(cookie);
    expect(context).toContain('_ga');
    expect(context).toContain('example.com');
    expect(context).toContain('/app');
    expect(context).toContain('Secure=true');
    expect(context).toContain('HttpOnly=true');
    expect(context).toContain('SameSite=Lax');
  });

  it('describes a JWT by alg and claim NAMES but never claim values', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const secret = 'super-secret-subject-id-42';
    const jwt = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: secret, exp, role: 'admin' })}.sig`;
    const cookie = makeCookie({ name: 'token', domain: 'auth0.example.com', value: jwt });
    const context = buildCookieContext(cookie);
    expect(context).toContain('JWT');
    expect(context).toContain('HS256');
    expect(context).toContain('sub');
    expect(context).toContain('role');
    // Claim VALUES must not leak
    expect(context).not.toContain(secret);
    expect(context).not.toContain('admin');
  });

  it('never includes the raw value for opaque, base64-JSON or JWT cookies', () => {
    const values = [
      'e1c9a4f7-8823-4c1b-9d2e-aa10240cd8e1',
      btoa(JSON.stringify({ theme: 'dark', token: 'leaky' })),
      `${b64url({ alg: 'none' })}.${b64url({ sub: 'x' })}.`,
      'GS1.1.1721541000.4.1.1721541833.0.0.0',
    ];
    for (const value of values) {
      const cookie = makeCookie({ name: 'c', domain: 'x.com', value });
      const context = buildCookieContext(cookie);
      expect(context).not.toContain(value);
    }
  });

  it('handles an empty value', () => {
    const context = buildCookieContext(makeCookie({ name: 'empty', value: '' }));
    expect(context).toContain('0 characters');
    expect(context).toContain('empty');
  });

  it('notes CHIPS partitioning', () => {
    const cookie = makeCookie({
      name: 'p',
      domain: 'embed.com',
      partitionKey: { topLevelSite: 'https://top.com' },
    });
    expect(buildCookieContext(cookie)).toContain('https://top.com');
  });
});

describe('buildInitialQuestion', () => {
  it('embeds the context and defaults the question', () => {
    const q = buildInitialQuestion(makeCookie({ name: 'sid' }));
    expect(q).toContain('Cookie name: sid');
    expect(q).toContain('What is this cookie about?');
  });

  it('uses a custom question when given', () => {
    const q = buildInitialQuestion(makeCookie({ name: 'sid' }), 'Is this a tracker?');
    expect(q).toContain('Is this a tracker?');
  });
});

describe('SYSTEM_PROMPT', () => {
  it('is a non-empty stable string', () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(50);
    expect(SYSTEM_PROMPT).toContain('CookieJar');
  });
});
