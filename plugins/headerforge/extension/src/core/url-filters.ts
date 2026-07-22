import type { UrlFilter } from './types'

export type RuleConditionPatch = Pick<
  chrome.declarativeNetRequest.RuleCondition,
  'urlFilter' | 'regexFilter'
>

export function filterToCondition(filter: UrlFilter): RuleConditionPatch {
  if (filter.kind === 'regex') {
    return { regexFilter: filter.pattern }
  }
  // DNR urlFilter already does substring matching; anchors (||, |, ^, *) pass through.
  return { urlFilter: filter.pattern }
}

/**
 * Syntax pre-check only. DNR uses RE2 (a subset of JS regex), so the popup
 * additionally validates with chrome.declarativeNetRequest.isRegexSupported.
 */
export function validateRegexPattern(pattern: string): { ok: boolean; error?: string } {
  try {
    new RegExp(pattern)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
