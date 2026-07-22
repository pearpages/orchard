/** Where the sites live (each under /<slug>/, directory at the root). */
export const SITE = 'https://orchard.pearpages.com';

export interface PluginMeta {
  slug: 'begone' | 'focaccia' | 'cookiejar' | 'headerforge' | 'hopchase';
  name: string;
  tagline: string;
  /** Filename under each site's public/plugins/ (every site carries copies). */
  icon: string;
}

export const plugins: PluginMeta[] = [
  {
    slug: 'begone',
    name: 'Begone',
    tagline: 'Banishes unwanted elements the instant they appear.',
    icon: 'begone.png',
  },
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
  {
    slug: 'hopchase',
    name: 'HopChase',
    tagline: 'Every redirect hop — statuses, headers, and the SEO issues they hide.',
    icon: 'hopchase.png',
  },
];
