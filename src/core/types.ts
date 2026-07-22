export type HeaderOperation = 'set' | 'remove' | 'append'

export interface HeaderEntry {
  id: string
  name: string
  /** Used for set/append. '' is legal and sends an empty header. Ignored for remove. */
  value: string
  operation: HeaderOperation
  enabled: boolean
}

export type UrlFilterKind = 'contains' | 'regex'

export interface UrlFilter {
  id: string
  /** 'contains' maps to a DNR urlFilter (substring match); 'regex' to regexFilter (RE2). */
  kind: UrlFilterKind
  pattern: string
  enabled: boolean
}

export interface Profile {
  id: string
  title: string
  /** All enabled profiles apply simultaneously. */
  enabled: boolean
  requestHeaders: HeaderEntry[]
  responseHeaders: HeaderEntry[]
  /** Empty list means the profile applies to all URLs. */
  urlFilters: UrlFilter[]
}

export interface AppState {
  version: 1
  profiles: Profile[]
  /** Which profile tab the popup shows; independent of `enabled`. */
  selectedProfileId: string | null
}

export interface ExportFile {
  format: 'headerforge'
  version: 1
  exportedAt: string
  profiles: Profile[]
}
