import { getBlockerState } from '../shared/storage';
import { buildBlockingRules } from './rules';

/**
 * Declarative sync: the dynamic rule set is always derived from storage —
 * the full blocklist when blocking is on, nothing when it is off.
 */
export async function syncBlockingRules(): Promise<void> {
  const { enabled, sites } = await getBlockerState();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: buildBlockingRules(sites, enabled, chrome.runtime.getURL('blocked/blocked.html')),
  });
}
