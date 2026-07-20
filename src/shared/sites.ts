const SITE_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Turns free-form input ("https://www.YouTube.com/watch?v=x") into a bare
 * domain ("youtube.com"), or null when no valid domain can be extracted.
 */
export function normalizeSite(input: string): string | null {
  let value = input.trim().toLowerCase();
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.split(/[/?#]/)[0] ?? '';
  value = value.replace(/:\d+$/, '');
  value = value.replace(/^www\./, '');
  return SITE_PATTERN.test(value) ? value : null;
}
