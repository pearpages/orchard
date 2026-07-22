import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'HopChase',
  description:
    'Redirect chain inspector: per-hop status, headers and latency for every navigation, SEO issue flags, on-demand URL tracing, HAR/CSV/JSON export.',
  version: '0.1.0',
  icons: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  permissions: ['webRequest', 'webNavigation', 'storage', 'tabs', 'scripting'],
  host_permissions: ['<all_urls>'],
})
