import { bareDomain, type Cookie } from './cookies';

export interface ParsedQuery {
  domain?: string;
  name?: string;
  text: string[];
}

/**
 * Parses a search query. Supports `domain:foo` and `name:bar` prefixes;
 * remaining words match domain, name and value as substrings.
 */
export function parseQuery(query: string): ParsedQuery {
  const parsed: ParsedQuery = { text: [] };
  for (const token of query.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
    if (token.startsWith('domain:')) parsed.domain = token.slice('domain:'.length);
    else if (token.startsWith('name:')) parsed.name = token.slice('name:'.length);
    else parsed.text.push(token);
  }
  return parsed;
}

export function filterCookies(cookies: Cookie[], query: string): Cookie[] {
  const { domain, name, text } = parseQuery(query);
  if (!domain && !name && text.length === 0) return cookies;
  return cookies.filter((c) => {
    const cDomain = bareDomain(c.domain).toLowerCase();
    const cName = c.name.toLowerCase();
    const cValue = c.value.toLowerCase();
    if (domain && !cDomain.includes(domain)) return false;
    if (name && !cName.includes(name)) return false;
    return text.every((t) => cDomain.includes(t) || cName.includes(t) || cValue.includes(t));
  });
}

export interface DomainGroup {
  /** Normalized domain (no leading dot). */
  domain: string;
  cookies: Cookie[];
  pinned: boolean;
}

/**
 * Groups cookies by normalized domain (`.example.com` and `example.com`
 * merge), pinned domains first, then alphabetical.
 */
export function groupByDomain(cookies: Cookie[], pinnedDomains: string[] = []): DomainGroup[] {
  const pinned = new Set(pinnedDomains.map((d) => bareDomain(d).toLowerCase()));
  const groups = new Map<string, Cookie[]>();
  for (const c of cookies) {
    const domain = bareDomain(c.domain).toLowerCase();
    const list = groups.get(domain);
    if (list) list.push(c);
    else groups.set(domain, [c]);
  }
  return [...groups.entries()]
    .map(([domain, list]) => ({
      domain,
      cookies: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      pinned: pinned.has(domain),
    }))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.domain.localeCompare(b.domain);
    });
}
