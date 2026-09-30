import { useEffect, useState } from 'react'
import { fromFileList } from './engine/ingest'
import { currentPick, orderedVariants } from './state/pick'
import { addFiles, downloadVariant, moveSelection, pin, removeImage, setView, useSession } from './state/session'
import { useSettings } from './state/settings'
import { useViewer } from './state/viewer'
import { EmptyState } from './ui/EmptyState'
import { GridView } from './ui/GridView'
import { DropHint, Notice, Shortcuts } from './ui/Overlays'
import { ingestTransfer, pickFiles } from './ui/pickers'
import { MobileBar } from './ui/MobileBar'
import { Rail } from './ui/Rail'
import { Stage } from './ui/Stage'
import { TopBar } from './ui/TopBar'
import './App.css'

export default function App() {
  const hasImages = useSession((s) => s.order.length > 0)
  const restored = useSession((s) => s.restored)
  const view = useSession((s) => s.view)
  const dragging = useFileDrop()
  useShortcuts()

  return (
    <div className="app" data-empty={!hasImages}>
      <TopBar />
      {!restored ? null : !hasImages ? (
        <EmptyState dragging={dragging} />
      ) : view === 'grid' ? (
        <GridView />
      ) : (
        <>
          <Rail />
          <Stage />
        </>
      )}
      {hasImages && restored && <MobileBar />}
      {hasImages && dragging && <DropHint />}
      <Shortcuts />
      <Notice />
    </div>
  )
}

/** Files or folders dropped anywhere on the window, and images pasted from the clipboard. */
function useFileDrop(): boolean {
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      ingestTransfer(e.dataTransfer!)
    }
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files
      if (!files || files.length === 0) return
      e.preventDefault()
      void fromFileList(files).then(addFiles)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [])
  return dragging
}

function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Keys can target the window itself (no element); treat that like the page body.
      const target = e.target instanceof Element ? e.target : document.body
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        pickFiles(e.shiftKey)
        return
      }
      if (mod || e.altKey) return

      const session = useSession.getState()
      const image = session.selectedId ? session.images[session.selectedId] : null
      const enabled = useSettings.getState().enabled

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault()
          moveSelection(1)
          break
        case 'ArrowUp':
        case 'k':
          e.preventDefault()
          moveSelection(-1)
          break
        case 'ArrowRight':
        case 'ArrowLeft': {
          if (!image || target.closest('[role="menu"]')) return
          const done = orderedVariants(image, enabled).filter((v) => v.status === 'done')
          if (done.length === 0) return
          e.preventDefault()
          const index = done.findIndex((v) => v.key === currentPick(image, enabled))
          const step = e.key === 'ArrowRight' ? 1 : -1
          const next = index === -1 ? 0 : Math.max(0, Math.min(done.length - 1, index + step))
          pin(image.id, done[next].key)
          break
        }
        case ' ':
          if (!image || e.repeat || target.closest('button')) return
          e.preventDefault()
          useViewer.setState({ showOriginal: true })
          break
        case 'z':
          useViewer.setState((s) => ({ zoom: s.zoom === 'fit' ? 'actual' : 'fit' }))
          break
        case 'l':
          useViewer.setState((s) => ({ loupe: !s.loupe }))
          break
        case 'g':
          if (image) setView('grid')
          break
        case 'e':
          setView('stage')
          break
        case 'd': {
          const key = image ? currentPick(image, enabled) : null
          if (image && key) downloadVariant(image.id, key)
          break
        }
        case 'Backspace':
        case 'Delete':
          if (image) removeImage(image.id)
          break
        case '?':
          useViewer.setState((s) => ({ shortcutsOpen: !s.shortcutsOpen }))
          break
        case 'Escape':
          useViewer.setState({ shortcutsOpen: false })
          break
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') useViewer.setState({ showOriginal: false })
    }
    const onBlur = () => useViewer.setState({ showOriginal: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
