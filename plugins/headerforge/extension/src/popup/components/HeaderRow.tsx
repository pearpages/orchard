import type { HeaderEntry, HeaderOperation } from '../../core/types'
import { Toggle } from './Toggle'
import './HeaderRow.scss'

interface HeaderRowProps {
  entry: HeaderEntry
  datalistId?: string
  onChange: (patch: Partial<HeaderEntry>) => void
  onDelete: () => void
}

export function HeaderRow({ entry, datalistId, onChange, onDelete }: HeaderRowProps) {
  const isRemove = entry.operation === 'remove'
  return (
    <div className="header-row">
      <Toggle
        checked={entry.enabled}
        onChange={(enabled) => onChange({ enabled })}
        label={`Enable header ${entry.name || '(unnamed)'}`}
      />
      <input
        className="header-row__name-input"
        type="text"
        placeholder="Name"
        value={entry.name}
        list={datalistId}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <span className="header-row__colon" aria-hidden="true">
        :
      </span>
      <input
        className="header-row__value-input"
        type="text"
        placeholder={isRemove ? '(removed)' : 'Value'}
        value={isRemove ? '' : entry.value}
        disabled={isRemove}
        onChange={(event) => onChange({ value: event.target.value })}
      />
      <select
        className="header-row__operation-select"
        value={entry.operation}
        onChange={(event) => onChange({ operation: event.target.value as HeaderOperation })}
      >
        <option value="set">Set</option>
        <option value="remove">Remove</option>
        <option value="append">Append</option>
      </select>
      <button
        className="header-row__delete-btn"
        type="button"
        onClick={onDelete}
        aria-label={`Delete header ${entry.name || '(unnamed)'}`}
      >
        ✕
      </button>
    </div>
  )
}
