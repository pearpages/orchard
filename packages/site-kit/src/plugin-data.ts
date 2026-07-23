/**
 * Plain plugin data — no image imports, erasable TS only (no enums), so it is
 * importable both by plugins.ts (which attaches the icons) and by plain Node
 * scripts (scripts/generate-og.mjs relies on Node 24 type stripping).
 */

/** Where the sites live (each under /<slug>/, directory at the root). */
export const SITE = 'https://orchard.pearpages.com';

export type PluginSlug = 'begone' | 'focaccia' | 'cookiejar' | 'headerforge' | 'hopchase';

export interface PluginData {
  slug: PluginSlug;
  name: string;
  tagline: string;
  /** A sentence or two more than the tagline — shown on the home directory cards. */
  description: string;
}

export const pluginData: PluginData[] = [
  {
    slug: 'begone',
    name: 'Begone',
    tagline: 'Banishes unwanted elements the instant they appear.',
    description:
      'Ships with no rules of its own — you add the CSS selectors for cookie banners, newsletter popups and chat bubbles, and they vanish from every page the moment they render.',
  },
  {
    slug: 'cookiejar',
    name: 'CookieJar',
    tagline: 'A friendly cookie manager for developers.',
    description:
      'See, search, edit, protect and export cookies across every domain — with a JWT decoder, a change timeline, and cookies.txt / cURL interop for debugging auth flows.',
  },
  {
    slug: 'focaccia',
    name: 'Focaccia',
    tagline: 'Close the internet when it’s time to work.',
    description:
      'Block the sites that eat your afternoons with one switch, and pace the work with the built-in Pomodoro timer. An extension with an enamel kitchen-timer soul.',
  },
  {
    slug: 'headerforge',
    name: 'HeaderForge',
    tagline: 'Rewrite request and response headers, on the wire.',
    description:
      'Profiles of header rules, scoped by URL filters and applied by Chrome’s declarative engine — they keep working even while the extension sleeps. Verified on the wire, not in DevTools.',
  },
  {
    slug: 'hopchase',
    name: 'HopChase',
    tagline: 'Every redirect hop — statuses, headers, and the SEO issues they hide.',
    description:
      'Reconstructs the whole journey behind a page load — server redirects, meta refreshes, JavaScript hops — with per-hop headers, IPs and latency, plus an on-demand URL tracer.',
  },
];

/** Home directory site — single source for its page meta and og card. */
export const homeCard = {
  name: 'orchard',
  title: 'orchard — browser plugins by pearpages',
  tagline: 'A small orchard of Chrome extensions — grown by hand, loaded unpacked.',
  /** Second half of the meta description — the og card shows tagline + blurb without repeating. */
  blurb: 'Element removal, cookies, headers, redirects and focus.',
  description:
    'A small orchard of Chrome extensions — grown by hand, loaded unpacked. Element removal, cookies, headers, redirects and focus.',
};
