import { describe, expect, it } from 'vitest'
import { toCsv } from '../export/csv'
import { toCurl } from '../export/curl'
import { toHar } from '../export/har'
import { toJson } from '../export/json'
import { toText } from '../export/text'
import { makeChain, makeHop } from './factories'

const chain = makeChain({
  hops: [
    makeHop({
      url: 'https://a.example/?q=1',
      statusCode: 301,
      statusLine: 'HTTP/1.1 301 Moved Permanently',
      redirectKind: 'http',
      requestHeaders: [{ name: 'accept', value: 'text/html' }],
      responseHeaders: [{ name: 'location', value: 'https://b.example/' }],
      ip: '203.0.113.7',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_000_120,
      latencyMs: 120,
    }),
    makeHop({
      url: 'https://b.example/',
      statusCode: 200,
      responseHeaders: [{ name: 'content-type', value: 'text/html; charset=utf-8' }],
      startedAt: 1_700_000_000_120,
      endedAt: 1_700_000_000_200,
      latencyMs: 80,
    }),
  ],
  finalUrl: 'https://b.example/',
})

describe('toJson', () => {
  it('wraps the chain in a versioned envelope that round-trips', () => {
    const parsed = JSON.parse(toJson(chain, '2026-07-22T00:00:00.000Z'))
    expect(parsed.format).toBe('hopchase')
    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBe('2026-07-22T00:00:00.000Z')
    expect(parsed.chain.hops).toHaveLength(2)
  })
})

describe('toCsv', () => {
  it('emits a header row and one row per hop', () => {
    const lines = toCsv(chain).split('\r\n')
    expect(lines[0]).toBe('index,url,method,status,redirect_kind,latency_ms,ip,from_cache,error')
    expect(lines[1]).toBe('1,https://a.example/?q=1,GET,301,http,120,203.0.113.7,false,')
    expect(lines).toHaveLength(3)
  })

  it('quotes fields containing commas, quotes or newlines per RFC 4180', () => {
    const tricky = makeChain({
      hops: [makeHop({ url: 'https://a.example/?q=1,2', error: 'said "no"\nreally' })],
    })
    const row = toCsv(tricky).split('\r\n')[1]
    expect(row).toContain('"https://a.example/?q=1,2"')
    expect(row).toContain('"said ""no""\nreally"')
  })
})

describe('toHar', () => {
  it('produces a minimal valid HAR 1.2 with hop linkage', () => {
    const har = JSON.parse(toHar(chain))
    expect(har.log.version).toBe('1.2')
    expect(har.log.entries).toHaveLength(2)
    const [first, second] = har.log.entries
    expect(first.startedDateTime).toBe('2023-11-14T22:13:20.000Z')
    expect(first.response.status).toBe(301)
    expect(first.response.redirectURL).toBe('https://b.example/')
    expect(first.request.queryString).toEqual([{ name: 'q', value: '1' }])
    expect(first.timings.wait).toBe(120)
    expect(first.serverIPAddress).toBe('203.0.113.7')
    expect(second.response.redirectURL).toBe('')
    expect(second.response.content.mimeType).toBe('text/html; charset=utf-8')
  })
})

describe('toText', () => {
  it('renders one status+url line per hop', () => {
    expect(toText(chain)).toBe('301 https://a.example/?q=1\n200 https://b.example/')
  })

  it('marks errored and client-redirect hops', () => {
    const tricky = makeChain({
      hops: [
        makeHop({ url: 'https://a.example/', statusCode: 200, redirectKind: 'meta' }),
        makeHop({ url: 'https://b.example/', statusCode: null, error: 'net::ERR_FAILED' }),
      ],
    })
    expect(toText(tricky)).toBe(
      '200 https://a.example/ (meta refresh)\nERR https://b.example/ (net::ERR_FAILED)',
    )
  })
})

describe('toCurl', () => {
  it('builds a multi-line curl with request headers', () => {
    expect(toCurl(chain.hops[0])).toBe(
      "curl -i -X GET 'https://a.example/?q=1' \\\n  -H 'accept: text/html'",
    )
  })

  it('escapes embedded single quotes POSIX-style', () => {
    const hop = makeHop({ url: "https://a.example/it's", requestHeaders: [] })
    expect(toCurl(hop)).toBe("curl -i -X GET 'https://a.example/it'\\''s'")
  })
})
