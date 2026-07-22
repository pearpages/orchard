import { describe, expect, it } from 'vitest'
import { buildRules, countActiveHeaders, headerToModification } from '../rules'
import { createDefaultState, createHeaderEntry, createProfile, createUrlFilter } from '../state'
import { ALL_RESOURCE_TYPES } from '../constants'
import type { AppState, Profile } from '../types'

function stateWith(...profiles: Profile[]): AppState {
  return { version: 1, profiles, selectedProfileId: profiles[0]?.id ?? null }
}

describe('buildRules', () => {
  it('emits one rule with all enabled request headers and no url condition', () => {
    const profile = createProfile('P1', {
      requestHeaders: [
        createHeaderEntry({ name: 'x-one', value: '1' }),
        createHeaderEntry({ name: 'x-two', value: '2' }),
      ],
    })
    const rules = buildRules(stateWith(profile))

    expect(rules).toHaveLength(1)
    expect(rules[0].action.type).toBe('modifyHeaders')
    expect(rules[0].action.requestHeaders).toEqual([
      { header: 'x-one', operation: 'set', value: '1' },
      { header: 'x-two', operation: 'set', value: '2' },
    ])
    expect(rules[0].action.responseHeaders).toBeUndefined()
    expect(rules[0].condition.urlFilter).toBeUndefined()
    expect(rules[0].condition.regexFilter).toBeUndefined()
    expect(rules[0].condition.resourceTypes).toEqual(ALL_RESOURCE_TYPES)
    expect(rules[0].condition.resourceTypes).toContain('main_frame')
  })

  it('emits nothing for a disabled profile', () => {
    const profile = createProfile('P1', {
      enabled: false,
      requestHeaders: [createHeaderEntry({ name: 'x-one', value: '1' })],
    })
    expect(buildRules(stateWith(profile))).toEqual([])
  })

  it('excludes disabled entries and emits nothing when all entries are disabled', () => {
    const profile = createProfile('P1', {
      requestHeaders: [
        createHeaderEntry({ name: 'x-on', value: 'yes' }),
        createHeaderEntry({ name: 'x-off', value: 'no', enabled: false }),
      ],
    })
    const rules = buildRules(stateWith(profile))
    expect(rules[0].action.requestHeaders).toEqual([
      { header: 'x-on', operation: 'set', value: 'yes' },
    ])

    const allOff = createProfile('P2', {
      requestHeaders: [createHeaderEntry({ name: 'x-off', value: 'no', enabled: false })],
    })
    expect(buildRules(stateWith(allOff))).toEqual([])
  })

  it('emits remove operations without a value key (DNR rejects it)', () => {
    const modification = headerToModification(
      createHeaderEntry({ name: 'x-gone', value: 'ignored', operation: 'remove' }),
    )
    expect(modification).toEqual({ header: 'x-gone', operation: 'remove' })
    expect('value' in modification).toBe(false)
  })

  it('preserves an explicit empty value for set (sends empty header)', () => {
    const modification = headerToModification(createHeaderEntry({ name: 'x-empty', value: '' }))
    expect(modification).toEqual({ header: 'x-empty', operation: 'set', value: '' })
  })

  it('puts response headers in action.responseHeaders alongside request headers', () => {
    const profile = createProfile('P1', {
      requestHeaders: [createHeaderEntry({ name: 'x-req', value: 'r' })],
      responseHeaders: [createHeaderEntry({ name: 'x-res', operation: 'remove' })],
    })
    const rules = buildRules(stateWith(profile))
    expect(rules).toHaveLength(1)
    expect(rules[0].action.requestHeaders).toEqual([{ header: 'x-req', operation: 'set', value: 'r' }])
    expect(rules[0].action.responseHeaders).toEqual([{ header: 'x-res', operation: 'remove' }])
  })

  it('skips entries with an empty name, emitting no rule if none remain', () => {
    const profile = createProfile('P1', {
      requestHeaders: [createHeaderEntry({ name: '  ', value: 'x' })],
    })
    expect(buildRules(stateWith(profile))).toEqual([])
  })

  it('fans out one rule per enabled url filter with identical actions', () => {
    const profile = createProfile('P1', {
      requestHeaders: [createHeaderEntry({ name: 'x-h', value: 'v' })],
      urlFilters: [
        createUrlFilter({ pattern: 'example.com' }),
        createUrlFilter({ kind: 'regex', pattern: '^https://api\\.' }),
        createUrlFilter({ pattern: 'disabled.com', enabled: false }),
        createUrlFilter({ pattern: '   ' }),
      ],
    })
    const rules = buildRules(stateWith(profile))

    expect(rules).toHaveLength(2)
    expect(rules[0].action).toEqual(rules[1].action)
    expect(rules[0].condition.urlFilter).toBe('example.com')
    expect(rules[1].condition.regexFilter).toBe('^https://api\\.')
  })

  it('assigns sequential unique ids and higher priority to earlier profiles', () => {
    const first = createProfile('First', {
      requestHeaders: [createHeaderEntry({ name: 'x-a', value: '1' })],
      urlFilters: [createUrlFilter({ pattern: 'a.com' }), createUrlFilter({ pattern: 'b.com' })],
    })
    const second = createProfile('Second', {
      requestHeaders: [createHeaderEntry({ name: 'x-b', value: '2' })],
    })
    const rules = buildRules(stateWith(first, second))

    expect(rules.map((rule) => rule.id)).toEqual([1, 2, 3])
    const firstPriority = rules[0].priority ?? 0
    const secondPriority = rules[2].priority ?? 0
    expect(firstPriority).toBeGreaterThan(secondPriority)
  })

  it('emits rules for every enabled profile', () => {
    const one = createProfile('One', {
      requestHeaders: [createHeaderEntry({ name: 'x-1', value: '1' })],
    })
    const two = createProfile('Two', {
      responseHeaders: [createHeaderEntry({ name: 'x-2', value: '2' })],
    })
    const rules = buildRules(stateWith(one, two))
    expect(rules).toHaveLength(2)
  })
})

describe('countActiveHeaders', () => {
  it('counts only enabled entries in enabled profiles', () => {
    const active = createProfile('Active', {
      requestHeaders: [
        createHeaderEntry({ name: 'x-1', value: '1' }),
        createHeaderEntry({ name: 'x-2', value: '2', enabled: false }),
      ],
      responseHeaders: [createHeaderEntry({ name: 'x-3', value: '3' })],
    })
    const inactive = createProfile('Inactive', {
      enabled: false,
      requestHeaders: [createHeaderEntry({ name: 'x-4', value: '4' })],
    })
    expect(countActiveHeaders(stateWith(active, inactive))).toBe(2)
  })

  it('is zero for the default state (blank entry has no name)', () => {
    expect(countActiveHeaders(createDefaultState())).toBe(0)
  })
})
