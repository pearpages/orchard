/**
 * Lets popup.html be opened as a plain page (outside Chrome's extension
 * runtime) while working on styles: installs an in-memory stand-in for the
 * few chrome.* APIs the popup touches. A no-op inside the real extension.
 */
export function installDevMock(): void {
  if (typeof chrome !== 'undefined' && chrome.storage) return;

  const listeners: Array<() => void> = [];
  const data: Record<string, unknown> = {};
  const area = {
    get: (defaults: Record<string, unknown>) => Promise.resolve({ ...defaults, ...data }),
    set: (patch: Record<string, unknown>) => {
      Object.assign(data, patch);
      queueMicrotask(() => listeners.forEach((listener) => listener()));
      return Promise.resolve();
    },
  };

  (globalThis as { chrome?: unknown }).chrome = {
    storage: {
      sync: area,
      local: area,
      onChanged: { addListener: (listener: () => void) => listeners.push(listener) },
    },
    runtime: { sendMessage: () => Promise.resolve({}) },
  };
}
