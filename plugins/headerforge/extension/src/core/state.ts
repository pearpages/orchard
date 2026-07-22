import type { AppState, HeaderEntry, Profile, UrlFilter } from './types'

export function createHeaderEntry(partial: Partial<HeaderEntry> = {}): HeaderEntry {
  return {
    id: crypto.randomUUID(),
    name: '',
    value: '',
    operation: 'set',
    enabled: true,
    ...partial,
  }
}

export function createUrlFilter(partial: Partial<UrlFilter> = {}): UrlFilter {
  return {
    id: crypto.randomUUID(),
    kind: 'contains',
    pattern: '',
    enabled: true,
    ...partial,
  }
}

export function createProfile(title: string, partial: Partial<Profile> = {}): Profile {
  return {
    id: crypto.randomUUID(),
    title,
    enabled: true,
    requestHeaders: [createHeaderEntry()],
    responseHeaders: [],
    urlFilters: [],
    ...partial,
  }
}

export function createDefaultState(): AppState {
  const profile = createProfile('Profile 1')
  return {
    version: 1,
    profiles: [profile],
    selectedProfileId: profile.id,
  }
}
