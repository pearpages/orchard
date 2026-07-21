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

interface StorageArea {
  get(key: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string | string[]): Promise<void>;
}

export interface TabStorageData {
  local: Map<string, string>;
  session: Map<string, string>;
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
    local: StorageArea;
    session: StorageArea;
    onChanged: Listener<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>;
  };
  tabs: {
    query(info: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
    create(props: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>;
    onRemoved: Listener<(tabId: number) => void>;
    onUpdated: Listener<(tabId: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => void>;
  };
  scripting: {
    executeScript(details: {
      target: { tabId: number };
      func: (...args: never[]) => unknown;
      args?: unknown[];
    }): Promise<{ frameId: number; result: unknown }[]>;
  };
  browsingData: {
    remove(options: chrome.browsingData.RemovalOptions, dataTypes: chrome.browsingData.DataTypeSet): Promise<void>;
  };
  runtime: {
    getURL(path: string): string;
  };
  /** Test helpers, not part of the chrome API. */
  _store: Map<string, Cookie>;
  _seed(cookies: Partial<Cookie>[]): Cookie[];
  _storageData: Record<string, unknown>;
  _sessionData: Record<string, unknown>;
  _tabs: chrome.tabs.Tab[];
  _setTabs(tabs: Partial<chrome.tabs.Tab>[]): void;
  _setActiveTabUrl(url: string): void;
  /** Per-tab fake DOM storage read/written by the scripting.executeScript fake. */
  _tabStorage: Map<number, TabStorageData>;
  _seedTabStorage(tabId: number, local: Record<string, string>, session?: Record<string, string>): void;
  /** Tab ids where executeScript rejects (chrome://, discarded…). */
  _uninjectableTabIds: Set<number>;
  /** Names rejected by cookies.set to simulate Chrome refusing a cookie. */
  _rejectSetNames: Set<string>;
  /** Log of raw details passed to set/remove, for asserting exact API usage. */
  _setCalls: chrome.cookies.SetDetails[];
  _removeCalls: chrome.cookies.CookieDetails[];
  _browsingDataCalls: { options: chrome.browsingData.RemovalOptions; dataTypes: chrome.browsingData.DataTypeSet }[];
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

export function makeTab(partial: Partial<chrome.tabs.Tab>): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    url: 'https://example.com/',
    title: 'Example',
    active: false,
    discarded: false,
    status: 'complete',
    windowId: 1,
    pinned: false,
    highlighted: false,
    incognito: false,
    ...partial,
  } as chrome.tabs.Tab;
}

function hostFromUrl(url: string): string {
  return new URL(url).hostname;
}

function domainMatches(cookieDomain: string, filter: string): boolean {
  const d = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
  const f = filter.startsWith('.') ? filter.slice(1) : filter;
  return d === f || d.endsWith(`.${f}`);
}

/** Minimal DOM Storage lookalike over a Map, used by the executeScript fake. */
function storageShim(map: Map<string, string>) {
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

export function createChromeMock(): ChromeMock {
  const store = new Map<string, Cookie>();
  const onCookieChanged = createEvent<(info: CookieChangeInfo) => void>();
  const onStorageChanged =
    createEvent<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>();
  const onTabRemoved = createEvent<(tabId: number) => void>();
  const onTabUpdated =
    createEvent<(tabId: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => void>();

  function makeStorageArea(areaName: string, data: Record<string, unknown>): StorageArea {
    return {
      async get(key) {
        if (key === null) return { ...data };
        const keys = Array.isArray(key) ? key : [key];
        const out: Record<string, unknown> = {};
        for (const k of keys) if (k in data) out[k] = data[k];
        return out;
      },
      async set(items) {
        const changes: Record<string, chrome.storage.StorageChange> = {};
        for (const [k, v] of Object.entries(items)) {
          changes[k] = { oldValue: data[k], newValue: v };
          data[k] = v;
        }
        onStorageChanged.fire(changes, areaName);
      },
      async remove(key) {
        const keys = Array.isArray(key) ? key : [key];
        const changes: Record<string, chrome.storage.StorageChange> = {};
        for (const k of keys) {
          if (k in data) {
            changes[k] = { oldValue: data[k], newValue: undefined };
            delete data[k];
          }
        }
        onStorageChanged.fire(changes, areaName);
      },
    };
  }

  const storageData: Record<string, unknown> = {};
  const sessionData: Record<string, unknown> = {};
  const tabs: chrome.tabs.Tab[] = [makeTab({ id: 1, active: true })];
  const tabStorage = new Map<number, TabStorageData>();

  const mock: ChromeMock = {
    _store: store,
    _storageData: storageData,
    _sessionData: sessionData,
    _tabs: tabs,
    _tabStorage: tabStorage,
    _uninjectableTabIds: new Set(),
    _rejectSetNames: new Set(),
    _setCalls: [],
    _removeCalls: [],
    _browsingDataCalls: [],
    _seed(cookies) {
      return cookies.map((partial) => {
        const cookie = makeCookie(partial);
        store.set(cookieKey(cookie), cookie);
        return cookie;
      });
    },
    _setTabs(partials) {
      tabs.length = 0;
      partials.forEach((partial, index) => tabs.push(makeTab({ id: index + 1, index, ...partial })));
    },
    _setActiveTabUrl(url) {
      const active = tabs.find((t) => t.active) ?? tabs[0];
      if (active) active.url = url;
    },
    _seedTabStorage(tabId, local, session = {}) {
      tabStorage.set(tabId, {
        local: new Map(Object.entries(local)),
        session: new Map(Object.entries(session)),
      });
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
      local: makeStorageArea('local', storageData),
      session: makeStorageArea('session', sessionData),
    },
    tabs: {
      onRemoved: onTabRemoved,
      onUpdated: onTabUpdated,
      async query(info) {
        if (info.active) return tabs.filter((t) => t.active);
        return [...tabs];
      },
      async create(props) {
        return makeTab({ id: 99, url: props.url });
      },
    },
    scripting: {
      async executeScript({ target, func, args = [] }) {
        if (mock._uninjectableTabIds.has(target.tabId)) {
          throw new Error(`Cannot access contents of the page (tab ${target.tabId}).`);
        }
        let data = tabStorage.get(target.tabId);
        if (!data) {
          data = { local: new Map(), session: new Map() };
          tabStorage.set(target.tabId, data);
        }
        // Run the injected function against this tab's fake DOM storage.
        // jsdom defines localStorage as an accessor, so use defineProperty.
        const define = (name: string, value: unknown) =>
          Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
        const prevLocal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
        const prevSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
        define('localStorage', storageShim(data.local));
        define('sessionStorage', storageShim(data.session));
        try {
          const result = await (func as (...a: unknown[]) => unknown)(...args);
          return [{ frameId: 0, result }];
        } finally {
          if (prevLocal) Object.defineProperty(globalThis, 'localStorage', prevLocal);
          if (prevSession) Object.defineProperty(globalThis, 'sessionStorage', prevSession);
        }
      },
    },
    browsingData: {
      async remove(options, dataTypes) {
        mock._browsingDataCalls.push({ options, dataTypes });
      },
    },
    runtime: {
      getURL: (path) => `chrome-extension://mock-extension-id/${path.replace(/^\//, '')}`,
    },
  };
  return mock;
}
