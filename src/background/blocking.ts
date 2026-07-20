import { getBlockerState } from '../shared/storage';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One redirect rule per blocked site: any main-frame request to the domain
 * (or a subdomain of it) lands on the extension's blocked page.
 */
function ruleFor(site: string, id: number): chrome.declarativeNetRequest.Rule {
  const blockedPage = chrome.runtime.getURL('blocked/blocked.html');
  return {
    id,
    priority: 1,
    condition: {
      regexFilter: `^https?://([^/]+\\.)?${escapeRegex(site)}(:\\d+)?/`,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        regexSubstitution: `${blockedPage}?site=${encodeURIComponent(site)}`,
      },
    },
  };
}

/**
 * Declarative sync: the dynamic rule set is always derived from storage —
 * the full blocklist when blocking is on, nothing when it is off.
 */
export async function syncBlockingRules(): Promise<void> {
  const { enabled, sites } = await getBlockerState();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: enabled ? sites.map((site, index) => ruleFor(site, index + 1)) : [],
  });
}
