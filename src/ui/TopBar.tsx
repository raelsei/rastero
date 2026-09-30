import { useRef } from 'react'
import { Check, ChevronDown, Download, FolderDown, FolderOpen, ImagePlus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { getFormat } from '../engine/formats'
import { canSaveToDirectory } from '../engine/export'
import { formatBytes, savings } from '../engine/format-bytes'
import { currentPick, pickBytes } from '../state/pick'
import { useSettings } from '../state/settings'
import { clearAll, runExport, useSession } from '../state/session'
import type { ExportContent } from '../state/types'
import { Menu } from './Menu'
import { pickFiles } from './pickers'
import { formatSaving } from './format'
import { Wordmark } from './Logo'
import { FormatsMenu } from './FormatsMenu'
import './TopBar.css'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = IS_MAC ? '⌘' : 'Ctrl+'

/** Closes the popover menu containing the clicked item once it has acted. */
function closeMenu(target: EventTarget) {
  ;(target as HTMLElement).closest<HTMLElement>('[popover]')?.hidePopover()
}

export function TopBar() {
  const hasImages = useSession((s) => s.order.length > 0)
  return (
    <header className="topbar">
      <Wordmark />
      {hasImages ? <Summary /> : <div />}
      <div className="topbar-actions">
        <FormatsButton />
        <AddButton hasImages={hasImages} />
        <ExportButton hasImages={hasImages} menuId="export-menu" className="topbar-export" />
      </div>
    </header>
  )
}

/** Which formats every image is encoded into: a session-wide choice, so it lives with the session actions. */
function FormatsButton() {
  const anchor = useRef<HTMLButtonElement>(null)
  const count = useSettings((s) => s.enabled.length)
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="btn btn-ghost topbar-formats"
        popoverTarget="formats-menu"
        aria-label={`Formats (${count} on)`}
      >
        <SlidersHorizontal aria-hidden="true" />
        <span className="topbar-label">Formats</span>
        <span className="btn-count btn-count-ghost num">{count}</span>
      </button>
      <FormatsMenu anchor={anchor} />
    </>
  )
}

function Summary() {
  const images = useSession((s) => s.images)
  const order = useSession((s) => s.order)
  const enabled = useSettings((s) => s.enabled)

  let original = 0
  let output = 0
  let resolved = 0
  let totalVariants = 0
  let finishedVariants = 0
  for (const id of order) {
    const image = images[id]
    for (const v of Object.values(image.variants)) {
      totalVariants++
      if (v.status === 'done' || v.status === 'error') finishedVariants++
    }
    const bytes = pickBytes(image, currentPick(image, enabled))
    if (bytes === null) continue
    original += image.bytes
    output += bytes
    resolved++
  }
  const left = totalVariants - finishedVariants
  const progress = totalVariants === 0 ? 0 : finishedVariants / totalVariants

  return (
    <div className="summary num" aria-live="polite">
      <span>
        {order.length} {order.length === 1 ? 'image' : 'images'}
      </span>
      {resolved > 0 && (
        <>
          <span className="summary-dot">·</span>
          <span>
            {formatBytes(original)} <span className="summary-arrow">→</span> {formatBytes(output)}
          </span>
          <span className="summary-dot">·</span>
          <span className="summary-saving">{formatSaving(savings(original, output))}</span>
        </>
      )}
      {left > 0 && (
        <>
          <span className="summary-dot">·</span>
          <span className="summary-left">
            {left} {left === 1 ? 'result' : 'results'} left
          </span>
        </>
      )}
      <div
        className="topbar-progress"
        data-done={left === 0}
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
    </div>
  )
}

