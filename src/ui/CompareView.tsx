import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronsLeftRight, Download, Keyboard, Maximize, ScanSearch, Trash2 } from 'lucide-react'
import { formatBytes } from '../engine/format-bytes'
import { downloadVariant, removeImage } from '../state/session'
import { ORIGINAL, type ImageEntry, type Variant } from '../state/types'
import { useViewer } from '../state/viewer'
import { dimensions, variantName } from './format'
import { useDecoded } from './useDecoded'
import './CompareView.css'

/* Room around the proof for the caption row and the view tools. */
const MARGIN_X = 84
const MARGIN_X_COMPACT = 16
const MARGIN_TOP = 65
const MARGIN_BOTTOM = 23
/** Below this stage width the proof sizes to its image and the stage scrolls. */
const COMPACT = 700
/** Height reserved under a compact proof for the horizontal view tools. */
const COMPACT_TOOLS = 52

interface Size {
  width: number
  height: number
}

export function CompareView({ image, pickKey }: { image: ImageEntry; pickKey: string | null }) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState<Size>({ width: 0, height: 0 })
  const zoom = useViewer((s) => s.zoom)
  const loupe = useViewer((s) => s.loupe)
  const split = useViewer((s) => s.split)
  const showOriginal = useViewer((s) => s.showOriginal)
  // Pan the user dragged, relative to where 1:1 opens; it belongs to one image at one zoom.
  const panKey = `${image.id}|${zoom}`
  const [userPan, setUserPan] = useState({ key: '', x: 0, y: 0 })
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  /** `intent` 'pending': a touch on the photo that has not yet shown whether it is a sideways drag or a scroll. */
  const dragRef = useRef<{
    mode: 'split' | 'pan'
    intent: 'pending' | 'drag'
    startX: number
    startY: number
    panX: number
    panY: number
  } | null>(null)

  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setArea({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const natural: Size | null = image.width && image.height ? { width: image.width, height: image.height } : null
  const variant: Variant | null = pickKey && pickKey !== ORIGINAL ? (image.variants[pickKey] ?? null) : null
  const dpr = window.devicePixelRatio || 1

  // Sharp pixels appear only once decoded; the blurred thumbnail holds the frame until then.
  const decodedOriginal = useDecoded(image.originalUrl)
  const originalReady = decodedOriginal !== null && decodedOriginal === image.originalUrl
  const wantedResult = variant?.status === 'done' ? variant.viewUrl : null
  const decodedResult = useDecoded(wantedResult)
  // While a newly picked result decodes, the previous result of this same image stays on screen.
  const resultUrl =
    decodedResult && Object.values(image.variants).some((v) => v.viewUrl === decodedResult) ? decodedResult : null
  const shownResult = resultUrl ? Object.values(image.variants).find((v) => v.viewUrl === resultUrl)! : null

  // Single-column layouts (phones, phones in landscape) size the proof to its image and let the stage scroll.
  const compact = area.width > 0 && (area.width < COMPACT || window.innerWidth <= 860)
  const marginX = compact ? MARGIN_X_COMPACT : MARGIN_X
  const availW = Math.max(0, area.width - marginX * 2)
  const compactH = natural ? Math.min(window.innerHeight * 0.6, (availW / natural.width) * natural.height) : 0
  const availH = compact ? compactH : Math.max(0, area.height - MARGIN_TOP - MARGIN_BOTTOM)
  const fitScale = natural ? Math.min(availW / natural.width, availH / natural.height) : 1
  const scale = zoom === 'actual' ? 1 / dpr : fitScale
  const imgW = natural ? natural.width * scale : 0
  const imgH = natural ? natural.height * scale : 0
  // In fit mode the proof is the image; at 1:1 the proof is a window onto the larger image.
  const proofW = zoom === 'actual' ? Math.min(availW, imgW) : imgW
  const proofH = zoom === 'actual' ? Math.min(availH, imgH) : imgH
  const proofLeft = marginX + (availW - proofW) / 2
  const proofTop = MARGIN_TOP + (availH - proofH) / 2
  const maxPanX = Math.max(0, (imgW - proofW) / 2)
  const maxPanY = Math.max(0, (imgH - proofH) / 2)
  // 1:1 opens centred on the detail region the result patches show.
  const openX = zoom === 'actual' && image.patch ? imgW / 2 - (image.patch.x + image.patch.size / 2) * scale : 0
  const openY = zoom === 'actual' && image.patch ? imgH / 2 - (image.patch.y + image.patch.size / 2) * scale : 0
  const dragged = userPan.key === panKey ? userPan : { x: 0, y: 0 }
  const panX = zoom === 'actual' ? clamp(openX + dragged.x, -maxPanX, maxPanX) : 0
  const panY = zoom === 'actual' ? clamp(openY + dragged.y, -maxPanY, maxPanY) : 0
  const imgLeft = (proofW - imgW) / 2 + panX
  const imgTop = (proofH - imgH) / 2 + panY
  const splitX = split * proofW

  const moveSplit = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    useViewer.setState({ split: clamp((event.clientX - box.left) / box.width, 0, 1) })
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const onHandle = (event.target as HTMLElement).closest('.proof-handle') !== null
    const mode = zoom === 'actual' && !onHandle ? 'pan' : 'split'
    // A touch that starts on the photo may be a page scroll: it only moves the divider once it goes sideways
    // (touch-action: pan-y hands vertical swipes to the page, which then cancels this pointer).
    const intent = mode === 'split' && event.pointerType === 'touch' && !onHandle ? 'pending' : 'drag'
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { mode, intent, startX: event.clientX, startY: event.clientY, panX, panY }
    if (mode === 'split' && intent === 'drag') moveSplit(event)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag?.intent === 'pending') {
      const dx = Math.abs(event.clientX - drag.startX)
      const dy = Math.abs(event.clientY - drag.startY)
      if (dy > 6 && dy >= dx) dragRef.current = null
      else if (dx > 6) drag.intent = 'drag'
    }
    if (drag?.mode === 'split' && drag.intent === 'drag') moveSplit(event)
    else if (drag?.mode === 'pan') {
      const x = clamp(drag.panX + event.clientX - drag.startX, -maxPanX, maxPanX) - openX
      const y = clamp(drag.panY + event.clientY - drag.startY, -maxPanY, maxPanY) - openY
      setUserPan({ key: panKey, x, y })
    }
    if (loupe && natural) {
      const box = event.currentTarget.getBoundingClientRect()
      const ix = (event.clientX - box.left - imgLeft) / scale
      const iy = (event.clientY - box.top - imgTop) / scale
      setHover(ix >= 0 && iy >= 0 && ix < natural.width && iy < natural.height ? { x: ix, y: iy } : null)
    }
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const imgStyle: CSSProperties = {
    width: imgW,
    height: imgH,
    transform: `translate(${imgLeft}px, ${imgTop}px)`,
    imageRendering: scale >= 2 ? 'pixelated' : undefined,
  }
  const dims = dimensions(image)
  const ready = natural !== null && area.width > 0
  const headStyle: CSSProperties = compact
    ? { left: 16, width: area.width - 32, top: proofTop - 38 }
    : proofW >= 560
      ? { left: proofLeft, width: proofW, top: proofTop - 38 }
      : { left: marginX, width: availW, top: proofTop - 38 }

  return (
    <div
      className="proof-area"
      ref={areaRef}
      data-compact={compact}
      style={compact && natural ? { height: compactH + MARGIN_TOP + MARGIN_BOTTOM + COMPACT_TOOLS } : undefined}
    >
      {ready && (
        <div className="proof-head" style={headStyle}>
          <p className="proof-caption">
            <span className="proof-name">{image.name}</span>
            {dims && <span className="num">{dims}</span>}
            <span className="num">{formatBytes(image.bytes)}</span>
          </p>
          <Readout image={image} variant={variant} pickKey={pickKey} />
        </div>
      )}
      {ready && (
        <div className="proof" style={{ left: proofLeft, top: proofTop, width: proofW, height: proofH }}>
          <div
            className="proof-canvas"
            data-zoom={zoom}
            data-alpha={image.hasAlpha}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={() => setHover(null)}
          >
            <div className="proof-layer">
              {image.thumbUrl && !originalReady && (
                <img className="proof-skeleton" src={image.thumbUrl} alt="" style={imgStyle} draggable={false} />
              )}
              {image.originalUrl && (
                <img
                  className="proof-sharp"
                  data-ready={originalReady}
                  src={image.originalUrl}
                  alt={`${image.name}, original`}
                  style={imgStyle}
                  decoding="async"
                  draggable={false}
                />
              )}
            </div>
            {resultUrl && originalReady && !showOriginal && (
              <>
                <div className="proof-layer" style={{ clipPath: `inset(0 0 0 ${splitX}px)` }}>
                  <img
                    src={resultUrl}
                    alt={`${image.name}, ${shownResult ? variantName(shownResult) : 'result'}`}
                    style={imgStyle}
                    decoding="async"
                    draggable={false}
                  />
                </div>
                <div className="proof-divider" style={{ left: splitX }}>
                  <span className="proof-handle">
                    <ChevronsLeftRight />
                  </span>
                </div>
              </>
            )}
          </div>
          {loupe && hover && natural && image.originalUrl && (
            <Loupe
              size={Math.max(96, Math.min(176, Math.floor((proofW - 36) / 2)))}
              point={hover}
              natural={natural}
              dpr={dpr}
              originalUrl={image.originalUrl}
              resultUrl={resultUrl}
              resultLabel={shownResult ? variantName(shownResult) : 'Original'}
            />
          )}
        </div>
      )}
      {!natural && image.status !== 'error' && (
        <div className="proof-wait" aria-live="polite">
          <div className="proof-wait-frame" />
          <span>Reading {image.name}…</span>
        </div>
      )}
      {image.status === 'error' && (
        <div className="proof-wait proof-error" role="alert">
          <strong>Can’t read {image.name}</strong>
          <span>{image.error}</span>
        </div>
      )}
      {(ready || image.status === 'error') && <ProofTools imageId={image.id} imageName={image.name} />}
    </div>
  )
}

