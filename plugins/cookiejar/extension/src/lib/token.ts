/**
 * Detection and decoding of tokens embedded in cookie / storage values:
 * JWTs (found anywhere inside the value, incl. URL-encoded wrappers) and
 * whole-value base64-encoded JSON blobs. Pure — no chrome APIs.
 */

export interface DecodedJwt {
  header: Record<string, unknown>;
  /** null when the payload segment is not JSON ("opaque payload"). */
  payload: Record<string, unknown> | null;
  payloadRaw: string;
  signatureB64: string;
  /** The matched token substring. */
  raw: string;
}

export type DetectedToken =
  | { kind: 'jwt'; jwt: DecodedJwt }
  | { kind: 'base64-json'; json: Record<string, unknown> };

// A JWT header always starts with '{"' → base64url 'eyJ'. Empty signature is
// legal (alg: none).
const JWT_RE = /eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/;

function base64UrlDecode(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    // TextDecoder, not bare atob output: claims may contain non-ASCII.
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function parseJsonObject(text: string | null): Record<string, unknown> | null {
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Decodes a candidate JWT string; null when the header isn't a JWT header. */
export function decodeJwt(token: string): DecodedJwt | null {
  const [headerB64, payloadB64, signatureB64 = ''] = token.split('.');
  if (!headerB64 || !payloadB64) return null;
  const header = parseJsonObject(base64UrlDecode(headerB64));
  if (!header || !('alg' in header || 'typ' in header)) return null;
  const payloadText = base64UrlDecode(payloadB64);
  return {
    header,
    payload: parseJsonObject(payloadText),
    payloadRaw: payloadText ?? payloadB64,
    signatureB64,
    raw: token,
  };
}

function findJwt(text: string): DecodedJwt | null {
  const match = JWT_RE.exec(text);
  return match ? decodeJwt(match[0]) : null;
}

/**
 * Finds a token in a raw value: first JWT match wins (also scanning the
 * URL-decoded form), else the whole value as a base64 JSON blob.
 */
export function detectToken(value: string): DetectedToken | null {
  let jwt = findJwt(value);
  if (!jwt && value.includes('%')) {
    try {
      jwt = findJwt(decodeURIComponent(value));
    } catch {
      // malformed percent-encoding — ignore
    }
  }
  if (jwt) return { kind: 'jwt', jwt };

  const trimmed = value.trim();
  if (trimmed.length >= 8 && /^[A-Za-z0-9+/_-]+=*$/.test(trimmed)) {
    const json = parseJsonObject(base64UrlDecode(trimmed));
    if (json) return { kind: 'base64-json', json };
  }
  return null;
}

export interface JwtTimes {
  exp?: Date;
  iat?: Date;
  nbf?: Date;
}

export function jwtTimes(payload: Record<string, unknown> | null): JwtTimes {
  const times: JwtTimes = {};
  if (!payload) return times;
  for (const claim of ['exp', 'iat', 'nbf'] as const) {
    const v = payload[claim];
    if (typeof v === 'number' && Number.isFinite(v)) times[claim] = new Date(v * 1000);
  }
  return times;
}

/** undefined when the payload has no exp claim. */
export function isExpired(payload: Record<string, unknown> | null, now: Date = new Date()): boolean | undefined {
  const { exp } = jwtTimes(payload);
  return exp === undefined ? undefined : exp.getTime() <= now.getTime();
}
