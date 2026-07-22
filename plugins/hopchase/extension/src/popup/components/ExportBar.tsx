import { useState } from 'react'
import { toCsv } from '../../core/export/csv'
import { toHar } from '../../core/export/har'
import { toJson } from '../../core/export/json'
import { toText } from '../../core/export/text'
import type { Chain } from '../../core/types'
import { copyText, downloadFile, exportFilename } from '../utils/download'
import './ExportBar.scss'

export function ExportBar({ chain }: { chain: Chain }) {
  const [copied, setCopied] = useState<'chain' | 'json' | null>(null)

  const copy = async (kind: 'chain' | 'json', content: string) => {
    await copyText(content)
    setCopied(kind)
    window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1200)
  }

  return (
    <div className="export-bar">
      <span className="export-bar__label">Export</span>
      <button
        type="button"
        className="export-bar__button"
        onClick={() => downloadFile(exportFilename(chain, 'json'), toJson(chain, new Date().toISOString()), 'application/json')}
      >
        JSON
      </button>
      <button
        type="button"
        className="export-bar__button"
        onClick={() => downloadFile(exportFilename(chain, 'csv'), toCsv(chain), 'text/csv')}
      >
        CSV
      </button>
      <button
        type="button"
        className="export-bar__button"
        onClick={() => downloadFile(exportFilename(chain, 'har'), toHar(chain), 'application/json')}
      >
        HAR
      </button>
      <button type="button" className="export-bar__button" onClick={() => void copy('chain', toText(chain))}>
        {copied === 'chain' ? 'Copied!' : 'Copy chain'}
      </button>
      <button
        type="button"
        className="export-bar__button"
        onClick={() => void copy('json', toJson(chain, new Date().toISOString()))}
      >
        {copied === 'json' ? 'Copied!' : 'Copy JSON'}
      </button>
    </div>
  )
}
