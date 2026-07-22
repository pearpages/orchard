import { useRef, useState } from 'react'
import { importState, serializeExport } from '../../core/serialization'
import type { AppState, Profile } from '../../core/types'
import './ImportExport.scss'

interface ImportExportProps {
  state: AppState
  onImport: (profiles: Profile[]) => void
}

export function ImportExport({ state, onImport }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = () => {
    const json = serializeExport(state, new Date().toISOString())
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'headerforge-profiles.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (file: File) => {
    const result = importState(await file.text())
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (window.confirm('Importing replaces all current profiles. Continue?')) {
      setError(null)
      onImport(result.profiles)
    }
  }

  return (
    <div className="import-export">
      <div className="import-export__buttons">
        <button className="import-export__export-btn" type="button" onClick={handleExport}>
          Export
        </button>
        <button
          className="import-export__import-btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          className="import-export__file-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ''
          }}
        />
      </div>
      {error && <p className="import-export__error">{error}</p>}
    </div>
  )
}
