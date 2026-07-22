import { describe, expect, it } from 'vitest'
import { importState, serializeExport } from '../serialization'
import { createHeaderEntry, createProfile, createUrlFilter } from '../state'
import type { AppState } from '../types'

function sampleState(): AppState {
  const profile = createProfile('Sample', {
    requestHeaders: [createHeaderEntry({ name: 'x-a', value: '1' })],
    responseHeaders: [createHeaderEntry({ name: 'x-b', operation: 'remove' })],
    urlFilters: [createUrlFilter({ kind: 'regex', pattern: '^https://' })],
  })
  return { version: 1, profiles: [profile], selectedProfileId: profile.id }
}

describe('export/import roundtrip', () => {
  it('roundtrips profiles deep-equal', () => {
    const state = sampleState()
    const result = importState(serializeExport(state, '2026-07-20T00:00:00.000Z'))
    expect(result).toEqual({ ok: true, profiles: state.profiles })
  })
})

describe('importState validation', () => {
  it('rejects non-JSON', () => {
    expect(importState('not json {')).toMatchObject({ ok: false })
  })

  it('rejects JSON without the headerforge format marker', () => {
    expect(importState(JSON.stringify({ profiles: [] }))).toMatchObject({
      ok: false,
      error: expect.stringContaining('HeaderForge'),
    })
  })

  it('rejects unsupported versions', () => {
    expect(
      importState(JSON.stringify({ format: 'headerforge', version: 99, profiles: [{}] })),
    ).toMatchObject({ ok: false, error: expect.stringContaining('version') })
  })

  it('rejects empty or missing profiles', () => {
    expect(
      importState(JSON.stringify({ format: 'headerforge', version: 1, profiles: [] })),
    ).toMatchObject({ ok: false })
  })

  it('rejects wrong field types', () => {
    const file = {
      format: 'headerforge',
      version: 1,
      profiles: [{ title: 'P', enabled: 'yes' }],
    }
    expect(importState(JSON.stringify(file))).toMatchObject({
      ok: false,
      error: expect.stringContaining('enabled'),
    })
  })

  it('rejects unknown header operations', () => {
    const file = {
      format: 'headerforge',
      version: 1,
      profiles: [{ requestHeaders: [{ name: 'x', operation: 'explode' }] }],
    }
    expect(importState(JSON.stringify(file))).toMatchObject({
      ok: false,
      error: expect.stringContaining('operation'),
    })
  })

  it('fills defaults for absent optional fields', () => {
    const file = {
      format: 'headerforge',
      version: 1,
      profiles: [{ requestHeaders: [{ name: 'x-min' }] }],
    }
    const result = importState(JSON.stringify(file))
    if (!result.ok) throw new Error(result.error)

    const [profile] = result.profiles
    expect(profile.enabled).toBe(true)
    expect(profile.title).toBeTruthy()
    expect(profile.responseHeaders).toEqual([])
    expect(profile.urlFilters).toEqual([])
    expect(profile.requestHeaders[0]).toMatchObject({
      name: 'x-min',
      value: '',
      operation: 'set',
      enabled: true,
    })
    expect(profile.requestHeaders[0].id).toBeTruthy()
  })

  it('regenerates colliding ids so all imported ids are unique', () => {
    const file = {
      format: 'headerforge',
      version: 1,
      profiles: [
        { id: 'dup', requestHeaders: [{ id: 'dup', name: 'a' }, { id: 'dup', name: 'b' }] },
        { id: 'dup' },
      ],
    }
    const result = importState(JSON.stringify(file))
    if (!result.ok) throw new Error(result.error)

    const ids = result.profiles.flatMap((profile) => [
      profile.id,
      ...profile.requestHeaders.map((entry) => entry.id),
    ])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
