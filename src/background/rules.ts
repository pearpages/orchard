/**
 * Pure derivation of declarativeNetRequest rules from the blocker state —
 * no storage or API calls, so it is unit-testable in isolation.
 */
export function regexFilterFor(site: string): string {
  const escaped = site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `^https?://([^/]+\\.)?${escaped}(:\\d+)?/`;
}

/**
 * One redirect rule per blocked site: any main-frame request to the domain
 * (or a subdomain of it) lands on the extension's blocked page.
 */
export function buildBlockingRules(
  sites: string[],
  enabled: boolean,
  blockedPageUrl: string,
): chrome.declarativeNetRequest.Rule[] {
  if (!enabled) return [];
  return sites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    condition: {
      regexFilter: regexFilterFor(site),
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        regexSubstitution: `${blockedPageUrl}?site=${encodeURIComponent(site)}`,
      },
    },
  }));
}
