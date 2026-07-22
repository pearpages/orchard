import type { ChainEvent, Header } from './types'

// Structural subsets of chrome.webRequest / chrome.webNavigation callback details.
// No chrome import: unit tests feed plain object literals, the service worker
// passes the real details objects, which satisfy these shapes.

export interface RawRequestDetails {
  requestId: string
  tabId: number
  url: string
  method: string
  type: string
  timeStamp: number
}

export interface RawHeader {
  name: string
  value?: string
}

export interface RawSendHeadersDetails extends RawRequestDetails {
  requestHeaders?: RawHeader[]
}

export interface RawRedirectDetails extends RawRequestDetails {
  redirectUrl: string
  statusCode: number
  statusLine: string
  responseHeaders?: RawHeader[]
  ip?: string
  fromCache: boolean
}

export interface RawCompletedDetails extends RawRequestDetails {
  statusCode: number
  statusLine: string
  responseHeaders?: RawHeader[]
  ip?: string
  fromCache: boolean
}

export interface RawErrorDetails extends RawRequestDetails {
  error: string
}

export interface RawNavCommittedDetails {
  tabId: number
  frameId: number
  url: string
  transitionType: string
  transitionQualifiers: string[]
  timeStamp: number
}

/**
 * Main-frame navigations in real tabs, plus the tracer's own fetches
 * (service-worker-originated, tabId -1, surfaced as xmlhttprequest).
 */
function isTracked(details: RawRequestDetails): boolean {
  if (details.type === 'main_frame') return details.tabId >= 0
  if (details.type === 'xmlhttprequest') return details.tabId === -1
  return false
}

export function normalizeHeaders(headers: RawHeader[] | undefined): Header[] {
  return (headers ?? []).map((h) => ({ name: h.name, value: h.value ?? '' }))
}

export function fromBeforeRequest(details: RawRequestDetails): ChainEvent | null {
  if (!isTracked(details)) return null
  return {
    type: 'request-started',
    requestId: details.requestId,
    tabId: details.tabId,
    url: details.url,
    method: details.method,
    at: details.timeStamp,
  }
}

export function fromSendHeaders(details: RawSendHeadersDetails): ChainEvent | null {
  if (!isTracked(details)) return null
  return {
    type: 'request-headers',
    requestId: details.requestId,
    tabId: details.tabId,
    headers: normalizeHeaders(details.requestHeaders),
    at: details.timeStamp,
  }
}

export function fromBeforeRedirect(details: RawRedirectDetails): ChainEvent | null {
  if (!isTracked(details)) return null
  return {
    type: 'redirected',
    requestId: details.requestId,
    tabId: details.tabId,
    fromUrl: details.url,
    toUrl: details.redirectUrl,
    statusCode: details.statusCode,
    statusLine: details.statusLine,
    headers: normalizeHeaders(details.responseHeaders),
    ip: details.ip ?? null,
    fromCache: details.fromCache,
    at: details.timeStamp,
  }
}

export function fromCompleted(details: RawCompletedDetails): ChainEvent | null {
  if (!isTracked(details)) return null
  return {
    type: 'completed',
    requestId: details.requestId,
    tabId: details.tabId,
    url: details.url,
    statusCode: details.statusCode,
    statusLine: details.statusLine,
    headers: normalizeHeaders(details.responseHeaders),
    ip: details.ip ?? null,
    fromCache: details.fromCache,
    at: details.timeStamp,
  }
}

export function fromErrorOccurred(details: RawErrorDetails): ChainEvent | null {
  if (!isTracked(details)) return null
  return {
    type: 'errored',
    requestId: details.requestId,
    tabId: details.tabId,
    url: details.url,
    error: details.error,
    at: details.timeStamp,
  }
}

export function fromNavCommitted(details: RawNavCommittedDetails): ChainEvent | null {
  if (details.frameId !== 0 || details.tabId < 0) return null
  return {
    type: 'nav-committed',
    tabId: details.tabId,
    url: details.url,
    transitionType: details.transitionType,
    qualifiers: details.transitionQualifiers,
    at: details.timeStamp,
  }
}
