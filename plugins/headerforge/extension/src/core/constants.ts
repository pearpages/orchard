export const STORAGE_KEY = 'appState'

/** modifyHeaders rules are "unsafe" dynamic rules: capped at 5000, not the 30k session limit. */
export const MAX_UNSAFE_DYNAMIC_RULES = 5000

export const BADGE_COLOR = '#4a7dff'
export const BADGE_ERROR_TEXT = '!'

/**
 * Explicit full list so main-frame navigations are unambiguously covered
 * (a condition without resourceTypes excludes main_frame for some rule types).
 */
export const ALL_RESOURCE_TYPES: `${chrome.declarativeNetRequest.ResourceType}`[] = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
]
