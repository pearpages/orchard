import { ERR_HOP_CAP, ERR_TOO_MANY_REDIRECTS, MAX_HEALTHY_REDIRECTS } from './constants'
import type { Chain, Issue } from './types'
import { normalizeUrl, protocolOf } from './url-utils'

export function detectIssues(chain: Chain): Issue[] {
  const issues: Issue[] = []
  const { hops } = chain
  const redirectCount = Math.max(0, hops.length - 1)

  if (redirectCount > MAX_HEALTHY_REDIRECTS) {
    issues.push({
      rule: 'too-many-hops',
      severity: 'warning',
      hopIndex: null,
      message: `${redirectCount} redirects before the final document — every hop adds latency and dilutes link signal.`,
    })
  }

  const seen = new Map<string, number>()
  let loop: Issue | null = null
  for (const [index, hop] of hops.entries()) {
    const key = normalizeUrl(hop.url)
    const firstIndex = seen.get(key)
    if (firstIndex !== undefined && !loop) {
      loop = {
        rule: 'redirect-loop',
        severity: 'error',
        hopIndex: index,
        message: `Redirect loop: ${hop.url} was already visited at hop ${firstIndex + 1}.`,
      }
    }
    seen.set(key, seen.get(key) ?? index)
  }
  if (!loop && hops.some((hop) => hop.error === ERR_TOO_MANY_REDIRECTS || hop.error === ERR_HOP_CAP)) {
    loop = {
      rule: 'redirect-loop',
      severity: 'error',
      hopIndex: hops.length - 1,
      message: 'The browser gave up: too many redirects.',
    }
  }
  if (loop) issues.push(loop)

  for (const [index, hop] of hops.entries()) {
    if (hop.statusCode === 302 || hop.statusCode === 307) {
      issues.push({
        rule: 'temporary-redirect',
        severity: 'info',
        hopIndex: index,
        message: `${hop.statusCode} is a temporary redirect — use 301/308 if the move is permanent so search engines transfer ranking.`,
      })
    }
    if (['meta', 'js', 'client'].includes(hop.redirectKind)) {
      issues.push({
        rule: 'client-redirect',
        severity: 'warning',
        hopIndex: index,
        message: `Hop ${index + 1} redirects client-side (${hop.redirectKind}) — slower than a server 301 and passes less signal.`,
      })
    }
    const next = hops[index + 1]
    if (next) {
      const from = protocolOf(hop.url)
      const to = protocolOf(next.url)
      if (from === 'https' && to === 'http') {
        issues.push({
          rule: 'protocol-downgrade',
          severity: 'error',
          hopIndex: index,
          message: `Hop ${index + 1} downgrades HTTPS to HTTP.`,
        })
      } else if (from === 'http' && to === 'https') {
        issues.push({
          rule: 'http-upgrade-hop',
          severity: 'info',
          hopIndex: index,
          message: `Hop ${index + 1} exists only to upgrade to HTTPS — link the HTTPS URL directly.`,
        })
      }
    }
  }

  const finalHop = hops[hops.length - 1]
  if (finalHop?.statusCode != null && finalHop.statusCode >= 400) {
    issues.push({
      rule: 'final-error-status',
      severity: 'error',
      hopIndex: hops.length - 1,
      message: `The chain ends in ${finalHop.statusCode} — redirects are pointing at a broken target.`,
    })
  }

  if (chain.canonicalUrl && chain.finalUrl && normalizeUrl(chain.canonicalUrl) !== normalizeUrl(chain.finalUrl)) {
    issues.push({
      rule: 'canonical-mismatch',
      severity: 'warning',
      hopIndex: null,
      message: `The final document declares canonical ${chain.canonicalUrl} — the redirect target may not be the indexable URL.`,
    })
  }

  return issues
}
