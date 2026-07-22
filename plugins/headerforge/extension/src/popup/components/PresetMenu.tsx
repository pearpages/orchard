import { useEffect, useRef, useState } from 'react'
import type { HeaderPreset } from '../../core/presets'
import './PresetMenu.scss'

interface PresetMenuProps {
  presets: HeaderPreset[]
  onPick: (preset: HeaderPreset) => void
}

export function PresetMenu({ presets, onPick }: PresetMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="preset-menu" ref={rootRef}>
      <button
        className="preset-menu__button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        Presets ▾
      </button>
      {open && (
        <div className="preset-menu__popover" role="menu">
          {presets.map((preset) => (
            <button
              key={preset.label}
              className="preset-menu__item"
              role="menuitem"
              type="button"
              onClick={() => {
                onPick(preset)
                setOpen(false)
              }}
            >
              <span className="preset-menu__item-label">{preset.label}</span>
              <span className="preset-menu__item-detail">
                {preset.operation === 'remove' ? `remove ${preset.name}` : `${preset.name}: ${preset.value}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
