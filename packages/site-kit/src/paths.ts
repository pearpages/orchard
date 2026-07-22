/**
 * Join a public-asset path onto the site's base URL. Astro's BASE_URL is '/'
 * today and '/<slug>' once the sites deploy under one domain; it may or may
 * not carry a trailing slash, so normalize both sides.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base.endsWith('/') ? base.slice(0, -1) : base}/${path.replace(/^\//, '')}`;
}
