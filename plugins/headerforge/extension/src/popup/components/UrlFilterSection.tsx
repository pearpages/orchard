import type { UrlFilter } from '../../core/types'
import { UrlFilterRow } from './UrlFilterRow'
import './UrlFilterSection.scss'

interface UrlFilterSectionProps {
  filters: UrlFilter[]
  onFilterChange: (filterId: string, patch: Partial<UrlFilter>) => void
  onFilterDelete: (filterId: string) => void
  onAdd: () => void
}

export function UrlFilterSection({
  filters,
  onFilterChange,
  onFilterDelete,
  onAdd,
}: UrlFilterSectionProps) {
  return (
    <section className="url-filter-section">
      <div className="url-filter-section__header">
        <h2 className="url-filter-section__title">URL filters</h2>
        <button className="url-filter-section__add-btn" type="button" onClick={onAdd}>
          + Add
        </button>
      </div>
      <p className="url-filter-section__hint">
        Headers apply only to matching URLs. No filters means all URLs.
      </p>
      {filters.map((filter) => (
        <UrlFilterRow
          key={filter.id}
          filter={filter}
          onChange={(patch) => onFilterChange(filter.id, patch)}
          onDelete={() => onFilterDelete(filter.id)}
        />
      ))}
    </section>
  )
}