function AddButton({ hasImages }: { hasImages: boolean }) {
  const anchor = useRef<HTMLDivElement>(null)
  return (
    <div className="split" ref={anchor}>
      <button type="button" className="btn btn-ghost" onClick={() => pickFiles(false)} aria-label="Add images">
        <ImagePlus className="topbar-compact-icon" aria-hidden="true" />
        <span className="topbar-label">Add images</span>
      </button>
      <button type="button" className="btn btn-ghost" popoverTarget="add-menu" aria-label="More ways to add">
        <ChevronDown />
      </button>
      <Menu id="add-menu" anchor={anchor} label="Add">
        <button
          type="button"
          role="menuitem"
          className="menu-item"
          onClick={(e) => {
            closeMenu(e.currentTarget)
            pickFiles(false)
          }}
        >
          <ImagePlus /> Choose images… <span className="hint">{MOD}O</span>
        </button>
        <button
          type="button"
          role="menuitem"
          className="menu-item"
          onClick={(e) => {
            closeMenu(e.currentTarget)
            pickFiles(true)
          }}
        >
          <FolderOpen /> Choose folder… <span className="hint">⇧{MOD}O</span>
        </button>
        {hasImages && (
          <>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={(e) => {
                closeMenu(e.currentTarget)
                clearAll()
              }}
            >
              <Trash2 /> Clear all images
            </button>
          </>
        )}
      </Menu>
    </div>
  )
}

/**
 * Download all (with its options menu). The top bar carries it on wide screens; phones get a second instance
 * in the bottom action bar, where the thumb reaches, with the menu opening upward.
 */
export function ExportButton({
  hasImages,
  menuId,
  className,
  placement = 'below',
}: {
  hasImages: boolean
  menuId: string
  className?: string
  placement?: 'below' | 'above'
}) {
  const anchor = useRef<HTMLDivElement>(null)
  const enabled = useSettings((s) => s.enabled)
  const content = useSettings((s) => s.exportContent)
  const destination = useSettings((s) => s.exportDestination)
  const exporting = useSession((s) => s.exporting)
  const count = useSession((s) => s.order.length)
  const toFolder = destination === 'folder' && canSaveToDirectory
  const options: Array<{ value: ExportContent; label: string }> = [
    { value: 'picks', label: 'Picked result per image' },
    ...enabled.map((id) => ({ value: id, label: `${getFormat(id).label} for every image` })),
  ]
  const disabled = !hasImages || exporting

  return (
    <div className={className ? `split ${className}` : 'split'} ref={anchor}>
      <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => void runExport()}>
        {toFolder ? <FolderDown aria-hidden="true" /> : <Download aria-hidden="true" />}
        <span>{exporting ? 'Preparing…' : toFolder ? 'Save all to folder' : 'Download all'}</span>
        {hasImages && !exporting && <span className="btn-count num">{count}</span>}
      </button>
      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled}
        popoverTarget={menuId}
        aria-label="Download options"
      >
        <ChevronDown />
      </button>
      <Menu id={menuId} anchor={anchor} label="Download options" placement={placement}>
        <div className="menu-label">Download</div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={content === option.value}
            className="menu-item"
            onClick={() => useSettings.getState().setExportContent(option.value)}
          >
            <Check className="check" style={{ visibility: content === option.value ? 'visible' : 'hidden' }} />
            {option.label}
          </button>
        ))}
        <div className="menu-sep" />
        <div className="menu-label">Save as</div>
        <button
          type="button"
          role="menuitemradio"
          aria-checked={!toFolder}
          className="menu-item"
          onClick={() => useSettings.getState().setExportDestination('zip')}
        >
          <Check className="check" style={{ visibility: toFolder ? 'hidden' : 'visible' }} />
          ZIP file
        </button>
        <button
          type="button"
          role="menuitemradio"
          aria-checked={toFolder}
          className="menu-item"
          disabled={!canSaveToDirectory}
          onClick={() => useSettings.getState().setExportDestination('folder')}
        >
          <Check className="check" style={{ visibility: toFolder ? 'visible' : 'hidden' }} />
          Folder on this computer
        </button>
        {!canSaveToDirectory && (
          <p className="menu-note">Writing into a folder needs Chrome or Edge on desktop. The ZIP keeps your folder structure.</p>
        )}
      </Menu>
    </div>
  )
}
