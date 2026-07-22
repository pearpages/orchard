import { describe, expect, it } from 'vitest'
import { filterToCondition, validateRegexPattern } from '../url-filters'
import { createUrlFilter } from '../state'

describe('filterToCondition', () => {
  it('maps contains filters to urlFilter as-is', () => {
    expect(filterToCondition(createUrlFilter({ pattern: 'example.com' }))).toEqual({
      urlFilter: 'example.com',
    })
  })

  it('passes DNR anchor syntax through untouched', () => {
    expect(filterToCondition(createUrlFilter({ pattern: '||example.com^' }))).toEqual({
      urlFilter: '||example.com^',
    })
    expect(filterToCondition(createUrlFilter({ pattern: '*/api/*' }))).toEqual({
      urlFilter: '*/api/*',
    })
  })

  it('maps regex filters to regexFilter', () => {
    expect(
      filterToCondition(createUrlFilter({ kind: 'regex', pattern: '^https://api\\.example\\.com/' })),
    ).toEqual({ regexFilter: '^https://api\\.example\\.com/' })
  })
})

describe('validateRegexPattern', () => {
  it('accepts valid patterns', () => {
    expect(validateRegexPattern('^https://.*\\.example\\.com/').ok).toBe(true)
  })

  it('rejects syntactically invalid patterns with an error message', () => {
    const result = validateRegexPattern('[unclosed')
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
