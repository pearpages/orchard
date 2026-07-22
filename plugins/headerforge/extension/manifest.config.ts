import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'HeaderForge',
  description:
    'Modify HTTP request and response headers per profile, with URL filters. A ModHeader-style extension built on declarativeNetRequest.',
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
  permissions: ['declarativeNetRequest', 'storage'],
  host_permissions: ['<all_urls>'],
})
