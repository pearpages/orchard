import {
  REQUEST_HEADER_NAMES,
  REQUEST_PRESETS,
  RESPONSE_HEADER_NAMES,
  RESPONSE_PRESETS,
  type HeaderPreset,
} from '../core/presets'
import { createHeaderEntry, createProfile, createUrlFilter } from '../core/state'
import type { HeaderEntry, Profile, UrlFilter } from '../core/types'
import { useAppState } from './hooks/use-app-state'
import { HeaderSection } from './components/HeaderSection'
import { ImportExport } from './components/ImportExport'
import { ProfileTabs } from './components/ProfileTabs'
import { ProfileToolbar } from './components/ProfileToolbar'
import { UrlFilterSection } from './components/UrlFilterSection'
import './App.scss'

type HeaderListKey = 'requestHeaders' | 'responseHeaders'

export function App() {
  const { state, update } = useAppState()

  if (!state) {
    return <div className="app app--loading">Loading…</div>
  }

  const selected =
    state.profiles.find((profile) => profile.id === state.selectedProfileId) ?? state.profiles[0]

  const updateProfile = (profileId: string, mutate: (profile: Profile) => Profile) => {
    update((prev) => ({
      ...prev,
      profiles: prev.profiles.map((profile) =>
        profile.id === profileId ? mutate(profile) : profile,
      ),
    }))
  }

  const patchHeader = (listKey: HeaderListKey, entryId: string, patch: Partial<HeaderEntry>) => {
    updateProfile(selected.id, (profile) => ({
      ...profile,
      [listKey]: profile[listKey].map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry,
      ),
    }))
  }

  const deleteHeader = (listKey: HeaderListKey, entryId: string) => {
    updateProfile(selected.id, (profile) => ({
      ...profile,
      [listKey]: profile[listKey].filter((entry) => entry.id !== entryId),
    }))
  }

  const addHeader = (listKey: HeaderListKey, preset?: HeaderPreset) => {
    const entry = preset
      ? createHeaderEntry({
          name: preset.name,
          value: preset.value,
          operation: preset.operation ?? 'set',
        })
      : createHeaderEntry()
    updateProfile(selected.id, (profile) => ({
      ...profile,
      [listKey]: [...profile[listKey], entry],
    }))
  }

  const addProfile = () => {
    const profile = createProfile(`Profile ${state.profiles.length + 1}`)
    update((prev) => ({
      ...prev,
      profiles: [...prev.profiles, profile],
      selectedProfileId: profile.id,
    }))
  }

  const deleteProfile = () => {
    update((prev) => {
      const remaining = prev.profiles.filter((profile) => profile.id !== selected.id)
      return {
        ...prev,
        profiles: remaining,
        selectedProfileId: remaining[0]?.id ?? null,
      }
    })
  }

  const importProfiles = (profiles: Profile[]) => {
    update((prev) => ({
      ...prev,
      profiles,
      selectedProfileId: profiles[0]?.id ?? null,
    }))
  }

  return (
    <div className="app">
      <header className="app__header">
        <img className="app__mark" src="/icons/icon.svg" alt="" width="26" height="26" />
        <div className="app__titles">
          <h1 className="app__title">HeaderForge</h1>
          <p className="app__tagline">Header editor</p>
        </div>
      </header>
      <ProfileTabs
        profiles={state.profiles}
        selectedId={selected.id}
        onSelect={(profileId) => update((prev) => ({ ...prev, selectedProfileId: profileId }))}
        onAdd={addProfile}
      />
      <ProfileToolbar
        profile={selected}
        canDelete={state.profiles.length > 1}
        onRename={(title) => updateProfile(selected.id, (profile) => ({ ...profile, title }))}
        onToggle={(enabled) => updateProfile(selected.id, (profile) => ({ ...profile, enabled }))}
        onDelete={deleteProfile}
      />
      <HeaderSection
        kind="request"
        title="Request headers"
        entries={selected.requestHeaders}
        presets={REQUEST_PRESETS}
        datalistId="request-header-names"
        onEntryChange={(entryId, patch) => patchHeader('requestHeaders', entryId, patch)}
        onEntryDelete={(entryId) => deleteHeader('requestHeaders', entryId)}
        onAdd={(preset) => addHeader('requestHeaders', preset)}
      />
      <HeaderSection
        kind="response"
        title="Response headers"
        entries={selected.responseHeaders}
        presets={RESPONSE_PRESETS}
        datalistId="response-header-names"
        onEntryChange={(entryId, patch) => patchHeader('responseHeaders', entryId, patch)}
        onEntryDelete={(entryId) => deleteHeader('responseHeaders', entryId)}
        onAdd={(preset) => addHeader('responseHeaders', preset)}
      />
      <datalist id="request-header-names">
        {REQUEST_HEADER_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="response-header-names">
        {RESPONSE_HEADER_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <UrlFilterSection
        filters={selected.urlFilters}
        onFilterChange={(filterId, patch: Partial<UrlFilter>) =>
          updateProfile(selected.id, (profile) => ({
            ...profile,
            urlFilters: profile.urlFilters.map((filter) =>
              filter.id === filterId ? { ...filter, ...patch } : filter,
            ),
          }))
        }
        onFilterDelete={(filterId) =>
          updateProfile(selected.id, (profile) => ({
            ...profile,
            urlFilters: profile.urlFilters.filter((filter) => filter.id !== filterId),
          }))
        }
        onAdd={() =>
          updateProfile(selected.id, (profile) => ({
            ...profile,
            urlFilters: [...profile.urlFilters, createUrlFilter()],
          }))
        }
      />
      <ImportExport state={state} onImport={importProfiles} />
      <footer className="credit">
        <img className="credit__icon" src="/pearpages-icon.png" alt="" width="16" height="16" />
        Made by{' '}
        <a href="https://pearpages.com" target="_blank" rel="noopener">
          pearpages
        </a>
      </footer>
    </div>
  )
}
