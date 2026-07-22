/**
 * Builds the metadata-only description of a cookie that is sent to an AI
 * backend. PRIVACY INVARIANT: the raw cookie value must NEVER appear in the
 * output — only its length, detected format, and (for JWTs) header alg,
 * claim NAMES and timing. Unit tests enforce this.
 */
import { bareDomain, type Cookie } from '../cookies';
import { formatExpiry, formatExpiryAbsolute, SAME_SITE_LABELS } from '../format';
import { detectToken, jwtTimes } from '../token';

export const SYSTEM_PROMPT = `You are a browser-cookie expert embedded in CookieJar, a cookie manager for web developers.
The user asks about one specific cookie. You receive its metadata only — never its value.
Explain, concisely and in plain text (no markdown):
1. What this cookie most likely is and which service or library sets it. Recognize well-known names (_ga/_gid = Google Analytics, JSESSIONID/PHPSESSID = server sessions, auth0/__Host-next-auth = auth flows, _cf* = Cloudflare, etc.). If unsure, say what the naming pattern and attributes suggest.
2. Whether it looks functional, authentication-related, or tracking/analytics.
3. What likely breaks if the developer deletes it.
Keep answers short (3-6 sentences) unless asked to elaborate. If the metadata is not enough to be sure, say so honestly instead of overclaiming.`;

function describeValueFormat(value: string): string {
  if (value.length === 0) return 'empty';
  const token = detectToken(value);
  if (token?.kind === 'jwt') {
    const { jwt } = token;
    const parts: string[] = [`a JWT (alg: ${String(jwt.header.alg ?? 'unknown')})`];
    if (jwt.payload) {
      const claims = Object.keys(jwt.payload);
      if (claims.length > 0) parts.push(`claim names: ${claims.join(', ')}`);
      const times = jwtTimes(jwt.payload);
      if (times.exp) parts.push(`expires ${formatExpiry({ session: false, expirationDate: times.exp.getTime() / 1000 })}`);
    } else {
      parts.push('opaque payload');
    }
    return parts.join('; ');
  }
  if (token?.kind === 'base64-json') {
    return `base64-encoded JSON (keys: ${Object.keys(token.json).join(', ')})`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'a UUID';
  if (/^[0-9a-f]+$/i.test(value)) return 'a hex string';
  if (/^\d+$/.test(value)) return 'numeric';
  if (/^[A-Za-z0-9+/_-]+=*$/.test(value)) return 'base64-like opaque data';
  return 'an opaque string';
}

/** Metadata-only context block. Never includes the raw value. */
export function buildCookieContext(cookie: Cookie): string {
  const lines = [
    `Cookie name: ${cookie.name}`,
    `Domain: ${bareDomain(cookie.domain)}${cookie.hostOnly ? ' (host-only)' : ' (domain cookie, incl. subdomains)'}`,
    `Path: ${cookie.path}`,
    `Expiry: ${cookie.session ? 'session cookie' : `${formatExpiry(cookie)} (${formatExpiryAbsolute(cookie)})`}`,
    `Flags: Secure=${cookie.secure}, HttpOnly=${cookie.httpOnly}, SameSite=${SAME_SITE_LABELS[cookie.sameSite]}`,
    `Value: ${cookie.value.length} characters, looks like ${describeValueFormat(cookie.value)} (raw value withheld for privacy)`,
  ];
  if (cookie.partitionKey?.topLevelSite) {
    lines.push(`Partitioned (CHIPS) under top-level site: ${cookie.partitionKey.topLevelSite}`);
  }
  return lines.join('\n');
}

export interface AiTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** First user turn: context + the default or custom question. */
export function buildInitialQuestion(cookie: Cookie, question?: string): string {
  return `${buildCookieContext(cookie)}\n\nQuestion: ${question?.trim() || 'What is this cookie about?'}`;
}