function Readout({ image, variant, pickKey }: { image: ImageEntry; variant: Variant | null; pickKey: string | null }) {
  if (pickKey === ORIGINAL) {
    return (
      <div className="proof-readout">
        <span>Original kept</span>
        <span className="proof-readout-dot">·</span>
        <span className="num">{formatBytes(image.bytes)}</span>
        <DownloadButton label="Download original" onClick={() => downloadVariant(image.id, ORIGINAL)} />
      </div>
    )
  }
  if (!variant) {
    return (
      <div className="proof-readout">
        <span className="proof-readout-muted">Encoding results…</span>
      </div>
    )
  }
  const done = variant.status === 'done' && variant.bytes !== null
  return (
    <div className="proof-readout">
      <span>{variantName(variant)}</span>
      <span className="proof-readout-dot">·</span>
      {done ? (
        <span className="num">{formatBytes(variant.bytes!)}</span>
      ) : (
        <span className="proof-readout-muted">{variant.status === 'error' ? 'failed' : 'encoding…'}</span>
      )}
      {done && <DownloadButton label={`Download ${variantName(variant)}`} onClick={() => downloadVariant(image.id, variant.key)} />}
    </div>
  )
}

function DownloadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-sm btn-solid proof-download" aria-label={label} title={`${label} (D)`} onClick={onClick}>
      <Download aria-hidden="true" />
      <span className="proof-download-label">Download</span>
    </button>
  )
}

