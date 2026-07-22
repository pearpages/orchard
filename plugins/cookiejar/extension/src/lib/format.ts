import type { Cookie } from './cookies';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Session", "in 3 days", "in 2 h", "expired 5 min ago" … */
export function formatExpiry(cookie: Pick<Cookie, 'session' | 'expirationDate'>, now: Date = new Date()): string {
  if (cookie.session || cookie.expirationDate === undefined) return 'Session';
  const delta = cookie.expirationDate - now.getTime() / 1000;
  const abs = Math.abs(delta);
  let amount: string;
  if (abs >= 2 * DAY) amount = `${Math.round(abs / DAY)} days`;
  else if (abs >= DAY) amount = '1 day';
  else if (abs >= HOUR) amount = `${Math.round(abs / HOUR)} h`;
  else if (abs >= MINUTE) amount = `${Math.round(abs / MINUTE)} min`;
  else amount = 'seconds';
  return delta >= 0 ? `in ${amount}` : `expired ${amount} ago`;
}

/** Absolute date-time for tooltips. */
export function formatExpiryAbsolute(cookie: Pick<Cookie, 'session' | 'expirationDate'>): string {
  if (cookie.session || cookie.expirationDate === undefined) return 'Expires when the browser closes';
  return new Date(cookie.expirationDate * 1000).toLocaleString();
}

export function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export const SAME_SITE_LABELS: Record<chrome.cookies.SameSiteStatus, string> = {
  no_restriction: 'None',
  lax: 'Lax',
  strict: 'Strict',
  unspecified: '—',
};
