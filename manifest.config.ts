import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'CookieJar',
  version: '0.1.0',
  description:
    'A friendly cookie manager for developers. See, search, edit, protect, export and delete cookies across every domain.',
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'CookieJar',
  },
  options_page: 'src/manager/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['cookies', 'storage'],
  host_permissions: ['<all_urls>'],
  minimum_chrome_version: '119',
});
