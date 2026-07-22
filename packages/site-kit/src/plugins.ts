/** Where the sites will live once deployed (each under /<slug>/). */
export const SITE = 'https://plugins.pearpages.com';

export interface PluginMeta {
  slug: 'focaccia' | 'cookiejar' | 'headerforge';
  name: string;
  tagline: string;
  /** Filename under each site's public/plugins/ (every site carries copies). */
  icon: string;
}

export const plugins: PluginMeta[] = [
  {
    slug: 'cookiejar',
    name: 'CookieJar',
    tagline: 'A friendly cookie manager for developers.',
    icon: 'cookiejar.png',
  },
  {
    slug: 'focaccia',
    name: 'Focaccia',
    tagline: 'Close the internet when it’s time to work.',
    icon: 'focaccia.png',
  },
  {
    slug: 'headerforge',
    name: 'HeaderForge',
    tagline: 'Rewrite request and response headers, on the wire.',
    icon: 'headerforge.png',
  },
];
