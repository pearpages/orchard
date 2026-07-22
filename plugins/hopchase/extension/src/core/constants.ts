import type { Settings, TrackerState } from './types'

export const TRACKER_STORAGE_KEY = 'hopchase:tracker'
export const TRACES_STORAGE_KEY = 'hopchase:traces'
export const HISTORY_STORAGE_KEY = 'hopchase:history'
export const SETTINGS_STORAGE_KEY = 'hopchase:settings'

/** Hard cap: past this the reducer force-finalizes the chain with a loop issue. */
export const MAX_HOPS = 25

/**
 * A 'client_redirect' qualifier is trusted to CREATE a link; this window only VETOES it,
 * so a long-delayed meta refresh (content="300;url=…") can't grow monster chains.
 */
export const CLIENT_REDIRECT_MAX_GAP_MS = 15_000

/** More than this many redirects before the final document is an SEO smell. */
export const MAX_HEALTHY_REDIRECTS = 2

export const MAX_TRACES = 20
export const DEFAULT_HISTORY_LIMIT = 50

/** Marker request header binding a tracer fetch to its webRequest requestId. */
export const TRACE_MARKER_HEADER = 'x-hopchase-trace'

/** Chrome aborts with net::ERR_TOO_MANY_REDIRECTS around 20 hops. */
export const ERR_TOO_MANY_REDIRECTS = 'net::ERR_TOO_MANY_REDIRECTS'

/** Synthetic hop error set when MAX_HOPS forces finalization. */
export const ERR_HOP_CAP = 'hopchase::MAX_HOPS_EXCEEDED'

export function createInitialTrackerState(): TrackerState {
  return { version: 1, tabs: {}, background: {}, finalized: [] }
}

export function createDefaultSettings(): Settings {
  return { version: 1, historyLimit: DEFAULT_HISTORY_LIMIT, trackSubresources: false }
}
