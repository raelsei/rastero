import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useSession } from '../state/session'
import { useViewer } from '../state/viewer'
import './Overlays.css'

const NOTICE_MS = 6000

/** One quiet status line (skipped files, export results, errors); replaces itself, fades on its own. */
export function Notice() {
  const notice = useSession((s) => s.notice)
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => {
      if (useSession.getState().notice?.id === notice.id) useSession.setState({ notice: null })
    }, NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  return (
    <div className="notice-region" role="status" aria-live="polite">
      {notice && (
        <div key={notice.id} className="notice">
          <span>{notice.text}</span>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => useSession.setState({ notice: null })}>
            <X />
          </button>
        </div>
      )}
    </div>
  )
}

/** Shown over a loaded session while files are dragged in. */
export function DropHint() {
  return (
    <div className="drop-hint" aria-hidden="true">
      <span>Drop to add</span>
    </div>
  )
}

const SHORTCUTS: Array<[string, string]> = [
  ['↑ ↓', 'Previous / next image'],
  ['← →', 'Previous / next result'],
  ['Space', 'Hold to see the original'],
  ['Z', 'Fit / actual pixels'],
  ['L', 'Loupe'],
  ['G / E', 'Grid / proof view'],
  ['D', 'Download the picked result'],
  ['⌫', 'Remove image'],
  ['⌘O / ⇧⌘O', 'Add images / folder'],
]

export function Shortcuts() {
  const open = useViewer((s) => s.shortcutsOpen)
  if (!open) return null
  return (
    <div className="shortcuts" role="dialog" aria-label="Keyboard shortcuts">
      <header>
        <h2>Keyboard</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={() => useViewer.setState({ shortcutsOpen: false })}>
          <X />
        </button>
      </header>
      <dl>
        {SHORTCUTS.map(([keys, action]) => (
          <div key={keys}>
            <dt>{keys}</dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
