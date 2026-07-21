export type Cookie = chrome.cookies.Cookie;
export type SameSite = chrome.cookies.Cookie['sameSite'];
export type PartitionKey = chrome.cookies.CookiePartitionKey;

/**
 * Editable representation of a cookie. Unlike chrome.cookies.Cookie this can
 * describe a cookie that does not exist yet.
 */
export interface CookieDraft {
  name: string;
  value: string;
  /** May carry a leading dot for domain cookies; ignored when hostOnly. */
  domain: string;
  hostOnly: boolean;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSite;
  /** Session cookie: no expirationDate is sent. */
  session: boolean;
  /** Seconds since epoch. Required when session is false. */
  expirationDate?: number;
  storeId?: string;
  partitionKey?: PartitionKey;
}

/** Strips the leading dot of a domain cookie. */
export function bareDomain(domain: string): string {
  return domain.startsWith('.') ? domain.slice(1) : domain;
}

/**
 * Reconstructs a URL that scopes this cookie. chrome.cookies.set/remove
 * require a url — a bare domain is not accepted.
 */
export function cookieUrl(c: Pick<CookieDraft, 'domain' | 'path' | 'secure'>): string {
  const scheme = c.secure ? 'https' : 'http';
  return `${scheme}://${bareDomain(c.domain)}${c.path || '/'}`;
}

/**
 * Canonical identity of a cookie. Used for React keys, protection entries and
 * delete targets — never build this by hand elsewhere.
 */
export function cookieKey(
  c: Pick<Cookie, 'storeId' | 'domain' | 'path' | 'name'> & { partitionKey?: PartitionKey },
): string {
  return [c.storeId, c.domain, c.path, c.name, c.partitionKey?.topLevelSite ?? ''].join('|');
}

/**
 * Every cookie in the browser: all cookie stores, and (on Chrome 119+) both
 * unpartitioned and CHIPS-partitioned cookies.
 */
export async function listAll(): Promise<Cookie[]> {
  const stores = await chrome.cookies.getAllCookieStores();
  const perStore = await Promise.all(
    stores.map(async (store) => {
      try {
        // partitionKey: {} means "unpartitioned AND all partitioned cookies".
        return await chrome.cookies.getAll({ storeId: store.id, partitionKey: {} });
      } catch {
        // Older Chrome without partitionKey support.
        return chrome.cookies.getAll({ storeId: store.id });
      }
    }),
  );
  return perStore.flat();
}

/** Cookies that apply to (or share a site with) the given host. */
export function cookiesForHost(cookies: Cookie[], host: string): Cookie[] {
  const h = host.toLowerCase();
  return cookies.filter((c) => {
    const d = bareDomain(c.domain).toLowerCase();
    return d === h || h.endsWith(`.${d}`) || d.endsWith(`.${h}`);
  });
}

function removeDetails(c: Cookie): chrome.cookies.CookieDetails {
  return {
    url: cookieUrl(c),
    name: c.name,
    storeId: c.storeId,
    ...(c.partitionKey ? { partitionKey: c.partitionKey } : {}),
  };
}

/** Deletes one cookie, targeting it exactly (url + name + storeId + partitionKey). */
export async function removeCookie(c: Cookie): Promise<void> {
  const result = await chrome.cookies.remove(removeDetails(c));
  if (!result) {
    throw new Error(`Could not delete cookie "${c.name}" on ${c.domain}`);
  }
}

/** Bulk delete. Never throws; reports which cookies failed. */
export async function removeCookies(cookies: Cookie[]): Promise<{ deleted: Cookie[]; failed: Cookie[] }> {
  const deleted: Cookie[] = [];
  const failed: Cookie[] = [];
  for (const c of cookies) {
    try {
      await removeCookie(c);
      deleted.push(c);
    } catch {
      failed.push(c);
    }
  }
  return { deleted, failed };
}

/** Validation errors for a draft; empty array means the draft is settable. */
export function validateDraft(draft: CookieDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('Name is required.');
  if (/[;=\s]/.test(draft.name)) errors.push('Name cannot contain spaces, ";" or "=".');
  if (!draft.domain.trim()) errors.push('Domain is required.');
  if (!draft.path.startsWith('/')) errors.push('Path must start with "/".');
  if (!draft.session && draft.expirationDate === undefined) {
    errors.push('Pick an expiry date or mark the cookie as a session cookie.');
  }
  if (draft.sameSite === 'no_restriction' && !draft.secure) {
    errors.push('SameSite=None requires the Secure flag.');
  }
  if (draft.name.startsWith('__Host-')) {
    if (!draft.secure) errors.push('__Host- cookies must be Secure.');
    if (!draft.hostOnly) errors.push('__Host- cookies cannot set a domain (must be host-only).');
    if (draft.path !== '/') errors.push('__Host- cookies must use path "/".');
  } else if (draft.name.startsWith('__Secure-') && !draft.secure) {
    errors.push('__Secure- cookies must be Secure.');
  }
  return errors;
}

function toSetDetails(draft: CookieDraft): chrome.cookies.SetDetails {
  return {
    url: cookieUrl(draft),
    name: draft.name,
    value: draft.value,
    // A host-only cookie is created by OMITTING domain, not by passing it.
    ...(draft.hostOnly ? {} : { domain: draft.domain }),
    path: draft.path,
    secure: draft.secure,
    httpOnly: draft.httpOnly,
    sameSite: draft.sameSite,
    // A session cookie is created by OMITTING expirationDate.
    ...(draft.session ? {} : { expirationDate: draft.expirationDate }),
    ...(draft.storeId ? { storeId: draft.storeId } : {}),
    ...(draft.partitionKey ? { partitionKey: draft.partitionKey } : {}),
  };
}

/** Creates or overwrites a cookie from a draft. Throws on validation or API failure. */
export async function setFromCookie(draft: CookieDraft): Promise<Cookie> {
  const errors = validateDraft(draft);
  if (errors.length) throw new Error(errors.join(' '));
  const result = await chrome.cookies.set(toSetDetails(draft));
  if (!result) {
    throw new Error(`Chrome rejected the cookie "${draft.name}" for ${draft.domain}.`);
  }
  return result;
}

/** Converts an existing cookie back into an editable draft. */
export function draftFromCookie(c: Cookie): CookieDraft {
  return {
    name: c.name,
    value: c.value,
    domain: c.domain,
    hostOnly: c.hostOnly,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    session: c.session,
    expirationDate: c.expirationDate,
    storeId: c.storeId,
    partitionKey: c.partitionKey,
  };
}

/**
 * Cookies have no mutable identity: editing means remove + set. If the new
 * cookie is rejected, the original is restored on a best-effort basis.
 */
export async function updateCookie(oldCookie: Cookie, draft: CookieDraft): Promise<Cookie> {
  const errors = validateDraft(draft);
  if (errors.length) throw new Error(errors.join(' '));
  await removeCookie(oldCookie);
  try {
    return await setFromCookie(draft);
  } catch (error) {
    await setFromCookie(draftFromCookie(oldCookie)).catch(() => undefined);
    throw error;
  }
}
