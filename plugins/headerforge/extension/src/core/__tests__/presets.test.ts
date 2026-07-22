import { describe, expect, it } from 'vitest'
import { REQUEST_HEADER_NAMES, REQUEST_PRESETS, RESPONSE_HEADER_NAMES, RESPONSE_PRESETS } from '../presets'
import { headerToModification } from '../rules'
import { createHeaderEntry } from '../state'

const ALL_PRESETS = [...REQUEST_PRESETS, ...RESPONSE_PRESETS]

describe('header presets', () => {
  it('all presets have a label and a header name', () => {
    for (const preset of ALL_PRESETS) {
      expect(preset.label.trim()).not.toBe('')
      expect(preset.name.trim()).not.toBe('')
    }
  })

  it('all presets map to a valid DNR header modification', () => {
    for (const preset of ALL_PRESETS) {
      const entry = createHeaderEntry({
        name: preset.name,
        value: preset.value,
        operation: preset.operation ?? 'set',
      })
      const modification = headerToModification(entry)
      expect(modification.header).toBe(preset.name)
      if (preset.operation === 'remove') {
        expect('value' in modification).toBe(false)
      } else {
        expect(modification.value).toBe(preset.value)
      }
    }
  })

  it('labels are unique within each menu', () => {
    for (const presets of [REQUEST_PRESETS, RESPONSE_PRESETS]) {
      const labels = presets.map((preset) => preset.label)
      expect(new Set(labels).size).toBe(labels.length)
    }
  })

  it('autocomplete name lists are non-empty and sorted', () => {
    for (const names of [REQUEST_HEADER_NAMES, RESPONSE_HEADER_NAMES]) {
      expect(names.length).toBeGreaterThan(0)
      expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names)
    }
  })
})
