import { useState } from 'react'
import type { TraceResult } from '../../core/types'
import { useTraces } from '../hooks/use-traces'
import { formatRelativeTime } from '../utils/format'
import { ChainView } from './ChainView'
import './TracerTab.scss'

function isTraceableUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function TracerTab() {
  const traces = useTraces()
  const [url, setUrl] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected: TraceResult | null =
    traces.find((t) => t.id === selectedId) ?? traces[0] ?? null
  const valid = isTraceableUrl(url.trim())

  const startTrace = async () => {
    const target = url.trim()
    if (!isTraceableUrl(target)) return
    const response = (await chrome.runtime.sendMessage({ type: 'trace', url: target })) as
      | { traceId?: string }
      | undefined
    if (response?.traceId) setSelectedId(response.traceId)
    setUrl('')
  }

  return (
    <div className="tracer-tab">
      <form
        className="tracer-tab__form"
        onSubmit={(event) => {
          event.preventDefault()
          void startTrace()
        }}
      >
        <input
          className="tracer-tab__input"
          type="url"
          placeholder="https://example.com/old-page"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <button type="submit" className="tracer-tab__submit" disabled={!valid}>
          Trace
        </button>
      </form>
      <p className="tracer-tab__note">
        Traces follow server-side redirects only (no meta refresh or JS), without cookies — a
        cookie- or login-dependent chain can differ from what a real visit sees.
      </p>
      {traces.length > 1 && (
        <ul className="tracer-tab__recent">
          {traces.map((trace) => (
            <li key={trace.id}>
              <button
                type="button"
                className={`tracer-tab__recent-item${trace.id === selected?.id ? ' tracer-tab__recent-item--active' : ''}`}
                onClick={() => setSelectedId(trace.id)}
              >
                <span className="tracer-tab__recent-url">{trace.url}</span>
                <span className="tracer-tab__recent-time">{formatRelativeTime(trace.startedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected?.status === 'pending' && <p className="tracer-tab__pending">Tracing {selected.url}…</p>}
      {selected?.status === 'error' && (
        <p className="tracer-tab__error">{selected.error ?? 'Trace failed.'}</p>
      )}
      {selected?.chain && <ChainView chain={selected.chain} />}
    </div>
  )
}
