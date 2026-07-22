import { describe, expect, it } from 'vitest'
import {
  fromBeforeRedirect,
  fromBeforeRequest,
  fromCompleted,
  fromNavCommitted,
  fromSendHeaders,
  normalizeHeaders,
} from '../normalize'

const base = { requestId: 'r1', tabId: 1, url: 'https://a.example/', method: 'GET', timeStamp: 1000 }

describe('normalize', () => {
  it('tracks main-frame requests in real tabs', () => {
    expect(fromBeforeRequest({ ...base, type: 'main_frame' })).toEqual({
      type: 'request-started',
      requestId: 'r1',
      tabId: 1,
      url: 'https://a.example/',
      method: 'GET',
      at: 1000,
    })
  })

  it('drops subresources and page-initiated xhr, keeps service-worker xhr (the tracer)', () => {
    expect(fromBeforeRequest({ ...base, type: 'image' })).toBeNull()
    expect(fromBeforeRequest({ ...base, type: 'xmlhttprequest' })).toBeNull()
    expect(fromBeforeRequest({ ...base, type: 'xmlhttprequest', tabId: -1 })).not.toBeNull()
    expect(fromBeforeRequest({ ...base, type: 'main_frame', tabId: -1 })).toBeNull()
  })

  it('normalizes headers, defaulting missing values to an empty string', () => {
    expect(normalizeHeaders([{ name: 'X-A', value: '1' }, { name: 'X-B' }])).toEqual([
      { name: 'X-A', value: '1' },
      { name: 'X-B', value: '' },
    ])
    expect(normalizeHeaders(undefined)).toEqual([])
  })

  it('carries redirect fields through, defaulting ip to null', () => {
    const event = fromBeforeRedirect({
      ...base,
      type: 'main_frame',
      redirectUrl: 'https://b.example/',
      statusCode: 301,
      statusLine: 'HTTP/1.1 301 Moved Permanently',
      responseHeaders: [{ name: 'location', value: 'https://b.example/' }],
      fromCache: false,
    })
    expect(event).toMatchObject({
      type: 'redirected',
      fromUrl: 'https://a.example/',
      toUrl: 'https://b.example/',
      statusCode: 301,
      ip: null,
    })
  })

  it('normalizes completed and send-headers events', () => {
    expect(
      fromCompleted({
        ...base,
        type: 'main_frame',
        statusCode: 200,
        statusLine: 'HTTP/1.1 200 OK',
        ip: '203.0.113.7',
        fromCache: true,
      }),
    ).toMatchObject({ type: 'completed', statusCode: 200, ip: '203.0.113.7', fromCache: true })
    expect(fromSendHeaders({ ...base, type: 'main_frame', requestHeaders: [{ name: 'A' }] })).toMatchObject({
      type: 'request-headers',
      headers: [{ name: 'A', value: '' }],
    })
  })

  it('only accepts top-frame commits in real tabs', () => {
    const nav = {
      tabId: 1,
      frameId: 0,
      url: 'https://a.example/',
      transitionType: 'link',
      transitionQualifiers: ['client_redirect'],
      timeStamp: 1000,
    }
    expect(fromNavCommitted(nav)).toMatchObject({ type: 'nav-committed', qualifiers: ['client_redirect'] })
    expect(fromNavCommitted({ ...nav, frameId: 3 })).toBeNull()
    expect(fromNavCommitted({ ...nav, tabId: -1 })).toBeNull()
  })
})
