import { Download } from 'lucide-react'
import { formatBytes } from '../engine/format-bytes'
import { currentPick, pickBytes } from '../state/pick'
import { downloadVariant, useSession } from '../state/session'
import { useSettings } from '../state/settings'
import { ORIGINAL } from '../state/types'
import { variantName } from './format'
import { ExportButton } from './TopBar'
import './MobileBar.css'

/**
 * Phones only (CSS shows it at ≤860px): the two things people come to do, within thumb reach at the bottom:
 * download the result on screen, or download everything.
 */
export function MobileBar() {
  const image = useSession((s) => (s.selectedId ? s.images[s.selectedId] : null))
  const enabled = useSettings((s) => s.enabled)
  const pickKey = image ? currentPick(image, enabled) : null
  const bytes = image ? pickBytes(image, pickKey) : null
  const variant = image && pickKey && pickKey !== ORIGINAL ? image.variants[pickKey] : null
  const label = pickKey === ORIGINAL ? 'Original' : variant ? variantName(variant) : null

  return (
    <div className="mobile-bar" role="toolbar" aria-label="Download">
      <button
        type="button"
        className="btn btn-solid mobile-bar-one"
        disabled={!image || !pickKey || bytes === null}
        onClick={() => image && pickKey && downloadVariant(image.id, pickKey)}
      >
        <Download aria-hidden="true" />
        <span className="mobile-bar-text">
          <span>Download</span>
          {/* Size leads: when space runs out the format (already in the proof caption) is what gets cut. */}
          <span className="mobile-bar-detail num">{label && bytes !== null ? `${formatBytes(bytes)} · ${label}` : 'Encoding…'}</span>
        </span>
      </button>
      <ExportButton hasImages menuId="export-menu-bar" className="mobile-bar-all" placement="above" />
    </div>
  )
}
