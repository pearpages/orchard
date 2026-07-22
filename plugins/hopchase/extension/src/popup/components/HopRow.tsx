import { useState } from 'react'
import { toCurl } from '../../core/export/curl'
import type { Hop } from '../../core/types'
import { copyText } from '../utils/download'
import { formatLatency, truncateUrl } from '../utils/format'
import { HeaderList } from './HeaderList'
import { StatusBadge } from './StatusBadge'
import './HopRow.scss'

interface HopRowProps {
  hop: Hop
  index: number
  flashed: boolean
}

const KIND_LABEL: Record<string, string> = { meta: 'meta refresh', js: 'js redirect', client: 'client redirect' }

export function HopRow({ hop, index, flashed }: HopRowProps) {
  const [expanded, setExpanded] = useState(false)
  const kindLabel = KIND_LABEL[hop.redirectKind]

  return (
    <li id={`hop-${index}`} className={`hop-row${flashed ? ' hop-row--flash' : ''}`}>
      <div className="hop-row__line">
        <span className="hop-row__index">{index + 1}</span>
        <StatusBadge hop={hop} />
        <span className="hop-row__method">{hop.method}</span>
        <span className="hop-row__url" title={hop.url}>
          {truncateUrl(hop.url)}
        </span>
        {kindLabel && <span className="hop-row__kind">{kindLabel}</span>}
        {hop.fromCache && <span className="hop-row__cache">cache</span>}
        <span className="hop-row__latency">{formatLatency(hop.latencyMs)}</span>
        <span className="hop-row__actions">
          <button
            type="button"
            className="hop-row__action"
            title="Copy URL"
            onClick={() => void copyText(hop.url)}
          >
            URL
          </button>
          <button
            type="button"
            className="hop-row__action"
            title="Copy as curl"
            onClick={() => void copyText(toCurl(hop))}
          >
            curl
          </button>
          <button
            type="button"
            className={`hop-row__action hop-row__action--expand${expanded ? ' hop-row__action--open' : ''}`}
            title={expanded ? 'Hide headers' : 'Show headers'}
            onClick={() => setExpanded((value) => !value)}
          >
            ▾
          </button>
        </span>
      </div>
      {hop.error && <p className="hop-row__error">{hop.error}</p>}
      {expanded && <HeaderList requestHeaders={hop.requestHeaders} responseHeaders={hop.responseHeaders} />}
    </li>
  )
}
