import { useState } from 'react'
import { toCsv } from '../../core/export/csv'
import { toHar } from '../../core/export/har'
import { toJson } from '../../core/export/json'
import type { Chain } from '../../core/types'
import { copyText, downloadFile, exportFilename } from '../utils/download'
import './ExportBar.scss'

export function ExportBar({ chain }: { chain: Chain }) {
  const [copied, setCopied] = useState(false)

  const copyJson = async () => {
    await copyText(toJson(chain, new Date().toISOString()))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
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
      <button type="button" className="export-bar__button" onClick={() => void copyJson()}>
        {copied ? 'Copied!' : 'Copy JSON'}
      </button>
    </div>
  )
}
