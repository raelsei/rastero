import { memo, useState } from 'react'
import { Check, CircleCheck, ChevronDown, Download } from 'lucide-react'
import { getFormat, outputPath, type FormatId } from '../engine/formats'
import { formatBytes, savings } from '../engine/format-bytes'
import { currentPick, formatVariant, orderedVariants } from '../state/pick'
import { downloadVariant, pin, selectImage, setView, useSession } from '../state/session'
import { useSettings } from '../state/settings'
import { ORIGINAL, type ImageEntry, type Variant } from '../state/types'
import { dimensions, formatSaving, qualityCaption, variantName } from './format'
import { QualityBar } from './QualityBar'
import './GridView.css'

/** Batch view: one row per image, one column per format, sizes drawn as bars on a shared per-row scale. */
export function GridView() {
  const order = useSession((s) => s.order)
  const images = useSession((s) => s.images)
  const enabled = useSettings((s) => s.enabled)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups: Array<{ folder: string; ids: string[] }> = []
  for (const id of order) {
    const folder = images[id].folder
    const group = groups.find((g) => g.folder === folder)
    if (group) group.ids.push(id)
    else groups.push({ folder, ids: [id] })
  }

  return (
    <div className="grid-view">
      <div className="grid-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th scope="col">Image</th>
              <th scope="col">Original</th>
              {enabled.map((format) => (
                <th key={format} scope="col">
                  {columnLabel(format)}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => {
            const isCollapsed = collapsed[group.folder] === true
            return (
              <tbody key={group.folder || '(loose)'}>
                {group.folder !== '' && (
                  <tr className="grid-folder">
                    <th colSpan={enabled.length + 2} scope="rowgroup">
                      <button
                        type="button"
                        aria-expanded={!isCollapsed}
                        onClick={() => setCollapsed((c) => ({ ...c, [group.folder]: !isCollapsed }))}
                      >
                        <ChevronDown data-collapsed={isCollapsed} />
                        {group.folder}/ <span className="num">({group.ids.length})</span>
                      </button>
                    </th>
                  </tr>
                )}
                {!isCollapsed && group.ids.map((id) => <GridRow key={id} image={images[id]} enabled={enabled} />)}
              </tbody>
            )
          })}
        </table>
      </div>
      <Inspector />
    </div>
  )
}

function columnLabel(format: FormatId): string {
  const def = getFormat(format)
  if (format === 'png') return 'PNG'
  if (format === 'png-lossy') return 'PNG lossy'
  return `${def.label} q${def.tiers.balanced}`
}

const GridRow = memo(function GridRow({ image, enabled }: { image: ImageEntry; enabled: FormatId[] }) {
  const selected = useSession((s) => s.selectedId === image.id)
  const pickKey = currentPick(image, enabled)
  const picked = pickKey && pickKey !== ORIGINAL ? image.variants[pickKey] : null

  const cells = enabled.map((format) => {
    const v = picked?.spec.format === format ? picked : formatVariant(image, format)
    return { format, v }
  })
  const doneBytes = cells.flatMap(({ v }) => (v?.status === 'done' && v.bytes !== null ? [v.bytes] : []))
  const scale = Math.max(image.bytes, ...doneBytes)
  const eligible = cells.filter(
    ({ format, v }) => v?.status === 'done' && (!image.hasAlpha || getFormat(format).supportsAlpha),
  )
  const smallest = eligible.reduce<Variant | null>((best, { v }) => (best === null || v!.bytes! < best.bytes! ? v! : best), null)

  return (
    <tr
      className="grid-row"
      aria-selected={selected}
      onClick={() => selectImage(image.id)}
      onDoubleClick={() => setView('stage')}
    >
      <th scope="row" className="grid-image">
        <span className="grid-thumb">{image.thumbUrl && <img src={image.thumbUrl} alt="" decoding="async" />}</span>
        <span className="grid-image-text">
          <span className="grid-path">{image.relativePath}</span>
          <span className="grid-dims num">{image.status === 'error' ? 'Unreadable' : (dimensions(image) ?? '…')}</span>
        </span>
      </th>
      <td>
        <SizeCell bytes={image.bytes} scale={scale} />
      </td>
      {cells.map(({ format, v }) => (
        <td key={format}>
          {v ? (
            <button
              type="button"
              className="grid-cell"
              aria-pressed={v.key === pickKey}
              disabled={v.status !== 'done'}
              title={v.status === 'done' ? `${variantName(v)} · ${formatSaving(savings(image.bytes, v.bytes!))}` : variantName(v)}
              onClick={(e) => {
                e.stopPropagation()
                selectImage(image.id)
                pin(image.id, v.key)
              }}
            >
              {v.status === 'done' && v.bytes !== null ? (
                <SizeCell
                  bytes={v.bytes}
                  scale={scale}
                  note={v.tier === 'balanced' || v.tier === null ? null : qualityCaption(v)}
                  mark={v.key === pickKey ? 'picked' : v === smallest ? 'smallest' : null}
                />
              ) : (
                <span className="grid-wait">{v.status === 'error' ? 'Failed' : v.status === 'encoding' ? 'Encoding' : 'Queued'}</span>
              )}
            </button>
          ) : (
            <span className="grid-wait">—</span>
          )}
        </td>
      ))}
    </tr>
  )
})

/** A size with its bar on the row's shared scale; the pick carries a filled check, the smallest an outline one. */
function SizeCell({
  bytes,
  scale,
  note = null,
  mark = null,
}: {
  bytes: number
  scale: number
  note?: string | null
  mark?: 'picked' | 'smallest' | null
}) {
  return (
    <span className="size-cell">
      <span className="size-value num">
        {formatBytes(bytes)}
        {note && <span className="size-note"> {note}</span>}
        {mark === 'picked' && <CircleCheck className="size-mark size-mark-picked" aria-label="picked" />}
        {mark === 'smallest' && <Check className="size-mark" aria-label="smallest" />}
      </span>
      <span className="size-bar">
        <span style={{ width: `${Math.max(2, (bytes / scale) * 100)}%` }} />
      </span>
    </span>
  )
}

function Inspector() {
  const image = useSession((s) => (s.selectedId ? s.images[s.selectedId] : null))
  const enabled = useSettings((s) => s.enabled)
  if (!image) return <aside className="inspector" />
  const pickKey = currentPick(image, enabled)
  const picked = pickKey && pickKey !== ORIGINAL ? (image.variants[pickKey] ?? null) : null
  const viewUrl = picked?.status === 'done' ? picked.viewUrl : image.originalUrl
  const downloadName =
    pickKey === ORIGINAL ? image.name : picked ? outputPath(image.name, picked.spec, { withQuality: picked.spec.quality !== null }) : null
  const downloadBytes = pickKey === ORIGINAL ? image.bytes : picked?.status === 'done' ? picked.bytes : null
  const tiers = picked ? orderedVariants(image, [picked.spec.format]) : []

  return (
    <aside className="inspector" aria-label="Selected image">
      <header className="inspector-head">
        <span className="inspector-path">{image.relativePath}</span>
        <span className="num">{dimensions(image)}</span>
      </header>
      <div className="inspector-proof">
        {viewUrl && (
          <div className="inspector-frame" data-alpha={image.hasAlpha}>
            <img src={viewUrl} alt={image.name} decoding="async" />
          </div>
        )}
      </div>
      {image.patch && (
        <section className="inspector-crop" aria-label="100% crop">
          <header>
            <span>100% crop (1:1)</span>
            <span className="num">
              {image.patch.size} × {image.patch.size}
            </span>
          </header>
          <div className="inspector-crop-pair">
            <figure>
              <img src={image.patch.url} alt="" />
              <figcaption>Original</figcaption>
            </figure>
            {picked?.patchUrl && (
              <figure>
                <img src={picked.patchUrl} alt="" />
                <figcaption>{variantName(picked)}</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}
      {picked && (
        <section className="inspector-tiers" aria-label={`${getFormat(picked.spec.format).label} results`}>
          <h3>{getFormat(picked.spec.format).label}</h3>
          <ul>
            {tiers.map((v) => {
              const on = v.key === pickKey
              return (
                <li key={v.key}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className="tier-row"
                    disabled={v.status !== 'done'}
                    onClick={() => pin(image.id, v.key)}
                  >
                    <span>{qualityCaption(v)}</span>
                    <span className="num">{v.bytes !== null ? formatBytes(v.bytes) : '—'}</span>
                    <span className="num tier-saving">{v.bytes !== null ? formatSaving(savings(image.bytes, v.bytes)) : ''}</span>
                    <span className="size-bar">
                      <span style={{ width: `${v.bytes !== null ? Math.max(2, (v.bytes / image.bytes) * 100) : 0}%` }} />
                    </span>
                    <span className="tier-radio" aria-hidden="true">
                      {on && <Check />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <div className="inspector-quality">
        <QualityBar key={`${image.id}|${pickKey}`} image={image} pickKey={pickKey} />
      </div>
      <button
        type="button"
        className="btn btn-solid inspector-download"
        disabled={downloadName === null || downloadBytes === null}
        onClick={() => pickKey && downloadVariant(image.id, pickKey)}
      >
        <Download aria-hidden="true" />
        <span>Download</span>
        {downloadName && (
          <span className="inspector-download-file">
            <span className="inspector-download-name">{downloadName}</span>
            {downloadBytes !== null && <span className="num">{formatBytes(downloadBytes)}</span>}
          </span>
        )}
      </button>
    </aside>
  )
}
