import type { ImageMetadata } from 'astro';
import begoneIcon from '@browser-plugins/assets/plugins/begone.png';
import cookiejarIcon from '@browser-plugins/assets/plugins/cookiejar.png';
import focacciaIcon from '@browser-plugins/assets/plugins/focaccia.png';
import headerforgeIcon from '@browser-plugins/assets/plugins/headerforge.png';
import hopchaseIcon from '@browser-plugins/assets/plugins/hopchase.png';

/** Where the sites live (each under /<slug>/, directory at the root). */
export const SITE = 'https://orchard.pearpages.com';

export interface PluginMeta {
  slug: 'begone' | 'focaccia' | 'cookiejar' | 'headerforge' | 'hopchase';
  name: string;
  tagline: string;
  /** 48px icon from @browser-plugins/assets (shared, hashed at build). */
  icon: ImageMetadata;
}

export const plugins: PluginMeta[] = [
  {
    slug: 'begone',
    name: 'Begone',
    tagline: 'Banishes unwanted elements the instant they appear.',
    icon: begoneIcon,
  },
  {
    slug: 'cookiejar',
    name: 'CookieJar',
    tagline: 'A friendly cookie manager for developers.',
    icon: cookiejarIcon,
  },
  {
    slug: 'focaccia',
    name: 'Focaccia',
    tagline: 'Close the internet when it’s time to work.',
    icon: focacciaIcon,
  },
  {
    slug: 'headerforge',
    name: 'HeaderForge',
    tagline: 'Rewrite request and response headers, on the wire.',
    icon: headerforgeIcon,
  },
  {
    slug: 'hopchase',
    name: 'HopChase',
    tagline: 'Every redirect hop — statuses, headers, and the SEO issues they hide.',
    icon: hopchaseIcon,
  },
];
