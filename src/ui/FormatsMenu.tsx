import type { RefObject } from 'react'
import { Check } from 'lucide-react'
import { FORMATS, type FormatId } from '../engine/formats'
import { applyEnabledFormats } from '../state/session'
import { useSettings } from '../state/settings'
import { Menu } from './Menu'

const NOTES: Partial<Record<FormatId, string>> = {
  jxl: 'slow to encode; Safari shows it, Chrome and Firefox are adding it',
  'png-lossy': 'up to 256 colours',
}

/** Which formats every image is encoded into. At least one stays on. */
export function FormatsMenu({ anchor }: { anchor: RefObject<HTMLElement | null> }) {
  const enabled = useSettings((s) => s.enabled)
  return (
    <Menu id="formats-menu" anchor={anchor} label="Formats">
      <div className="menu-label">Encode every image as</div>
      {FORMATS.map((format) => {
        const on = enabled.includes(format.id)
        const last = on && enabled.length === 1
        return (
          <button
            key={format.id}
            type="button"
            role="menuitemcheckbox"
            aria-checked={on}
            className="menu-item"
            disabled={last}
            onClick={() => applyEnabledFormats(on ? enabled.filter((id) => id !== format.id) : [...enabled, format.id])}
          >
            <Check className="check" style={{ visibility: on ? 'visible' : 'hidden' }} />
            <span>
              {format.label}
              {NOTES[format.id] && <span className="menu-item-note">{NOTES[format.id]}</span>}
            </span>
          </button>
        )
      })}
    </Menu>
  )
}
