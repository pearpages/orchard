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
  /** A sentence or two more than the tagline — shown on the home directory cards. */
  description: string;
  /** 48px icon from @browser-plugins/assets (shared, hashed at build). */
  icon: ImageMetadata;
}

export const plugins: PluginMeta[] = [
  {
    slug: 'begone',
    name: 'Begone',
    tagline: 'Banishes unwanted elements the instant they appear.',
    description:
      'Ships with no rules of its own — you add the CSS selectors for cookie banners, newsletter popups and chat bubbles, and they vanish from every page the moment they render.',
    icon: begoneIcon,
  },
  {
    slug: 'cookiejar',
    name: 'CookieJar',
    tagline: 'A friendly cookie manager for developers.',
    description:
      'See, search, edit, protect and export cookies across every domain — with a JWT decoder, a change timeline, and cookies.txt / cURL interop for debugging auth flows.',
    icon: cookiejarIcon,
  },
  {
    slug: 'focaccia',
    name: 'Focaccia',
    tagline: 'Close the internet when it’s time to work.',
    description:
      'Block the sites that eat your afternoons with one switch, and pace the work with the built-in Pomodoro timer. An extension with an enamel kitchen-timer soul.',
    icon: focacciaIcon,
  },
  {
    slug: 'headerforge',
    name: 'HeaderForge',
    tagline: 'Rewrite request and response headers, on the wire.',
    description:
      'Profiles of header rules, scoped by URL filters and applied by Chrome’s declarative engine — they keep working even while the extension sleeps. Verified on the wire, not in DevTools.',
    icon: headerforgeIcon,
  },
  {
    slug: 'hopchase',
    name: 'HopChase',
    tagline: 'Every redirect hop — statuses, headers, and the SEO issues they hide.',
    description:
      'Reconstructs the whole journey behind a page load — server redirects, meta refreshes, JavaScript hops — with per-hop headers, IPs and latency, plus an on-demand URL tracer.',
    icon: hopchaseIcon,
  },
];
