import { setFromCookie, type Cookie, type CookieDraft, type SameSite } from './cookies';

export const EXPORT_FORMAT = 'cookiejar/v1';

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  cookies: Cookie[];
}

export function serializeCookies(cookies: Cookie[], exportedAt: Date = new Date()): string {
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    exportedAt: exportedAt.toISOString(),
    cookies,
  };
  return JSON.stringify(file, null, 2);
}

export interface ImportError {
  index: number;
  reason: string;
}

export interface ParsedImport {
  drafts: CookieDraft[];
  errors: ImportError[];
}

const SAME_SITE_VALUES: SameSite[] = ['no_restriction', 'lax', 'strict', 'unspecified'];

function draftFromRaw(raw: unknown, index: number): CookieDraft | ImportError {
  if (typeof raw !== 'object' || raw === null) {
    return { index, reason: 'Entry is not an object.' };
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || !r.name.trim()) {
    return { index, reason: 'Missing cookie name.' };
  }
  if (typeof r.domain !== 'string' || !r.domain.trim()) {
    return { index, reason: `Cookie "${r.name}" is missing a domain.` };
  }
  const expirationDate = typeof r.expirationDate === 'number' ? r.expirationDate : undefined;
  const sameSite = SAME_SITE_VALUES.includes(r.sameSite as SameSite)
    ? (r.sameSite as SameSite)
    : 'unspecified';
  return {
    name: r.name,
    value: typeof r.value === 'string' ? r.value : '',
    domain: r.domain,
    hostOnly: r.hostOnly === true || !(r.domain as string).startsWith('.'),
    path: typeof r.path === 'string' && r.path.startsWith('/') ? r.path : '/',
    secure: r.secure === true,
    httpOnly: r.httpOnly === true,
    sameSite,
    session: r.session === true || expirationDate === undefined,
    expirationDate,
    storeId: typeof r.storeId === 'string' ? r.storeId : undefined,
    partitionKey:
      typeof r.partitionKey === 'object' && r.partitionKey !== null
        ? (r.partitionKey as chrome.cookies.CookiePartitionKey)
        : undefined,
  };
}

/**
 * Parses exported JSON. Accepts the cookiejar/v1 format or a bare array of
 * cookie-shaped objects (for interop with other tools).
 */
export function parseImport(text: string): ParsedImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { drafts: [], errors: [{ index: -1, reason: 'Not valid JSON.' }] };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as ExportFile).cookies)
      ? (parsed as ExportFile).cookies
      : null;
  if (!list) {
    return {
      drafts: [],
      errors: [{ index: -1, reason: 'Expected a cookiejar export or an array of cookies.' }],
    };
  }
  const drafts: CookieDraft[] = [];
  const errors: ImportError[] = [];
  list.forEach((raw, index) => {
    const result = draftFromRaw(raw, index);
    if ('reason' in result) errors.push(result);
    else drafts.push(result);
  });
  return { drafts, errors };
}

export interface ImportResult {
  imported: number;
  failed: { draft: CookieDraft; reason: string }[];
}

/** Applies parsed drafts sequentially, collecting per-cookie failures. */
export async function applyImport(drafts: CookieDraft[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, failed: [] };
  for (const draft of drafts) {
    try {
      await setFromCookie(draft);
      result.imported += 1;
    } catch (error) {
      result.failed.push({ draft, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}
