import { useState } from 'react'
import type { Header } from '../../core/types'
import './HeaderList.scss'

interface HeaderListProps {
  requestHeaders: Header[]
  responseHeaders: Header[]
}

function Section({ title, headers, filter }: { title: string; headers: Header[]; filter: string }) {
  const query = filter.trim().toLowerCase()
  const visible = query
    ? headers.filter((h) => h.name.toLowerCase().includes(query) || h.value.toLowerCase().includes(query))
    : headers
  return (
    <section className="header-list__section">
      <h3 className="header-list__title">{title}</h3>
      {visible.length === 0 ? (
        <p className="header-list__empty">{headers.length === 0 ? 'No headers captured.' : 'No match.'}</p>
      ) : (
        <ul className="header-list__rows">
          {visible.map((header, index) => (
            <li key={`${header.name}-${index}`} className="header-list__row">
              <span className="header-list__name">{header.name}</span>
              <span className="header-list__value">{header.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function HeaderList({ requestHeaders, responseHeaders }: HeaderListProps) {
  const [filter, setFilter] = useState('')
  return (
    <div className="header-list">
      <input
        className="header-list__filter"
        type="search"
        placeholder="Filter headers by name or value…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <Section title="Request" headers={requestHeaders} filter={filter} />
      <Section title="Response" headers={responseHeaders} filter={filter} />
    </div>
  )
}
