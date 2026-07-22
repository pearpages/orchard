import { describe, expect, it } from 'vitest'
import { ERR_TOO_MANY_REDIRECTS } from '../constants'
import { detectIssues } from '../issues'
import type { IssueRuleId } from '../types'
import { makeChain, makeHop } from './factories'

const rules = (chain: Parameters<typeof detectIssues>[0]): IssueRuleId[] => detectIssues(chain).map((i) => i.rule)

describe('detectIssues', () => {
  it('reports nothing for a healthy single 301 to a 200', () => {
    const chain = makeChain({
      hops: [
        makeHop({ url: 'https://a.example/', statusCode: 301, redirectKind: 'http' }),
        makeHop({ url: 'https://b.example/', statusCode: 200 }),
      ],
      finalUrl: 'https://b.example/',
    })
    expect(rules(chain)).toEqual([])
  })

  it('flags chains with more than 2 redirects', () => {
    const chain = makeChain({
      hops: [
        makeHop({ url: 'https://a.example/', statusCode: 301, redirectKind: 'http' }),
        makeHop({ url: 'https://b.example/', statusCode: 301, redirectKind: 'http' }),
        makeHop({ url: 'https://c.example/', statusCode: 301, redirectKind: 'http' }),
        makeHop({ url: 'https://d.example/', statusCode: 200 }),
      ],
    })
    expect(rules(chain)).toContain('too-many-hops')
  })

  it('flags 302 and 307 hops as temporary redirects, per hop', () => {
    const chain = makeChain({
      hops: [
        makeHop({ url: 'https://a.example/', statusCode: 302, redirectKind: 'http' }),
        makeHop({ url: 'https://b.example/', statusCode: 307, redirectKind: 'http' }),
        makeHop({ url: 'https://c.example/', statusCode: 200 }),
      ],
    })
    const issues = detectIssues(chain).filter((i) => i.rule === 'temporary-redirect')
    expect(issues.map((i) => i.hopIndex)).toEqual([0, 1])
  })

  it('detects loops by repeated normalized URL (ignoring fragment and default port)', () => {
    const chain = makeChain({
      hops: [
        makeHop({ url: 'https://a.example:443/x', statusCode: 302, redirectKind: 'http' }),
        makeHop({ url: 'https://b.example/', statusCode: 302, redirectKind: 'http' }),
        makeHop({ url: 'https://a.example/x#frag', statusCode: 302, redirectKind: 'http' }),
      ],
      status: 'error',
      finalUrl: null,
    })
    expect(rules(chain)).toContain('redirect-loop')
  })

  it('detects loops by the browser error even without a repeated URL', () => {
    const chain = makeChain({
      hops: [makeHop({ url: 'https://a.example/', statusCode: 302, error: ERR_TOO_MANY_REDIRECTS })],
      status: 'error',
      finalUrl: null,
    })
    expect(rules(chain)).toContain('redirect-loop')
  })

  it('flags protocol downgrades as errors and https upgrades as info', () => {
    const downgrade = makeChain({
      hops: [
        makeHop({ url: 'https://a.example/', statusCode: 301, redirectKind: 'http' }),
        makeHop({ url: 'http://a.example/', statusCode: 200 }),
      ],
    })
    expect(detectIssues(downgrade).find((i) => i.rule === 'protocol-downgrade')?.severity).toBe('error')

    const upgrade = makeChain({
      hops: [
        makeHop({ url: 'http://a.example/', statusCode: 301, redirectKind: 'http' }),
        makeHop({ url: 'https://a.example/', statusCode: 200 }),
      ],
    })
    expect(detectIssues(upgrade).find((i) => i.rule === 'http-upgrade-hop')?.severity).toBe('info')
  })

  it('flags a 4xx/5xx final status', () => {
    const chain = makeChain({
      hops: [
        makeHop({ url: 'https://a.example/', statusCode: 301, redirectKind: 'http' }),
        makeHop({ url: 'https://b.example/', statusCode: 404 }),
      ],
    })
    expect(rules(chain)).toContain('final-error-status')
  })

  it('flags client-side redirect hops', () => {
    for (const kind of ['meta', 'js', 'client'] as const) {
      const chain = makeChain({
        hops: [makeHop({ redirectKind: kind, statusCode: 200 }), makeHop({ url: 'https://b.example/' })],
      })
      expect(rules(chain)).toContain('client-redirect')
    }
  })

  it('flags a canonical URL that differs from the final URL, normalized', () => {
    const mismatch = makeChain({ canonicalUrl: 'https://other.example/' })
    expect(rules(mismatch)).toContain('canonical-mismatch')

    const same = makeChain({ canonicalUrl: 'https://example.com/#top' }) // finalUrl is https://example.com/
    expect(rules(same)).not.toContain('canonical-mismatch')
  })
})