function ProofTools({ imageId, imageName }: { imageId: string; imageName: string }) {
  const zoom = useViewer((s) => s.zoom)
  const loupe = useViewer((s) => s.loupe)
  return (
    <div className="proof-tools" role="toolbar" aria-label="View" aria-orientation="vertical">
      <button
        type="button"
        className="icon-btn"
        aria-pressed={zoom === 'fit'}
        aria-label="Fit to window (Z)"
        title="Fit (Z)"
        onClick={() => useViewer.setState({ zoom: 'fit' })}
      >
        <Maximize />
      </button>
      <button
        type="button"
        className="icon-btn proof-tool-text"
        aria-pressed={zoom === 'actual'}
        aria-label="Actual pixels (Z)"
        title="Actual pixels (Z)"
        onClick={() => useViewer.setState({ zoom: 'actual' })}
      >
        1:1
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-pressed={loupe}
        aria-label="Loupe (L)"
        title="Loupe (L)"
        onClick={() => useViewer.setState({ loupe: !loupe })}
      >
        <ScanSearch />
      </button>
      <span className="proof-tools-sep" aria-hidden="true" />
      <button
        type="button"
        className="icon-btn proof-tool-keys"
        aria-label="Keyboard shortcuts (?)"
        title="Keyboard shortcuts (?)"
        onClick={() => useViewer.setState((s) => ({ shortcutsOpen: !s.shortcutsOpen }))}
      >
        <Keyboard />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Remove ${imageName} (Delete)`}
        title="Remove image (Delete)"
        onClick={() => removeImage(imageId)}
      >
        <Trash2 />
      </button>
    </div>
  )
}

/** Two 1:1 windows (original, result) seated inside the proof's bottom-right corner. */
function Loupe({
  size,
  point,
  natural,
  dpr,
  originalUrl,
  resultUrl,
  resultLabel,
}: {
  size: number
  point: { x: number; y: number }
  natural: Size
  dpr: number
  originalUrl: string
  resultUrl: string | null
  resultLabel: string
}) {
  // One image pixel per device pixel, centred on the pointer.
  const style = (url: string): CSSProperties => ({
    width: size,
    height: size,
    backgroundImage: `url("${url}")`,
    backgroundSize: `${natural.width / dpr}px ${natural.height / dpr}px`,
    backgroundPosition: `${size / 2 - point.x / dpr}px ${size / 2 - point.y / dpr}px`,
  })
  return (
    <div className="loupe" aria-hidden="true">
      <div className="loupe-cell">
        <div className="loupe-view" style={style(originalUrl)} />
        <span className="loupe-label">Original</span>
      </div>
      {resultUrl && (
        <div className="loupe-cell">
          <div className="loupe-view" style={style(resultUrl)} />
          <span className="loupe-label">{resultLabel}</span>
        </div>
      )}
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
