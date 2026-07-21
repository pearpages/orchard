/**
 * In-memory fake of the chrome.* APIs the extension uses. Backed by a Map of
 * cookies keyed by identity, fires onChanged listeners like the real API.
 */
import { cookieKey } from '../src/lib/cookies';

type Cookie = chrome.cookies.Cookie;
type CookieChangeInfo = chrome.cookies.CookieChangeInfo;

interface Listener<T> {
  addListener(fn: T): void;
  removeListener(fn: T): void;
  fire(...args: unknown[]): void;
  listeners: T[];
}

function createEvent<T extends (...args: never[]) => void>(): Listener<T> {
  const listeners: T[] = [];
  return {
    listeners,
    addListener: (fn) => listeners.push(fn),
    removeListener: (fn) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    fire: (...args) => listeners.forEach((fn) => (fn as unknown as (...a: unknown[]) => void)(...args)),
  };
}

export interface ChromeMock {
  cookies: {
    getAll(details: chrome.cookies.GetAllDetails): Promise<Cookie[]>;
    set(details: chrome.cookies.SetDetails): Promise<Cookie | null>;
    remove(details: chrome.cookies.CookieDetails): Promise<chrome.cookies.CookieDetails | null>;
    getAllCookieStores(): Promise<chrome.cookies.CookieStore[]>;
    onChanged: Listener<(info: CookieChangeInfo) => void>;
  };
  storage: {
    local: {
      get(key: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
    onChanged: Listener<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>;
  };
  tabs: {
    query(info: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
    create(props: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>;
  };
  runtime: {
    getURL(path: string): string;
  };
  /** Test helpers, not part of the chrome API. */
  _store: Map<string, Cookie>;
  _seed(cookies: Partial<Cookie>[]): Cookie[];
  _storageData: Record<string, unknown>;
  _setActiveTabUrl(url: string): void;
  /** Names rejected by cookies.set to simulate Chrome refusing a cookie. */
  _rejectSetNames: Set<string>;
  /** Log of raw details passed to set/remove, for asserting exact API usage. */
  _setCalls: chrome.cookies.SetDetails[];
  _removeCalls: chrome.cookies.CookieDetails[];
}

export function makeCookie(partial: Partial<Cookie>): Cookie {
  return {
    name: 'cookie',
    value: 'value',
    domain: 'example.com',
    hostOnly: !(partial.domain ?? 'example.com').startsWith('.'),
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'unspecified',
    session: partial.expirationDate === undefined,
    storeId: '0',
    ...partial,
  } as Cookie;
}

function hostFromUrl(url: string): string {
  return new URL(url).hostname;
}

function domainMatches(cookieDomain: string, filter: string): boolean {
  const d = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
  const f = filter.startsWith('.') ? filter.slice(1) : filter;
  return d === f || d.endsWith(`.${f}`);
}

export function createChromeMock(): ChromeMock {
  const store = new Map<string, Cookie>();
  const storageData: Record<string, unknown> = {};
  let activeTabUrl = 'https://example.com/';
  const onCookieChanged = createEvent<(info: CookieChangeInfo) => void>();
  const onStorageChanged =
    createEvent<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>();

  const mock: ChromeMock = {
    _store: store,
    _storageData: storageData,
    _rejectSetNames: new Set(),
    _setCalls: [],
    _removeCalls: [],
    _seed(cookies) {
      return cookies.map((partial) => {
        const cookie = makeCookie(partial);
        store.set(cookieKey(cookie), cookie);
        return cookie;
      });
    },
    _setActiveTabUrl(url) {
      activeTabUrl = url;
    },
    cookies: {
      onChanged: onCookieChanged,
      async getAllCookieStores() {
        return [{ id: '0', tabIds: [1] }] as chrome.cookies.CookieStore[];
      },
      async getAll(details) {
        return [...store.values()].filter((c) => {
          if (details.storeId && c.storeId !== details.storeId) return false;
          if (details.name && c.name !== details.name) return false;
          if (details.domain && !domainMatches(c.domain, details.domain)) return false;
          if (details.partitionKey === undefined && c.partitionKey?.topLevelSite) return false;
          if (
            details.partitionKey?.topLevelSite &&
            c.partitionKey?.topLevelSite !== details.partitionKey.topLevelSite
          ) {
            return false;
          }
          return true;
        });
      },
      async set(details) {
        mock._setCalls.push(details);
        if (mock._rejectSetNames.has(details.name ?? '')) return null;
        if (details.sameSite === 'no_restriction' && !details.secure) return null;
        const cookie = makeCookie({
          name: details.name ?? '',
          value: details.value ?? '',
          domain: details.domain ?? hostFromUrl(details.url),
          hostOnly: details.domain === undefined,
          path: details.path ?? '/',
          secure: details.secure ?? false,
          httpOnly: details.httpOnly ?? false,
          sameSite: details.sameSite ?? 'unspecified',
          session: details.expirationDate === undefined,
          expirationDate: details.expirationDate,
          storeId: details.storeId ?? '0',
          partitionKey: details.partitionKey?.topLevelSite
            ? { topLevelSite: details.partitionKey.topLevelSite }
            : undefined,
        });
        const key = cookieKey(cookie);
        const existing = store.get(key);
        if (existing) {
          onCookieChanged.fire({ cookie: existing, removed: true, cause: 'overwrite' });
        }
        store.set(key, cookie);
        onCookieChanged.fire({ cookie, removed: false, cause: 'explicit' });
        return cookie;
      },
      async remove(details) {
        mock._removeCalls.push(details);
        const host = hostFromUrl(details.url);
        const path = new URL(details.url).pathname;
        const match = [...store.values()].find((c) => {
          const bare = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
          if (bare !== host || c.name !== details.name || c.path !== path) return false;
          if (details.storeId && c.storeId !== details.storeId) return false;
          if ((details.partitionKey?.topLevelSite ?? '') !== (c.partitionKey?.topLevelSite ?? '')) return false;
          return true;
        });
        if (!match) return null;
        store.delete(cookieKey(match));
        onCookieChanged.fire({ cookie: match, removed: true, cause: 'explicit' });
        return { url: details.url, name: details.name, storeId: match.storeId };
      },
    },
    storage: {
      onChanged: onStorageChanged,
      local: {
        async get(key) {
          if (key === null) return { ...storageData };
          const keys = Array.isArray(key) ? key : [key];
          const out: Record<string, unknown> = {};
          for (const k of keys) if (k in storageData) out[k] = storageData[k];
          return out;
        },
        async set(items) {
          const changes: Record<string, chrome.storage.StorageChange> = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: storageData[k], newValue: v };
            storageData[k] = v;
          }
          onStorageChanged.fire(changes, 'local');
        },
      },
    },
    tabs: {
      async query() {
        return [{ id: 1, url: activeTabUrl, active: true } as chrome.tabs.Tab];
      },
      async create(props) {
        return { id: 2, url: props.url } as chrome.tabs.Tab;
      },
    },
    runtime: {
      getURL: (path) => `chrome-extension://mock-extension-id/${path.replace(/^\//, '')}`,
    },
  };
  return mock;
}
