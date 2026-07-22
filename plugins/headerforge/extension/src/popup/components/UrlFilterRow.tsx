import { useEffect, useState } from 'react'
import type { UrlFilter, UrlFilterKind } from '../../core/types'
import { validateRegexPattern } from '../../core/url-filters'
import { Toggle } from './Toggle'
import './UrlFilterRow.scss'

interface UrlFilterRowProps {
  filter: UrlFilter
  onChange: (patch: Partial<UrlFilter>) => void
  onDelete: () => void
}

export function UrlFilterRow({ filter, onChange, onDelete }: UrlFilterRowProps) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (filter.kind !== 'regex' || filter.pattern.trim() === '') {
      setError(null)
      return
    }
    const syntax = validateRegexPattern(filter.pattern)
    if (!syntax.ok) {
      setError(syntax.error ?? 'Invalid regular expression')
      return
    }
    // DNR regexes are RE2, which supports less than JS regex — ask Chrome directly.
    let cancelled = false
    void chrome.declarativeNetRequest
      .isRegexSupported({ regex: filter.pattern })
      .then((result) => {
        if (cancelled) return
        setError(result.isSupported ? null : `Not supported by Chrome: ${result.reason ?? 'unknown reason'}`)
      })
    return () => {
      cancelled = true
    }
  }, [filter.kind, filter.pattern])

  return (
    <div className="url-filter-row">
      <div className="url-filter-row__main">
        <Toggle
          checked={filter.enabled}
          onChange={(enabled) => onChange({ enabled })}
          label={`Enable filter ${filter.pattern || '(empty)'}`}
        />
        <select
          className="url-filter-row__kind-select"
          value={filter.kind}
          onChange={(event) => onChange({ kind: event.target.value as UrlFilterKind })}
        >
          <option value="contains">URL contains</option>
          <option value="regex">Regex</option>
        </select>
        <input
          className="url-filter-row__pattern-input"
          type="text"
          placeholder={filter.kind === 'regex' ? '^https://api\\.example\\.com/' : 'example.com'}
          value={filter.pattern}
          onChange={(event) => onChange({ pattern: event.target.value })}
        />
        <button
          className="url-filter-row__delete-btn"
          type="button"
          onClick={onDelete}
          aria-label={`Delete filter ${filter.pattern || '(empty)'}`}
        >
          ✕
        </button>
      </div>
      {error && <p className="url-filter-row__error">{error}</p>}
    </div>
  )
}
