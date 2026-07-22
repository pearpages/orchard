import { bareDomain, setFromCookie, type Cookie, type CookieDraft, type SameSite } from './cookies';

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

const CSV_COLUMNS = [
  'name',
  'value',
  'domain',
  'path',
  'expirationDate',
  'secure',
  'httpOnly',
  'sameSite',
  'session',
  'storeId',
  'partitionKey',
] as const;

function csvEscape(field: string): string {
  return /[",\n\r]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

/** CSV export (RFC 4180) — for spreadsheets and non-JSON tooling. */
export function serializeCookiesCsv(cookies: Cookie[]): string {
  const rows = cookies.map((c) =>
    [
      c.name,
      c.value,
      c.domain,
      c.path,
      c.session || c.expirationDate === undefined ? '' : String(c.expirationDate),
      String(c.secure),
      String(c.httpOnly),
      c.sameSite,
      String(c.session),
      c.storeId,
      c.partitionKey?.topLevelSite ?? '',
    ]
      .map(csvEscape)
      .join(','),
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\n');
}

/** Minimal RFC 4180 reader: quotes, escaped quotes, newlines inside quotes. */
function readCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
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

const NETSCAPE_HEADER = '# Netscape HTTP Cookie File';
const HTTPONLY_PREFIX = '#HttpOnly_';

/**
 * Netscape cookies.txt — the format curl, wget and yt-dlp consume.
 * 7 tab-separated fields per line; HttpOnly cookies use curl's
 * `#HttpOnly_` domain prefix convention.
 */
export function serializeNetscape(cookies: Cookie[]): string {
  const lines = cookies.map((c) => {
    const domain = (c.httpOnly ? HTTPONLY_PREFIX : '') + c.domain;
    const includeSubdomains = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const expires = c.session || c.expirationDate === undefined ? '0' : String(Math.floor(c.expirationDate));
    return [domain, includeSubdomains, c.path, c.secure ? 'TRUE' : 'FALSE', expires, c.name, c.value].join('\t');
  });
  return [NETSCAPE_HEADER, '# Exported by CookieJar', '', ...lines].join('\n');
}

/** Parses a Netscape cookies.txt file. */
export function parseNetscape(text: string): ParsedImport {
  const drafts: CookieDraft[] = [];
  const errors: ImportError[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const httpOnly = trimmed.startsWith(HTTPONLY_PREFIX);
    if (trimmed.startsWith('#') && !httpOnly) return;
    const fields = (httpOnly ? trimmed.slice(HTTPONLY_PREFIX.length) : trimmed).split('\t');
    if (fields.length !== 7) {
      errors.push({ index, reason: `Line ${index + 1}: expected 7 tab-separated fields, got ${fields.length}.` });
      return;
    }
    const [domain, , path, secure, expires, name, value] = fields;
    const expirationDate = Number(expires);
    const session = !Number.isFinite(expirationDate) || expirationDate <= 0;
    const result = draftFromRaw(
      {
        name,
        value,
        domain,
        hostOnly: !domain.startsWith('.'),
        path,
        secure: secure.toUpperCase() === 'TRUE',
        httpOnly,
        sameSite: 'unspecified',
        session,
        expirationDate: session ? undefined : expirationDate,
      },
      index,
    );
    if ('reason' in result) errors.push(result);
    else drafts.push(result);
  });
  if (drafts.length === 0 && errors.length === 0) {
    errors.push({ index: -1, reason: 'No cookie lines found in the cookies.txt file.' });
  }
  return { drafts, errors };
}

function looksLikeNetscape(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines[0]?.startsWith(NETSCAPE_HEADER)) return true;
  return lines.some((l) => l.split('\t').length === 7);
}

/** `name=value; name2=value2` — ready for a Cookie: request header. */
export function cookieHeaderString(cookies: Cookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

function shellEscapeSingleQuotes(text: string): string {
  return text.replace(/'/g, "'\\''");
}

/** Ready-to-run curl command that sends this domain's cookies. */
export function curlCommand(domain: string, cookies: Cookie[]): string {
  const url = `https://${bareDomain(domain)}/`;
  return `curl '${url}' -H 'Cookie: ${shellEscapeSingleQuotes(cookieHeaderString(cookies))}'`;
}

/** Parses a CSV export (ours, or anything with name/domain columns). */
export function parseCsv(text: string): ParsedImport {
  const rows = readCsvRows(text);
  if (rows.length < 2) {
    return { drafts: [], errors: [{ index: -1, reason: 'CSV needs a header row and at least one cookie row.' }] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  if (!header.includes('name') || !header.includes('domain')) {
    return { drafts: [], errors: [{ index: -1, reason: 'CSV header must include "name" and "domain" columns.' }] };
  }
  const col = (row: string[], name: string): string | undefined => {
    const i = header.indexOf(name);
    return i >= 0 ? row[i] : undefined;
  };
  const drafts: CookieDraft[] = [];
  const errors: ImportError[] = [];
  rows.slice(1).forEach((row, index) => {
    const expirationText = col(row, 'expirationdate')?.trim() ?? '';
    const expirationDate = expirationText === '' ? undefined : Number(expirationText);
    const partitionSite = col(row, 'partitionkey')?.trim();
    const raw: Record<string, unknown> = {
      name: col(row, 'name'),
      value: col(row, 'value') ?? '',
      domain: col(row, 'domain'),
      path: col(row, 'path'),
      expirationDate: Number.isFinite(expirationDate) ? expirationDate : undefined,
      secure: col(row, 'secure')?.trim().toLowerCase() === 'true',
      httpOnly: col(row, 'httponly')?.trim().toLowerCase() === 'true',
      sameSite: col(row, 'samesite')?.trim(),
      session: col(row, 'session')?.trim().toLowerCase() === 'true',
      storeId: col(row, 'storeid')?.trim() || undefined,
      partitionKey: partitionSite ? { topLevelSite: partitionSite } : undefined,
    };
    const result = draftFromRaw(raw, index);
    if ('reason' in result) errors.push(result);
    else drafts.push(result);
  });
  return { drafts, errors };
}

/** JSON first (cookiejar or EditThisCookie-style arrays), then Netscape cookies.txt, then CSV. */
export function parseImportAuto(text: string): ParsedImport {
  const asJson = parseImport(text);
  if (asJson.errors.some((e) => e.index === -1 && /JSON/.test(e.reason))) {
    return looksLikeNetscape(text) ? parseNetscape(text) : parseCsv(text);
  }
  return asJson;
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
