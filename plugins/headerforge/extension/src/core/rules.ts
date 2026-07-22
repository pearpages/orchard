import type { AppState, HeaderEntry } from './types'
import { ALL_RESOURCE_TYPES } from './constants'
import { filterToCondition } from './url-filters'

type Rule = chrome.declarativeNetRequest.Rule
type ModifyHeaderInfo = chrome.declarativeNetRequest.ModifyHeaderInfo

export function headerToModification(entry: HeaderEntry): ModifyHeaderInfo {
  if (entry.operation === 'remove') {
    // DNR rejects a `value` key on remove operations.
    return { header: entry.name, operation: 'remove' }
  }
  return { header: entry.name, operation: entry.operation, value: entry.value }
}

function activeEntries(entries: HeaderEntry[]): HeaderEntry[] {
  return entries.filter((entry) => entry.enabled && entry.name.trim() !== '')
}

export function buildRules(state: AppState): Rule[] {
  const rules: Rule[] = []
  const enabledProfiles = state.profiles.filter((profile) => profile.enabled)
  let nextId = 1

  enabledProfiles.forEach((profile, index) => {
    const requestHeaders = activeEntries(profile.requestHeaders).map(headerToModification)
    const responseHeaders = activeEntries(profile.responseHeaders).map(headerToModification)
    if (requestHeaders.length === 0 && responseHeaders.length === 0) return

    const action: Rule['action'] = { type: 'modifyHeaders' }
    if (requestHeaders.length > 0) action.requestHeaders = requestHeaders
    if (responseHeaders.length > 0) action.responseHeaders = responseHeaders

    const enabledFilters = profile.urlFilters.filter(
      (filter) => filter.enabled && filter.pattern.trim() !== '',
    )
    // A DNR condition holds a single urlFilter/regexFilter, so N filters fan out to N rules.
    const conditionPatches = enabledFilters.length > 0 ? enabledFilters.map(filterToCondition) : [{}]

    for (const patch of conditionPatches) {
      rules.push({
        id: nextId++,
        priority: enabledProfiles.length - index,
        action,
        condition: { ...patch, resourceTypes: [...ALL_RESOURCE_TYPES] },
      })
    }
  })

  return rules
}

export function countActiveHeaders(state: AppState): number {
  return state.profiles
    .filter((profile) => profile.enabled)
    .reduce(
      (count, profile) =>
        count +
        activeEntries(profile.requestHeaders).length +
        activeEntries(profile.responseHeaders).length,
      0,
    )
}
