import type { HeaderPreset } from '../../core/presets'
import type { HeaderEntry } from '../../core/types'
import { HeaderRow } from './HeaderRow'
import { PresetMenu } from './PresetMenu'
import './HeaderSection.scss'

export type SectionKind = 'request' | 'response'

interface HeaderSectionProps {
  kind: SectionKind
  title: string
  entries: HeaderEntry[]
  presets: HeaderPreset[]
  datalistId: string
  onEntryChange: (entryId: string, patch: Partial<HeaderEntry>) => void
  onEntryDelete: (entryId: string) => void
  onAdd: (preset?: HeaderPreset) => void
}

export function HeaderSection({
  kind,
  title,
  entries,
  presets,
  datalistId,
  onEntryChange,
  onEntryDelete,
  onAdd,
}: HeaderSectionProps) {
  return (
    <section className={`header-section header-section--${kind}`}>
      <div className="header-section__header">
        <h2 className="header-section__title">
          <span className="header-section__direction" aria-hidden="true">
            {kind === 'request' ? '→' : '←'}
          </span>
          {title}
        </h2>
        <div className="header-section__actions">
          <PresetMenu presets={presets} onPick={(preset) => onAdd(preset)} />
          <button className="header-section__add-btn" type="button" onClick={() => onAdd()}>
            + Add
          </button>
        </div>
      </div>
      {entries.length === 0 && (
        <p className="header-section__empty">
          No {kind} headers yet — add one or pick a preset.
        </p>
      )}
      {entries.map((entry) => (
        <HeaderRow
          key={entry.id}
          entry={entry}
          datalistId={datalistId}
          onChange={(patch) => onEntryChange(entry.id, patch)}
          onDelete={() => onEntryDelete(entry.id)}
        />
      ))}
    </section>
  )
}
