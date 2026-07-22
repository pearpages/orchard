import {
  BADGE_COLOR,
  BADGE_ERROR_TEXT,
  MAX_UNSAFE_DYNAMIC_RULES,
} from '../core/constants'
import { buildRules, countActiveHeaders } from '../core/rules'
import { createDefaultState } from '../core/state'
import type { AppState } from '../core/types'
import { loadState, saveState, subscribeToState } from '../storage/app-storage'

type Rule = chrome.declarativeNetRequest.Rule

async function replaceDynamicRules(rules: Rule[]): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: rules,
  })
}

async function applyState(state: AppState): Promise<void> {
  let rules = buildRules(state)
  let hadError = false

  if (rules.length > MAX_UNSAFE_DYNAMIC_RULES) {
    console.error(
      `Rule count ${rules.length} exceeds the ${MAX_UNSAFE_DYNAMIC_RULES} unsafe-dynamic-rule limit; truncating`,
    )
    rules = rules.slice(0, MAX_UNSAFE_DYNAMIC_RULES)
    hadError = true
  }

  try {
    await replaceDynamicRules(rules)
  } catch (error) {
    // Most likely an RE2-invalid regexFilter; keep everything else working.
    console.error('updateDynamicRules failed, retrying without regex rules', error)
    hadError = true
    try {
      await replaceDynamicRules(rules.filter((rule) => rule.condition.regexFilter === undefined))
    } catch (retryError) {
      console.error('Retry without regex rules failed; clearing all dynamic rules', retryError)
      await replaceDynamicRules([])
    }
  }

  const count = countActiveHeaders(state)
  await chrome.action.setBadgeText({
    text: hadError ? BADGE_ERROR_TEXT : count > 0 ? String(count) : '',
  })
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function scheduleApply(state: AppState): void {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void applyState(state), 150)
}

async function initialize(): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR })
  let state = await loadState()
  if (!state) {
    state = createDefaultState()
    await saveState(state)
  }
  await applyState(state)
}

chrome.runtime.onInstalled.addListener(() => void initialize())
chrome.runtime.onStartup.addListener(() => void initialize())
subscribeToState(scheduleApply)
