import { describe, expect, it } from 'vitest'
import { normalizeUrl, parseMetaRefreshContent, protocolOf } from '../url-utils'

describe('normalizeUrl', () => {
  it('lowercases scheme and host, strips default ports and fragments, keeps path+query', () => {
    expect(normalizeUrl('HTTPS://Example.COM:443/Path?q=1#frag')).toBe('https://example.com/Path?q=1')
    expect(normalizeUrl('http://example.com:8080/a')).toBe('http://example.com:8080/a')
  })

  it('returns unparseable input as-is', () => {
    expect(normalizeUrl('not a url')).toBe('not a url')
  })
})

describe('protocolOf', () => {
  it('extracts the scheme without the colon, null when unparseable', () => {
    expect(protocolOf('https://a.example/')).toBe('https')
    expect(protocolOf('nope')).toBeNull()
  })
})

describe('parseMetaRefreshContent', () => {
  it('parses delay;url= into an absolute URL', () => {
    expect(parseMetaRefreshContent('0;url=/next', 'https://a.example/page')).toBe('https://a.example/next')
    expect(parseMetaRefreshContent('5; URL=https://b.example/x', 'https://a.example/')).toBe('https://b.example/x')
    expect(parseMetaRefreshContent("3;url='/quoted'", 'https://a.example/')).toBe('https://a.example/quoted')
  })

  it('returns null when there is no url part or the input is invalid', () => {
    expect(parseMetaRefreshContent('5', 'https://a.example/')).toBeNull()
    expect(parseMetaRefreshContent('banana', 'https://a.example/')).toBeNull()
    expect(parseMetaRefreshContent('0;url=', 'https://a.example/')).toBeNull()
  })
})
